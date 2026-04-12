import { Hono } from "hono";
import type { AlertStatus, NoticeStatus, Prisma } from "@prisma/client";

import type { Bindings } from "../types";
import {
	adminAuthMiddleware,
	type AdminAuthVariables,
} from "../middleware/admin-auth";
import { getPrismaClient } from "../lib/prisma";
import {
	OrganizationSettingsRepository,
	OrganizationSettingsService,
	organizationSettingsCreateSchema,
	organizationSettingsUpdateSchema,
} from "../domain/organization-settings";
import { RiskMethodologyRepository } from "../domain/risk/methodology/repository";

export const adminRouter = new Hono<{
	Bindings: Bindings;
	Variables: AdminAuthVariables;
}>();

// Apply admin auth middleware to all admin routes
adminRouter.use("*", adminAuthMiddleware());

/**
 * GET /api/v1/admin/stats
 * Platform-wide statistics across all organizations
 */
adminRouter.get("/stats", async (c) => {
	const prisma = getPrismaClient(c.env.DB);

	const [
		totalClients,
		totalOperations,
		totalAlerts,
		totalNotices,
		alertsByStatus,
		noticesByStatus,
		recentAlerts,
	] = await Promise.all([
		prisma.client.count({ where: { deletedAt: null } }),
		prisma.operation.count({ where: { deletedAt: null } }),
		prisma.alert.count(),
		prisma.notice.count(),
		prisma.alert.groupBy({
			by: ["status"],
			_count: { status: true },
		}),
		prisma.notice.groupBy({
			by: ["status"],
			_count: { status: true },
		}),
		prisma.alert.findMany({
			take: 5,
			orderBy: { createdAt: "desc" },
			select: {
				id: true,
				organizationId: true,
				status: true,
				severity: true,
				createdAt: true,
				alertRule: {
					select: { name: true },
				},
			},
		}),
	]);

	// Transform grouped data to object
	const alertStatusCounts = alertsByStatus.reduce(
		(acc, item) => {
			acc[item.status] = item._count.status;
			return acc;
		},
		{} as Record<string, number>,
	);

	const noticeStatusCounts = noticesByStatus.reduce(
		(acc, item) => {
			acc[item.status] = item._count.status;
			return acc;
		},
		{} as Record<string, number>,
	);

	return c.json({
		success: true,
		data: {
			totals: {
				clients: totalClients,
				operations: totalOperations,
				alerts: totalAlerts,
				notices: totalNotices,
			},
			alerts: {
				byStatus: alertStatusCounts,
			},
			notices: {
				byStatus: noticeStatusCounts,
			},
			recentAlerts: recentAlerts.map((alert) => ({
				id: alert.id,
				organizationId: alert.organizationId,
				status: alert.status,
				severity: alert.severity,
				ruleName: alert.alertRule.name,
				createdAt: alert.createdAt.toISOString(),
			})),
		},
	});
});

/**
 * GET /api/v1/admin/alerts
 * List alerts across all organizations with pagination
 */
adminRouter.get("/alerts", async (c) => {
	const prisma = getPrismaClient(c.env.DB);

	const page = parseInt(c.req.query("page") || "1", 10);
	const limit = Math.min(parseInt(c.req.query("limit") || "20", 10), 100);
	const status = c.req.query("status") as AlertStatus | undefined;
	const severity = c.req.query("severity");
	const organizationId = c.req.query("organizationId");

	const where: Prisma.AlertWhereInput = {};

	if (status) where.status = status;
	if (severity) where.severity = severity as Prisma.AlertWhereInput["severity"];
	if (organizationId) where.organizationId = organizationId;

	const [alerts, total] = await Promise.all([
		prisma.alert.findMany({
			where,
			skip: (page - 1) * limit,
			take: limit,
			orderBy: { createdAt: "desc" },
			include: {
				alertRule: {
					select: { id: true, name: true, severity: true },
				},
				client: {
					select: {
						id: true,
						firstName: true,
						lastName: true,
						businessName: true,
						rfc: true,
					},
				},
			},
		}),
		prisma.alert.count({ where }),
	]);

	return c.json({
		success: true,
		data: alerts.map((alert) => ({
			id: alert.id,
			organizationId: alert.organizationId,
			status: alert.status,
			severity: alert.severity,
			isManual: alert.isManual,
			submissionDeadline: alert.submissionDeadline?.toISOString() ?? null,
			submittedAt: alert.submittedAt?.toISOString() ?? null,
			isOverdue: alert.isOverdue,
			createdAt: alert.createdAt.toISOString(),
			alertRule: alert.alertRule,
			client: alert.client
				? {
						id: alert.client.id,
						name:
							alert.client.businessName ||
							`${alert.client.firstName} ${alert.client.lastName}`.trim(),
						rfc: alert.client.rfc,
					}
				: null,
		})),
		pagination: {
			page,
			limit,
			total,
			totalPages: Math.ceil(total / limit),
		},
	});
});

