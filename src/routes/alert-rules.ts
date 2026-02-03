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
	AlertRuleConfigRepository,
	AlertRuleConfigService,
	AlertRuleConfigCreateSchema,
	AlertRuleConfigUpdateSchema,
	AlertRuleConfigKeyParamSchema,
} from "../domain/alert";
import type { Bindings } from "../types";
import { getPrismaClient } from "../lib/prisma";
import { APIError } from "../middleware/error";
import type { AuthVariables } from "../middleware/auth";

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

function getConfigService(
	c: Context<{ Bindings: Bindings; Variables: AuthVariables }>,
) {
	const prisma = getPrismaClient(c.env.DB);
	const repository = new AlertRuleConfigRepository(prisma);
	return new AlertRuleConfigService(repository);
}

function handleServiceError(error: unknown): never {
	if (error instanceof Error) {
		if (error.message === "ALERT_RULE_NOT_FOUND") {
			throw new APIError(404, "Alert rule not found");
		}
		if (error.message === "ALERT_RULE_CONFIG_NOT_FOUND") {
			throw new APIError(404, "Alert rule config not found");
		}
		if (error.message === "ALERT_RULE_CONFIG_IS_HARDCODED") {
			throw new APIError(403, "Cannot modify hardcoded config value");
		}
	}
	throw error;
}

// Alert Rules - Global (no organizationId required)
alertRulesRouter.get("/", async (c) => {
	const url = new URL(c.req.url);
	const queryObject = Object.fromEntries(url.searchParams.entries());
	const filters = parseWithZod(AlertRuleFilterSchema, queryObject);

	const service = getService(c);
	const result = await service.list(filters).catch(handleServiceError);

	return c.json(result);
});

// Convenience endpoint: Get active alert rules for seekers (non-manual-only)
alertRulesRouter.get("/active", async (c) => {
	const service = getService(c);
	const rules = await service.listActiveForSeeker().catch(handleServiceError);
	return c.json(rules);
});

alertRulesRouter.get("/:id", async (c) => {
	const params = parseWithZod(AlertRuleIdParamSchema, c.req.param());

	const service = getService(c);
	const rule = await service.get(params.id).catch(handleServiceError);

	return c.json(rule);
});

alertRulesRouter.post("/", async (c) => {
	const body = await c.req.json();
	const payload = parseWithZod(AlertRuleCreateSchema, body);

	const service = getService(c);
	const created = await service.create(payload).catch(handleServiceError);

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

// Alert Rule Config Routes
alertRulesRouter.get("/:id/config", async (c) => {
	const params = parseWithZod(AlertRuleIdParamSchema, c.req.param());

	const configService = getConfigService(c);
	const configs = await configService
		.listByAlertRuleId(params.id)
		.catch(handleServiceError);

	return c.json(configs);
});

alertRulesRouter.get("/:id/config/:key", async (c) => {
	const params = parseWithZod(AlertRuleConfigKeyParamSchema, c.req.param());

	const configService = getConfigService(c);
	const config = await configService
		.getByKey(params.id, params.key)
		.catch(handleServiceError);

	return c.json(config);
});

alertRulesRouter.post("/:id/config", async (c) => {
	const params = parseWithZod(AlertRuleIdParamSchema, c.req.param());
	const body = await c.req.json();
	const payload = parseWithZod(AlertRuleConfigCreateSchema, body);

	const configService = getConfigService(c);
	const created = await configService
		.create(params.id, payload)
		.catch(handleServiceError);

	return c.json(created, 201);
});

alertRulesRouter.patch("/:id/config/:key", async (c) => {
	const params = parseWithZod(AlertRuleConfigKeyParamSchema, c.req.param());
	const body = await c.req.json();
	const payload = parseWithZod(AlertRuleConfigUpdateSchema, body);

	const configService = getConfigService(c);
	const updated = await configService
		.update(params.id, params.key, payload)
		.catch(handleServiceError);

	return c.json(updated);
});

alertRulesRouter.delete("/:id/config/:key", async (c) => {
	const params = parseWithZod(AlertRuleConfigKeyParamSchema, c.req.param());

	const configService = getConfigService(c);
	await configService.delete(params.id, params.key).catch(handleServiceError);

	return c.body(null, 204);
});
