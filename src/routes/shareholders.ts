import { Hono } from "hono";
import type { Context } from "hono";
import { ZodError } from "zod";
import * as Sentry from "@sentry/cloudflare";

import {
	ShareholderCreateSchema,
	ShareholderUpdateSchema,
	ShareholderPatchSchema,
	ShareholderIdParamSchema,
	ClientIdParamSchema,
	ShareholderService,
	ValidationError as ShareholderValidationError,
} from "../domain/shareholder/index.js";
import { ClientRepository } from "../domain/client/index.js";
import type { Bindings } from "../types.js";
import { getPrismaClient } from "../lib/prisma.js";
import { type AuthVariables, getOrganizationId } from "../middleware/auth.js";
import { APIError } from "../middleware/error.js";
import { productionTenant } from "../lib/tenant-context.js";

export const shareholdersRouter = new Hono<{
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
	return new ShareholderService(prisma);
}

function getClientRepository(
	c: Context<{ Bindings: Bindings; Variables: AuthVariables }>,
) {
	const prisma = getPrismaClient(c.env.DB);
	return new ClientRepository(prisma);
}

function handleServiceError(error: unknown): never {
	if (error instanceof ShareholderValidationError) {
		throw new APIError(400, error.message);
	}
	if (error instanceof Error) {
		if (error.message === "SHAREHOLDER_NOT_FOUND") {
			throw new APIError(404, "Shareholder not found");
		}
		if (error.message === "CLIENT_NOT_FOUND") {
			throw new APIError(404, "Client not found");
		}
	}
	throw error;
}

/**
 * Verify that the client belongs to the organization
 */
async function verifyClientOwnership(
	c: Context<{ Bindings: Bindings; Variables: AuthVariables }>,
	clientId: string,
): Promise<void> {
	const organizationId = getOrganizationId(c);
	const clientRepo = getClientRepository(c);
	const client = await clientRepo.getById(
		productionTenant(organizationId),
		clientId,
	);
	if (!client) {
		throw new APIError(404, "Client not found");
	}
}

// ============================================
// PUBLIC ROUTES (with JWT auth)
// ============================================

/**
 * GET /:clientId/shareholders
 * List all shareholders for a client
 */
shareholdersRouter.get("/:clientId/shareholders", async (c) => {
	try {
		const { clientId } = parseWithZod(ClientIdParamSchema, c.req.param());
		await verifyClientOwnership(c, clientId);

		const parentShareholderId = c.req.query("parentShareholderId") || undefined;
		const entityType = c.req.query("entityType") as
			| "PERSON"
			| "COMPANY"
			| undefined;

		const service = getService(c);
		const result = await service.list({
			clientId,
			parentShareholderId,
			entityType,
		});

		Sentry.setTag("shareholder.count", result.total);

		return c.json({
			data: result.data,
			total: result.total,
		});
	} catch (error) {
		handleServiceError(error);
	}
});

/**
 * GET /:clientId/shareholders/:shareholderId
 * Get a single shareholder by ID
 */
shareholdersRouter.get("/:clientId/shareholders/:shareholderId", async (c) => {
	try {
		const { clientId } = parseWithZod(ClientIdParamSchema, c.req.param());
		const { shareholderId } = parseWithZod(
			ShareholderIdParamSchema,
			c.req.param(),
		);
		await verifyClientOwnership(c, clientId);

		const service = getService(c);
		const shareholder = await service.getById(clientId, shareholderId);

		if (!shareholder) {
			throw new APIError(404, "Shareholder not found");
		}

		Sentry.setTag("shareholder.entity_type", shareholder.entityType);

		return c.json(shareholder);
	} catch (error) {
		handleServiceError(error);
	}
});

/**
 * POST /:clientId/shareholders
 * Create a new shareholder
 */
