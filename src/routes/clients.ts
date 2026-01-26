import { Hono } from "hono";
import type { Context } from "hono";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";

import {
	AddressIdParamSchema,
	ClientAddressCreateSchema,
	ClientAddressPatchSchema,
	ClientAddressUpdateSchema,
	ClientCreateSchema,
	ClientDocumentCreateSchema,
	ClientDocumentPatchSchema,
	ClientDocumentUpdateSchema,
	ClientFilterSchema,
	ClientIdParamSchema,
	ClientPatchSchema,
	ClientService,
	ClientUpdateSchema,
	DocumentIdParamSchema,
	ClientRepository,
	ClientPEPStatusUpdateSchema,
} from "../domain/client";
import type { Bindings } from "../index";
import { createAlertQueueService } from "../lib/alert-queue";
import { createPEPQueueService } from "../lib/pep-queue";
import { getPrismaClient } from "../lib/prisma";
import { type AuthVariables, getOrganizationId } from "../middleware/auth";
import { APIError } from "../middleware/error";

export const clientsRouter = new Hono<{
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
	const repository = new ClientRepository(prisma);
	return new ClientService(repository);
}

function handleServiceError(error: unknown): never {
	// Handle Prisma unique constraint violations
	if (error instanceof Prisma.PrismaClientKnownRequestError) {
		if (error.code === "P2002") {
			// Unique constraint failed
			const target = error.meta?.target;
			// Check if it's the RFC unique constraint
			if (
				Array.isArray(target) &&
				target.includes("organization_id") &&
				target.includes("rfc")
			) {
				throw new APIError(
					409,
					"Ya existe un cliente con este RFC en la organización",
					{
						code: "DUPLICATE_RFC",
						field: "rfc",
					},
				);
			}
			// Generic unique constraint message
			throw new APIError(409, "A record with this value already exists", {
				code: "DUPLICATE_VALUE",
				target,
			});
		}
	}

	if (error instanceof Error) {
		// Handle UNIQUE constraint failed from D1/SQLite (alternative error format)
		if (
			error.message.includes("UNIQUE constraint failed") ||
			error.message.includes("Unique constraint failed")
		) {
			if (error.message.includes("rfc")) {
				throw new APIError(
					409,
					"Ya existe un cliente con este RFC en la organización",
					{
						code: "DUPLICATE_RFC",
						field: "rfc",
					},
				);
			}
			throw new APIError(409, "A record with this value already exists", {
				code: "DUPLICATE_VALUE",
			});
		}

		if (error.message === "CLIENT_NOT_FOUND") {
			throw new APIError(404, "Client not found");
		}
		if (error.message === "DOCUMENT_NOT_FOUND") {
			throw new APIError(404, "Document not found");
		}
		if (error.message === "ADDRESS_NOT_FOUND") {
			throw new APIError(404, "Address not found");
		}
	}
	throw error;
}

clientsRouter.get("/", async (c) => {
	const organizationId = getOrganizationId(c);
	const url = new URL(c.req.url);
	const queryObject = Object.fromEntries(url.searchParams.entries());
	const filters = parseWithZod(ClientFilterSchema, queryObject);

	const service = getService(c);
	const result = await service
		.list(organizationId, filters)
		.catch(handleServiceError);

	return c.json(result);
});

// IMPORTANT: /stats must be defined BEFORE /:id to avoid "stats" being matched as an id parameter
clientsRouter.get("/stats", async (c) => {
	const organizationId = getOrganizationId(c);
	const service = getService(c);
	const stats = await service
		.getStats(organizationId)
		.catch(handleServiceError);
	return c.json(stats);
});

/**
 * GET /clients/:id/kyc-status
 * Get KYC completion status for a client
 * Returns requirements based on person type and completion percentage
 * Note: Uses raw SQL until Prisma client is regenerated with new schema fields
 */
