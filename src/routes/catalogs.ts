import { Hono } from "hono";
import type { Context } from "hono";
import { ZodError } from "zod";

import {
	CatalogItemCreateSchema,
	CatalogKeyParamSchema,
	CatalogListQuerySchema,
	CatalogQueryService,
	CatalogRepository,
} from "../domain/catalog";
import type { Bindings } from "../index";
import { getPrismaClient } from "../lib/prisma";
import { APIError } from "../middleware/error";

export const catalogsRouter = new Hono<{ Bindings: Bindings }>();

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
	const repository = new CatalogRepository(prisma);
	return new CatalogQueryService(repository);
}

function handleServiceError(error: unknown): never {
	if (error instanceof Error) {
		switch (error.message) {
			case "CATALOG_NOT_FOUND":
				throw new APIError(404, "Catalog not found");
			case "CATALOG_NOT_OPEN":
				throw new APIError(403, "This catalog does not allow adding new items");
			case "CATALOG_ITEM_ALREADY_EXISTS":
				throw new APIError(409, "An item with this name already exists");
		}
	}
	throw error;
}

catalogsRouter.get("/:catalogKey", async (c) => {
	const params = parseWithZod(CatalogKeyParamSchema, c.req.param());
	const url = new URL(c.req.url);
	const queryObject = Object.fromEntries(url.searchParams.entries());
	const query = parseWithZod(CatalogListQuerySchema, queryObject);

	const service = getService(c);
	const result = await service
		.list(params.catalogKey, query)
		.catch(handleServiceError);

	return c.json(result);
});

catalogsRouter.post("/:catalogKey/items", async (c) => {
	const params = parseWithZod(CatalogKeyParamSchema, c.req.param());
	const body = await c.req.json();
	const input = parseWithZod(CatalogItemCreateSchema, body);

	const service = getService(c);
	const item = await service
		.createItem(params.catalogKey, input.name)
		.catch(handleServiceError);

	return c.json(item, 201);
});
