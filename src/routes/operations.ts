import { Hono } from "hono";
import type { Context } from "hono";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import * as Sentry from "@sentry/cloudflare";

import {
	OperationService,
	DuplicateOperationError,
	OperationCreateSchema,
	OperationUpdateSchema,
	OperationFilterSchema,
	OperationIdParamSchema,
	BulkOperationImportSchema,
} from "../domain/operation";
import type { BulkOperationItemInput } from "../domain/operation";
import { getAllActivities } from "../domain/operation/activities";
import type { Bindings } from "../types";
import { getPrismaClient } from "../lib/prisma";
import { APIError } from "../middleware/error";
import { type AuthVariables, getOrganizationId } from "../middleware/auth";
import { createAlertQueueService } from "../lib/alert-queue";
import { createUsageRightsClient } from "../lib/usage-rights-client";
import { KycSessionService } from "../domain/kyc-session";
import { OrganizationSettingsRepository } from "../domain/organization-settings";
import { UmaValueRepository } from "../domain/uma/repository";
import {
	getIdentificationThresholdUma,
	getNoticeThresholdUma,
} from "../domain/operation/activities/registry";
import type { ActivityCode } from "../domain/operation/types";
import { sendKYCInviteEmail } from "../lib/kyc-email";
import { parseQueryParams } from "../lib/query-params";

export const operationsRouter = new Hono<{
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
	return new OperationService(prisma);
}

function handleServiceError(error: unknown): never {
	if (error instanceof Error) {
		if (error.message === "OPERATION_NOT_FOUND") {
			throw new APIError(404, "Operation not found");
		}
		if (error.message === "CLIENT_NOT_FOUND") {
			throw new APIError(404, "Client not found");
		}
		if (error.message === "INVOICE_NOT_FOUND") {
			throw new APIError(404, "Invoice not found");
		}
		if (error.message === "INVALID_ACTIVITY_CODE") {
			throw new APIError(400, "Invalid activity code");
		}
	}

	// Handle Prisma foreign key constraint violations
	if (error instanceof Prisma.PrismaClientKnownRequestError) {
		if (error.code === "P2003") {
			const field = error.meta?.field_name as string | undefined;
			if (field === "clientId" || field?.includes("clientId")) {
				throw new APIError(404, "Client not found", {
					field: "clientId",
					message:
						"The specified client does not exist or belongs to a different organization",
				});
			}
			if (field === "invoiceId" || field?.includes("invoiceId")) {
				throw new APIError(404, "Invoice not found", {
					field: "invoiceId",
					message:
						"The specified invoice does not exist or belongs to a different organization",
				});
			}
			throw new APIError(400, "Foreign key constraint violation", {
				field: field || "unknown",
				message: "A referenced record does not exist",
				details: error.meta,
			});
		}
	}

	throw error;
}

/**
 * GET /operations
 * List all operations with optional filters
 */
operationsRouter.get("/", async (c) => {
	const organizationId = getOrganizationId(c);
	const url = new URL(c.req.url);
	const queryObject = parseQueryParams(url.searchParams, [
		"activityCode",
		"watchlistStatus",
		"dataSource",
	]);
	const filters = parseWithZod(OperationFilterSchema, queryObject);

	const service = getService(c);
	const result = await service
		.list(organizationId, filters)
		.catch(handleServiceError);

	return c.json(result);
});

/**
 * GET /operations/stats
 * Get summary statistics for operations in the organization.
 * Returns the API contract shape: operationsToday, suspiciousOperations, totalVolume,
 * plus optional completeCount and incompleteCount for the operations page.
 * IMPORTANT: must be defined before /:id to avoid "stats" being matched as an id.
 */
