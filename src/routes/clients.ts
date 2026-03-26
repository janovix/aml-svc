import { Hono } from "hono";
import type { Context } from "hono";
import * as Sentry from "@sentry/cloudflare";

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
} from "../domain/client";
import type { Bindings } from "../types";
import { createUsageRightsClient } from "../lib/usage-rights-client";
import { createAlertQueueService } from "../lib/alert-queue";
import { createWatchlistSearchService } from "../lib/watchlist-search";
import { getPrismaClient } from "../lib/prisma";
import {
	parseWithZod,
	handleServiceError,
	getClientDisplayName,
} from "../lib/route-helpers";
import { type AuthVariables, getOrganizationId } from "../middleware/auth";
import { APIError } from "../middleware/error";
import { parseQueryParams } from "../lib/query-params";

export const clientsRouter = new Hono<{
	Bindings: Bindings;
	Variables: AuthVariables;
}>();

function getService(
	c: Context<{ Bindings: Bindings; Variables: AuthVariables }>,
) {
	const prisma = getPrismaClient(c.env.DB);
	const repository = new ClientRepository(prisma);
	return new ClientService(repository);
}

clientsRouter.get("/", async (c) => {
	const organizationId = getOrganizationId(c);
	const url = new URL(c.req.url);
	const queryObject = parseQueryParams(url.searchParams, [
		"personType",
		"stateCode",
	]);
	const filters = parseWithZod(ClientFilterSchema, queryObject);

	const service = getService(c);
	const result = await service
		.list(organizationId, filters)
		.catch(handleServiceError);

	return c.json(result);
});

// IMPORTANT: named sub-paths must be defined BEFORE /:id to avoid being matched as an id parameter

