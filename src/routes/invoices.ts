import { Hono } from "hono";
import type { Context } from "hono";
import { ZodError } from "zod";
import * as Sentry from "@sentry/cloudflare";

import {
	InvoiceService,
	InvoiceCreateSchema,
	InvoiceFilterSchema,
	InvoiceUpdateSchema,
	InvoiceParseXmlSchema,
} from "../domain/invoice";
import type { Bindings } from "../types";
import { getPrismaClient } from "../lib/prisma";
import { APIError } from "../middleware/error";
import { type AuthVariables, getOrganizationId } from "../middleware/auth";
import { z } from "zod";
import { parseQueryParams } from "../lib/query-params";

export const invoicesRouter = new Hono<{
	Bindings: Bindings;
	Variables: AuthVariables;
}>();

const InvoiceIdParamSchema = z.object({
	id: z.string().uuid("Invalid invoice ID"),
});

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
	return new InvoiceService(prisma);
}

function handleServiceError(error: unknown): never {
	if (error instanceof Error) {
		if (error.message === "INVOICE_NOT_FOUND") {
			throw new APIError(404, "Invoice not found");
		}
		if (error.message === "DUPLICATE_CFDI_UUID") {
			throw new APIError(409, "Invoice with this CFDI UUID already exists");
		}
		if (error.message === "INVALID_XML") {
			throw new APIError(400, "Invalid CFDI XML format");
		}
	}
	throw error;
}

/**
 * GET /invoices
 * List all invoices with optional filters
 */
invoicesRouter.get("/", async (c) => {
	const organizationId = getOrganizationId(c);
	const url = new URL(c.req.url);
	const queryObject = parseQueryParams(url.searchParams, [
		"voucherTypeCode",
		"currencyCode",
	]);
	const filters = parseWithZod(InvoiceFilterSchema, queryObject);

	const service = getService(c);
	const result = await service
		.list(organizationId, filters)
		.catch(handleServiceError);

	return c.json(result);
});

/**
 * GET /invoices/stats
 * Get summary statistics for invoices in the organization.
 * IMPORTANT: must be defined before /:id to avoid "stats" being matched as an id.
 */
invoicesRouter.get("/stats", async (c) => {
	const organizationId = getOrganizationId(c);
	const service = getService(c);
	const stats = await service
		.getStats(organizationId)
		.catch(handleServiceError);
	return c.json(stats);
});

/**
 * GET /invoices/:id
 * Get a single invoice by ID
 */
invoicesRouter.get("/:id", async (c) => {
	const organizationId = getOrganizationId(c);
	const params = parseWithZod(InvoiceIdParamSchema, c.req.param());

	const service = getService(c);
	const record = await service
		.getById(organizationId, params.id)
		.catch(handleServiceError);

	return c.json(record);
});

/**
 * GET /invoices/uuid/:uuid
 * Get a single invoice by CFDI UUID
 */
invoicesRouter.get("/uuid/:uuid", async (c) => {
	const organizationId = getOrganizationId(c);
	const uuid = c.req.param("uuid");

	if (!uuid || !/^[0-9a-f-]{36}$/i.test(uuid)) {
		throw new APIError(400, "Invalid UUID format");
	}

	const service = getService(c);
	const record = await service
		.getByUuid(organizationId, uuid)
		.catch(handleServiceError);

	return c.json(record);
});

/**
 * POST /invoices
 * Create a new invoice manually
 */
invoicesRouter.post("/", async (c) => {
	const organizationId = getOrganizationId(c);
	const body = await c.req.json();
	const payload = parseWithZod(InvoiceCreateSchema, body);

	const service = getService(c);
	const created = await service
		.create(organizationId, payload)
		.catch(handleServiceError);

	return c.json(created, 201);
});

/**
 * POST /invoices/parse-xml
 * Parse a CFDI XML and create invoice
 * Returns PLD hints for activity detection
 */
invoicesRouter.post("/parse-xml", async (c) => {
	const organizationId = getOrganizationId(c);
	const body = await c.req.json();
	const payload = parseWithZod(InvoiceParseXmlSchema, body);

	const service = getService(c);
	const result = await service
		.parseAndCreate(organizationId, payload)
		.catch(handleServiceError);

	return c.json(result, 201);
});

/**
 * PUT /invoices/:id
 * Update invoice notes
 */
invoicesRouter.put("/:id", async (c) => {
	const organizationId = getOrganizationId(c);
	const params = parseWithZod(InvoiceIdParamSchema, c.req.param());
	const body = await c.req.json();
	const payload = parseWithZod(InvoiceUpdateSchema, body);

	const service = getService(c);
	const updated = await service
		.updateNotes(organizationId, params.id, payload.notes ?? null)
		.catch(handleServiceError);

	return c.json(updated);
});

/**
 * DELETE /invoices/:id
 * Soft delete an invoice
 */
invoicesRouter.delete("/:id", async (c) => {
	const organizationId = getOrganizationId(c);
	const params = parseWithZod(InvoiceIdParamSchema, c.req.param());

	const service = getService(c);
	await service.delete(organizationId, params.id).catch(handleServiceError);

	return c.body(null, 204);
});

// ============================================================================
// Internal router (for worker communication - no auth required)
// ============================================================================

export const invoicesInternalRouter = new Hono<{
	Bindings: Bindings;
}>();

function getInternalService(c: Context<{ Bindings: Bindings }>) {
	const prisma = getPrismaClient(c.env.DB);
	return new InvoiceService(prisma);
}

/**
 * POST /internal/invoices/parse-xml
 * Parse CFDI XML (internal, called by import worker)
 */
invoicesInternalRouter.post("/parse-xml", async (c) => {
	const organizationId = c.req.header("X-Organization-Id");
	if (!organizationId) {
		return c.json(
			{ error: "Bad Request", message: "Missing X-Organization-Id header" },
			400,
		);
	}

	try {
		const body = await c.req.json();
		const payload = parseWithZod(InvoiceParseXmlSchema, body);

		const service = getInternalService(c);
		const result = await service.parseAndCreate(organizationId, payload);

		return c.json(result, 201);
	} catch (error) {
		Sentry.captureException(error, {
			tags: { context: "internal-invoices-post-parse-xml-error" },
		});

		if (error instanceof APIError) {
			return c.json(
				{ error: "Error", message: error.message, details: error.details },
				error.statusCode as 400,
			);
		}

		if (error instanceof Error) {
			return c.json({ error: "Error", message: error.message }, 500);
		}

		return c.json({ error: "Error", message: "Unknown error occurred" }, 500);
	}
});