operationsRouter.get("/stats", async (c) => {
	const organizationId = getOrganizationId(c);
	const service = getService(c);
	const prisma = getPrismaClient(c.env.DB);

	const [rawStats, suspiciousOperations, completeCount, incompleteCount] =
		await Promise.all([
			service.getStats(organizationId).catch(handleServiceError),
			prisma.alert.count({
				where: {
					organizationId,
					status: { in: ["DETECTED", "FILE_GENERATED"] },
				},
			}),
			prisma.operation.count({
				where: {
					organizationId,
					deletedAt: null,
					completenessStatus: "COMPLETE",
				},
			}),
			prisma.operation.count({
				where: {
					organizationId,
					deletedAt: null,
					completenessStatus: { in: ["INCOMPLETE", "MINIMUM"] },
				},
			}),
		]);

	const body: {
		operationsToday: number;
		suspiciousOperations: number;
		totalVolume: string;
		totalOperations: number;
		completeCount?: number;
		incompleteCount?: number;
	} = {
		operationsToday: rawStats.operationsToday,
		suspiciousOperations,
		totalVolume: rawStats.totalAmountMxn,
		totalOperations: rawStats.totalOperations,
		completeCount,
		incompleteCount,
	};

	return c.json(body);
});

/**
 * GET /operations/activities
 * Get list of all supported vulnerable activities with their details
 */
operationsRouter.get("/activities", async (c) => {
	const activities = getAllActivities();
	const service = getService(c);

	const activitiesWithThresholds = activities.map((activity) => ({
		...activity,
		noticeThresholdMxn: service.getNoticeThresholdMxn(activity.code),
		identificationThresholdMxn: service.getIdentificationThresholdMxn(
			activity.code,
		),
	}));

	return c.json({
		data: activitiesWithThresholds,
		currentUmaValue: service.getCurrentUmaValue(),
	});
});

/**
 * GET /operations/activities/:code/fields
 * Get field metadata for a specific activity (extension fields, required/optional, CFDI coverage)
 */
