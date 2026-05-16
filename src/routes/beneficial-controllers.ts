import { Hono } from "hono";
import type { Context } from "hono";
import { ZodError } from "zod";
import * as Sentry from "@sentry/cloudflare";

import {
	BeneficialControllerCreateSchema,
	BeneficialControllerUpdateSchema,
	BeneficialControllerPatchSchema,
	BeneficialControllerIdParamSchema,
	ClientIdParamSchema,
	BeneficialControllerService,
	ValidationError as BCValidationError,
	BeneficialControllerScreeningUpdateSchema,
} from "../domain/beneficial-controller/index.js";
import { ClientRepository } from "../domain/client/index.js";
import type { Bindings } from "../types.js";
import { createWatchlistSearchService } from "../lib/watchlist-search.js";
import { getPrismaClient } from "../lib/prisma.js";
import {
	type AuthVariables,
	getOrganizationId,
	getTenantContext,
} from "../middleware/auth.js";
import { APIError } from "../middleware/error.js";
import { productionTenant } from "../lib/tenant-context.js";

export const beneficialControllersRouter = new Hono<{
	Bindings: Bindings;
	Variables: AuthVariables;
}>();

// Internal router for callbacks (no JWT auth)
export const beneficialControllersInternalRouter = new Hono<{
	Bindings: Bindings;
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
	return new BeneficialControllerService(prisma);
}

