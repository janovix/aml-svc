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
	AlertCancelSchema,
} from "../domain/alert";
import type { Bindings } from "../index";
import { getPrismaClient } from "../lib/prisma";
import { APIError } from "../middleware/error";
import { type AuthVariables, getOrganizationId } from "../middleware/auth";

export const alertsRouter = new Hono<{
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
	const repository = new AlertRepository(prisma);
	return new AlertService(repository);
}

function handleServiceError(error: unknown): never {
	if (error instanceof Error) {
		if (error.message === "ALERT_NOT_FOUND") {
			throw new APIError(404, "Alert not found");
		}
		if (error.message === "ALERT_RULE_NOT_FOUND") {
			throw new APIError(404, "Alert rule not found");
		}
		if (error.message === "ALERT_RULE_IS_MANUAL_ONLY") {
			throw new APIError(
				400,
				"This alert rule can only be triggered manually. Set isManual to true.",
			);
		}
	}
	throw error;
}

alertsRouter.get("/", async (c) => {
	const organizationId = getOrganizationId(c);
	const url = new URL(c.req.url);
	const queryObject = Object.fromEntries(url.searchParams.entries());
	const filters = parseWithZod(AlertFilterSchema, queryObject);

	const service = getService(c);
	const result = await service
		.list(organizationId, filters)
		.catch(handleServiceError);

	return c.json(result);
});

alertsRouter.post("/:id/cancel", async (c) => {
	const organizationId = getOrganizationId(c);
	const user = c.get("user");
	const params = parseWithZod(AlertIdParamSchema, c.req.param());
	const body = await c.req.json();
	const { reason } = parseWithZod(AlertCancelSchema, body);

	const service = getService(c);
	const updated = await service
		.patch(organizationId, params.id, {
			status: "CANCELLED",
			cancelledBy: user.id,
			cancellationReason: reason,
		})
		.catch(handleServiceError);

	return c.json(updated);
});

alertsRouter.get("/:id", async (c) => {
	const organizationId = getOrganizationId(c);
	const params = parseWithZod(AlertIdParamSchema, c.req.param());

	const service = getService(c);
	const alert = await service
		.get(organizationId, params.id)
		.catch(handleServiceError);

	return c.json(alert);
});

alertsRouter.post("/", async (c) => {
	const organizationId = getOrganizationId(c);
	const body = await c.req.json();
	const payload = parseWithZod(AlertCreateSchema, body);

	const service = getService(c);
	// The service handles idempotency via idempotencyKey
	const created = await service
		.create(payload, organizationId)
		.catch(handleServiceError);

	return c.json(created, 201);
});

alertsRouter.put("/:id", async (c) => {
	const organizationId = getOrganizationId(c);
	const params = parseWithZod(AlertIdParamSchema, c.req.param());
	const body = await c.req.json();
	const payload = parseWithZod(AlertUpdateSchema, body);

	const service = getService(c);
	const updated = await service
		.update(organizationId, params.id, payload)
		.catch(handleServiceError);

	return c.json(updated);
});

alertsRouter.patch("/:id", async (c) => {
	const organizationId = getOrganizationId(c);
	const params = parseWithZod(AlertIdParamSchema, c.req.param());
	const body = await c.req.json();
	const payload = parseWithZod(AlertPatchSchema, body);

	if (Object.keys(payload).length === 0) {
		throw new APIError(400, "Payload is empty");
	}

	const service = getService(c);
	const updated = await service
		.patch(organizationId, params.id, payload)
		.catch(handleServiceError);

	return c.json(updated);
});

alertsRouter.delete("/:id", async (c) => {
	const organizationId = getOrganizationId(c);
	const params = parseWithZod(AlertIdParamSchema, c.req.param());

	const service = getService(c);
	await service.delete(organizationId, params.id).catch(handleServiceError);

	return c.body(null, 204);
});