operationsRouter.get("/activities/:code/fields", async (c) => {
	const code = c.req.param("code").toUpperCase();

	// Field definitions per activity extension
	const ACTIVITY_FIELDS: Record<
		string,
		Array<{
			name: string;
			label: string;
			type: string;
			required: boolean;
			cfdiExtractable: boolean;
			importance: "CRITICAL" | "IMPORTANT" | "OPTIONAL";
		}>
	> = {
		VEH: [
			{
				name: "vehicleType",
				label: "Vehicle type (land/marine/air)",
				type: "enum",
				required: true,
				cfdiExtractable: false,
				importance: "CRITICAL",
			},
			{
				name: "brand",
				label: "Brand",
				type: "string",
				required: true,
				cfdiExtractable: true,
				importance: "CRITICAL",
			},
			{
				name: "model",
				label: "Model",
				type: "string",
				required: true,
				cfdiExtractable: true,
				importance: "CRITICAL",
			},
			{
				name: "year",
				label: "Year",
				type: "number",
				required: true,
				cfdiExtractable: true,
				importance: "CRITICAL",
			},
			{
				name: "vin",
				label: "VIN (serial number)",
				type: "string",
				required: false,
				cfdiExtractable: true,
				importance: "IMPORTANT",
			},
			{
				name: "plates",
				label: "License plates",
				type: "string",
				required: false,
				cfdiExtractable: true,
				importance: "OPTIONAL",
			},
			{
				name: "armorLevelCode",
				label: "Armor level",
				type: "catalog",
				required: false,
				cfdiExtractable: false,
				importance: "OPTIONAL",
			},
			{
				name: "engineNumber",
				label: "Engine number",
				type: "string",
				required: false,
				cfdiExtractable: true,
				importance: "OPTIONAL",
			},
		],
		INM: [
			{
				name: "propertyTypeCode",
				label: "Property type",
				type: "catalog",
				required: true,
				cfdiExtractable: false,
				importance: "CRITICAL",
			},
			{
				name: "street",
				label: "Street",
				type: "string",
				required: false,
				cfdiExtractable: false,
				importance: "IMPORTANT",
			},
			{
				name: "postalCode",
				label: "Postal code",
				type: "string",
				required: false,
				cfdiExtractable: true,
				importance: "IMPORTANT",
			},
			{
				name: "municipality",
				label: "Municipality",
				type: "string",
				required: false,
				cfdiExtractable: false,
				importance: "IMPORTANT",
			},
			{
				name: "stateCode",
				label: "State",
				type: "catalog",
				required: false,
				cfdiExtractable: false,
				importance: "IMPORTANT",
			},
			{
				name: "registryFolio",
				label: "Registry folio",
				type: "string",
				required: false,
				cfdiExtractable: true,
				importance: "IMPORTANT",
			},
			{
				name: "landAreaM2",
				label: "Land area (m²)",
				type: "number",
				required: false,
				cfdiExtractable: true,
				importance: "OPTIONAL",
			},
		],
		MJR: [
			{
				name: "itemTypeCode",
				label: "Item type",
				type: "catalog",
				required: true,
				cfdiExtractable: false,
				importance: "CRITICAL",
			},
			{
				name: "metalType",
				label: "Metal type",
				type: "string",
				required: false,
				cfdiExtractable: true,
				importance: "IMPORTANT",
			},
			{
				name: "weightGrams",
				label: "Weight (grams)",
				type: "number",
				required: false,
				cfdiExtractable: true,
				importance: "IMPORTANT",
			},
			{
				name: "purity",
				label: "Purity (karats)",
				type: "string",
				required: false,
				cfdiExtractable: true,
				importance: "OPTIONAL",
			},
		],
		AVI: [
			{
				name: "assetTypeCode",
				label: "Virtual asset type",
				type: "catalog",
				required: true,
				cfdiExtractable: false,
				importance: "CRITICAL",
			},
			{
				name: "walletAddressOrigin",
				label: "Origin wallet",
				type: "string",
				required: false,
				cfdiExtractable: true,
				importance: "IMPORTANT",
			},
			{
				name: "walletAddressDestination",
				label: "Destination wallet",
				type: "string",
				required: false,
				cfdiExtractable: true,
				importance: "IMPORTANT",
			},
			{
				name: "blockchainTxHash",
				label: "Operation hash",
				type: "string",
				required: false,
				cfdiExtractable: true,
				importance: "OPTIONAL",
			},
		],
	};

	const fields = ACTIVITY_FIELDS[code];
	if (!fields) {
		// Return empty fields for activities without specific metadata yet
		return c.json({
			activityCode: code,
			fields: [],
			message: "Field metadata not yet defined for this activity",
		});
	}

	return c.json({
		activityCode: code,
		fields,
	});
});

/**
 * GET /operations/thresholds
 * Get UMA thresholds for all activities
 */
operationsRouter.get("/thresholds", async (c) => {
	const service = getService(c);
	const thresholds = service.getAllThresholds();

	return c.json({
		currentUmaValue: service.getCurrentUmaValue(),
		thresholds,
	});
});

/**
 * GET /operations/:id
 * Get a single operation by ID
 */
operationsRouter.get("/:id", async (c) => {
	const organizationId = getOrganizationId(c);
	const params = parseWithZod(OperationIdParamSchema, c.req.param());

	const service = getService(c);
	const record = await service
		.getById(organizationId, params.id)
		.catch(handleServiceError);

	return c.json(record);
});

/**
 * POST /operations
 * Create a new operation
 */
