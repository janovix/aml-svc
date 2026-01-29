/**
 * Import Routes
 * API endpoints for bulk data imports with SSE support
 */

import { Hono } from "hono";
import type { Context } from "hono";
import { ZodError } from "zod";
import { streamSSE } from "hono/streaming";

import {
	ImportService,
	ImportRepository,
	ImportCreateSchema,
	ImportFilterSchema,
	ImportRowFilterSchema,
	ImportIdParamSchema,
	ImportProgressUpdateSchema,
	ImportStatusUpdateSchema,
	ImportBulkRowCreateSchema,
	type ImportEntity,
} from "../domain/import";
import type { Bindings } from "../index";
import { getPrismaClient } from "../lib/prisma";
import {
	type AuthVariables,
	type AuthTokenPayload,
	getOrganizationId,
	verifyToken,
} from "../middleware/auth";
import { generateImportFileKey } from "../lib/r2-upload";
import { APIError } from "../middleware/error";

// CSV templates for clients and transactions
const CLIENT_TEMPLATE = `person_type,rfc,first_name,last_name,second_last_name,birth_date,curp,business_name,incorporation_date,nationality,email,phone,country,state_code,city,municipality,neighborhood,street,external_number,internal_number,postal_code,reference,notes
physical,ABCD123456EF1,Juan,Pérez,García,1990-05-15,PEGJ900515HDFRRL09,,,,MX,juan@example.com,+525512345678,MX,CMX,Ciudad de México,Cuauhtémoc,Centro,Reforma,123,,06000,Near the monument,Example client
moral,ABC123456EF1,,,,,,,Empresa SA de CV,2020-01-01,,empresa@example.com,+525598765432,MX,CMX,Ciudad de México,Miguel Hidalgo,Polanco,Masaryk,456,Suite 100,11560,Corporate building,Business client`;

const TRANSACTION_TEMPLATE = `client_rfc,operation_date,operation_type,branch_postal_code,vehicle_type,brand,model,year,engine_number,plates,registration_number,flag_country_id,armor_level,amount,currency,payment_method_1,payment_amount_1,payment_method_2,payment_amount_2
ABCD123456EF1,2025-01-15,purchase,06000,land,Toyota,Camry,2024,ENG123456,ABC1234,,,Level III-A,450000,MXN,cash,200000,transfer,250000
ABC123456EF1,2025-01-20,sale,11560,land,BMW,X5,2023,ENG789012,XYZ5678,,,,750000,MXN,transfer,750000,,`;

/**
 * Public templates router (no auth required)
 * Serves static CSV templates for import
 */
export const importTemplatesRouter = new Hono<{
	Bindings: Bindings;
}>();

/**
 * GET /:entityType
 * Download CSV template for the specified entity type
 * This endpoint is public (no auth required)
 */
importTemplatesRouter.get("/:entityType", async (c) => {
	const entityType = c.req.param("entityType")?.toUpperCase();

	if (entityType !== "CLIENT" && entityType !== "TRANSACTION") {
		return c.json(
			{
				success: false,
				error: "Bad Request",
				message: "Invalid entity type. Must be CLIENT or TRANSACTION",
			},
			400,
		);
	}

	const template =
		entityType === "CLIENT" ? CLIENT_TEMPLATE : TRANSACTION_TEMPLATE;
	const filename =
		entityType === "CLIENT"
			? "clients_template.csv"
			: "transactions_template.csv";

	return new Response(template, {
		status: 200,
		headers: {
			"Content-Type": "text/csv; charset=utf-8",
			"Content-Disposition": `attachment; filename="${filename}"`,
		},
	});
});

/**
 * SSE Events router (handles its own auth from query params)
 * EventSource API doesn't support custom headers, so we accept token from query params
 */
export const importEventsRouter = new Hono<{
	Bindings: Bindings;
}>();

/**
 * GET /:id/events
 * Server-Sent Events stream for real-time import updates
 * Accepts token from query param since EventSource can't send headers
 */
