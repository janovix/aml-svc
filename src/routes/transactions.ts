import { Hono } from "hono";
import type { Context } from "hono";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";

import { CatalogRepository } from "../domain/catalog/repository";
import { CatalogEnrichmentService } from "../domain/catalog/enrichment-service";
import { ClientRepository } from "../domain/client";
import {
	TransactionCreateSchema,
	TransactionFilterSchema,
	TransactionIdParamSchema,
	TransactionRepository,
	TransactionService,
	TransactionUpdateSchema,
} from "../domain/transaction";
import { UmaValueRepository } from "../domain/uma";
import type { Bindings } from "../types";
import { createAlertQueueService } from "../lib/alert-queue";
import { getPrismaClient } from "../lib/prisma";
import { APIError } from "../middleware/error";
import { type AuthVariables, getOrganizationId } from "../middleware/auth";
import { createSubscriptionClient } from "../lib/subscription-client";

export const transactionsRouter = new Hono<{
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
	const umaRepository = new UmaValueRepository(prisma);
	const catalogRepository = new CatalogRepository(prisma);
	const catalogEnrichmentService = new CatalogEnrichmentService(
		catalogRepository,
	);
	const transactionRepository = new TransactionRepository(
		prisma,
		umaRepository,
		catalogEnrichmentService,
	);
	const clientRepository = new ClientRepository(prisma);
	return new TransactionService(
		transactionRepository,
		clientRepository,
		umaRepository,
	);
}

function handleServiceError(error: unknown): never {
	if (error instanceof Error) {
		if (error.message === "TRANSACTION_NOT_FOUND") {
			throw new APIError(404, "Transaction not found");
		}
		if (error.message === "CLIENT_NOT_FOUND") {
			throw new APIError(404, "Client not found");
		}
	}

	// Handle Prisma foreign key constraint violations
	if (error instanceof Prisma.PrismaClientKnownRequestError) {
		if (error.code === "P2003") {
			// Foreign key constraint failed
			const field = error.meta?.field_name as string | undefined;
			if (field === "clientId" || field?.includes("clientId")) {
				throw new APIError(404, "Client not found", {
					field: "clientId",
					message:
						"The specified client does not exist or belongs to a different organization",
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

transactionsRouter.get("/", async (c) => {
	const organizationId = getOrganizationId(c);
	const url = new URL(c.req.url);
	const queryObject = Object.fromEntries(url.searchParams.entries());
	const filters = parseWithZod(TransactionFilterSchema, queryObject);

	const service = getService(c);
	const result = await service
		.list(organizationId, filters)
		.catch(handleServiceError);

	return c.json(result);
});

// IMPORTANT: /stats must be defined BEFORE /:id to avoid "stats" being matched as an id parameter
transactionsRouter.get("/stats", async (c) => {
	const organizationId = getOrganizationId(c);
	const service = getService(c);
	const stats = await service
		.getStats(organizationId)
		.catch(handleServiceError);
	return c.json(stats);
});

transactionsRouter.get("/:id", async (c) => {
	const organizationId = getOrganizationId(c);
	const params = parseWithZod(TransactionIdParamSchema, c.req.param());

	const service = getService(c);
	const record = await service
		.get(organizationId, params.id)
		.catch(handleServiceError);

	return c.json(record);
});

transactionsRouter.post("/", async (c) => {
	const organizationId = getOrganizationId(c);
	const body = await c.req.json();
	const payload = parseWithZod(TransactionCreateSchema, body);

	const service = getService(c);
	const created = await service
		.create(payload, organizationId)
		.catch(handleServiceError);

	// Queue alert detection job
	const alertQueue = createAlertQueueService(c.env.ALERT_DETECTION_QUEUE);
	await alertQueue.queueTransactionCreated(created.clientId, created.id);

	// Report transaction usage to auth-svc for metered billing
	// Fire-and-forget - don't fail transaction creation if billing fails
	const subscriptionClient = createSubscriptionClient(c.env);
	subscriptionClient
		.reportUsage(organizationId, "transactions", 1)
		.catch((err) => {
			console.error("Failed to report transaction usage:", err);
		});

	return c.json(created, 201);
});

transactionsRouter.put("/:id", async (c) => {
	const organizationId = getOrganizationId(c);
	const params = parseWithZod(TransactionIdParamSchema, c.req.param());
	const body = await c.req.json();
	const payload = parseWithZod(TransactionUpdateSchema, body);

	const service = getService(c);
	const updated = await service
		.update(organizationId, params.id, payload)
		.catch(handleServiceError);

	return c.json(updated);
});

transactionsRouter.delete("/:id", async (c) => {
	const organizationId = getOrganizationId(c);
	const params = parseWithZod(TransactionIdParamSchema, c.req.param());

	const service = getService(c);
	await service.delete(organizationId, params.id).catch(handleServiceError);

	return c.body(null, 204);
});

// ============================================================================
// Internal router (for worker communication - no auth required)
// ============================================================================

/**
 * Internal transactions router (no auth required)
 * These endpoints are called by the aml-import-worker via service binding
 */
export const transactionsInternalRouter = new Hono<{
	Bindings: Bindings;
}>();

function getInternalService(c: Context<{ Bindings: Bindings }>) {
	const prisma = getPrismaClient(c.env.DB);
	const umaRepository = new UmaValueRepository(prisma);
	const catalogRepository = new CatalogRepository(prisma);
	const catalogEnrichmentService = new CatalogEnrichmentService(
		catalogRepository,
	);
	const transactionRepository = new TransactionRepository(
		prisma,
		umaRepository,
		catalogEnrichmentService,
	);
	const clientRepository = new ClientRepository(prisma);
	return new TransactionService(
		transactionRepository,
		clientRepository,
		umaRepository,
	);
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
		// Check for Prisma unique constraint violation
		if (error.message.includes("UNIQUE constraint failed")) {
			const match = error.message.match(/UNIQUE constraint failed: \w+\.(\w+)/);
			const field = match ? match[1] : "field";
			return {
				message: `Duplicate value: A record with this ${field} already exists`,
				details: { constraint: "unique", field },
			};
		}

		// Check for foreign key constraint errors
		if (error.message.includes("Foreign key constraint failed")) {
			return {
				message: "Referenced record not found (client may not exist)",
				details: { constraint: "foreign_key" },
			};
		}

		// Check for client not found error
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
 * POST /internal/transactions
 * Create a transaction (internal, called by worker)
 */
transactionsInternalRouter.post("/", async (c) => {
	const organizationId = c.req.header("X-Organization-Id");
	if (!organizationId) {
		return c.json(
			{ error: "Bad Request", message: "Missing X-Organization-Id header" },
			400,
		);
	}

	try {
		const body = await c.req.json();
		const payload = parseWithZod(TransactionCreateSchema, body);

		const service = getInternalService(c);
		const created = await service.create(payload, organizationId);

		// Queue alert detection job for new transaction
		const alertQueue = createAlertQueueService(c.env.ALERT_DETECTION_QUEUE);
		await alertQueue.queueTransactionCreated(created.clientId, created.id);

		return c.json(created, 201);
	} catch (error) {
		console.error("[InternalTransactions] POST error:", error);
		const { message, details } = formatInternalError(error);

		// Return 404 for client not found
		if (error instanceof Error && error.message.includes("CLIENT_NOT_FOUND")) {
			return c.json({ error: "Not Found", message, details }, 404);
		}

		const status = error instanceof APIError ? error.statusCode : 500;
		return c.json({ error: "Error", message, details }, status as 400);
	}
});