/**
 * GET /api/v1/admin/notices
 * List notices across all organizations with pagination
 */
adminRouter.get("/notices", async (c) => {
	const prisma = getPrismaClient(c.env.DB);

	const page = parseInt(c.req.query("page") || "1", 10);
	const limit = Math.min(parseInt(c.req.query("limit") || "20", 10), 100);
	const status = c.req.query("status") as NoticeStatus | undefined;
	const organizationId = c.req.query("organizationId");

	const where: Prisma.NoticeWhereInput = {};

	if (status) where.status = status;
	if (organizationId) where.organizationId = organizationId;

	const [notices, total] = await Promise.all([
		prisma.notice.findMany({
			where,
			skip: (page - 1) * limit,
			take: limit,
			orderBy: { createdAt: "desc" },
			include: {
				_count: { select: { alerts: true } },
			},
		}),
		prisma.notice.count({ where }),
	]);

	return c.json({
		success: true,
		data: notices.map((notice) => ({
			id: notice.id,
			organizationId: notice.organizationId,
			name: notice.name,
			status: notice.status,
			periodStart: notice.periodStart.toISOString(),
			periodEnd: notice.periodEnd.toISOString(),
			reportedMonth: notice.reportedMonth,
			recordCount: notice.recordCount,
			alertCount: notice._count.alerts,
			generatedAt: notice.generatedAt?.toISOString() ?? null,
			submittedAt: notice.submittedAt?.toISOString() ?? null,
			createdAt: notice.createdAt.toISOString(),
		})),
		pagination: {
			page,
			limit,
			total,
			totalPages: Math.ceil(total / limit),
		},
	});
});

/**
 * GET /api/v1/admin/organizations
 * List organizations with AML statistics
 */
adminRouter.get("/organizations", async (c) => {
	const prisma = getPrismaClient(c.env.DB);

	const page = parseInt(c.req.query("page") || "1", 10);
	const limit = Math.min(parseInt(c.req.query("limit") || "20", 10), 100);

	// Get unique organization IDs from clients (since we don't have orgs table in aml-svc)
	const orgIds = await prisma.client.findMany({
		where: { deletedAt: null },
		select: { organizationId: true },
		distinct: ["organizationId"],
	});

	const uniqueOrgIds = orgIds.map((o) => o.organizationId);
	const total = uniqueOrgIds.length;

	// Paginate org IDs
	const paginatedOrgIds = uniqueOrgIds.slice((page - 1) * limit, page * limit);

	// Get stats for each organization
	const orgStats = await Promise.all(
		paginatedOrgIds.map(async (orgId) => {
			const [clientCount, operationCount, alertCount, noticeCount, settings] =
				await Promise.all([
					prisma.client.count({
						where: { organizationId: orgId, deletedAt: null },
					}),
					prisma.operation.count({
						where: { organizationId: orgId, deletedAt: null },
					}),
					prisma.alert.count({
						where: { organizationId: orgId },
					}),
					prisma.notice.count({
						where: { organizationId: orgId },
					}),
					prisma.organizationSettings.findUnique({
						where: { organizationId: orgId },
					}),
				]);

			return {
				organizationId: orgId,
				stats: {
					clients: clientCount,
					operations: operationCount,
					alerts: alertCount,
					notices: noticeCount,
				},
				settings: settings
					? {
							obligatedSubjectKey: settings.obligatedSubjectKey,
							activityKey: settings.activityKey,
						}
					: null,
			};
		}),
	);

	return c.json({
		success: true,
		data: orgStats,
		pagination: {
			page,
			limit,
			total,
			totalPages: Math.ceil(total / limit),
		},
	});
});

/**
 * GET /api/v1/admin/organizations/:id
 * Get detailed AML stats for a specific organization
 */