clientsRouter.get("/:id/kyc-status", async (c) => {
	const organizationId = getOrganizationId(c);
	const params = parseWithZod(ClientIdParamSchema, c.req.param());
	const prisma = getPrismaClient(c.env.DB);

	// Get client
	const client = await prisma.client.findFirst({
		where: { organizationId, id: params.id, deletedAt: null },
	});

	if (!client) {
		throw new APIError(404, "Client not found");
	}

	// Get documents for this client using raw query to include new fields
	const documents = await prisma.$queryRaw<
		Array<{
			id: string;
			document_type: string;
			status: string;
			verification_status: string | null;
		}>
	>`
		SELECT id, document_type, status, verification_status
		FROM client_documents
		WHERE client_id = ${client.id}
	`;

	// Get UBOs for this client using raw query
	const ubos = await prisma.$queryRaw<
		Array<{
			id: string;
			id_document_id: string | null;
		}>
	>`
		SELECT id, id_document_id
		FROM ultimate_beneficial_owners
		WHERE client_id = ${client.id}
	`;

	// Define document requirements per person type
	const documentRequirements: Record<string, string[]> = {
		PHYSICAL: ["NATIONAL_ID", "PROOF_OF_ADDRESS", "TAX_ID"],
		MORAL: [
			"ACTA_CONSTITUTIVA",
			"TAX_ID",
			"PODER_NOTARIAL",
			"PROOF_OF_ADDRESS",
		],
		TRUST: ["TRUST_AGREEMENT", "TAX_ID", "PROOF_OF_ADDRESS"],
	};

	const requiredDocs = documentRequirements[client.personType] || [];
	const uploadedDocTypes = documents.map((d) => d.document_type);
	const missingDocs = requiredDocs.filter((d) => !uploadedDocTypes.includes(d));

	// Check document verification status
	const verifiedDocs = documents.filter(
		(d) => d.status === "VERIFIED" || d.verification_status === "APPROVED",
	).length;
	const pendingDocs = documents.filter(
		(d) => d.status === "PENDING" || d.verification_status === "REVIEW",
	).length;

	// UBO requirements for MORAL/TRUST
	const requiresUBO = ["MORAL", "TRUST"].includes(client.personType);
	const hasUBO = ubos.length > 0;
	const uboHasDocs = requiresUBO
		? ubos.every((ubo) => ubo.id_document_id !== null)
		: true;

	// Calculate completion percentage
	let totalRequirements = requiredDocs.length;
	let completedRequirements = requiredDocs.length - missingDocs.length;

	if (requiresUBO) {
		totalRequirements += 2; // UBO exists + UBO has docs
		if (hasUBO) completedRequirements += 1;
		if (uboHasDocs) completedRequirements += 1;
	}

	const completionPercentage =
		totalRequirements > 0
			? Math.round((completedRequirements / totalRequirements) * 100)
			: 100;

	// Determine overall KYC status
	let kycStatus = "INCOMPLETE";
	if (missingDocs.length === 0 && (!requiresUBO || hasUBO)) {
		if (verifiedDocs === documents.length && documents.length > 0) {
			kycStatus = "COMPLETE";
		} else if (pendingDocs > 0) {
			kycStatus = "PENDING_VERIFICATION";
		}
	}

	return c.json({
		clientId: client.id,
		personType: client.personType,
		kycStatus,
		completionPercentage,
		documents: {
			required: requiredDocs,
			uploaded: uploadedDocTypes,
			missing: missingDocs,
			verified: verifiedDocs,
			pending: pendingDocs,
			total: documents.length,
		},
		ubos: requiresUBO
			? {
					required: true,
					hasUBO,
					count: ubos.length,
					allHaveDocuments: uboHasDocs,
				}
			: { required: false },
		// PEP status will be available after Prisma regeneration
		pep: {
			status: "PENDING",
			isPEP: false,
			checkedAt: null,
		},
	});
});

clientsRouter.get("/:id", async (c) => {
	const organizationId = getOrganizationId(c);
	const params = parseWithZod(ClientIdParamSchema, c.req.param());

	const service = getService(c);
	const client = await service
		.get(organizationId, params.id)
		.catch(handleServiceError);

	return c.json(client);
});

clientsRouter.post("/", async (c) => {
	const organizationId = getOrganizationId(c);
	const body = await c.req.json();
	const payload = parseWithZod(ClientCreateSchema, body);

	const service = getService(c);
	const created = await service
		.create(organizationId, payload)
		.catch(handleServiceError);

	// Queue alert detection job for new client
	const alertQueue = createAlertQueueService(c.env.ALERT_DETECTION_QUEUE);
	await alertQueue.queueClientCreated(created.id);

	// Queue PEP check for new client (non-blocking)
	const pepQueue = createPEPQueueService(c.env.PEP_CHECK_QUEUE);
	const fullName =
		created.personType === "physical"
			? `${created.firstName} ${created.lastName} ${created.secondLastName || ""}`.trim()
			: created.businessName || "";
	if (fullName) {
		await pepQueue.queueClientPEPCheck(created.id, fullName, {
			organizationId,
			triggeredBy: "create",
		});
	}

	return c.json(created, 201);
});