importEventsRouter.get("/:id/events", async (c) => {
	const importId = c.req.param("id");
	const token = c.req.query("token");

	if (!token) {
		return c.json(
			{
				success: false,
				error: "Unauthorized",
				message: "Missing token parameter",
			},
			401,
		);
	}

	// Verify the token manually
	const authServiceUrl =
		c.env.AUTH_SERVICE_URL ?? "https://auth-svc.janovix.workers.dev";
	const cacheTtl = 3600;
	let payload: AuthTokenPayload;

	try {
		payload = await verifyToken(
			token,
			authServiceUrl,
			cacheTtl,
			c.env.AUTH_SERVICE,
			c.env.ENVIRONMENT,
		);
	} catch (error) {
		console.error("Token verification failed:", error);
		return c.json(
			{
				success: false,
				error: "Unauthorized",
				message: "Invalid or expired token",
			},
			401,
		);
	}

	// Get organization ID from token
	const organizationId = payload.organizationId;
	if (!organizationId) {
		return c.json(
			{
				success: false,
				error: "Forbidden",
				message: "No organization context in token",
			},
			403,
		);
	}

	// Validate import ID and get service
	const prisma = getPrismaClient(c.env.DB);
	const repository = new ImportRepository(prisma);
	const service = new ImportService(repository);

	let importRecord: ImportEntity;
	try {
		importRecord = await service.get(organizationId, importId);
	} catch (error) {
		if (error instanceof Error && error.message === "IMPORT_NOT_FOUND") {
			return c.json(
				{
					success: false,
					error: "Not Found",
					message: "Import not found",
				},
				404,
			);
		}
		throw error;
	}

	return streamSSE(c, async (stream) => {
		// Send initial connection event
		await stream.writeSSE({
			event: "connected",
			data: JSON.stringify({
				importId: importRecord.id,
				status: importRecord.status,
				timestamp: new Date().toISOString(),
			}),
		});

		// Track last update time for polling
		let lastUpdateTime = new Date();
		let currentStatus = importRecord.status;
		let isCompleted =
			currentStatus === "COMPLETED" || currentStatus === "FAILED";

		// Poll for updates every 500ms
		while (!isCompleted) {
			// Check if connection is still alive
			if (stream.aborted) {
				break;
			}

			// Get recent row updates
			const recentUpdates = await service.getRecentRowUpdates(
				importId,
				lastUpdateTime,
			);

			for (const row of recentUpdates) {
				await stream.writeSSE({
					event: "row_update",
					data: JSON.stringify(row),
				});
			}

			if (recentUpdates.length > 0) {
				lastUpdateTime = new Date();
			}

			// Check import status
			const currentImport = await service.get(organizationId, importId);
			if (currentImport.status !== currentStatus) {
				await stream.writeSSE({
					event: "status_change",
					data: JSON.stringify({
						status: currentImport.status,
						processedRows: currentImport.processedRows,
						totalRows: currentImport.totalRows,
						successCount: currentImport.successCount,
						warningCount: currentImport.warningCount,
						errorCount: currentImport.errorCount,
					}),
				});
				currentStatus = currentImport.status;
			}

			if (
				currentImport.status === "COMPLETED" ||
				currentImport.status === "FAILED"
			) {
				await stream.writeSSE({
					event: "completed",
					data: JSON.stringify({
						status: currentImport.status,
						processedRows: currentImport.processedRows,
						totalRows: currentImport.totalRows,
						successCount: currentImport.successCount,
						warningCount: currentImport.warningCount,
						errorCount: currentImport.errorCount,
						errorMessage: currentImport.errorMessage,
						completedAt: currentImport.completedAt,
					}),
				});
				isCompleted = true;
				break;
			}

			// Send heartbeat ping
			await stream.writeSSE({
				event: "ping",
				data: JSON.stringify({ timestamp: new Date().toISOString() }),
			});

			// Wait 500ms before next poll
			await new Promise((resolve) => setTimeout(resolve, 500));
		}
	});
});

export const importsRouter = new Hono<{
	Bindings: Bindings;
	Variables: AuthVariables;
}>();

function parseWithZod<T>(
	schema: { parse: (input: unknown) => T },
	payload: unknown,
): T {
	try {
		return schema.parse(payload);
	} catch (error) {
		if (error instanceof ZodError) {
			throw new APIError(400, "Validation failed", error.format());
		}
		throw error;
	}
}