function getClientRepository(
	c: Context<{ Bindings: Bindings; Variables: AuthVariables }>,
) {
	const prisma = getPrismaClient(c.env.DB);
	return new ClientRepository(prisma);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getServiceInternal(c: Context<{ Bindings: Bindings }, any, any>) {
	const prisma = getPrismaClient(c.env.DB);
	return new BeneficialControllerService(prisma);
}

function handleServiceError(error: unknown): never {
	if (error instanceof BCValidationError) {
		throw new APIError(400, error.message);
	}
	if (error instanceof Error) {
		if (error.message === "BC_NOT_FOUND") {
			throw new APIError(404, "Beneficial controller not found");
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
 * GET /:clientId/beneficial-controllers
 * List all beneficial controllers for a client
 */
beneficialControllersRouter.get(
	"/:clientId/beneficial-controllers",
	async (c) => {
		try {
			const { clientId } = parseWithZod(ClientIdParamSchema, c.req.param());
			await verifyClientOwnership(c, clientId);

			// Query params are strings or undefined, cast to enum type for filter
			const bcType = c.req.query("bcType") as
				| "SHAREHOLDER"
				| "LEGAL_REP"
				| "TRUSTEE"
				| "SETTLOR"
				| "TRUST_BENEFICIARY"
				| "DIRECTOR"
				| undefined;
			const identificationCriteria = c.req.query("identificationCriteria") as
				| "BENEFIT"
				| "CONTROL"
				| "FALLBACK"
				| undefined;
			const shareholderId = c.req.query("shareholderId");

			const service = getService(c);
			const result = await service.list({
				clientId,
				bcType,
				identificationCriteria,
				shareholderId,
			});

			Sentry.setTag("bc.count", result.total);

			return c.json({
				data: result.data,
				total: result.total,
			});
		} catch (error) {
			handleServiceError(error);
		}
	},
);

/**
 * GET /:clientId/beneficial-controllers/:bcId/screening-history
 */
beneficialControllersRouter.get(
	"/:clientId/beneficial-controllers/:bcId/screening-history",
	async (c) => {
		try {
			const { clientId } = parseWithZod(ClientIdParamSchema, c.req.param());
			const { bcId } = parseWithZod(
				BeneficialControllerIdParamSchema,
				c.req.param(),
			);
			await verifyClientOwnership(c, clientId);
			const tenant = getTenantContext(c);
			const url = new URL(c.req.url);
			const limit = Math.min(
				100,
				Math.max(1, parseInt(url.searchParams.get("limit") || "20", 10) || 20),
			);
			const offset = Math.max(
				0,
				parseInt(url.searchParams.get("offset") || "0", 10) || 0,
			);
			const prisma = getPrismaClient(c.env.DB);
			const bc = await prisma.beneficialController.findFirst({
				where: { id: bcId, clientId },
				select: { id: true, client: { select: { organizationId: true } } },
			});
			if (!bc || bc.client.organizationId !== tenant.organizationId) {
				throw new APIError(404, "Beneficial controller not found");
			}
			const [rows, total] = await Promise.all([
				prisma.beneficialControllerWatchlistScreening.findMany({
					where: {
						beneficialControllerId: bcId,
						organizationId: tenant.organizationId,
					},
					orderBy: { screenedAt: "desc" },
					take: limit,
					skip: offset,
				}),
				prisma.beneficialControllerWatchlistScreening.count({
					where: {
						beneficialControllerId: bcId,
						organizationId: tenant.organizationId,
					},
				}),
			]);
			const items = rows.map((r) => {
				let changeFlags: Record<string, "new"> | null = null;
				if (r.changeFlags) {
					try {
						changeFlags = JSON.parse(r.changeFlags) as Record<string, "new">;
					} catch {
						changeFlags = null;
					}
				}
				return {
					id: r.id,
					watchlistQueryId: r.watchlistQueryId,
					screenedAt: r.screenedAt.toISOString(),
					triggeredBy: r.triggeredBy,
					screeningResult: r.screeningResult,
					ofacSanctioned: r.ofacSanctioned,
					unscSanctioned: r.unscSanctioned,
					sat69bListed: r.sat69bListed,
					isPEP: r.isPep,
					adverseMediaFlagged: r.adverseMediaFlagged,
					changeFlags,
					errorMessage: r.errorMessage,
					createdAt: r.createdAt.toISOString(),
				};
			});
			return c.json({
				items,
				pagination: {
					limit,
					offset,
					total,
					hasMore: offset + items.length < total,
				},
			});
		} catch (error) {
			handleServiceError(error);
		}
	},
);

/**
 * GET /:clientId/beneficial-controllers/:bcId
 * Get a single beneficial controller by ID
 */
beneficialControllersRouter.get(
	"/:clientId/beneficial-controllers/:bcId",
	async (c) => {
		try {
			const { clientId } = parseWithZod(ClientIdParamSchema, c.req.param());
			const { bcId } = parseWithZod(
				BeneficialControllerIdParamSchema,
				c.req.param(),
			);
			await verifyClientOwnership(c, clientId);

			const service = getService(c);
			const bc = await service.getById(clientId, bcId);

			if (!bc) {
				throw new APIError(404, "Beneficial controller not found");
			}

			Sentry.setTag("bc.type", bc.bcType);
			Sentry.setTag("bc.identification_criteria", bc.identificationCriteria);

			return c.json(bc);
		} catch (error) {
			handleServiceError(error);
		}
	},
);

/**
 * POST /:clientId/beneficial-controllers
 * Create a new beneficial controller
 * Triggers watchlist screening automatically
 */
beneficialControllersRouter.post(
	"/:clientId/beneficial-controllers",
	async (c) => {
		try {
			const { clientId } = parseWithZod(ClientIdParamSchema, c.req.param());
			await verifyClientOwnership(c, clientId);

			const body = await c.req.json();
			const input = parseWithZod(BeneficialControllerCreateSchema, body);

			const service = getService(c);
			const bc = await service.create(clientId, input);

			// Trigger watchlist screening in background (non-blocking)
			const user = c.get("user");
			const userId = user?.id || "system:aml";
			const organizationId = getOrganizationId(c);

			c.executionCtx.waitUntil(
				(async () => {
					try {
						const watchlistService = createWatchlistSearchService(
							c.env.WATCHLIST_SERVICE,
						);
						const searchResult = await watchlistService.triggerSearch({
							query: service.getBCFullName(bc),
							entityType: "person",
							userId,
							organizationId,
							source: "aml:bc",
							birthDate: bc.birthDate
								? new Date(bc.birthDate).toISOString().split("T")[0]
								: undefined,
							identifiers: bc.rfc ? [bc.rfc] : undefined,
							countries: bc.nationality ? [bc.nationality] : undefined,
							entityId: bc.id,
							entityKind: "beneficial_controller",
							environment: (c.get("environment") as string) ?? "production",
						});

						if (searchResult) {
							// Update BC with query ID and initial counts
							await service.updateScreening(bc.id, {
								watchlistQueryId: searchResult.queryId,
								ofacSanctioned: searchResult.ofacCount > 0,
								unscSanctioned: searchResult.unscCount > 0,
								sat69bListed: searchResult.sat69bCount > 0,
								screeningResult: "pending",
								screenedAt: new Date(),
							});

							Sentry.setTag("bc.watchlist_triggered", true);
							Sentry.setTag("bc.watchlist_query_id", searchResult.queryId);
						}
					} catch (error) {
						Sentry.captureException(error, {
							tags: {
								operation: "bc_watchlist_trigger",
								bc_id: bc.id,
							},
						});
					}
				})(),
			);

			Sentry.setTag("bc.type", bc.bcType);
			Sentry.setTag("bc.identification_criteria", bc.identificationCriteria);

			return c.json(bc, 201);
		} catch (error) {
			handleServiceError(error);
		}
	},
);

/**
 * PUT /:clientId/beneficial-controllers/:bcId
 * Full update of a beneficial controller
 * Triggers watchlist screening if name changes
 */
beneficialControllersRouter.put(
	"/:clientId/beneficial-controllers/:bcId",
	async (c) => {
		try {
			const { clientId } = parseWithZod(ClientIdParamSchema, c.req.param());
			const { bcId } = parseWithZod(
				BeneficialControllerIdParamSchema,
				c.req.param(),
			);
			await verifyClientOwnership(c, clientId);

			const body = await c.req.json();
			const input = parseWithZod(BeneficialControllerUpdateSchema, body);

			const service = getService(c);
			const existing = await service.getById(clientId, bcId);
			if (!existing) {
				throw new APIError(404, "Beneficial controller not found");
			}

			const bc = await service.update(clientId, bcId, input);

			// Check if name changed, trigger re-screening
			const nameChanged =
				existing.firstName !== bc.firstName ||
				existing.lastName !== bc.lastName ||
				existing.secondLastName !== bc.secondLastName;

			if (nameChanged) {
				const user = c.get("user");
				const userId = user?.id || "system:aml";
				const organizationId = getOrganizationId(c);

				c.executionCtx.waitUntil(
					(async () => {
						try {
							const watchlistService = createWatchlistSearchService(
								c.env.WATCHLIST_SERVICE,
							);
							const searchResult = await watchlistService.triggerSearch({
								query: service.getBCFullName(bc),
								entityType: "person",
								userId,
								organizationId,
								source: "aml:bc",
								birthDate: bc.birthDate
									? new Date(bc.birthDate).toISOString().split("T")[0]
									: undefined,
								identifiers: bc.rfc ? [bc.rfc] : undefined,
								countries: bc.nationality ? [bc.nationality] : undefined,
								entityId: bc.id,
								entityKind: "beneficial_controller",
								environment: (c.get("environment") as string) ?? "production",
							});

							if (searchResult) {
								await service.updateScreening(bc.id, {
									watchlistQueryId: searchResult.queryId,
									ofacSanctioned: searchResult.ofacCount > 0,
									unscSanctioned: searchResult.unscCount > 0,
									sat69bListed: searchResult.sat69bCount > 0,
									screeningResult: "pending",
									screenedAt: new Date(),
								});
							}
						} catch (error) {
							Sentry.captureException(error, {
								tags: {
									operation: "bc_watchlist_retrigger",
									bc_id: bc.id,
								},
							});
						}
					})(),
				);
			}

			Sentry.setTag("bc.type", bc.bcType);
			Sentry.setTag("bc.name_changed", nameChanged);

			return c.json(bc);
		} catch (error) {
			handleServiceError(error);
		}
	},
);

/**
 * PATCH /:clientId/beneficial-controllers/:bcId
 * Partial update of a beneficial controller
 * Triggers watchlist screening if name changes
 */
beneficialControllersRouter.patch(
	"/:clientId/beneficial-controllers/:bcId",
	async (c) => {
		try {
			const { clientId } = parseWithZod(ClientIdParamSchema, c.req.param());
			const { bcId } = parseWithZod(
				BeneficialControllerIdParamSchema,
				c.req.param(),
			);
			await verifyClientOwnership(c, clientId);

			const body = await c.req.json();
			const input = parseWithZod(BeneficialControllerPatchSchema, body);

			const service = getService(c);
			const existing = await service.getById(clientId, bcId);
			if (!existing) {
				throw new APIError(404, "Beneficial controller not found");
			}

			const bc = await service.patch(clientId, bcId, input);

			// Check if name changed
			const nameChanged =
				("firstName" in input && input.firstName !== existing.firstName) ||
				("lastName" in input && input.lastName !== existing.lastName) ||
				("secondLastName" in input &&
					input.secondLastName !== existing.secondLastName);

			if (nameChanged) {
				const user = c.get("user");
				const userId = user?.id || "system:aml";
				const organizationId = getOrganizationId(c);

				c.executionCtx.waitUntil(
					(async () => {
						try {
							const watchlistService = createWatchlistSearchService(
								c.env.WATCHLIST_SERVICE,
							);
							const searchResult = await watchlistService.triggerSearch({
								query: service.getBCFullName(bc),
								entityType: "person",
								userId,
								organizationId,
								source: "aml:bc",
								birthDate: bc.birthDate
									? new Date(bc.birthDate).toISOString().split("T")[0]
									: undefined,
								identifiers: bc.rfc ? [bc.rfc] : undefined,
								countries: bc.nationality ? [bc.nationality] : undefined,
								entityId: bc.id,
								entityKind: "beneficial_controller",
								environment: (c.get("environment") as string) ?? "production",
							});

							if (searchResult) {
								await service.updateScreening(bc.id, {
									watchlistQueryId: searchResult.queryId,
									ofacSanctioned: searchResult.ofacCount > 0,
									unscSanctioned: searchResult.unscCount > 0,
									sat69bListed: searchResult.sat69bCount > 0,
									screeningResult: "pending",
									screenedAt: new Date(),
								});
							}
						} catch (error) {
							Sentry.captureException(error, {
								tags: {
									operation: "bc_watchlist_retrigger",
									bc_id: bc.id,
								},
							});
						}
					})(),
				);
			}

			Sentry.setTag("bc.type", bc.bcType);
			Sentry.setTag("bc.name_changed", nameChanged);

			return c.json(bc);
		} catch (error) {
			handleServiceError(error);
		}
	},
);

/**
 * DELETE /:clientId/beneficial-controllers/:bcId
 * Delete a beneficial controller
 */
beneficialControllersRouter.delete(
	"/:clientId/beneficial-controllers/:bcId",
	async (c) => {
		try {
			const { clientId } = parseWithZod(ClientIdParamSchema, c.req.param());
			const { bcId } = parseWithZod(
				BeneficialControllerIdParamSchema,
				c.req.param(),
			);
			await verifyClientOwnership(c, clientId);

			const service = getService(c);
			await service.delete(clientId, bcId);

			Sentry.setTag("bc.deleted", true);

			return c.json({ success: true });
		} catch (error) {
			handleServiceError(error);
		}
	},
);

// ============================================
// INTERNAL ROUTES (no JWT auth - for watchlist-svc callbacks)
// ============================================

/**
 * PATCH /internal/beneficial-controllers/:bcId/watchlist-query
 * Update BC with watchlist query results (called by watchlist-svc)
 * No JWT auth - uses X-Organization-Id and X-User-Id headers
 */
beneficialControllersInternalRouter.patch(
	"/:bcId/watchlist-query",
	async (c) => {
		try {
			const { bcId } = parseWithZod(
				BeneficialControllerIdParamSchema,
				c.req.param(),
			);

			const body = await c.req.json();
			const input = parseWithZod(
				BeneficialControllerScreeningUpdateSchema,
				body,
			);

			const service = getServiceInternal(c);
			const bc = await service.updateScreening(bcId, {
				watchlistQueryId: input.watchlistQueryId,
				ofacSanctioned: input.ofacSanctioned,
				unscSanctioned: input.unscSanctioned,
				sat69bListed: input.sat69bListed,
				adverseMediaFlagged: input.adverseMediaFlagged,
				isPEP: input.isPEP,
				screeningResult: input.screeningResult,
				screenedAt: input.screenedAt ? new Date(input.screenedAt) : undefined,
			});

			Sentry.setTag("bc.screening_updated", true);
			Sentry.setTag("bc.screening_result", bc.screeningResult);

			return c.json(bc);
		} catch (error) {
			if (error instanceof Error) {
				Sentry.captureException(error, {
					tags: {
						operation: "bc_screening_update",
					},
				});
				throw new APIError(500, error.message);
			}
			throw error;
		}
	},
);
