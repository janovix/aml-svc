import { Hono } from "hono";
import type { Context } from "hono";
import { ZodError } from "zod";

import {
	AlertFilterSchema,
	AlertIdParamSchema,
	AlertPatchSchema,
	AlertService,
	AlertRepository,
	AlertCreateSchema,
	AlertUpdateSchema,
} from "../domain/alert";
import type { Bindings } from "../index";
import { getPrismaClient } from "../lib/prisma";
import { APIError } from "../middleware/error";

export const alertsRouter = new Hono<{ Bindings: Bindings }>();

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

function getService(c: Context<{ Bindings: Bindings }>) {
	const prisma = getPrismaClient(c.env.DB);
	const repository = new AlertRepository(prisma);
	return new AlertService(repository);
}

function handleServiceError(error: unknown): never {
	if (error instanceof Error) {
		if (error.message === "ALERT_NOT_FOUND") {
			throw new APIError(404, "Alert not found");
		}
	}
	throw error;
}

alertsRouter.get("/", async (c) => {
	const url = new URL(c.req.url);
	const queryObject = Object.fromEntries(url.searchParams.entries());
	const filters = parseWithZod(AlertFilterSchema, queryObject);

	const service = getService(c);
	const result = await service.list(filters).catch(handleServiceError);

	return c.json(result);
});

alertsRouter.get("/:id", async (c) => {
	const params = parseWithZod(AlertIdParamSchema, c.req.param());

	const service = getService(c);
	const alert = await service.get(params.id).catch(handleServiceError);

	return c.json(alert);
});

alertsRouter.post("/", async (c) => {
	const body = await c.req.json();
	const payload = parseWithZod(AlertCreateSchema, body);

	const service = getService(c);
	// The service handles idempotency via idempotencyKey
	const created = await service.create(payload).catch(handleServiceError);

	return c.json(created, 201);
});

alertsRouter.put("/:id", async (c) => {
	const params = parseWithZod(AlertIdParamSchema, c.req.param());
	const body = await c.req.json();
	const payload = parseWithZod(AlertUpdateSchema, body);

	const service = getService(c);
	const updated = await service
		.update(params.id, payload)
		.catch(handleServiceError);

	return c.json(updated);
});

alertsRouter.patch("/:id", async (c) => {
	const params = parseWithZod(AlertIdParamSchema, c.req.param());
	const body = await c.req.json();
	const payload = parseWithZod(AlertPatchSchema, body);

	if (Object.keys(payload).length === 0) {
		throw new APIError(400, "Payload is empty");
	}

	const service = getService(c);
	const updated = await service
		.patch(params.id, payload)
		.catch(handleServiceError);

	return c.json(updated);
});

alertsRouter.delete("/:id", async (c) => {
	const params = parseWithZod(AlertIdParamSchema, c.req.param());

	const service = getService(c);
	await service.delete(params.id).catch(handleServiceError);

	return c.body(null, 204);
});