function getService(
	c: Context<{ Bindings: Bindings; Variables: AuthVariables }>,
) {
	const prisma = getPrismaClient(c.env.DB);
	const repository = new ImportRepository(prisma);
	return new ImportService(repository);
}

function handleServiceError(error: unknown): never {
	if (error instanceof Error) {
		if (error.message === "IMPORT_NOT_FOUND") {
			throw new APIError(404, "Import not found");
		}
	}
	throw error;
}

/**
 * GET /imports
 * List imports for the organization
 */
importsRouter.get("/", async (c) => {
	const organizationId = getOrganizationId(c);
	const url = new URL(c.req.url);
	const queryObject = Object.fromEntries(url.searchParams.entries());
	const filters = parseWithZod(ImportFilterSchema, queryObject);

	const service = getService(c);
	const result = await service
		.list(organizationId, filters)
		.catch(handleServiceError);

	return c.json(result);
});

/**
 * GET /imports/:id
 * Get import details with row results
 */
importsRouter.get("/:id", async (c) => {
	const organizationId = getOrganizationId(c);
	const params = parseWithZod(ImportIdParamSchema, c.req.param());
	const url = new URL(c.req.url);
	const queryObject = Object.fromEntries(url.searchParams.entries());
	const rowFilters = parseWithZod(ImportRowFilterSchema, queryObject);

	const service = getService(c);
	const result = await service
		.getWithResults(organizationId, params.id, rowFilters)
		.catch(handleServiceError);

	return c.json(result);
});

/**
 * GET /imports/:id/rows
 * Get paginated row results for an import
 */
importsRouter.get("/:id/rows", async (c) => {
	const organizationId = getOrganizationId(c);
	const params = parseWithZod(ImportIdParamSchema, c.req.param());
	const url = new URL(c.req.url);
	const queryObject = Object.fromEntries(url.searchParams.entries());
	const filters = parseWithZod(ImportRowFilterSchema, queryObject);

	// First verify the import exists and belongs to org
	const service = getService(c);
	await service.get(organizationId, params.id).catch(handleServiceError);

	const result = await service.listRowResults(params.id, filters);

	return c.json(result);
});

/**
 * POST /imports
 * Create a new import by uploading a file
 */
importsRouter.post("/", async (c) => {
	const organizationId = getOrganizationId(c);
	const user = c.get("user");
	if (!user) {
		throw new APIError(401, "User not authenticated");
	}

	// Parse multipart form data
	const formData = await c.req.formData();
	const file = formData.get("file");
	const entityType = formData.get("entityType");

	if (!file || !(file instanceof File)) {
		throw new APIError(400, "No file provided");
	}

	if (!entityType || typeof entityType !== "string") {
		throw new APIError(400, "entityType is required");
	}

	// Validate file type
	const validMimeTypes = [
		"text/csv",
		"application/vnd.ms-excel",
		"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
	];
	const validExtensions = [".csv", ".xls", ".xlsx"];

	const hasValidMime = validMimeTypes.includes(file.type);
	const hasValidExt = validExtensions.some((ext) =>
		file.name.toLowerCase().endsWith(ext),
	);

	if (!hasValidMime && !hasValidExt) {
		throw new APIError(
			400,
			"Invalid file type. Please upload a CSV or Excel file (.csv, .xls, .xlsx)",
		);
	}

	// Validate file size (max 50MB)
	const maxSize = 50 * 1024 * 1024;
	if (file.size > maxSize) {
		throw new APIError(400, `File too large. Maximum size is 50MB`);
	}

	// Validate entity type
	const input = parseWithZod(ImportCreateSchema, {
		entityType: entityType.toUpperCase(),
		fileName: file.name,
		fileSize: file.size,
	});

	// Upload file to R2
	if (!c.env.R2_BUCKET) {
		throw new APIError(503, "File storage not configured");
	}

	const fileKey = generateImportFileKey(organizationId, file.name);
	const arrayBuffer = await file.arrayBuffer();
	await c.env.R2_BUCKET.put(fileKey, arrayBuffer, {
		httpMetadata: {
			contentType: file.type || "application/octet-stream",
		},
		customMetadata: {
			organizationId,
			userId: user.id,
			entityType: input.entityType,
			uploadedAt: new Date().toISOString(),
		},
	});

	// Create import record
	const service = getService(c);
	const { import: importRecord, job } = await service.create(
		organizationId,
		user.id,
		input,
		fileKey,
	);

	// Queue the import job
	if (c.env.IMPORT_PROCESSING_QUEUE) {
		await c.env.IMPORT_PROCESSING_QUEUE.send(job);
	} else {
		console.warn(
			"[Import] IMPORT_PROCESSING_QUEUE not configured, job not queued",
		);
	}

	return c.json(
		{
			success: true,
			data: importRecord,
		},
		201,
	);
});