clientsRouter.put("/:id", async (c) => {
	const organizationId = getOrganizationId(c);
	const params = parseWithZod(ClientIdParamSchema, c.req.param());
	const body = await c.req.json();
	const payload = parseWithZod(ClientUpdateSchema, body);

	const service = getService(c);
	const updated = await service
		.update(organizationId, params.id, payload)
		.catch(handleServiceError);

	// Queue alert detection job for updated client
	const alertQueue = createAlertQueueService(c.env.ALERT_DETECTION_QUEUE);
	await alertQueue.queueClientUpdated(updated.id);

	// Queue PEP check for updated client (non-blocking)
	const pepQueue = createPEPQueueService(c.env.PEP_CHECK_QUEUE);
	const fullName =
		updated.personType === "physical"
			? `${updated.firstName} ${updated.lastName} ${updated.secondLastName || ""}`.trim()
			: updated.businessName || "";
	if (fullName) {
		await pepQueue.queueClientPEPCheck(updated.id, fullName, {
			organizationId,
			triggeredBy: "update",
		});
	}

	return c.json(updated);
});

clientsRouter.patch("/:id", async (c) => {
	const organizationId = getOrganizationId(c);
	const params = parseWithZod(ClientIdParamSchema, c.req.param());
	const body = await c.req.json();
	const payload = parseWithZod(ClientPatchSchema, body);

	if (Object.keys(payload).length === 0) {
		throw new APIError(400, "Payload is empty");
	}

	const service = getService(c);
	const updated = await service
		.patch(organizationId, params.id, payload)
		.catch(handleServiceError);

	// Queue alert detection job for updated client
	const alertQueue = createAlertQueueService(c.env.ALERT_DETECTION_QUEUE);
	await alertQueue.queueClientUpdated(updated.id);

	// Queue PEP check if name-related fields changed
	const nameFieldsChanged =
		payload.firstName !== undefined ||
		payload.lastName !== undefined ||
		payload.secondLastName !== undefined ||
		payload.businessName !== undefined;

	if (nameFieldsChanged) {
		const pepQueue = createPEPQueueService(c.env.PEP_CHECK_QUEUE);
		const fullName =
			updated.personType === "physical"
				? `${updated.firstName} ${updated.lastName} ${updated.secondLastName || ""}`.trim()
				: updated.businessName || "";
		if (fullName) {
			await pepQueue.queueClientPEPCheck(updated.id, fullName, {
				organizationId,
				triggeredBy: "update",
			});
		}
	}

	return c.json(updated);
});

clientsRouter.delete("/:id", async (c) => {
	const organizationId = getOrganizationId(c);
	const params = parseWithZod(ClientIdParamSchema, c.req.param());

	const service = getService(c);
	await service.delete(organizationId, params.id).catch(handleServiceError);

	return c.body(null, 204);
});

clientsRouter.get("/:id/documents", async (c) => {
	const organizationId = getOrganizationId(c);
	const params = parseWithZod(ClientIdParamSchema, c.req.param());
	const service = getService(c);
	const documents = await service
		.listDocuments(organizationId, params.id)
		.catch(handleServiceError);
	return c.json({ data: documents });
});

clientsRouter.post("/:id/documents", async (c) => {
	const organizationId = getOrganizationId(c);
	const params = parseWithZod(ClientIdParamSchema, c.req.param());
	const body = await c.req.json();
	const payload = parseWithZod(ClientDocumentCreateSchema, {
		...body,
		clientId: params.id,
	});
	const service = getService(c);
	const created = await service
		.createDocument(organizationId, payload)
		.catch(handleServiceError);
	return c.json(created, 201);
});

clientsRouter.put("/:clientId/documents/:documentId", async (c) => {
	const organizationId = getOrganizationId(c);
	const params = parseWithZod(DocumentIdParamSchema, c.req.param());
	const body = await c.req.json();
	const payload = parseWithZod(ClientDocumentUpdateSchema, body);
	const service = getService(c);
	const updated = await service
		.updateDocument(organizationId, params.clientId, params.documentId, payload)
		.catch(handleServiceError);
	return c.json(updated);
});

clientsRouter.patch("/:clientId/documents/:documentId", async (c) => {
	const organizationId = getOrganizationId(c);
	const params = parseWithZod(DocumentIdParamSchema, c.req.param());
	const body = await c.req.json();
	const payload = parseWithZod(ClientDocumentPatchSchema, body);
	const service = getService(c);
	const updated = await service
		.patchDocument(organizationId, params.clientId, params.documentId, payload)
		.catch(handleServiceError);
	return c.json(updated);
});

clientsRouter.delete("/:clientId/documents/:documentId", async (c) => {
	const organizationId = getOrganizationId(c);
	const params = parseWithZod(DocumentIdParamSchema, c.req.param());
	const service = getService(c);
	await service
		.deleteDocument(organizationId, params.clientId, params.documentId)
		.catch(handleServiceError);
	return c.body(null, 204);
});

