import { Hono } from "hono";
import type { Context } from "hono";
import { ZodError } from "zod";

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
import type { Bindings } from "../index";
import { createAlertQueueService } from "../lib/alert-queue";
import { getPrismaClient } from "../lib/prisma";
import { APIError } from "../middleware/error";
import { type AuthVariables, getOrganizationId } from "../middleware/auth";

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
	const transactionRepository = new TransactionRepository(
		prisma,
		umaRepository,
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
	throw error;
}

transactionsRouter.get("/", async (c) => {
	const url = new URL(c.req.url);
	const queryObject = Object.fromEntries(url.searchParams.entries());
	const filters = parseWithZod(TransactionFilterSchema, queryObject);

	const service = getService(c);
	const result = await service.list(filters).catch(handleServiceError);

	return c.json(result);
});

// IMPORTANT: /stats must be defined BEFORE /:id to avoid "stats" being matched as an id parameter
transactionsRouter.get("/stats", async (c) => {
	const service = getService(c);
	const stats = await service.getStats().catch(handleServiceError);
	return c.json(stats);
});

transactionsRouter.get("/:id", async (c) => {
	const params = parseWithZod(TransactionIdParamSchema, c.req.param());

	const service = getService(c);
	const record = await service.get(params.id).catch(handleServiceError);

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

	return c.json(created, 201);
});

transactionsRouter.put("/:id", async (c) => {
	const params = parseWithZod(TransactionIdParamSchema, c.req.param());
	const body = await c.req.json();
	const payload = parseWithZod(TransactionUpdateSchema, body);

	const service = getService(c);
	const updated = await service
		.update(params.id, payload)
		.catch(handleServiceError);

	return c.json(updated);
});

transactionsRouter.delete("/:id", async (c) => {
	const params = parseWithZod(TransactionIdParamSchema, c.req.param());

	const service = getService(c);
	await service.delete(params.id).catch(handleServiceError);

	return c.body(null, 204);
});
