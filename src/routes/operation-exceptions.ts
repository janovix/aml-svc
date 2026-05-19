import { Hono } from "hono";
import type { Context } from "hono";
import { ZodError } from "zod";

import {
	OperationExceptionService,
	ExceptionNotAllowedError,
	ExceptionNotFoundError,
	OperationExceptionUpsertSchema,
	OperationExceptionEvidenceCreateSchema,
} from "../domain/operation-exception";
import type { Bindings } from "../types";
import { getPrismaClient } from "../lib/prisma";
import { APIError } from "../middleware/error";
import {
	type AuthVariables,
	getTenantContext,
	getAuthUser,
} from "../middleware/auth";

export const operationExceptionsRouter = new Hono<{
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

function getExceptionService(
	c: Context<{ Bindings: Bindings; Variables: AuthVariables }>,
) {
	const prisma = getPrismaClient(c.env.DB);
	return new OperationExceptionService(prisma);
}

function handleExceptionError(error: unknown): never {
	if (error instanceof ExceptionNotAllowedError) {
		throw new APIError(400, error.message);
	}
	if (error instanceof ExceptionNotFoundError) {
		throw new APIError(404, error.message);
	}
	throw error;
}

operationExceptionsRouter.get("/:id/exception", async (c) => {
	const operationId = c.req.param("id");
	const service = getExceptionService(c);
	const exception = await service
		.getByOperationId(getTenantContext(c), operationId)
		.catch(handleExceptionError);
	if (!exception) {
		return c.json(null, 200);
	}
	return c.json(exception);
});

operationExceptionsRouter.put("/:id/exception", async (c) => {
	const operationId = c.req.param("id");
	const body = await c.req.json();
	const input = parseWithZod(OperationExceptionUpsertSchema, body);
	const service = getExceptionService(c);
	const userId = getAuthUser(c).id;
	const result = await service
		.upsert(getTenantContext(c), operationId, input, userId)
		.catch(handleExceptionError);
	return c.json(result);
});

operationExceptionsRouter.delete("/:id/exception", async (c) => {
	const operationId = c.req.param("id");
	const service = getExceptionService(c);
	const deleted = await service
		.deleteException(getTenantContext(c), operationId)
		.catch(handleExceptionError);
	if (!deleted) {
		throw new APIError(404, "No exception found for this operation");
	}
	return c.json({ success: true });
});

operationExceptionsRouter.post("/:id/exception/evidence", async (c) => {
	const operationId = c.req.param("id");
	const body = await c.req.json();
	const input = parseWithZod(OperationExceptionEvidenceCreateSchema, body);
	const service = getExceptionService(c);
	const userId = getAuthUser(c).id;
	const evidence = await service
		.addEvidence(getTenantContext(c), operationId, input, userId)
		.catch(handleExceptionError);
	return c.json(evidence, 201);
});

operationExceptionsRouter.delete(
	"/:id/exception/evidence/:evidenceId",
	async (c) => {
		const operationId = c.req.param("id");
		const evidenceId = c.req.param("evidenceId");
		const service = getExceptionService(c);
		const removed = await service
			.removeEvidence(getTenantContext(c), operationId, evidenceId)
			.catch(handleExceptionError);
		if (!removed) {
			throw new APIError(404, "Evidence not found");
		}
		return c.json({ success: true });
	},
);