operationsRouter.post("/", async (c) => {
	const organizationId = getOrganizationId(c);
	const body = await c.req.json();
	const payload = parseWithZod(OperationCreateSchema, body);

	const service = getService(c);
	const created = await service
		.create(organizationId, payload)
		.catch(handleServiceError);

	// Queue alert detection job for new operation
	const alertQueue = createAlertQueueService(c.env.ALERT_DETECTION_QUEUE);
	await alertQueue.queueOperationCreated(created.clientId, created.id);

	// Report operation usage to auth-svc for metered billing
	const usageRightsClient = createUsageRightsClient(c.env);
	usageRightsClient.meter(organizationId, "operations", 1).catch((err) => {
		Sentry.captureException(err, {
			tags: { context: "operation-usage-reporting-failed" },
			extra: { organizationId },
		});
	});

	// Threshold-crossing KYC trigger (non-blocking, Art. 17 LFPIORPI)
	// If this operation pushes a client above the identification or notice threshold,
	// auto-create a new KYC session if self-service mode is "automatic".
	c.executionCtx.waitUntil(
		(async () => {
			try {
				const prisma = getPrismaClient(c.env.DB);
				const orgSettingsRepo = new OrganizationSettingsRepository(prisma);
				const umaRepo = new UmaValueRepository(prisma);

				const [orgSettings, umaValue] = await Promise.all([
					orgSettingsRepo.findByOrganizationId(organizationId),
					umaRepo.getActive(),
				]);

				if (!orgSettings || !umaValue) return;

				const activityCode = orgSettings.activityKey as ActivityCode;
				const idThresholdUma = getIdentificationThresholdUma(activityCode);
				const noticeThresholdUma = getNoticeThresholdUma(activityCode);

				// Skip threshold check for ALWAYS activities
				if (idThresholdUma === "ALWAYS") return;

				const dailyValue = parseFloat(umaValue.dailyValue);
				const idThresholdMxn = (idThresholdUma as number) * dailyValue;
				const noticeThresholdMxn =
					noticeThresholdUma === "ALWAYS"
						? 0
						: (noticeThresholdUma as number) * dailyValue;

				const opAmount =
					typeof created.amount === "number"
						? created.amount
						: parseFloat(String(created.amount ?? 0));

				// Check single operation threshold
				const singleOpTriggered = opAmount >= idThresholdMxn;

				// Check 6-month cumulative threshold
				let cumulativeTriggered = false;
				if (noticeThresholdMxn > 0) {
					const sixMonthsAgo = new Date();
					sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
					const cumulativeResult = await prisma.operation.aggregate({
						where: {
							clientId: created.clientId,
							deletedAt: null,
							operationDate: { gte: sixMonthsAgo },
						},
						_sum: { amount: true },
					});
					const cumulativeOp = cumulativeResult._sum.amount;
					const cumulativeMxn =
						cumulativeOp === null
							? 0
							: typeof cumulativeOp === "number"
								? cumulativeOp
								: parseFloat(cumulativeOp.toString());
					cumulativeTriggered = cumulativeMxn >= noticeThresholdMxn;
				}

				if (!singleOpTriggered && !cumulativeTriggered) return;

				// Check if client already has an ABOVE_THRESHOLD or ALWAYS KYC session
				const existingSession = await prisma.kycSession.findFirst({
					where: {
						clientId: created.clientId,
						organizationId,
						identificationTier: { in: ["ABOVE_THRESHOLD", "ALWAYS"] },
						status: { notIn: ["REVOKED", "EXPIRED", "REJECTED"] },
					},
					orderBy: { createdAt: "desc" },
				});

				if (existingSession) return; // Already has appropriate KYC session

				// Auto-create ABOVE_THRESHOLD session if mode is automatic
				if (orgSettings.selfServiceMode !== "automatic") return;

				const kycService = new KycSessionService(prisma);
				const session = await kycService.create(
					organizationId,
					{
						clientId: created.clientId,
						createdBy: "system",
					},
					prisma,
				);

				// Send email if client has email
				const client = await prisma.client.findUnique({
					where: { id: created.clientId },
					select: {
						email: true,
						firstName: true,
						lastName: true,
						businessName: true,
					},
				});

				if (client?.email) {
					const clientName = client.firstName
						? `${client.firstName} ${client.lastName ?? ""}`.trim()
						: (client.businessName ?? "Cliente");

					await sendKYCInviteEmail(c.env, client.email, session, {
						clientName,
					});
					await kycService.recordEmailSent(session.id);
				}

				console.log(
					`[Operations] Threshold crossed for client ${created.clientId}, auto-created KYC session ${session.id}`,
				);
			} catch (err) {
				console.error("[Operations] Threshold KYC trigger failed:", err);
			}
		})(),
	);

	return c.json(created, 201);
});