clientsRouter.get("/check-rfc/:rfc", async (c) => {
	const organizationId = getOrganizationId(c);
	const rfc = c.req.param("rfc");

	const service = getService(c);
	const client = await service
		.findByRfc(organizationId, rfc)
		.catch(handleServiceError);

	if (!client) {
		return c.json({ exists: false });
	}

	return c.json({
		exists: true,
		clientId: client.id,
		clientName: getClientDisplayName(client),
	});
});

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

	// Get documents for this client using raw query
	const documents = await prisma.$queryRaw<
		Array<{
			id: string;
			document_type: string;
			status: string;
		}>
	>`
		SELECT id, document_type, status
		FROM client_documents
		WHERE client_id = ${client.id}
	`;

	// Get Beneficial Controllers for this client using raw query
	// BCs replaced UBOs as the AML compliance entity after migration 0004
	const beneficialControllers = await prisma.$queryRaw<
		Array<{
			id: string;
			id_copy_doc_id: string | null;
		}>
	>`
		SELECT id, id_copy_doc_id
		FROM beneficial_controllers
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
	const verifiedDocs = documents.filter((d) => d.status === "VERIFIED").length;
	const pendingDocs = documents.filter((d) => d.status === "PENDING").length;

	// Beneficial Controller requirements for MORAL/TRUST
	const requiresBC = ["MORAL", "TRUST"].includes(client.personType);
	const hasBC = beneficialControllers.length > 0;
	const bcHasDocs = requiresBC
		? beneficialControllers.every((bc) => bc.id_copy_doc_id !== null)
		: true;

	// Calculate completion percentage
	let totalRequirements = requiredDocs.length;
	let completedRequirements = requiredDocs.length - missingDocs.length;

	if (requiresBC) {
		totalRequirements += 2; // BC exists + BC has docs
		if (hasBC) completedRequirements += 1;
		if (bcHasDocs) completedRequirements += 1;
	}

	const completionPercentage =
		totalRequirements > 0
			? Math.round((completedRequirements / totalRequirements) * 100)
			: 100;

	// Determine overall KYC status
	let kycStatus = "INCOMPLETE";
	if (missingDocs.length === 0 && (!requiresBC || hasBC)) {
		if (verifiedDocs === documents.length && documents.length > 0) {
			kycStatus = "COMPLETE";
		} else if (pendingDocs > 0) {
			kycStatus = "PENDING_VERIFICATION";
		}
	}

	// ── Threshold-aware KYC status (Art. 17 LFPIORPI) ──────────────────────
	// Get org settings to compute thresholds
	let identificationRequired = true;
	let identificationTier: "ALWAYS" | "ABOVE_THRESHOLD" | "BELOW_THRESHOLD" =
		"ALWAYS";
	let identificationThresholdMxn: number | null = null;
	let noticeThresholdMxn: number | null = null;
	let maxSingleOperationMxn = 0;
	let sixMonthCumulativeMxn = 0;
	let singleOpExceedsThreshold = false;
	let cumulativeExceedsNoticeThreshold = false;
	let identificationThresholdPct = 100;
	let noticeThresholdPct = 100;

	try {
		const { OrganizationSettingsRepository: OrgSettingsRepo } = await import(
			"../domain/organization-settings/repository"
		);
		const { getIdentificationThresholdUma, getNoticeThresholdUma } =
			await import("../domain/operation/activities/registry");
		const { UmaValueRepository } = await import("../domain/uma/repository");

		const orgSettingsRepo = new OrgSettingsRepo(prisma);
		const umaRepo = new UmaValueRepository(prisma);

		const [orgSettings, umaValue] = await Promise.all([
			orgSettingsRepo.findByOrganizationId(organizationId),
			umaRepo.getActive(),
		]);

		if (orgSettings && umaValue) {
			const activityCode =
				orgSettings.activityKey as import("../domain/operation/types").ActivityCode;
			const idThresholdUma = getIdentificationThresholdUma(activityCode);
			const noticeThresholdUma = getNoticeThresholdUma(activityCode);
			const dailyValue = parseFloat(umaValue.dailyValue);

			if (idThresholdUma === "ALWAYS") {
				identificationTier = "ALWAYS";
				identificationRequired = true;
			} else {
				const idMxn = idThresholdUma * dailyValue;
				const noticeMxn =
					noticeThresholdUma === "ALWAYS"
						? 0
						: (noticeThresholdUma as number) * dailyValue;

				identificationThresholdMxn = idMxn;
				noticeThresholdMxn = noticeMxn > 0 ? noticeMxn : null;

				// Compute client's operation amounts
				const maxOpResult = await prisma.operation.aggregate({
					where: { clientId: client.id, deletedAt: null },
					_max: { amount: true },
				});
				const maxOp = maxOpResult._max.amount;
				maxSingleOperationMxn =
					maxOp === null
						? 0
						: typeof maxOp === "number"
							? maxOp
							: parseFloat(maxOp.toString());

				const sixMonthsAgo = new Date();
				sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
				const cumulativeResult = await prisma.operation.aggregate({
					where: {
						clientId: client.id,
						deletedAt: null,
						operationDate: { gte: sixMonthsAgo },
					},
					_sum: { amount: true },
				});
				const cumulativeOp = cumulativeResult._sum.amount;
				sixMonthCumulativeMxn =
					cumulativeOp === null
						? 0
						: typeof cumulativeOp === "number"
							? cumulativeOp
							: parseFloat(cumulativeOp.toString());

				singleOpExceedsThreshold = maxSingleOperationMxn >= idMxn;
				cumulativeExceedsNoticeThreshold =
					noticeMxn > 0 && sixMonthCumulativeMxn >= noticeMxn;

				identificationRequired =
					singleOpExceedsThreshold || cumulativeExceedsNoticeThreshold;
				identificationTier = identificationRequired
					? "ABOVE_THRESHOLD"
					: "BELOW_THRESHOLD";

				identificationThresholdPct =
					idMxn > 0 ? Math.round((maxSingleOperationMxn / idMxn) * 100) : 0;
				noticeThresholdPct =
					noticeMxn > 0
						? Math.round((sixMonthCumulativeMxn / noticeMxn) * 100)
						: 0;
			}
		}
	} catch (err) {
		console.warn("[kyc-status] Could not compute threshold info:", err);
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
		beneficialControllers: requiresBC
			? {
					required: true,
					hasBC,
					count: beneficialControllers.length,
					allHaveDocuments: bcHasDocs,
				}
			: { required: false },
		// Screening status based on client watchlist data
		pep: {
			status: "PENDING",
			isPEP: false,
			checkedAt: null,
		},
		// Threshold-aware KYC (Art. 17 LFPIORPI)
		threshold: {
			identificationRequired,
			identificationTier,
			identificationThresholdMxn,
			maxSingleOperationMxn,
			singleOpExceedsThreshold,
			noticeThresholdMxn,
			sixMonthCumulativeMxn,
			cumulativeExceedsNoticeThreshold,
			identificationThresholdPct,
			noticeThresholdPct,
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

	// Gate check: verify org has quota for clients (meter is incremented atomically)
	const usageRights = createUsageRightsClient(c.env);
	const gateResult = await usageRights.gate(organizationId, "clients");
	if (!gateResult.allowed) {
		return c.json(
			{
				success: false,
				error: gateResult.error ?? "usage_limit_exceeded",
				code: "USAGE_LIMIT_EXCEEDED",
				upgradeRequired: true,
				metric: "clients",
				used: gateResult.used,
				limit: gateResult.limit,
				entitlementType: gateResult.entitlementType,
				message:
					"You have reached the limit for clients. Please upgrade your plan or contact your administrator.",
			},
			403,
		);
	}

	const body = await c.req.json();
	const payload = parseWithZod(ClientCreateSchema, body);

	const service = getService(c);
	const created = await service
		.create(organizationId, payload)
		.catch(handleServiceError);

	// Queue alert detection job for new client
	const alertQueue = createAlertQueueService(c.env.ALERT_DETECTION_QUEUE);
	await alertQueue.queueClientCreated(created.id);

	// Trigger watchlist search (non-blocking)
	const watchlistSearch = createWatchlistSearchService(c.env.WATCHLIST_SERVICE);
	const fullName = getClientDisplayName(created);
	const user = c.get("user");
	if (fullName) {
		c.executionCtx.waitUntil(
			(async () => {
				const result = await watchlistSearch.triggerSearch({
					query: fullName,
					entityType:
						created.personType === "physical" ? "person" : "organization",
					organizationId,
					userId: user?.id ?? "unknown",
					birthDate: created.birthDate || undefined,
					identifiers: created.rfc ? [created.rfc] : undefined,
					countries: created.nationality ? [created.nationality] : undefined,
				});

				if (result?.queryId) {
					// Update client with watchlistQueryId and sync enrichment flags
					const prisma = getPrismaClient(c.env.DB);
					const isFlagged =
						result.ofacCount > 0 ||
						result.unscCount > 0 ||
						result.sat69bCount > 0;
					await prisma.client.update({
						where: { id: created.id },
						data: {
							watchlistQueryId: result.queryId,
							ofacSanctioned: result.ofacCount > 0,
							unscSanctioned: result.unscCount > 0,
							sat69bListed: result.sat69bCount > 0,
							screeningResult: isFlagged ? "flagged" : "pending",
							screenedAt: new Date(),
						},
					});
					console.log(
						`[Client Create] Watchlist search initiated, queryId: ${result.queryId}, sync flags: OFAC=${result.ofacCount > 0}, UNSC=${result.unscCount > 0}, SAT=${result.sat69bCount > 0}`,
					);
				}
			})(),
		);
	}

	// In automatic mode, KYC invite is sent only when client reaches ID threshold (see operations route).

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

	// Trigger watchlist search (non-blocking)
	const watchlistSearch = createWatchlistSearchService(c.env.WATCHLIST_SERVICE);
	const fullName = getClientDisplayName(updated);
	const user = c.get("user");
	if (fullName) {
		c.executionCtx.waitUntil(
			(async () => {
				const result = await watchlistSearch.triggerSearch({
					query: fullName,
					entityType:
						updated.personType === "physical" ? "person" : "organization",
					organizationId,
					userId: user?.id ?? "unknown",
					birthDate: updated.birthDate || undefined,
					identifiers: updated.rfc ? [updated.rfc] : undefined,
					countries: updated.nationality ? [updated.nationality] : undefined,
				});

				if (result?.queryId) {
					// Update client with watchlistQueryId and sync enrichment flags
					const prisma = getPrismaClient(c.env.DB);
					const isFlagged =
						result.ofacCount > 0 ||
						result.unscCount > 0 ||
						result.sat69bCount > 0;
					await prisma.client.update({
						where: { id: updated.id },
						data: {
							watchlistQueryId: result.queryId,
							ofacSanctioned: result.ofacCount > 0,
							unscSanctioned: result.unscCount > 0,
							sat69bListed: result.sat69bCount > 0,
							screeningResult: isFlagged ? "flagged" : "pending",
							screenedAt: new Date(),
						},
					});
					console.log(
						`[Client Update] Watchlist search initiated, queryId: ${result.queryId}, sync flags: OFAC=${result.ofacCount > 0}, UNSC=${result.unscCount > 0}, SAT=${result.sat69bCount > 0}`,
					);
				}
			})(),
		);
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

	// Trigger watchlist search if screening-relevant fields changed
	const screeningFieldsChanged =
		payload.firstName !== undefined ||
		payload.lastName !== undefined ||
		payload.secondLastName !== undefined ||
		payload.businessName !== undefined ||
		payload.birthDate !== undefined ||
		payload.nationality !== undefined ||
		"rfc" in payload;

	if (screeningFieldsChanged) {
		const watchlistSearch = createWatchlistSearchService(
			c.env.WATCHLIST_SERVICE,
		);
		const fullName = getClientDisplayName(updated);
		const user = c.get("user");
		if (fullName) {
			c.executionCtx.waitUntil(
				(async () => {
					const result = await watchlistSearch.triggerSearch({
						query: fullName,
						entityType:
							updated.personType === "physical" ? "person" : "organization",
						organizationId,
						userId: user?.id ?? "unknown",
						birthDate: updated.birthDate || undefined,
						identifiers: updated.rfc ? [updated.rfc] : undefined,
						countries: updated.nationality ? [updated.nationality] : undefined,
					});

					if (result?.queryId) {
						// Update client with watchlistQueryId and sync enrichment flags
						const prisma = getPrismaClient(c.env.DB);
						const isFlagged =
							result.ofacCount > 0 ||
							result.unscCount > 0 ||
							result.sat69bCount > 0;
						await prisma.client.update({
							where: { id: updated.id },
							data: {
								watchlistQueryId: result.queryId,
								ofacSanctioned: result.ofacCount > 0,
								unscSanctioned: result.unscCount > 0,
								sat69bListed: result.sat69bCount > 0,
								screeningResult: isFlagged ? "flagged" : "pending",
								screenedAt: new Date(),
							},
						});
						console.log(
							`[Client Patch] Watchlist search initiated, queryId: ${result.queryId}, sync flags: OFAC=${result.ofacCount > 0}, UNSC=${result.unscCount > 0}, SAT=${result.sat69bCount > 0}`,
						);
					}
				})(),
			);
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
		const queryObject = parseQueryParams(url.searchParams, [
			"personType",
			"stateCode",
		]);
		const filters = parseWithZod(ClientFilterSchema, queryObject);

		const service = getInternalService(c);
		const result = await service.list(organizationId, filters);

		return c.json(result);
	} catch (error) {
		Sentry.captureException(error, {
			tags: { context: "internal-clients-get-error" },
		});
		const { message, details } = formatInternalError(error);
		const status = error instanceof APIError ? error.statusCode : 500;
		return c.json({ error: "Error", message, details }, status as 400);
	}
});

/**
 * GET /internal/clients/by-rfc/:rfc
 * Lookup a single client by exact RFC match (internal, called by worker)
 */
clientsInternalRouter.get("/by-rfc/:rfc", async (c) => {
	const organizationId = c.req.header("X-Organization-Id");
	if (!organizationId) {
		return c.json(
			{ error: "Bad Request", message: "Missing X-Organization-Id header" },
			400,
		);
	}

	const rfc = c.req.param("rfc");

	try {
		const service = getInternalService(c);
		const client = await service.findByRfc(organizationId, rfc);

		if (!client) {
			return c.json({ error: "Not Found", message: "Client not found" }, 404);
		}

		return c.json({ id: client.id });
	} catch (error) {
		Sentry.captureException(error, {
			tags: { context: "internal-clients-by-rfc-error" },
		});
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

		// Trigger watchlist screening (non-blocking) — CSV import: use csv_import + user who triggered import
		const importUserId = c.req.header("X-User-Id") ?? "import-worker";
		const watchlistSearch = createWatchlistSearchService(
			c.env.WATCHLIST_SERVICE,
		);
		const fullName = getClientDisplayName(created);
		if (fullName) {
			c.executionCtx.waitUntil(
				(async () => {
					const result = await watchlistSearch.triggerSearch({
						query: fullName,
						entityType:
							created.personType === "physical" ? "person" : "organization",
						organizationId,
						userId: importUserId,
						source: "csv_import",
						birthDate: created.birthDate || undefined,
						identifiers: created.rfc ? [created.rfc] : undefined,
						countries: created.nationality ? [created.nationality] : undefined,
					});

					if (result?.queryId) {
						const prisma = getPrismaClient(c.env.DB);
						const isFlagged =
							result.ofacCount > 0 ||
							result.unscCount > 0 ||
							result.sat69bCount > 0;
						await prisma.client.update({
							where: { id: created.id },
							data: {
								watchlistQueryId: result.queryId,
								ofacSanctioned: result.ofacCount > 0,
								unscSanctioned: result.unscCount > 0,
								sat69bListed: result.sat69bCount > 0,
								screeningResult: isFlagged ? "flagged" : "pending",
								screenedAt: new Date(),
							},
						});
						console.log(
							`[Internal Client Create] Watchlist screening done, queryId: ${result.queryId}, OFAC=${result.ofacCount > 0}, UNSC=${result.unscCount > 0}, SAT=${result.sat69bCount > 0}`,
						);
					}
				})(),
			);
		}

		return c.json(created, 201);
	} catch (error) {
		Sentry.captureException(error, {
			tags: { context: "internal-clients-post-error" },
		});
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
// Internal Watchlist Screening endpoints
// ============================================================================

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
			AND (screened_at IS NULL OR screened_at < ${threshold.toISOString()})
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
		Sentry.captureException(error, {
			tags: { context: "internal-clients-get-stale-screening-error" },
		});
		return c.json({ error: "Failed to get stale clients" }, 500);
	}
});
