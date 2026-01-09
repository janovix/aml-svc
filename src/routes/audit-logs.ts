/**
 * Audit Logs Routes
 *
 * Read-only API endpoints for accessing and verifying the audit trail.
 * The audit log is append-only; entries are created internally by the system.
 */

import { Hono } from "hono";
import type { Context } from "hono";
import { ZodError } from "zod";

import {
	AuditLogRepository,
	AuditLogService,
	AuditLogFiltersSchema,
	ChainVerifyRequestSchema,
	AuditExportRequestSchema,
	EntityHistoryRequestSchema,
	AuditEntityTypeSchema,
} from "../domain/audit";
import type { Bindings } from "../index";
import { getPrismaClient } from "../lib/prisma";
import { DEFAULT_AUDIT_SECRET_KEY } from "../lib/audit-crypto";
import { type AuthVariables, getOrganizationId } from "../middleware/auth";
import { APIError } from "../middleware/error";

export const auditLogsRouter = new Hono<{
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
	// Use environment variable for secret key if available
	const secretKey = c.env.AUDIT_SECRET_KEY || DEFAULT_AUDIT_SECRET_KEY;
	const repository = new AuditLogRepository(prisma, secretKey);
	return new AuditLogService(repository, secretKey);
}

function handleServiceError(error: unknown): never {
	if (error instanceof Error) {
		if (error.message === "AUDIT_LOG_NOT_FOUND") {
			throw new APIError(404, "Audit log entry not found");
		}
	}
	throw error;
}

/**
 * GET /audit-logs
 * List audit logs with filtering and pagination
 */
auditLogsRouter.get("/", async (c) => {
	const organizationId = getOrganizationId(c);
	const url = new URL(c.req.url);
	const queryObject = Object.fromEntries(url.searchParams.entries());
	const filters = parseWithZod(AuditLogFiltersSchema, queryObject);

	const service = getService(c);
	const result = await service
		.list(organizationId, filters)
		.catch(handleServiceError);

	return c.json(result);
});

/**
 * GET /audit-logs/stats
 * Get audit log statistics
 */
auditLogsRouter.get("/stats", async (c) => {
	const organizationId = getOrganizationId(c);
	const service = getService(c);
	const stats = await service
		.getStats(organizationId)
		.catch(handleServiceError);
	return c.json(stats);
});

/**
 * POST /audit-logs/verify
 * Verify the integrity of the audit log chain
 */
auditLogsRouter.post("/verify", async (c) => {
	const organizationId = getOrganizationId(c);
	const body = await c.req.json().catch(() => ({}));
	const request = parseWithZod(ChainVerifyRequestSchema, body);

	const service = getService(c);
	const result = await service
		.verifyChain(organizationId, request)
		.catch(handleServiceError);

	return c.json(result);
});

/**
 * POST /audit-logs/export
 * Export audit logs for compliance
 */
auditLogsRouter.post("/export", async (c) => {
	const organizationId = getOrganizationId(c);
	const body = await c.req.json().catch(() => ({}));
	const request = parseWithZod(AuditExportRequestSchema, body);

	const service = getService(c);
	const result = await service
		.export(organizationId, request)
		.catch(handleServiceError);

	// For CSV format, convert to CSV string
	if (request.format === "csv") {
		const csvRows: string[] = [];

		// Header row
		csvRows.push(
			[
				"id",
				"entityType",
				"entityId",
				"action",
				"actorId",
				"actorType",
				"timestamp",
				"sequenceNumber",
				"dataHash",
				"signature",
			].join(","),
		);

		// Data rows
		for (const entry of result.data) {
			csvRows.push(
				[
					entry.id,
					entry.entityType,
					entry.entityId,
					entry.action,
					entry.actorId ?? "",
					entry.actorType,
					entry.timestamp,
					entry.sequenceNumber.toString(),
					entry.dataHash,
					entry.signature,
				]
					.map((v) => `"${String(v).replace(/"/g, '""')}"`)
					.join(","),
			);
		}

		return c.text(csvRows.join("\n"), 200, {
			"Content-Type": "text/csv",
			"Content-Disposition": `attachment; filename="audit-logs-${result.exportedAt}.csv"`,
		});
	}

	return c.json(result);
});

/**
 * GET /audit-logs/entity/:entityType/:entityId
 * Get audit history for a specific entity
 */
auditLogsRouter.get("/entity/:entityType/:entityId", async (c) => {
	const organizationId = getOrganizationId(c);

	const entityType = parseWithZod(
		AuditEntityTypeSchema,
		c.req.param("entityType"),
	);
	const entityId = c.req.param("entityId");

	const url = new URL(c.req.url);
	const queryObject = Object.fromEntries(url.searchParams.entries());
	const { page, limit } = parseWithZod(EntityHistoryRequestSchema, queryObject);

	const service = getService(c);
	const result = await service
		.getEntityHistory(organizationId, entityType, entityId, page, limit)
		.catch(handleServiceError);

	return c.json(result);
});

/**
 * GET /audit-logs/:id
 * Get a single audit log entry
 */
auditLogsRouter.get("/:id", async (c) => {
	const organizationId = getOrganizationId(c);
	const id = c.req.param("id");

	const service = getService(c);
	const entry = await service.get(organizationId, id).catch(handleServiceError);

	return c.json(entry);
});
