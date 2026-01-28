import { Hono } from "hono";
import type { Context } from "hono";
import { ZodError } from "zod";
import * as Sentry from "@sentry/cloudflare";

import {
	CatalogItemCreateSchema,
	CatalogItemIdParamSchema,
	CatalogKeyParamSchema,
	CatalogListQuerySchema,
	CatalogQueryService,
	CatalogRepository,
} from "../domain/catalog";
import type { Bindings } from "../types";
import { getPrismaClient } from "../lib/prisma";
import { APIError } from "../middleware/error";

export const catalogsRouter = new Hono<{ Bindings: Bindings }>();

// Timeout for catalog operations (in milliseconds)
// D1 queries should complete well under this limit
const CATALOG_OPERATION_TIMEOUT_MS = 25000; // 25 seconds (Workers have 30s limit)

/**
 * Wraps a promise with a timeout to prevent indefinite hangs.
 * This is a safety net for cases where D1 queries might hang.
 */
async function withTimeout<T>(
	promise: Promise<T>,
	timeoutMs: number,
	operationName: string,
): Promise<T> {
	let timeoutId: ReturnType<typeof setTimeout>;

	const timeoutPromise = new Promise<never>((_, reject) => {
		timeoutId = setTimeout(() => {
			const error = new Error(
				`Operation "${operationName}" timed out after ${timeoutMs}ms`,
			);
			error.name = "TimeoutError";
			Sentry.captureException(error, {
				tags: { operation: operationName, timeout: timeoutMs },
			});
			reject(error);
		}, timeoutMs);
	});

	try {
		const result = await Promise.race([promise, timeoutPromise]);
		clearTimeout(timeoutId!);
		return result;
	} catch (error) {
		clearTimeout(timeoutId!);
		throw error;
	}
}

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
		// Handle timeout errors
		if (error.name === "TimeoutError") {
			throw new APIError(504, "Gateway Timeout", {
				message: error.message,
			});
		}

		switch (error.message) {
			case "CATALOG_NOT_FOUND":
				throw new APIError(404, "Catalog not found");
			case "CATALOG_NOT_OPEN":
				throw new APIError(403, "This catalog does not allow adding new items");
			case "CATALOG_ITEM_ALREADY_EXISTS":
				throw new APIError(409, "An item with this name already exists");
			case "CATALOG_ITEM_NOT_FOUND":
				throw new APIError(404, "Catalog item not found");
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
	const operationName = `catalog.list.${params.catalogKey}`;

	const result = await withTimeout(
		service.list(params.catalogKey, query),
		CATALOG_OPERATION_TIMEOUT_MS,
		operationName,
	).catch(handleServiceError);

	return c.json(result);
});

catalogsRouter.get("/:catalogKey/items/:itemId", async (c) => {
	const params = parseWithZod(CatalogItemIdParamSchema, c.req.param());

	const service = getService(c);
	const operationName = `catalog.getItem.${params.catalogKey}.${params.itemId}`;

	const item = await withTimeout(
		service.getItemById(params.catalogKey, params.itemId),
		CATALOG_OPERATION_TIMEOUT_MS,
		operationName,
	).catch(handleServiceError);

	return c.json(item);
});

catalogsRouter.post("/:catalogKey/items", async (c) => {
	const params = parseWithZod(CatalogKeyParamSchema, c.req.param());
	const body = await c.req.json();
	const input = parseWithZod(CatalogItemCreateSchema, body);

	const service = getService(c);
	const operationName = `catalog.createItem.${params.catalogKey}`;

	const item = await withTimeout(
		service.createItem(params.catalogKey, input.name),
		CATALOG_OPERATION_TIMEOUT_MS,
		operationName,
	).catch(handleServiceError);

	return c.json(item, 201);
});
