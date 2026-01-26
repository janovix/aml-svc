import { Hono } from "hono";
import type { Context } from "hono";
import { ZodError } from "zod";

import {
	UBOCreateSchema,
	UBOUpdateSchema,
	UBOPatchSchema,
	UBOIdParamSchema,
	ClientIdParamSchema,
	PEPStatusUpdateSchema,
	UBOService,
	UBORepository,
} from "../domain/ubo";
import { ClientRepository } from "../domain/client";
import type { Bindings } from "../index";
import { createPEPQueueService } from "../lib/pep-queue";
import { getPrismaClient } from "../lib/prisma";
import { type AuthVariables, getOrganizationId } from "../middleware/auth";
import { APIError } from "../middleware/error";

export const ubosRouter = new Hono<{
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
	const repository = new UBORepository(prisma);
	return new UBOService(repository);
}

function getClientRepository(
	c: Context<{ Bindings: Bindings; Variables: AuthVariables }>,
) {
	const prisma = getPrismaClient(c.env.DB);
	return new ClientRepository(prisma);
}

function handleServiceError(error: unknown): never {
	if (error instanceof Error) {
		if (error.message === "UBO_NOT_FOUND") {
			throw new APIError(404, "UBO not found");
		}
		if (error.message === "CLIENT_NOT_FOUND") {
			throw new APIError(404, "Client not found");
		}
		if (error.message === "OWNERSHIP_PERCENTAGE_REQUIRED_FOR_SHAREHOLDER") {
			throw new APIError(
				400,
				"Ownership percentage is required for shareholders",
			);
		}
		if (error.message === "MINIMUM_OWNERSHIP_PERCENTAGE_NOT_MET") {
			throw new APIError(
				400,
				"La ley requiere reportar solo accionistas con 25% o más de participación",
			);
		}
		if (error.message === "CAP_TABLE_EXCEEDS_100_PERCENT") {
			throw new APIError(
				400,
				"La tabla de capitalización no puede exceder el 100%",
			);
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
	const client = await clientRepo.getById(organizationId, clientId);
	if (!client) {
		throw new APIError(404, "Client not found");
	}
}

// ============================================================================
// UBO Routes (nested under /clients/:clientId/ubos)
// ============================================================================

/**
 * GET /clients/:clientId/ubos
 * List all UBOs for a client
 */
ubosRouter.get("/:clientId/ubos", async (c) => {
	const params = parseWithZod(ClientIdParamSchema, c.req.param());
	await verifyClientOwnership(c, params.clientId);

	const organizationId = getOrganizationId(c);
	const service = getService(c);
	const result = await service
		.list(organizationId, params.clientId)
		.catch(handleServiceError);

	return c.json(result);
});

/**
 * GET /clients/:clientId/ubos/:uboId
 * Get a single UBO
 */
ubosRouter.get("/:clientId/ubos/:uboId", async (c) => {
	const params = parseWithZod(UBOIdParamSchema, c.req.param());
	await verifyClientOwnership(c, params.clientId);

	const organizationId = getOrganizationId(c);
	const service = getService(c);
	const ubo = await service
		.get(organizationId, params.clientId, params.uboId)
		.catch(handleServiceError);

	return c.json(ubo);
});

/**
 * POST /clients/:clientId/ubos
 * Create a new UBO
 */
ubosRouter.post("/:clientId/ubos", async (c) => {
	const params = parseWithZod(ClientIdParamSchema, c.req.param());
	await verifyClientOwnership(c, params.clientId);

	const organizationId = getOrganizationId(c);
	const body = await c.req.json();
	const payload = parseWithZod(UBOCreateSchema, {
		...body,
		clientId: params.clientId,
	});

	const service = getService(c);
	const created = await service
		.create(organizationId, payload)
		.catch(handleServiceError);

	// Queue PEP check for new UBO (non-blocking)
	const pepQueue = createPEPQueueService(c.env.PEP_CHECK_QUEUE);
	const fullName = service.getUBOFullName(created);
	if (fullName) {
		await pepQueue.queueUBOPEPCheck(created.id, fullName, {
			organizationId,
			triggeredBy: "create",
		});
	}

	return c.json(created, 201);
});

/**
 * PUT /clients/:clientId/ubos/:uboId
 * Update a UBO (full update)
 */
ubosRouter.put("/:clientId/ubos/:uboId", async (c) => {
	const params = parseWithZod(UBOIdParamSchema, c.req.param());
	await verifyClientOwnership(c, params.clientId);

	const organizationId = getOrganizationId(c);
	const body = await c.req.json();
	const payload = parseWithZod(UBOUpdateSchema, body);

	const service = getService(c);
	const updated = await service
		.update(organizationId, params.clientId, params.uboId, payload)
		.catch(handleServiceError);

	// Queue PEP check for updated UBO (non-blocking)
	const pepQueue = createPEPQueueService(c.env.PEP_CHECK_QUEUE);
	const fullName = service.getUBOFullName(updated);
	if (fullName) {
		await pepQueue.queueUBOPEPCheck(updated.id, fullName, {
			organizationId,
			triggeredBy: "update",
		});
	}

	return c.json(updated);
});

/**
 * PATCH /clients/:clientId/ubos/:uboId
 * Patch a UBO (partial update)
 */
ubosRouter.patch("/:clientId/ubos/:uboId", async (c) => {
	const params = parseWithZod(UBOIdParamSchema, c.req.param());
	await verifyClientOwnership(c, params.clientId);

	const organizationId = getOrganizationId(c);
	const body = await c.req.json();
	const payload = parseWithZod(UBOPatchSchema, body);

	if (Object.keys(payload).length === 0) {
		throw new APIError(400, "Payload is empty");
	}

	const service = getService(c);
	const updated = await service
		.patch(organizationId, params.clientId, params.uboId, payload)
		.catch(handleServiceError);

	// Queue PEP check if name-related fields changed
	const nameFieldsChanged =
		payload.firstName !== undefined ||
		payload.lastName !== undefined ||
		payload.secondLastName !== undefined;

	if (nameFieldsChanged) {
		const pepQueue = createPEPQueueService(c.env.PEP_CHECK_QUEUE);
		const fullName = service.getUBOFullName(updated);
		if (fullName) {
			await pepQueue.queueUBOPEPCheck(updated.id, fullName, {
				organizationId,
				triggeredBy: "update",
			});
		}
	}

	return c.json(updated);
});

/**
 * DELETE /clients/:clientId/ubos/:uboId
 * Delete a UBO
 */
ubosRouter.delete("/:clientId/ubos/:uboId", async (c) => {
	const params = parseWithZod(UBOIdParamSchema, c.req.param());
	await verifyClientOwnership(c, params.clientId);

	const organizationId = getOrganizationId(c);
	const service = getService(c);
	await service
		.delete(organizationId, params.clientId, params.uboId)
		.catch(handleServiceError);

	return c.body(null, 204);
});

// ============================================================================
// Internal router (for pep-check-worker communication - no auth required)
// ============================================================================

export const ubosInternalRouter = new Hono<{
	Bindings: Bindings;
}>();

function getInternalService(c: Context<{ Bindings: Bindings }>) {
	const prisma = getPrismaClient(c.env.DB);
	const repository = new UBORepository(prisma);
	return new UBOService(repository);
}

/**
 * PATCH /internal/ubos/:uboId/pep-status
 * Update PEP status for a UBO (called by pep-check-worker)
 */
ubosInternalRouter.patch("/:uboId/pep-status", async (c) => {
	const uboId = c.req.param("uboId");
	const body = await c.req.json();

	try {
		const payload = parseWithZod(PEPStatusUpdateSchema, body);
		const service = getInternalService(c);
		const updated = await service.updatePEPStatus(uboId, payload);
		return c.json({ success: true, data: updated });
	} catch (error) {
		console.error("[InternalUBOs] PATCH pep-status error:", error);
		if (error instanceof APIError) {
			return c.json({ error: error.message }, error.statusCode as 400);
		}
		if (error instanceof Error) {
			return c.json({ error: error.message }, 500);
		}
		return c.json({ error: "Unknown error" }, 500);
	}
});

/**
 * GET /internal/ubos/stale-pep-checks
 * Get UBOs with stale PEP checks (for cron refresh)
 */
ubosInternalRouter.get("/stale-pep-checks", async (c) => {
	const thresholdStr = c.req.query("threshold");
	const limitStr = c.req.query("limit");

	if (!thresholdStr) {
		return c.json({ error: "threshold query parameter is required" }, 400);
	}

	const threshold = new Date(thresholdStr);
	const limit = limitStr ? parseInt(limitStr, 10) : 100;

	try {
		const service = getInternalService(c);
		const staleUBOs = await service.getStaleUBOs(threshold, limit);
		return c.json({
			data: staleUBOs.map((u) => ({
				id: u.id,
				clientId: u.clientId,
				type: "ubo",
				name: u.fullName,
			})),
		});
	} catch (error) {
		console.error("[InternalUBOs] GET stale-pep-checks error:", error);
		return c.json({ error: "Failed to get stale UBOs" }, 500);
	}
});