clientsRouter.get("/:id/addresses", async (c) => {
	const organizationId = getOrganizationId(c);
	const params = parseWithZod(ClientIdParamSchema, c.req.param());
	const service = getService(c);
	const addresses = await service
		.listAddresses(organizationId, params.id)
		.catch(handleServiceError);
	return c.json({ data: addresses });
});

clientsRouter.post("/:id/addresses", async (c) => {
	const organizationId = getOrganizationId(c);
	const params = parseWithZod(ClientIdParamSchema, c.req.param());
	const body = await c.req.json();
	const payload = parseWithZod(ClientAddressCreateSchema, {
		...body,
		clientId: params.id,
	});
	const service = getService(c);
	const created = await service
		.createAddress(organizationId, payload)
		.catch(handleServiceError);
	return c.json(created, 201);
});

clientsRouter.put("/:clientId/addresses/:addressId", async (c) => {
	const organizationId = getOrganizationId(c);
	const params = parseWithZod(AddressIdParamSchema, c.req.param());
	const body = await c.req.json();
	const payload = parseWithZod(ClientAddressUpdateSchema, body);
	const service = getService(c);
	const updated = await service
		.updateAddress(organizationId, params.clientId, params.addressId, payload)
		.catch(handleServiceError);
	return c.json(updated);
});

clientsRouter.patch("/:clientId/addresses/:addressId", async (c) => {
	const organizationId = getOrganizationId(c);
	const params = parseWithZod(AddressIdParamSchema, c.req.param());
	const body = await c.req.json();
	const payload = parseWithZod(ClientAddressPatchSchema, body);
	const service = getService(c);
	const updated = await service
		.patchAddress(organizationId, params.clientId, params.addressId, payload)
		.catch(handleServiceError);
	return c.json(updated);
});

clientsRouter.delete("/:clientId/addresses/:addressId", async (c) => {
	const organizationId = getOrganizationId(c);
	const params = parseWithZod(AddressIdParamSchema, c.req.param());
	const service = getService(c);
	await service
		.deleteAddress(organizationId, params.clientId, params.addressId)
		.catch(handleServiceError);
	return c.body(null, 204);
});

// ============================================================================
// Internal router (for worker communication - no auth required)
// ============================================================================

/**
 * Internal clients router (no auth required)
 * These endpoints are called by the aml-import-worker via service binding
 */
export const clientsInternalRouter = new Hono<{
	Bindings: Bindings;
}>();

function getInternalService(c: Context<{ Bindings: Bindings }>) {
	const prisma = getPrismaClient(c.env.DB);
	const repository = new ClientRepository(prisma);
	return new ClientService(repository);
}

/**
 * Format error for internal API responses
 * Ensures error messages are always properly propagated
 */
function formatInternalError(error: unknown): {
	message: string;
	details?: unknown;
} {
	if (error instanceof APIError) {
		return { message: error.message, details: error.details };
	}

	if (error instanceof Error) {
		// Check for Prisma unique constraint violation
		if (error.message.includes("UNIQUE constraint failed")) {
			// Extract field name from error message if possible
			const match = error.message.match(/UNIQUE constraint failed: \w+\.(\w+)/);
			const field = match ? match[1] : "field";
			return {
				message: `Duplicate value: A record with this ${field} already exists`,
				details: { constraint: "unique", field },
			};
		}

		// Check for other common Prisma errors
		if (error.message.includes("Foreign key constraint failed")) {
			return {
				message: "Referenced record not found",
				details: { constraint: "foreign_key" },
			};
		}

		return { message: error.message };
	}

	return { message: "Unknown error occurred" };
}

/**
 * GET /internal/clients
 * List/search clients (internal, called by worker)
 */
clientsInternalRouter.get("/", async (c) => {
	const organizationId = c.req.header("X-Organization-Id");
	if (!organizationId) {
		return c.json(
			{ error: "Bad Request", message: "Missing X-Organization-Id header" },
			400,
		);
	}

	try {
		const url = new URL(c.req.url);
		const queryObject = Object.fromEntries(url.searchParams.entries());
		const filters = parseWithZod(ClientFilterSchema, queryObject);

		const service = getInternalService(c);
		const result = await service.list(organizationId, filters);

		return c.json(result);
	} catch (error) {
		console.error("[InternalClients] GET error:", error);
		const { message, details } = formatInternalError(error);
		const status = error instanceof APIError ? error.statusCode : 500;
		return c.json({ error: "Error", message, details }, status as 400);
	}
});

