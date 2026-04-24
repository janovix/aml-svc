/**
 * Internal screening routes for screening-refresh-worker access
 * These endpoints are used by screening-refresh-worker via Cloudflare service bindings
 */
import * as Sentry from "@sentry/cloudflare";
import { getPrismaClient } from "../lib/prisma";
import type { Bindings } from "../types";
import { createHash } from "crypto";
import { sendScreeningFlaggedNotification } from "../lib/screening-notifications";
import { createRiskQueueService, type RiskJob } from "../lib/risk-queue";
import {
	computeNewPositives,
	getLastClientScreeningSnapshot,
	getLastBcScreeningSnapshot,
	newScreeningSnapshotId,
	serializeChangeFlags,
	stateFromClientRow,
} from "../lib/screening-snapshot";

/**
 * Calculate segment for an entity ID using deterministic hash modulo 7
 */
function calculateSegment(id: string): number {
	const hash = createHash("sha256").update(id).digest();
	return hash[0] % 7;
}

/**
 * Handle internal screening requests from service bindings
 *
 * Routes:
 * - GET /clients/stale-screening?segment=N&limit=200 - Get stale clients for screening refresh
 * - GET /beneficial-controllers/stale-screening?segment=N&limit=200 - Get stale BCs for screening refresh
 * - PATCH /clients/:id/watchlist-query - Update client watchlistQueryId
 * - PATCH /beneficial-controllers/:bcId/watchlist-query - Update BC watchlistQueryId
 */