shareholdersRouter.post("/:clientId/shareholders", async (c) => {
	try {
		const { clientId } = parseWithZod(ClientIdParamSchema, c.req.param());
		await verifyClientOwnership(c, clientId);

		const body = await c.req.json();
		const input = parseWithZod(ShareholderCreateSchema, body);

		const service = getService(c);
		const shareholder = await service.create(clientId, input);

		Sentry.setTag("shareholder.entity_type", shareholder.entityType);
		Sentry.setTag("shareholder.has_parent", !!shareholder.parentShareholderId);

		return c.json(shareholder, 201);
	} catch (error) {
		handleServiceError(error);
	}
});

/**
 * PUT /:clientId/shareholders/:shareholderId
 * Full update of a shareholder
 */
shareholdersRouter.put("/:clientId/shareholders/:shareholderId", async (c) => {
	try {
		const { clientId } = parseWithZod(ClientIdParamSchema, c.req.param());
		const { shareholderId } = parseWithZod(
			ShareholderIdParamSchema,
			c.req.param(),
		);
		await verifyClientOwnership(c, clientId);

		const body = await c.req.json();
		const input = parseWithZod(ShareholderUpdateSchema, body);

		const service = getService(c);
		const shareholder = await service.update(clientId, shareholderId, input);

		Sentry.setTag("shareholder.entity_type", shareholder.entityType);

		return c.json(shareholder);
	} catch (error) {
		handleServiceError(error);
	}
});

/**
 * PATCH /:clientId/shareholders/:shareholderId
 * Partial update of a shareholder
 */
shareholdersRouter.patch(
	"/:clientId/shareholders/:shareholderId",
	async (c) => {
		try {
			const { clientId } = parseWithZod(ClientIdParamSchema, c.req.param());
			const { shareholderId } = parseWithZod(
				ShareholderIdParamSchema,
				c.req.param(),
			);
			await verifyClientOwnership(c, clientId);

			const body = await c.req.json();
			const input = parseWithZod(ShareholderPatchSchema, body);

			const service = getService(c);
			const shareholder = await service.patch(clientId, shareholderId, input);

			Sentry.setTag("shareholder.entity_type", shareholder.entityType);

			return c.json(shareholder);
		} catch (error) {
			handleServiceError(error);
		}
	},
);

/**
 * DELETE /:clientId/shareholders/:shareholderId
 * Delete a shareholder
 */
shareholdersRouter.delete(
	"/:clientId/shareholders/:shareholderId",
	async (c) => {
		try {
			const { clientId } = parseWithZod(ClientIdParamSchema, c.req.param());
			const { shareholderId } = parseWithZod(
				ShareholderIdParamSchema,
				c.req.param(),
			);
			await verifyClientOwnership(c, clientId);

			const service = getService(c);
			await service.delete(clientId, shareholderId);

			Sentry.setTag("shareholder.deleted", true);

			return c.json({ success: true });
		} catch (error) {
			handleServiceError(error);
		}
	},
);

/**
 * GET /:clientId/shareholders/:shareholderId/sub-shareholders
 * List sub-shareholders (level 2) of a company shareholder
 */
shareholdersRouter.get(
	"/:clientId/shareholders/:shareholderId/sub-shareholders",
	async (c) => {
		try {
			const { clientId } = parseWithZod(ClientIdParamSchema, c.req.param());
			const { shareholderId } = parseWithZod(
				ShareholderIdParamSchema,
				c.req.param(),
			);
			await verifyClientOwnership(c, clientId);

			const service = getService(c);

			// Verify parent exists and is a company
			const parent = await service.getById(clientId, shareholderId);
			if (!parent) {
				throw new APIError(404, "Parent shareholder not found");
			}
			if (parent.entityType !== "COMPANY") {
				throw new APIError(
					400,
					"Only company shareholders can have sub-shareholders",
				);
			}

			const result = await service.listByParent(shareholderId);

			Sentry.setTag("shareholder.sub_shareholder_count", result.total);

			return c.json({
				data: result.data,
				total: result.total,
			});
		} catch (error) {
			handleServiceError(error);
		}
	},
);