/**
 * POST /operations/bulk-import
 * Bulk import operations from legacy systems.
 *
 * Accepts a JSON array of operations (max 100 per batch).
 * Uses soft validation: missing VA-specific extensions produce warnings
 * but don't block creation. All operations are created with dataSource="IMPORT".
 *
 * Returns per-operation results with success/warning/error status.
 */
operationsRouter.post("/bulk-import", async (c) => {
	const organizationId = getOrganizationId(c);
	const body = await c.req.json();
	const input = parseWithZod(BulkOperationImportSchema, body);

	const service = getService(c);
	const alertQueue = createAlertQueueService(c.env.ALERT_DETECTION_QUEUE);
	const usageRightsClient = createUsageRightsClient(c.env);

	const results: Array<{
		index: number;
		status: "success" | "warning" | "error";
		operationId?: string;
		warnings?: string[];
		error?: string;
	}> = [];

	let successCount = 0;
	let warningCount = 0;
	let errorCount = 0;

	for (let i = 0; i < input.operations.length; i++) {
		const op = input.operations[i] as BulkOperationItemInput;

		try {
			const warnings: string[] = [];

			// Check payment amount mismatch (soft validation - warn instead of reject)
			const totalPaymentAmount = op.payments.reduce(
				(sum, pm) => sum + parseFloat(pm.amount),
				0,
			);
			const operationAmount = parseFloat(op.amount);
			if (Math.abs(totalPaymentAmount - operationAmount) > 0.01) {
				warnings.push(
					`Payment amounts sum (${totalPaymentAmount}) does not match operation amount (${operationAmount})`,
				);
			}

			// Force dataSource to IMPORT
			const payload = {
				...op,
				dataSource: "IMPORT" as const,
			};

			const created = await service
				.create(organizationId, payload)
				.catch(handleServiceError);

			// Queue alert detection
			await alertQueue
				.queueOperationCreated(created.clientId, created.id)
				.catch((err) =>
					Sentry.captureException(err, {
						tags: { context: "bulk-import-queue-alert-failed" },
						extra: { operationIndex: i, operationId: created.id },
					}),
				);

			if (warnings.length > 0) {
				warningCount++;
				results.push({
					index: i,
					status: "warning",
					operationId: created.id,
					warnings,
				});
			} else {
				successCount++;
				results.push({
					index: i,
					status: "success",
					operationId: created.id,
				});
			}
		} catch (error) {
			errorCount++;
			const message =
				error instanceof APIError
					? error.message
					: error instanceof Error
						? error.message
						: "Unknown error";
			results.push({
				index: i,
				status: "error",
				error: message,
			});

			if (input.stopOnError) {
				break;
			}
		}
	}

	// Report usage for all successfully created operations
	if (successCount + warningCount > 0) {
		usageRightsClient
			.meter(organizationId, "operations", successCount + warningCount)
			.catch((err) => {
				Sentry.captureException(err, {
					tags: { context: "bulk-import-usage-reporting-failed" },
					extra: { organizationId, count: successCount + warningCount },
				});
			});
	}

	const httpStatus =
		errorCount === 0 ? 201 : errorCount === input.operations.length ? 400 : 207;

	return c.json(
		{
			success: errorCount === 0,
			summary: {
				total: input.operations.length,
				processed: results.length,
				success: successCount,
				warnings: warningCount,
				errors: errorCount,
			},
			results,
		},
		httpStatus,
	);
});

/**
 * PUT /operations/:id
 * Update an existing operation
 */
operationsRouter.put("/:id", async (c) => {
	const organizationId = getOrganizationId(c);
	const params = parseWithZod(OperationIdParamSchema, c.req.param());
	const body = await c.req.json();
	const payload = parseWithZod(OperationUpdateSchema, body);

	const service = getService(c);
	const updated = await service
		.update(organizationId, params.id, payload)
		.catch(handleServiceError);

	return c.json(updated);
});

/**
 * DELETE /operations/:id
 * Soft delete an operation
 */