export async function handleInternalScreeningRequest(
	request: Request,
	env: Bindings,
	path: string,
): Promise<Response> {
	const prisma = getPrismaClient(env.DB);
	const url = new URL(request.url);

	try {
		// GET /internal/clients/stale-screening
		if (
			request.method === "GET" &&
			path.startsWith("clients/stale-screening")
		) {
			const segment = parseInt(url.searchParams.get("segment") || "0");
			const limit = parseInt(url.searchParams.get("limit") || "200");

			if (segment < 0 || segment > 6) {
				return new Response(
					JSON.stringify({
						success: false,
						error: "Segment must be between 0 and 6",
					}),
					{ status: 400, headers: { "Content-Type": "application/json" } },
				);
			}

			// Fetch all clients (we'll filter by segment in-memory for simplicity)
			// In production, you might want to add a segment column to the table
			const allClients = await prisma.client.findMany({
				where: {
					deletedAt: null,
				},
				select: {
					id: true,
					organizationId: true,
					personType: true,
					firstName: true,
					lastName: true,
					secondLastName: true,
					businessName: true,
					birthDate: true,
					nationality: true,
					rfc: true,
					watchlistQueryId: true,
				},
				take: limit * 7, // Fetch enough to filter
			});

			// Filter by segment and limit
			const clients = allClients
				.filter((client) => calculateSegment(client.id) === segment)
				.slice(0, limit);

			return new Response(
				JSON.stringify({
					success: true,
					data: clients,
					segment,
					count: clients.length,
				}),
				{ headers: { "Content-Type": "application/json" } },
			);
		}

		// GET /internal/beneficial-controllers/stale-screening
		if (
			request.method === "GET" &&
			path.startsWith("beneficial-controllers/stale-screening")
		) {
			const segment = parseInt(url.searchParams.get("segment") || "0");
			const limit = parseInt(url.searchParams.get("limit") || "200");

			if (segment < 0 || segment > 6) {
				return new Response(
					JSON.stringify({
						success: false,
						error: "Segment must be between 0 and 6",
					}),
					{ status: 400, headers: { "Content-Type": "application/json" } },
				);
			}

			// Fetch all BCs (we'll filter by segment in-memory for simplicity)
			const allBcs = await prisma.beneficialController.findMany({
				select: {
					id: true,
					clientId: true,
					firstName: true,
					lastName: true,
					secondLastName: true,
					birthDate: true,
					nationality: true,
					rfc: true,
					watchlistQueryId: true,
				},
				take: limit * 7, // Fetch enough to filter
			});

			// Get unique clientIds to fetch organizations
			const clientIds = [...new Set(allBcs.map((bc) => bc.clientId))];
			const clients = await prisma.client.findMany({
				where: { id: { in: clientIds } },
				select: { id: true, organizationId: true },
			});
			const clientOrgMap = new Map(
				clients.map((c) => [c.id, c.organizationId]),
			);

			// Filter by segment and limit
			const bcs = allBcs
				.filter((bc) => calculateSegment(bc.id) === segment)
				.slice(0, limit)
				.map((bc) => ({
					...bc,
					organizationId: clientOrgMap.get(bc.clientId) || "",
				}));

			return new Response(
				JSON.stringify({
					success: true,
					data: bcs,
					segment,
					count: bcs.length,
				}),
				{ headers: { "Content-Type": "application/json" } },
			);
		}

		// PATCH /internal/clients/:id/watchlist-query
		if (request.method === "PATCH" && path.startsWith("clients/")) {
			const match = path.match(/^clients\/([^/]+)\/watchlist-query$/);
			if (!match) {
				return new Response(
					JSON.stringify({
						success: false,
						error: "Invalid path format",
					}),
					{ status: 400, headers: { "Content-Type": "application/json" } },
				);
			}

			const clientId = match[1];
			const body = (await request.json()) as {
				watchlistQueryId: string;
				ofacSanctioned?: boolean;
				unscSanctioned?: boolean;
				sat69bListed?: boolean;
				screeningResult?: string;
				screenedAt?: string;
			};

			if (!body.watchlistQueryId) {
				return new Response(
					JSON.stringify({
						success: false,
						error: "watchlistQueryId is required",
					}),
					{ status: 400, headers: { "Content-Type": "application/json" } },
				);
			}

			// Build update data
			const updateData: Record<string, string | boolean | Date> = {
				watchlistQueryId: body.watchlistQueryId,
			};

			if (body.ofacSanctioned !== undefined)
				updateData.ofacSanctioned = body.ofacSanctioned;
			if (body.unscSanctioned !== undefined)
				updateData.unscSanctioned = body.unscSanctioned;
			if (body.sat69bListed !== undefined)
				updateData.sat69bListed = body.sat69bListed;
			if (body.screeningResult !== undefined)
				updateData.screeningResult = body.screeningResult;
			if (body.screenedAt !== undefined)
				updateData.screenedAt = new Date(body.screenedAt);

			const prev = await prisma.client.findUniqueOrThrow({
				where: { id: clientId },
			});
			const lastSn = await getLastClientScreeningSnapshot(prisma, clientId);
			const before = stateFromClientRow(prev);
			const screenedAt =
				body.screenedAt !== undefined ? new Date(body.screenedAt) : new Date();

			const ofac =
				body.ofacSanctioned !== undefined
					? body.ofacSanctioned
					: prev.ofacSanctioned;
			const un =
				body.unscSanctioned !== undefined
					? body.unscSanctioned
					: prev.unscSanctioned;
			const sat =
				body.sat69bListed !== undefined ? body.sat69bListed : prev.sat69bListed;
			const res =
				body.screeningResult !== undefined
					? body.screeningResult
					: prev.screeningResult;
			const after = {
				ofac,
				un,
				sat69b: sat,
				pep: prev.isPEP,
				adverse: prev.adverseMediaFlagged,
			};
			const changeFlags = computeNewPositives(before, after);
			const snapId = newScreeningSnapshotId();

			// Batch transaction (D1 does not support interactive $transaction callbacks)
			const [, updatedClient] = await prisma.$transaction([
				prisma.clientWatchlistScreening.create({
					data: {
						id: snapId,
						organizationId: prev.organizationId,
						clientId: prev.id,
						watchlistQueryId: body.watchlistQueryId,
						screenedAt,
						triggeredBy: "callback",
						screeningResult: res,
						ofacSanctioned: ofac,
						unscSanctioned: un,
						sat69bListed: sat,
						isPep: prev.isPEP,
						adverseMediaFlagged: prev.adverseMediaFlagged,
						changeFlags: serializeChangeFlags(changeFlags),
						prevSnapshotId: lastSn?.id ?? null,
					},
				}),
				prisma.client.update({
					where: { id: clientId },
					data: updateData,
					select: {
						organizationId: true,
						firstName: true,
						lastName: true,
						businessName: true,
					},
				}),
			]);

			// Notify the org if this screening result is flagged (sanctions match)
			if (body.screeningResult === "flagged") {
				const clientName =
					updatedClient.businessName ??
					([updatedClient.firstName, updatedClient.lastName]
						.filter(Boolean)
						.join(" ") ||
						clientId);
				sendScreeningFlaggedNotification(env, {
					organizationId: updatedClient.organizationId,
					entityId: clientId,
					entityName: clientName,
					entityKind: "client",
					hitType: "sanctions",
				}).catch((err) =>
					console.error(
						"[InternalScreening] Unexpected error in screening notification:",
						err,
					),
				);
			}

			return new Response(
				JSON.stringify({
					success: true,
					message: "Client screening data updated",
				}),
				{ headers: { "Content-Type": "application/json" } },
			);
		}

		// PATCH /internal/beneficial-controllers/:bcId/watchlist-query
		if (
			request.method === "PATCH" &&
			path.startsWith("beneficial-controllers/")
		) {
			const match = path.match(
				/^beneficial-controllers\/([^/]+)\/watchlist-query$/,
			);
			if (!match) {
				return new Response(
					JSON.stringify({
						success: false,
						error: "Invalid path format",
					}),
					{ status: 400, headers: { "Content-Type": "application/json" } },
				);
			}

			const bcId = match[1];
			const body = (await request.json()) as {
				watchlistQueryId: string;
				ofacSanctioned?: boolean;
				unscSanctioned?: boolean;
				sat69bListed?: boolean;
				screeningResult?: string;
				screenedAt?: string;
			};

			if (!body.watchlistQueryId) {
				return new Response(
					JSON.stringify({
						success: false,
						error: "watchlistQueryId is required",
					}),
					{ status: 400, headers: { "Content-Type": "application/json" } },
				);
			}

			// Build update data
			const updateData: Record<string, string | boolean | Date> = {
				watchlistQueryId: body.watchlistQueryId,
			};

			if (body.ofacSanctioned !== undefined)
				updateData.ofacSanctioned = body.ofacSanctioned;
			if (body.unscSanctioned !== undefined)
				updateData.unscSanctioned = body.unscSanctioned;
			if (body.sat69bListed !== undefined)
				updateData.sat69bListed = body.sat69bListed;
			if (body.screeningResult !== undefined)
				updateData.screeningResult = body.screeningResult;
			if (body.screenedAt !== undefined)
				updateData.screenedAt = new Date(body.screenedAt);

			const prev = await prisma.beneficialController.findUniqueOrThrow({
				where: { id: bcId },
				include: { client: { select: { organizationId: true } } },
			});
			const lastSn = await getLastBcScreeningSnapshot(prisma, bcId);
			const before = stateFromClientRow({
				...prev,
				isPEP: prev.isPEP,
			});
			const screenedAt =
				body.screenedAt !== undefined ? new Date(body.screenedAt) : new Date();
			const ofac =
				body.ofacSanctioned !== undefined
					? body.ofacSanctioned
					: prev.ofacSanctioned;
			const un =
				body.unscSanctioned !== undefined
					? body.unscSanctioned
					: prev.unscSanctioned;
			const sat =
				body.sat69bListed !== undefined ? body.sat69bListed : prev.sat69bListed;
			const res =
				body.screeningResult !== undefined
					? body.screeningResult
					: prev.screeningResult;
			const after = {
				ofac,
				un,
				sat69b: sat,
				pep: prev.isPEP,
				adverse: prev.adverseMediaFlagged,
			};
			const changeFlags = computeNewPositives(before, after);
			const snapId = newScreeningSnapshotId();

			const [, updatedBc] = await prisma.$transaction([
				prisma.beneficialControllerWatchlistScreening.create({
					data: {
						id: snapId,
						organizationId: prev.client.organizationId,
						beneficialControllerId: prev.id,
						clientId: prev.clientId,
						watchlistQueryId: body.watchlistQueryId,
						screenedAt,
						triggeredBy: "callback",
						screeningResult: res,
						ofacSanctioned: ofac,
						unscSanctioned: un,
						sat69bListed: sat,
						isPep: prev.isPEP,
						adverseMediaFlagged: prev.adverseMediaFlagged,
						changeFlags: serializeChangeFlags(changeFlags),
						prevSnapshotId: lastSn?.id ?? null,
					},
				}),
				prisma.beneficialController.update({
					where: { id: bcId },
					data: updateData,
					select: {
						firstName: true,
						lastName: true,
						client: {
							select: { organizationId: true, id: true },
						},
					},
				}),
			]);

			// Notify the org if this screening result is flagged (sanctions match)
			if (body.screeningResult === "flagged") {
				const bcName =
					[updatedBc.firstName, updatedBc.lastName].filter(Boolean).join(" ") ||
					bcId;
				sendScreeningFlaggedNotification(env, {
					organizationId: updatedBc.client.organizationId,
					entityId: bcId,
					entityName: bcName,
					entityKind: "beneficial_controller",
					hitType: "sanctions",
				}).catch((err) =>
					console.error(
						"[InternalScreening] Unexpected error in screening notification:",
						err,
					),
				);
			}

			return new Response(
				JSON.stringify({
					success: true,
					message: "Beneficial controller screening data updated",
				}),
				{ headers: { "Content-Type": "application/json" } },
			);
		}

		// PATCH /internal/screening-callback
		if (request.method === "PATCH" && path === "/screening-callback") {
			const body = (await request.json()) as {
				queryId: string;
				type: "pep_official" | "pep_ai" | "adverse_media";
				status: "completed" | "failed";
				matched: boolean;
			};

			if (!body.queryId || !body.type || !body.status) {
				return new Response(
					JSON.stringify({
						success: false,
						error: "queryId, type, and status are required",
					}),
					{ status: 400, headers: { "Content-Type": "application/json" } },
				);
			}

			// Try to find client by watchlistQueryId
			const client = await prisma.client.findFirst({
				where: { watchlistQueryId: body.queryId },
			});

			// Try to find BC by watchlistQueryId if no client found
			let bc = null;
			if (!client) {
				bc = await prisma.beneficialController.findFirst({
					where: { watchlistQueryId: body.queryId },
				});
			}

			if (!client && !bc) {
				return new Response(
					JSON.stringify({
						success: false,
						error:
							"No client or beneficial controller found with the given watchlistQueryId",
					}),
					{ status: 404, headers: { "Content-Type": "application/json" } },
				);
			}

			// Update flags based on callback type
			const updateData: Record<string, boolean | string | Date> = {};

			if (body.type === "pep_official" || body.type === "pep_ai") {
				// If either PEP check returns a match, set isPEP to true
				if (body.matched && body.status === "completed") {
					updateData.isPEP = true;
				}
			} else if (body.type === "adverse_media") {
				updateData.adverseMediaFlagged =
					body.matched && body.status === "completed";
			}

			// Recompute screeningResult if this was the last async search
			// For simplicity, we'll set to "flagged" if any flag is true, "clear" if all false
			// We can check the current entity's flags to determine the final state
			const entity = client || bc!;
			const isFlagged =
				entity.ofacSanctioned ||
				entity.unscSanctioned ||
				entity.sat69bListed ||
				updateData.adverseMediaFlagged === true ||
				updateData.isPEP === true ||
				entity.isPEP;

			updateData.screeningResult = isFlagged ? "flagged" : "clear";
			updateData.screenedAt = new Date();

			const nowAt = new Date();

			if (client) {
				const before = stateFromClientRow(client);
				const lastSn = await getLastClientScreeningSnapshot(prisma, client.id);
				const isPEP =
					updateData.isPEP === true
						? true
						: updateData.isPEP === false
							? false
							: client.isPEP;
				const adverse =
					typeof updateData.adverseMediaFlagged === "boolean"
						? updateData.adverseMediaFlagged
						: client.adverseMediaFlagged;
				const after = {
					ofac: client.ofacSanctioned,
					un: client.unscSanctioned,
					sat69b: client.sat69bListed,
					pep: isPEP,
					adverse,
				};
				const changeFlags = computeNewPositives(before, after);
				const snapId = newScreeningSnapshotId();
				if (body.status === "completed") {
					await prisma.$transaction([
						prisma.clientWatchlistScreening.create({
							data: {
								id: snapId,
								organizationId: client.organizationId,
								clientId: client.id,
								watchlistQueryId: body.queryId,
								screenedAt: nowAt,
								triggeredBy: "callback",
								screeningResult: updateData.screeningResult as string,
								ofacSanctioned: after.ofac,
								unscSanctioned: after.un,
								sat69bListed: after.sat69b,
								isPep: after.pep,
								adverseMediaFlagged: after.adverse,
								changeFlags: serializeChangeFlags(changeFlags),
								prevSnapshotId: lastSn?.id ?? null,
							},
						}),
						prisma.client.update({
							where: { id: client.id },
							data: updateData,
						}),
					]);
				} else {
					// failed async step: do not change persisted screening
					// (avoid clearing risk; matches "do not risk on fail" intent)
					return new Response(
						JSON.stringify({
							success: true,
							skipped: true,
							reason: "async_failed",
						}),
						{ headers: { "Content-Type": "application/json" } },
					);
				}
				console.log(
					`[InternalScreening] Updated client ${client.id} with callback data: ${body.type}`,
				);
			} else if (bc) {
				const pClient = await prisma.client.findUniqueOrThrow({
					where: { id: bc.clientId },
					select: { organizationId: true },
				});
				const before = stateFromClientRow({ ...bc, isPEP: bc.isPEP });
				const lastSn = await getLastBcScreeningSnapshot(prisma, bc.id);
				const isPEP =
					updateData.isPEP === true
						? true
						: updateData.isPEP === false
							? false
							: bc.isPEP;
				const adverse =
					typeof updateData.adverseMediaFlagged === "boolean"
						? updateData.adverseMediaFlagged
						: bc.adverseMediaFlagged;
				const after = {
					ofac: bc.ofacSanctioned,
					un: bc.unscSanctioned,
					sat69b: bc.sat69bListed,
					pep: isPEP,
					adverse,
				};
				const changeFlags = computeNewPositives(before, after);
				const snapId = newScreeningSnapshotId();
				if (body.status === "completed") {
					await prisma.$transaction([
						prisma.beneficialControllerWatchlistScreening.create({
							data: {
								id: snapId,
								organizationId: pClient.organizationId,
								beneficialControllerId: bc.id,
								clientId: bc.clientId,
								watchlistQueryId: body.queryId,
								screenedAt: nowAt,
								triggeredBy: "callback",
								screeningResult: updateData.screeningResult as string,
								ofacSanctioned: after.ofac,
								unscSanctioned: after.un,
								sat69bListed: after.sat69b,
								isPep: after.pep,
								adverseMediaFlagged: after.adverse,
								changeFlags: serializeChangeFlags(changeFlags),
								prevSnapshotId: lastSn?.id ?? null,
							},
						}),
						prisma.beneficialController.update({
							where: { id: bc.id },
							data: updateData,
						}),
					]);
				} else {
					return new Response(
						JSON.stringify({
							success: true,
							skipped: true,
							reason: "async_failed",
						}),
						{ headers: { "Content-Type": "application/json" } },
					);
				}
				console.log(
					`[InternalScreening] Updated BC ${bc.id} with callback data: ${body.type}`,
				);
			}

			// Notify the org when a match is confirmed
			if (body.matched && body.status === "completed") {
				const hitType =
					body.type === "pep_official" || body.type === "pep_ai"
						? "pep"
						: "adverse_media";

				if (client) {
					const clientName =
						client.businessName ??
						([client.firstName, client.lastName].filter(Boolean).join(" ") ||
							client.id);
					sendScreeningFlaggedNotification(env, {
						organizationId: client.organizationId,
						entityId: client.id,
						entityName: clientName,
						entityKind: "client",
						hitType,
					}).catch((err) =>
						console.error(
							"[InternalScreening] Unexpected error in screening notification:",
							err,
						),
					);
				} else if (bc) {
					const bcName =
						[bc.firstName, bc.lastName].filter(Boolean).join(" ") || bc.id;
					// Fetch org ID from the parent client
					prisma.client
						.findUnique({
							where: { id: bc.clientId },
							select: { organizationId: true },
						})
						.then((parent) => {
							if (!parent) return;
							sendScreeningFlaggedNotification(env, {
								organizationId: parent.organizationId,
								entityId: bc.id,
								entityName: bcName,
								entityKind: "beneficial_controller",
								hitType,
							});
						})
						.catch((err) =>
							console.error(
								"[InternalScreening] Unexpected error in screening notification:",
								err,
							),
						);
				}
			}

			// Trigger risk reassessment after successful screening data changes
			if (body.status === "completed" && client) {
				const riskQueue = createRiskQueueService(
					env.RISK_ASSESSMENT_QUEUE as Queue<RiskJob> | undefined,
				);
				riskQueue
					.queueScreeningRiskUpdate(
						client.organizationId,
						client.id,
						`screening_callback_${body.type}`,
					)
					.catch((err) =>
						console.error(
							"[InternalScreening] Failed to queue risk reassessment:",
							err,
						),
					);
			}
			if (body.status === "completed" && bc) {
				const riskQueue = createRiskQueueService(
					env.RISK_ASSESSMENT_QUEUE as Queue<RiskJob> | undefined,
				);
				const parent = await prisma.client.findUniqueOrThrow({
					where: { id: bc.clientId },
					select: { organizationId: true },
				});
				riskQueue
					.queueScreeningRiskUpdate(
						parent.organizationId,
						bc.clientId,
						`screening_callback_${body.type}_bc`,
					)
					.catch((err) =>
						console.error(
							"[InternalScreening] Failed to queue risk reassessment (BC):",
							err,
						),
					);
			}

			return new Response(
				JSON.stringify({
					success: true,
					message: "Screening callback processed",
				}),
				{ headers: { "Content-Type": "application/json" } },
			);
		}

		// Route not found
		return new Response(
			JSON.stringify({
				success: false,
				error: "Not found",
			}),
			{ status: 404, headers: { "Content-Type": "application/json" } },
		);
	} catch (error) {
		console.error("[InternalScreening] Error:", error);
		Sentry.captureException(error);

		return new Response(
			JSON.stringify({
				success: false,
				error: error instanceof Error ? error.message : "Internal server error",
			}),
			{ status: 500, headers: { "Content-Type": "application/json" } },
		);
	}
}
