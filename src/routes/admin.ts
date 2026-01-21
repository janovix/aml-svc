import { Hono } from "hono";
import type { AlertStatus, NoticeStatus, Prisma } from "@prisma/client";

import type { Bindings } from "../index";
import {
	adminAuthMiddleware,
	type AdminAuthVariables,
} from "../middleware/admin-auth";
import { getPrismaClient } from "../lib/prisma";

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
		totalTransactions,
		totalAlerts,
		totalNotices,
		alertsByStatus,
		noticesByStatus,
		recentAlerts,
	] = await Promise.all([
		prisma.client.count({ where: { deletedAt: null } }),
		prisma.transaction.count({ where: { deletedAt: null } }),
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
				transactions: totalTransactions,
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
			satFolioNumber: notice.satFolioNumber,
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
			const [clientCount, transactionCount, alertCount, noticeCount, settings] =
				await Promise.all([
					prisma.client.count({
						where: { organizationId: orgId, deletedAt: null },
					}),
					prisma.transaction.count({
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
					transactions: transactionCount,
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
		transactionCount,
		alertsByStatus,
		noticesByStatus,
		settings,
		recentAlerts,
		recentNotices,
	] = await Promise.all([
		prisma.client.count({
			where: { organizationId: orgId, deletedAt: null },
		}),
		prisma.transaction.count({
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
				transactions: transactionCount,
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
