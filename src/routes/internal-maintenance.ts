/**
 * Internal maintenance routes for automated operations.
 * Protected by INTERNAL_SERVICE_SECRET — not exposed to end-users.
 * Intended for CI/CD workflows and operational tooling.
 */
import { Hono } from "hono";

import type { Bindings } from "../types";
import { getPrismaClient } from "../lib/prisma";
import { recalculateKycProgress } from "../domain/client/kyc-progress";

export const maintenanceRouter = new Hono<{ Bindings: Bindings }>();

/**
 * Authenticate via INTERNAL_SERVICE_SECRET Bearer token.
 * The same secret is used by other internal service-to-service calls.
 */
maintenanceRouter.use("*", async (c, next) => {
	const secret = c.env.INTERNAL_SERVICE_SECRET;
	if (!secret) {
		return c.json(
			{ success: false, error: "Service not configured" },
			503 as const,
		);
	}

	const authHeader = c.req.header("Authorization");
	if (!authHeader || authHeader !== `Bearer ${secret}`) {
		return c.json({ success: false, error: "Unauthorized" }, 401 as const);
	}

	return next();
});

/**
 * POST /api/v1/internal/maintenance/recalculate-kyc
 *
 * Recalculates and persists KYC progress for all clients (or a single org).
 * Supports pagination so the caller can drive batching without Worker timeout risk.
 *
 * Query parameters:
 *   - organizationId?: filter to a single organization
 *   - offset?:         row offset for pagination (default: 0)
 *   - limit?:          batch size (default: 20, max: 50)
 *
 * Response:
 *   { total, processed, errors, duration_ms, nextOffset }
 *   nextOffset is null when there are no more rows to process.
 */
maintenanceRouter.post("/recalculate-kyc", async (c) => {
	const prisma = getPrismaClient(c.env.DB);

	const organizationId = c.req.query("organizationId") || undefined;
	const offset = Math.max(0, parseInt(c.req.query("offset") || "0", 10));
	const limit = Math.min(
		50,
		Math.max(1, parseInt(c.req.query("limit") || "20", 10)),
	);

	const where = {
		deletedAt: null as null,
		...(organizationId ? { organizationId } : {}),
	};

	const started = Date.now();

	const [total, batch] = await Promise.all([
		prisma.client.count({ where }),
		prisma.client.findMany({
			where,
			select: { id: true },
			skip: offset,
			take: limit,
			orderBy: { createdAt: "asc" as const },
		}),
	]);

	let processed = 0;
	let errors = 0;
	const errorDetails: { clientId: string; error: string }[] = [];

	for (const client of batch) {
		try {
			await recalculateKycProgress(prisma, client.id);
			processed++;
		} catch (err) {
			errors++;
			errorDetails.push({
				clientId: client.id,
				error: err instanceof Error ? err.message : "Unknown error",
			});
		}
	}

	const nextOffset =
		offset + batch.length < total ? offset + batch.length : null;

	return c.json({
		success: true,
		data: {
			total,
			offset,
			limit,
			processed,
			errors,
			duration_ms: Date.now() - started,
			nextOffset,
			...(errorDetails.length > 0 ? { errorDetails } : {}),
		},
	});
});