/**
 * POST /internal/clients
 * Create a client (internal, called by worker)
 */
clientsInternalRouter.post("/", async (c) => {
	const organizationId = c.req.header("X-Organization-Id");
	if (!organizationId) {
		return c.json(
			{ error: "Bad Request", message: "Missing X-Organization-Id header" },
			400,
		);
	}

	try {
		const body = await c.req.json();
		const payload = parseWithZod(ClientCreateSchema, body);

		const service = getInternalService(c);
		const created = await service.create(organizationId, payload);

		// Queue alert detection job for new client
		const alertQueue = createAlertQueueService(c.env.ALERT_DETECTION_QUEUE);
		await alertQueue.queueClientCreated(created.id);

		return c.json(created, 201);
	} catch (error) {
		console.error("[InternalClients] POST error:", error);
		const { message, details } = formatInternalError(error);

		// Return 409 for duplicate key errors
		if (
			error instanceof Error &&
			error.message.includes("UNIQUE constraint failed")
		) {
			return c.json({ error: "Conflict", message, details }, 409);
		}

		const status = error instanceof APIError ? error.statusCode : 500;
		return c.json({ error: "Error", message, details }, status as 400);
	}
});

// ============================================================================
// Internal PEP Status endpoints (for pep-check-worker)
// ============================================================================

/**
 * PATCH /internal/clients/:id/pep-status
 * Update PEP status for a client (called by pep-check-worker)
 * Note: Uses raw SQL until Prisma client is regenerated with new schema fields
 */
clientsInternalRouter.patch("/:id/pep-status", async (c) => {
	const clientId = c.req.param("id");
	const body = await c.req.json();

	try {
		const payload = parseWithZod(ClientPEPStatusUpdateSchema, body);
		const prisma = getPrismaClient(c.env.DB);

		// Use raw SQL to bypass Prisma type checking until client is regenerated
		await prisma.$executeRaw`
			UPDATE clients 
			SET 
				is_pep = ${payload.isPEP ? 1 : 0},
				pep_status = ${payload.pepStatus},
				pep_details = ${payload.pepDetails ?? null},
				pep_match_confidence = ${payload.pepMatchConfidence ?? null},
				pep_checked_at = ${new Date(payload.pepCheckedAt).toISOString()},
				pep_check_source = ${payload.pepCheckSource ?? null},
				updated_at = ${new Date().toISOString()}
			WHERE id = ${clientId}
		`;

		return c.json({ success: true });
	} catch (error) {
		console.error("[InternalClients] PATCH pep-status error:", error);
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
 * GET /internal/clients/stale-pep-checks
 * Get clients with stale PEP checks (for cron refresh)
 * Note: Uses raw SQL until Prisma client is regenerated with new schema fields
 */
clientsInternalRouter.get("/stale-pep-checks", async (c) => {
	const thresholdStr = c.req.query("threshold");
	const limitStr = c.req.query("limit");

	if (!thresholdStr) {
		return c.json({ error: "threshold query parameter is required" }, 400);
	}

	const threshold = new Date(thresholdStr);
	const limit = limitStr ? parseInt(limitStr, 10) : 100;

	try {
		const prisma = getPrismaClient(c.env.DB);

		// Use raw SQL to bypass Prisma type checking until client is regenerated
		// Note: $queryRaw returns DB enum values in uppercase (e.g., "PHYSICAL"),
		// whereas mappers.ts converts Prisma/DB enums to lowercase for public routes.
		// The uppercase comparison below is intentional for this internal handler.
		const clients = await prisma.$queryRaw<
			Array<{
				id: string;
				organization_id: string;
				person_type: string;
				first_name: string | null;
				last_name: string | null;
				second_last_name: string | null;
				business_name: string | null;
			}>
		>`
			SELECT 
				id, 
				organization_id, 
				person_type, 
				first_name, 
				last_name, 
				second_last_name, 
				business_name
			FROM clients
			WHERE deleted_at IS NULL
			AND (pep_checked_at IS NULL OR pep_checked_at < ${threshold.toISOString()})
			LIMIT ${limit}
		`;

		return c.json({
			data: clients.map((client) => ({
				id: client.id,
				organizationId: client.organization_id,
				type: "client" as const,
				name:
					client.person_type === "PHYSICAL"
						? `${client.first_name} ${client.last_name} ${client.second_last_name || ""}`.trim()
						: client.business_name || "",
			})),
		});
	} catch (error) {
		console.error("[InternalClients] GET stale-pep-checks error:", error);
		return c.json({ error: "Failed to get stale clients" }, 500);
	}
});
