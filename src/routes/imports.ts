/**
 * Import Routes
 * API endpoints for bulk data imports with SSE support
 */

import { Hono } from "hono";
import type { Context } from "hono";
import { ZodError } from "zod";
import { streamSSE } from "hono/streaming";
import * as Sentry from "@sentry/cloudflare";

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
import type { Bindings } from "../types";
import { getPrismaClient } from "../lib/prisma";
import {
	type AuthVariables,
	type AuthTokenPayload,
	getOrganizationId,
	verifyToken,
} from "../middleware/auth";
import { generateImportFileKey } from "../lib/r2-upload";
import { APIError } from "../middleware/error";
import {
	getActivityColumns,
	ACTIVITY_EXTENSION_COLUMNS,
	type ActivityCode,
} from "../domain/import/template-columns";
import { parseQueryParams } from "../lib/query-params";

// CSV templates for clients
const CLIENT_TEMPLATE = `person_type,rfc,first_name,last_name,second_last_name,birth_date,curp,business_name,incorporation_date,nationality,email,phone,country,state_code,city,municipality,neighborhood,street,external_number,internal_number,postal_code,reference,notes,country_code,economic_activity_code,gender,occupation,marital_status,source_of_funds,source_of_wealth
physical,ABCD123456EF1,Juan,Pérez,García,1990-05-15,PEGJ900515HDFRRL09,,,,MX,juan@example.com,+525512345678,MX,CMX,Ciudad de México,Cuauhtémoc,Centro,Reforma,123,,06000,Near the monument,Example client,MEX,4651101,M,Ingeniero de Software,MARRIED,Salario mensual,Ahorros personales
moral,ABC123456EF1,,,,,,,Empresa SA de CV,2020-01-01,,empresa@example.com,+525598765432,MX,CMX,Ciudad de México,Miguel Hidalgo,Polanco,Masaryk,456,Suite 100,11560,Corporate building,Business client,MEX,5221101,,,,,`;

/**
 * Public templates router (no auth required)
 * Serves static CSV templates for import
 */
export const importTemplatesRouter = new Hono<{
	Bindings: Bindings;
}>();

/**
 * GET /:entityType or /:entityType/:activityCode
 * Download CSV template for CLIENT or OPERATION
 * This endpoint is public (no auth required)
 * Case-insensitive: accepts CLIENT, client, Client, etc.
 */
importTemplatesRouter.get("/:entityType/:activityCode?", async (_c) => {
	const entityType = _c.req.param("entityType")?.toUpperCase();
	const activityCode = _c.req.param("activityCode")?.toUpperCase() as
		| ActivityCode
		| undefined;

	// Handle CLIENT template
	if (entityType === "CLIENT" && !activityCode) {
		return new Response(CLIENT_TEMPLATE, {
			status: 200,
			headers: {
				"Content-Type": "text/csv; charset=utf-8",
				"Content-Disposition": 'attachment; filename="clients_template.csv"',
			},
		});
	}

	// Handle OPERATION template
	if (entityType === "OPERATION" && activityCode) {
		// Validate activity code
		if (!ACTIVITY_EXTENSION_COLUMNS[activityCode]) {
			return _c.json(
				{
					success: false,
					error: "Bad Request",
					message: `Invalid activity code: ${activityCode}`,
				},
				400,
			);
		}

		// Generate CSV template for this activity
		const columns = getActivityColumns(activityCode);
		const header = columns.join(",");

		// Generate example row with empty values
		const exampleRow = columns.map(() => "").join(",");

		const template = `${header}\n${exampleRow}`;
		const filename = `operations_${activityCode.toLowerCase()}_template.csv`;

		return new Response(template, {
			status: 200,
			headers: {
				"Content-Type": "text/csv; charset=utf-8",
				"Content-Disposition": `attachment; filename="${filename}"`,
			},
		});
	}

	// Unknown entity type or missing activity code for OPERATION
	return _c.json(
		{
			success: false,
			error: "Bad Request",
			message: `Invalid entity type or missing activity code: ${entityType}`,
		},
		400,
	);
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
	const authServiceBinding = c.env.AUTH_SERVICE;
	if (!authServiceBinding) {
		return c.json(
			{
				success: false,
				error: "Configuration Error",
				message: "Authentication service not configured",
			},
			500,
		);
	}

	const cacheTtl = 3600;
	let payload: AuthTokenPayload;

	try {
		payload = await verifyToken(token, cacheTtl, authServiceBinding);
	} catch (error) {
		Sentry.captureException(error, {
			tags: { context: "import-token-verification-failed" },
		});
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
		// Send initial connection event — include current counts so the frontend
		// shows accurate progress immediately (important for reconnects and page
		// navigations to an already-running import).
		await stream.writeSSE({
			event: "connected",
			data: JSON.stringify({
				importId: importRecord.id,
				status: importRecord.status,
				totalRows: importRecord.totalRows,
				processedRows: importRecord.processedRows,
				successCount: importRecord.successCount,
				warningCount: importRecord.warningCount,
				errorCount: importRecord.errorCount,
				timestamp: new Date().toISOString(),
			}),
		});

		// Track last update time for polling
		let lastUpdateTime = new Date();
		let currentStatus = importRecord.status;
		let lastProcessedRows = importRecord.processedRows;
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

			// Check import status AND progress counts.
			// status_change is emitted whenever the status OR processedRows changes
			// so the frontend progress ring updates continuously during processing
			// (not only on status transitions).
			const currentImport = await service.get(organizationId, importId);
			if (
				currentImport.status !== currentStatus ||
				currentImport.processedRows !== lastProcessedRows
			) {
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
				lastProcessedRows = currentImport.processedRows;
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
	const queryObject = parseQueryParams(url.searchParams, [
		"status",
		"entityType",
	]);
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
	const activityCode = formData.get("activityCode");

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

	// Validate entity type and activity code
	const input = parseWithZod(ImportCreateSchema, {
		entityType: entityType.toUpperCase(),
		activityCode:
			activityCode && typeof activityCode === "string"
				? activityCode.toUpperCase()
				: undefined,
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
		Sentry.captureException(error, {
			tags: { context: "internal-imports-post-status-error" },
		});
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
		Sentry.captureException(error, {
			tags: { context: "internal-imports-post-rows-error" },
		});
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
		Sentry.captureException(error, {
			tags: { context: "internal-imports-post-progress-error" },
		});
		const { message, details } = formatInternalError(error);
		const status = error instanceof APIError ? error.statusCode : 500;
		return c.json({ error: "Error", message, details }, status as 400);
	}
});