adminRouter.get("/organizations/:id", async (c) => {
	const prisma = getPrismaClient(c.env.DB);
	const orgId = c.req.param("id");

	const [
		clientCount,
		operationCount,
		alertsByStatus,
		noticesByStatus,
		settings,
		recentAlerts,
		recentNotices,
	] = await Promise.all([
		prisma.client.count({
			where: { organizationId: orgId, deletedAt: null },
		}),
		prisma.operation.count({
			where: { organizationId: orgId, deletedAt: null },
		}),
		prisma.alert.groupBy({
			by: ["status"],
			where: { organizationId: orgId },
			_count: { status: true },
		}),
		prisma.notice.groupBy({
			by: ["status"],
			where: { organizationId: orgId },
			_count: { status: true },
		}),
		prisma.organizationSettings.findUnique({
			where: { organizationId: orgId },
		}),
		prisma.alert.findMany({
			where: { organizationId: orgId },
			take: 10,
			orderBy: { createdAt: "desc" },
			include: {
				alertRule: { select: { name: true } },
			},
		}),
		prisma.notice.findMany({
			where: { organizationId: orgId },
			take: 10,
			orderBy: { createdAt: "desc" },
		}),
	]);

	const alertStatusCounts = alertsByStatus.reduce(
		(acc, item) => {
			acc[item.status] = item._count.status;
			return acc;
		},
		{} as Record<string, number>,
	);

	const noticeStatusCounts = noticesByStatus.reduce(
		(acc, item) => {
			acc[item.status] = item._count.status;
			return acc;
		},
		{} as Record<string, number>,
	);

	return c.json({
		success: true,
		data: {
			organizationId: orgId,
			stats: {
				clients: clientCount,
				operations: operationCount,
				alerts: {
					total: Object.values(alertStatusCounts).reduce((a, b) => a + b, 0),
					byStatus: alertStatusCounts,
				},
				notices: {
					total: Object.values(noticeStatusCounts).reduce((a, b) => a + b, 0),
					byStatus: noticeStatusCounts,
				},
			},
			settings: settings
				? {
						obligatedSubjectKey: settings.obligatedSubjectKey,
						activityKey: settings.activityKey,
					}
				: null,
			recentAlerts: recentAlerts.map((alert) => ({
				id: alert.id,
				status: alert.status,
				severity: alert.severity,
				ruleName: alert.alertRule.name,
				createdAt: alert.createdAt.toISOString(),
			})),
			recentNotices: recentNotices.map((notice) => ({
				id: notice.id,
				name: notice.name,
				status: notice.status,
				reportedMonth: notice.reportedMonth,
				createdAt: notice.createdAt.toISOString(),
			})),
		},
	});
});

// =============================================================================
// Organization Settings (Admin) - Replaces auth-svc proxy
// =============================================================================

/**
 * GET /api/v1/admin/organization-settings/:orgId
 * Get AML compliance settings for a specific organization (admin only)
 *
 * Previously proxied through auth-svc via service binding.
 * Now directly accessible by admin panel with JWT admin auth.
 */
adminRouter.get("/organization-settings/:orgId", async (c) => {
	const prisma = getPrismaClient(c.env.DB);
	const orgId = c.req.param("orgId");
	const repository = new OrganizationSettingsRepository(prisma);
	const service = new OrganizationSettingsService(repository);

	const settings = await service.getByOrganizationId(orgId);

	if (!settings) {
		return c.json({
			success: true,
			data: { configured: false, settings: null },
		});
	}

	return c.json({
		success: true,
		data: { configured: true, settings },
	});
});

/**
 * PUT /api/v1/admin/organization-settings/:orgId
 * Create or update AML compliance settings (admin only)
 *
 * Previously proxied through auth-svc via service binding.
 */
adminRouter.put("/organization-settings/:orgId", async (c) => {
	const prisma = getPrismaClient(c.env.DB);
	const orgId = c.req.param("orgId");
	const repository = new OrganizationSettingsRepository(prisma);
	const service = new OrganizationSettingsService(repository);

	const body = await c.req.json();
	const parseResult = organizationSettingsCreateSchema.safeParse(body);

	if (!parseResult.success) {
		return c.json(
			{
				success: false,
				error: "Validation Error",
				details: parseResult.error.format(),
			},
			400,
		);
	}

	const settings = await service.createOrUpdate(orgId, parseResult.data);
	return c.json({ success: true, data: { configured: true, settings } });
});

/**
 * PATCH /api/v1/admin/organization-settings/:orgId
 * Partial update AML compliance settings (admin only)
 *
 * Previously proxied through auth-svc via service binding.
 */
adminRouter.patch("/organization-settings/:orgId", async (c) => {
	const prisma = getPrismaClient(c.env.DB);
	const orgId = c.req.param("orgId");
	const repository = new OrganizationSettingsRepository(prisma);
	const service = new OrganizationSettingsService(repository);

	// Check if settings exist first
	const existing = await service.getByOrganizationId(orgId);
	if (!existing) {
		return c.json(
			{
				success: false,
				configured: false,
				error: "Not Configured",
				message:
					"Organization settings have not been configured yet. Use PUT to create them.",
			},
			404,
		);
	}

	const body = await c.req.json();
	const parseResult = organizationSettingsUpdateSchema.safeParse(body);

	if (!parseResult.success) {
		return c.json(
			{
				success: false,
				error: "Validation Error",
				details: parseResult.error.format(),
			},
			400,
		);
	}

	if (Object.keys(parseResult.data).length === 0) {
		return c.json(
			{
				success: false,
				error: "Validation Error",
				message: "Payload is empty",
			},
			400,
		);
	}

	const settings = await service.update(orgId, parseResult.data);
	return c.json({
		success: true,
		data: { configured: true, settings },
	});
});

