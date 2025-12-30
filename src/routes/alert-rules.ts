import { Hono } from "hono";
import type { Context } from "hono";
import { ZodError } from "zod";

import {
	AlertRuleFilterSchema,
	AlertRuleIdParamSchema,
	AlertRulePatchSchema,
	AlertRuleService,
	AlertRuleRepository,
	AlertRuleCreateSchema,
	AlertRuleUpdateSchema,
} from "../domain/alert";
import type { Bindings } from "../index";
import { getPrismaClient } from "../lib/prisma";
import { APIError } from "../middleware/error";
import { type AuthVariables, getOrganizationId } from "../middleware/auth";

export const alertRulesRouter = new Hono<{
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
	const repository = new AlertRuleRepository(prisma);
	return new AlertRuleService(repository);
}

function handleServiceError(error: unknown): never {
	if (error instanceof Error) {
		if (error.message === "ALERT_RULE_NOT_FOUND") {
			throw new APIError(404, "Alert rule not found");
		}
	}
	throw error;
}

alertRulesRouter.get("/", async (c) => {
	const url = new URL(c.req.url);
	const queryObject = Object.fromEntries(url.searchParams.entries());
	const filters = parseWithZod(AlertRuleFilterSchema, queryObject);

	const service = getService(c);
	const result = await service.list(filters).catch(handleServiceError);

	return c.json(result);
});

alertRulesRouter.get("/:id", async (c) => {
	const params = parseWithZod(AlertRuleIdParamSchema, c.req.param());

	const service = getService(c);
	const rule = await service.get(params.id).catch(handleServiceError);

	return c.json(rule);
});

alertRulesRouter.post("/", async (c) => {
	const organizationId = getOrganizationId(c);
	const body = await c.req.json();
	const payload = parseWithZod(AlertRuleCreateSchema, body);

	const service = getService(c);
	const created = await service
		.create(payload, organizationId)
		.catch(handleServiceError);

	return c.json(created, 201);
});

alertRulesRouter.put("/:id", async (c) => {
	const params = parseWithZod(AlertRuleIdParamSchema, c.req.param());
	const body = await c.req.json();
	const payload = parseWithZod(AlertRuleUpdateSchema, body);

	const service = getService(c);
	const updated = await service
		.update(params.id, payload)
		.catch(handleServiceError);

	return c.json(updated);
});

alertRulesRouter.patch("/:id", async (c) => {
	const params = parseWithZod(AlertRuleIdParamSchema, c.req.param());
	const body = await c.req.json();
	const payload = parseWithZod(AlertRulePatchSchema, body);

	if (Object.keys(payload).length === 0) {
		throw new APIError(400, "Payload is empty");
	}

	const service = getService(c);
	const updated = await service
		.patch(params.id, payload)
		.catch(handleServiceError);

	return c.json(updated);
});

alertRulesRouter.delete("/:id", async (c) => {
	const params = parseWithZod(AlertRuleIdParamSchema, c.req.param());

	const service = getService(c);
	await service.delete(params.id).catch(handleServiceError);

	return c.body(null, 204);
});