operationsRouter.delete("/:id", async (c) => {
	const organizationId = getOrganizationId(c);
	const params = parseWithZod(OperationIdParamSchema, c.req.param());

	const service = getService(c);
	await service.delete(organizationId, params.id).catch(handleServiceError);

	return c.body(null, 204);
});

/**
 * GET /operations/client/:clientId/accumulated
 * Get accumulated amounts for a client within a period
 */
operationsRouter.get("/client/:clientId/accumulated", async (c) => {
	const organizationId = getOrganizationId(c);
	const clientId = c.req.param("clientId");
	const url = new URL(c.req.url);

	const activityCode = url.searchParams.get("activityCode");
	const startDate = url.searchParams.get("startDate");
	const endDate = url.searchParams.get("endDate");

	if (!clientId || !/^[0-9a-f-]{36}$/i.test(clientId)) {
		throw new APIError(400, "Invalid client ID format");
	}

	if (!activityCode) {
		throw new APIError(400, "Activity code is required");
	}

	const service = getService(c);
	const result = await service
		.calculateAccumulatedAmount(
			organizationId,
			clientId,
			activityCode as Parameters<typeof service.calculateAccumulatedAmount>[2],
			startDate
				? new Date(startDate)
				: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Default last 30 days
			endDate ? new Date(endDate) : new Date(),
		)
		.catch(handleServiceError);

	return c.json(result);
});

// ============================================================================
// Internal router (for worker communication - no auth required)
// ============================================================================

export const operationsInternalRouter = new Hono<{
	Bindings: Bindings;
}>();

function getInternalService(c: Context<{ Bindings: Bindings }>) {
	const prisma = getPrismaClient(c.env.DB);
	return new OperationService(prisma);
}

function formatInternalError(error: unknown): {
	message: string;
	details?: unknown;
} {
	if (error instanceof APIError) {
		return { message: error.message, details: error.details };
	}

	if (error instanceof Error) {
		if (error.message.includes("UNIQUE constraint failed")) {
			const match = error.message.match(/UNIQUE constraint failed: \w+\.(\w+)/);
			const field = match ? match[1] : "field";
			return {
				message: `Duplicate value: A record with this ${field} already exists`,
				details: { constraint: "unique", field },
			};
		}

		if (error.message.includes("Foreign key constraint failed")) {
			return {
				message:
					"Referenced record not found (client or invoice may not exist)",
				details: { constraint: "foreign_key" },
			};
		}

		if (error.message.includes("CLIENT_NOT_FOUND")) {
			return {
				message: "Client not found with the provided clientId",
				details: { code: "CLIENT_NOT_FOUND" },
			};
		}

		return { message: error.message };
	}

	return { message: "Unknown error occurred" };
}

/**
 * POST /internal/operations
 * Create an operation (internal, called by worker)
 */
operationsInternalRouter.post("/", async (c) => {
	const organizationId = c.req.header("X-Organization-Id");
	if (!organizationId) {
		return c.json(
			{ error: "Bad Request", message: "Missing X-Organization-Id header" },
			400,
		);
	}

	try {
		const body = await c.req.json();
		const payload = parseWithZod(OperationCreateSchema, body);

		const service = getInternalService(c);
		const created = await service.create(organizationId, payload);

		// Queue alert detection job for new operation
		const alertQueue = createAlertQueueService(c.env.ALERT_DETECTION_QUEUE);
		await alertQueue.queueOperationCreated(created.clientId, created.id);

		return c.json(created, 201);
	} catch (error) {
		if (error instanceof DuplicateOperationError) {
			return c.json(
				{
					error: "Duplicate",
					message: error.message,
					code: "DUPLICATE_OPERATION",
				},
				409,
			);
		}

		Sentry.captureException(error, {
			tags: { context: "internal-operations-post-error" },
		});
		const { message, details } = formatInternalError(error);

		if (error instanceof Error && error.message.includes("CLIENT_NOT_FOUND")) {
			return c.json({ error: "Not Found", message, details }, 404);
		}

		const status = error instanceof APIError ? error.statusCode : 500;
		return c.json({ error: "Error", message, details }, status as 400);
	}
});