// =============================================================================
// Risk Methodology (Admin)
// =============================================================================

/**
 * GET /api/v1/admin/risk-methodologies
 * List all SYSTEM + ACTIVITY methodologies (excludes ORGANIZATION scope)
 */
adminRouter.get("/risk-methodologies", async (c) => {
	const prisma = getPrismaClient(c.env.DB);
	const repo = new RiskMethodologyRepository(prisma);

	const scopeFilter = c.req.query("scope") as "SYSTEM" | "ACTIVITY" | undefined;
	const methodologies = await repo.listAll(scopeFilter);

	return c.json({
		success: true,
		data: methodologies,
	});
});

/**
 * GET /api/v1/admin/risk-methodologies/:id
 * Get a single methodology with all relations
 */
adminRouter.get("/risk-methodologies/:id", async (c) => {
	const prisma = getPrismaClient(c.env.DB);
	const repo = new RiskMethodologyRepository(prisma);
	const id = c.req.param("id");

	const methodology = await repo.getById(id);
	if (!methodology) {
		return c.json({ success: false, error: "Not found" }, 404);
	}

	return c.json({ success: true, data: methodology });
});

/**
 * POST /api/v1/admin/risk-methodologies
 * Create an activity-default methodology
 */
adminRouter.post("/risk-methodologies", async (c) => {
	const prisma = getPrismaClient(c.env.DB);
	const repo = new RiskMethodologyRepository(prisma);

	const body = await c.req.json();
	const adminId = c.get("adminUser").id;

	if (!body.activityKey && body.scope === "ACTIVITY") {
		return c.json(
			{ success: false, error: "activityKey is required for ACTIVITY scope" },
			400,
		);
	}

	const methodology = await repo.create({
		scope: (body.scope as "SYSTEM" | "ACTIVITY") ?? "ACTIVITY",
		activityKey: body.activityKey as string | undefined,
		name: body.name as string,
		description: body.description as string | undefined,
		createdBy: adminId,
		categories: body.categories ?? [],
		thresholds: body.thresholds ?? [],
		mitigants: body.mitigants ?? [],
	});

	return c.json({ success: true, data: methodology }, 201);
});

/**
 * PUT /api/v1/admin/risk-methodologies/:id
 * Update an existing methodology (archives old, creates new version)
 */
adminRouter.put("/risk-methodologies/:id", async (c) => {
	const prisma = getPrismaClient(c.env.DB);
	const repo = new RiskMethodologyRepository(prisma);
	const id = c.req.param("id");
	const body = await c.req.json();
	const adminId = c.get("adminUser").id;

	const existing = await repo.getById(id);
	if (!existing) {
		return c.json({ success: false, error: "Not found" }, 404);
	}

	// Archive current version
	await repo.archive(id, adminId, body.justification ?? "Updated by admin");

	// Retrieve the raw record to get scope/activity/org info
	const rawMethodology = await prisma.riskMethodology.findUnique({
		where: { id },
	});

	// Create new version
	const methodology = await repo.create({
		scope: (rawMethodology?.scope as "SYSTEM" | "ACTIVITY") ?? "ACTIVITY",
		activityKey: rawMethodology?.activityKey ?? undefined,
		organizationId: rawMethodology?.organizationId ?? undefined,
		name: body.name ?? existing.name,
		description: body.description,
		createdBy: adminId,
		categories: body.categories ?? existing.categories,
		thresholds: body.thresholds ?? existing.thresholds,
		mitigants: body.mitigants ?? existing.mitigants,
	});

	return c.json({ success: true, data: methodology });
});

/**
 * DELETE /api/v1/admin/risk-methodologies/:id
 * Archive a methodology (soft delete)
 */
adminRouter.delete("/risk-methodologies/:id", async (c) => {
	const prisma = getPrismaClient(c.env.DB);
	const repo = new RiskMethodologyRepository(prisma);
	const id = c.req.param("id");
	const adminId = c.get("adminUser").id;
	const body = await c.req.json().catch(() => ({}));

	const existing = await repo.getById(id);
	if (!existing) {
		return c.json({ success: false, error: "Not found" }, 404);
	}

	await repo.archive(
		id,
		adminId,
		(body as Record<string, string>).justification,
	);

	return c.json({ success: true });
});

/**
 * POST /api/v1/admin/risk-methodologies/seed
 * Ensure the system default methodology exists
 */
adminRouter.post("/risk-methodologies/seed", async (c) => {
	const prisma = getPrismaClient(c.env.DB);
	const repo = new RiskMethodologyRepository(prisma);

	const methodology = await repo.seedSystemDefault();

	return c.json({ success: true, data: methodology });
});