/**
 * DELETE /imports/:id
 * Delete an import and its row results
 */
importsRouter.delete("/:id", async (c) => {
	const organizationId = getOrganizationId(c);
	const params = parseWithZod(ImportIdParamSchema, c.req.param());

	const service = getService(c);
	await service.delete(organizationId, params.id).catch(handleServiceError);

	return c.body(null, 204);
});

// ============================================================================
// Internal router (for worker communication - no auth required)
// ============================================================================

/**
 * Internal imports router (no auth required)
 * These endpoints are called by the aml-import-worker via service binding
 */
export const importInternalRouter = new Hono<{
	Bindings: Bindings;
}>();

// Helper to get service without auth context
function getInternalService(c: Context<{ Bindings: Bindings }>) {
	const prisma = getPrismaClient(c.env.DB);
	const repository = new ImportRepository(prisma);
	return new ImportService(repository);
}

/**
 * Format error for internal API responses
 * Ensures error messages are always properly propagated
 */
function formatInternalError(error: unknown): {
	message: string;
	details?: unknown;
} {
	if (error instanceof APIError) {
		return { message: error.message, details: error.details };
	}

	if (error instanceof Error) {
		// Check for not found errors
		if (error.message.includes("NOT_FOUND")) {
			return { message: "Import not found", details: { code: "NOT_FOUND" } };
		}

		return { message: error.message };
	}

	return { message: "Unknown error occurred" };
}

/**
 * POST /imports/:id/status
 * Update import status (internal, called by worker)
 */
importInternalRouter.post("/:id/status", async (c) => {
	try {
		const params = parseWithZod(ImportIdParamSchema, c.req.param());
		const body = await c.req.json();
		const update = parseWithZod(ImportStatusUpdateSchema, body);

		const service = getInternalService(c);
		const result = await service.updateStatus(params.id, update);

		return c.json({ success: true, data: result });
	} catch (error) {
		console.error("[InternalImports] POST status error:", error);
		const { message, details } = formatInternalError(error);
		const status = error instanceof APIError ? error.statusCode : 500;
		return c.json({ error: "Error", message, details }, status as 400);
	}
});

/**
 * POST /imports/:id/rows
 * Create row results in bulk (internal, called by worker)
 */
importInternalRouter.post("/:id/rows", async (c) => {
	try {
		const params = parseWithZod(ImportIdParamSchema, c.req.param());
		const body = await c.req.json();
		const input = parseWithZod(ImportBulkRowCreateSchema, body);

		const service = getInternalService(c);
		await service.createRowResults(params.id, input);

		return c.json({ success: true });
	} catch (error) {
		console.error("[InternalImports] POST rows error:", error);
		const { message, details } = formatInternalError(error);
		const status = error instanceof APIError ? error.statusCode : 500;
		return c.json({ error: "Error", message, details }, status as 400);
	}
});

/**
 * POST /imports/:id/progress
 * Update a single row result (internal, called by worker)
 */
importInternalRouter.post("/:id/progress", async (c) => {
	try {
		const params = parseWithZod(ImportIdParamSchema, c.req.param());
		const body = await c.req.json();
		const update = parseWithZod(ImportProgressUpdateSchema, body);

		const service = getInternalService(c);
		const result = await service.updateRowResult(
			params.id,
			update.rowNumber,
			update,
		);

		return c.json({ success: true, data: result });
	} catch (error) {
		console.error("[InternalImports] POST progress error:", error);
		const { message, details } = formatInternalError(error);
		const status = error instanceof APIError ? error.statusCode : 500;
		return c.json({ error: "Error", message, details }, status as 400);
	}
});
