import { Hono } from "hono";
import type { Context } from "hono";
import { ZodError } from "zod";

import {
	UmaValueFilterSchema,
	UmaValueIdParamSchema,
	UmaValuePatchSchema,
	UmaValueService,
	UmaValueRepository,
	UmaValueCreateSchema,
	UmaValueUpdateSchema,
	UmaValueYearParamSchema,
} from "../domain/uma";
import type { Bindings } from "../index";
import { getPrismaClient } from "../lib/prisma";
import { APIError } from "../middleware/error";

export const umaValuesRouter = new Hono<{ Bindings: Bindings }>();

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
	const repository = new UmaValueRepository(prisma);
	return new UmaValueService(repository);
}

function handleServiceError(error: unknown): never {
	if (error instanceof Error) {
		if (error.message === "UMA_VALUE_NOT_FOUND") {
			throw new APIError(404, "UMA value not found");
		}
	}
	throw error;
}

umaValuesRouter.get("/", async (c) => {
	const url = new URL(c.req.url);
	const queryObject = Object.fromEntries(url.searchParams.entries());
	const filters = parseWithZod(UmaValueFilterSchema, queryObject);

	const service = getService(c);
	const result = await service.list(filters).catch(handleServiceError);

	return c.json(result);
});

umaValuesRouter.get("/active", async (c) => {
	const service = getService(c);
	const active = await service.getActive().catch(handleServiceError);

	if (!active) {
		throw new APIError(404, "No active UMA value found");
	}

	return c.json(active);
});

umaValuesRouter.get("/year/:year", async (c) => {
	const params = parseWithZod(UmaValueYearParamSchema, c.req.param());

	const service = getService(c);
	const umaValue = await service
		.getByYear(params.year)
		.catch(handleServiceError);

	if (!umaValue) {
		throw new APIError(404, `UMA value for year ${params.year} not found`);
	}

	return c.json(umaValue);
});

umaValuesRouter.get("/:id", async (c) => {
	const params = parseWithZod(UmaValueIdParamSchema, c.req.param());

	const service = getService(c);
	const umaValue = await service.get(params.id).catch(handleServiceError);

	return c.json(umaValue);
});

umaValuesRouter.post("/", async (c) => {
	const body = await c.req.json();
	const payload = parseWithZod(UmaValueCreateSchema, body);

	const service = getService(c);
	const created = await service.create(payload).catch(handleServiceError);

	return c.json(created, 201);
});

umaValuesRouter.put("/:id", async (c) => {
	const params = parseWithZod(UmaValueIdParamSchema, c.req.param());
	const body = await c.req.json();
	const payload = parseWithZod(UmaValueUpdateSchema, body);

	const service = getService(c);
	const updated = await service
		.update(params.id, payload)
		.catch(handleServiceError);

	return c.json(updated);
});

umaValuesRouter.patch("/:id", async (c) => {
	const params = parseWithZod(UmaValueIdParamSchema, c.req.param());
	const body = await c.req.json();
	const payload = parseWithZod(UmaValuePatchSchema, body);

	if (Object.keys(payload).length === 0) {
		throw new APIError(400, "Payload is empty");
	}

	const service = getService(c);
	const updated = await service
		.patch(params.id, payload)
		.catch(handleServiceError);

	return c.json(updated);
});

umaValuesRouter.post("/:id/activate", async (c) => {
	const params = parseWithZod(UmaValueIdParamSchema, c.req.param());

	const service = getService(c);
	const activated = await service.activate(params.id).catch(handleServiceError);

	return c.json(activated);
});

umaValuesRouter.delete("/:id", async (c) => {
	const params = parseWithZod(UmaValueIdParamSchema, c.req.param());

	const service = getService(c);
	await service.delete(params.id).catch(handleServiceError);

	return c.body(null, 204);
});
