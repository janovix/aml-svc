import { Hono } from "hono";
import type { Prisma } from "@prisma/client";

import type { Bindings } from "../types";
import type { AuthVariables } from "../middleware/auth";
import { getOrganizationId, getTenantContext } from "../middleware/auth";
import { getPrismaClient } from "../lib/prisma";
import { createRiskQueueService, type RiskJob } from "../lib/risk-queue";
import { ClientRiskService, loadRiskLookups } from "../domain/risk";
import {
	mapPrismaAssessmentToApi,
	type ClientRiskAssessmentRow,
} from "../domain/risk/client/map-assessment-api";
import { RiskMethodologyRepository } from "../domain/risk/methodology/repository";

export const riskRouter = new Hono<{
	Bindings: Bindings;
	Variables: AuthVariables;
}>();

// ---------- Client Risk Assessment ----------

riskRouter.post("/:clientId/assessment", async (c) => {
	const organizationId = getOrganizationId(c);
	const clientId = c.req.param("clientId");

	const riskQueue = createRiskQueueService(
		c.env.RISK_ASSESSMENT_QUEUE as Queue<RiskJob> | undefined,
	);

	if (riskQueue.isAvailable()) {
		await riskQueue.queueClientAssess(
			organizationId,
			clientId,
			"manual_trigger",
		);
		return c.json({ status: "queued", clientId }, 202);
	}

	// Fallback: run synchronously if queue unavailable (dev/test)
	const prisma = getPrismaClient(c.env.DB);
	const lookups = await loadRiskLookups(prisma);
	const service = new ClientRiskService(prisma);
	const { result } = await service.assessClient(
		clientId,
		getTenantContext(c),
		lookups,
		"manual_trigger",
	);

	return c.json(result, 200);
});

riskRouter.get("/:clientId/assessment", async (c) => {
	const clientId = c.req.param("clientId");

	const prisma = getPrismaClient(c.env.DB);
	const service = new ClientRiskService(prisma);
	const assessment = await service.getLatestAssessment(
		clientId,
		getTenantContext(c),
	);

	if (!assessment) {
		return c.json({ error: "No risk assessment found" }, 404);
	}

	return c.json({
		assessment: mapPrismaAssessmentToApi(assessment as ClientRiskAssessmentRow),
	});
});

riskRouter.get("/:clientId/history", async (c) => {
	const clientId = c.req.param("clientId");

	const prisma = getPrismaClient(c.env.DB);
	const service = new ClientRiskService(prisma);
	const history = await service.getAssessmentHistory(
		clientId,
		getTenantContext(c),
	);

	return c.json({
		assessments: (history as ClientRiskAssessmentRow[]).map(
			mapPrismaAssessmentToApi,
		),
	});
});

// ---------- Batch Assessment ----------

riskRouter.post("/batch-assess", async (c) => {
	const organizationId = getOrganizationId(c);

	const riskQueue = createRiskQueueService(
		c.env.RISK_ASSESSMENT_QUEUE as Queue<RiskJob> | undefined,
	);

	if (!riskQueue.isAvailable()) {
		return c.json({ error: "Risk assessment queue not available" }, 503);
	}

	await riskQueue.queueClientBatchAssess(
		organizationId,
		"manual_batch_trigger",
	);

	return c.json({ status: "queued", organizationId }, 202);
});

// ---------- Dashboard ----------

riskRouter.get("/dashboard", async (c) => {
	const organizationId = getOrganizationId(c);

	const prisma = getPrismaClient(c.env.DB);
	const service = new ClientRiskService(prisma);

	const tenant = getTenantContext(c);
	const distribution = await service.getRiskDistribution(tenant);
	const dueForReview = await service.getClientsDueForReview(tenant);

	const orgAssessment = await prisma.orgRiskAssessment.findFirst({
		where: { organizationId, status: "ACTIVE" },
		orderBy: { version: "desc" },
	});

	return c.json({
		clientRiskDistribution: distribution,
		clientsPendingReview: dueForReview.length,
		orgAssessment: orgAssessment
			? {
					riskLevel: orgAssessment.riskLevel,
					residualRiskScore: orgAssessment.residualRiskScore,
					requiredAuditType: orgAssessment.requiredAuditType,
					fpRiskLevel: orgAssessment.fpRiskLevel,
					nextReviewDeadline: orgAssessment.nextReviewDeadline,
				}
			: null,
	});
});

// ---------- Organization EBR ----------

riskRouter.post("/org-assessment", async (c) => {
	const organizationId = getOrganizationId(c);

	const riskQueue = createRiskQueueService(
		c.env.RISK_ASSESSMENT_QUEUE as Queue<RiskJob> | undefined,
	);

	if (!riskQueue.isAvailable()) {
		return c.json({ error: "Risk assessment queue not available" }, 503);
	}

	await riskQueue.queueOrgAssess(organizationId, "manual_trigger");

	return c.json({ status: "queued", organizationId }, 202);
});

riskRouter.get("/org-assessment", async (c) => {
	const organizationId = getOrganizationId(c);

	const prisma = getPrismaClient(c.env.DB);
	const assessment = await prisma.orgRiskAssessment.findFirst({
		where: { organizationId, status: "ACTIVE" },
		orderBy: { version: "desc" },
		include: { elements: true, mitigants: true },
	});

	if (!assessment) {
		// Empty state: no EBR run yet — use 200 so dashboards and proxies do not treat this as a route/client error.
		return c.json({ assessment: null });
	}

	return c.json({
		assessment: {
			...assessment,
			elements: assessment.elements.map((e) => ({
				...e,
				factorBreakdown: JSON.parse(e.factorBreakdown),
			})),
		},
	});
});

riskRouter.get("/org-assessment/history", async (c) => {
	const organizationId = getOrganizationId(c);

	const prisma = getPrismaClient(c.env.DB);
	const history = await prisma.orgRiskAssessment.findMany({
		where: { organizationId },
		orderBy: { version: "desc" },
	});

	return c.json(history);
});

// ---------- Evolution Tracking ----------

riskRouter.get("/org-assessment/evolution", async (c) => {
	const organizationId = getOrganizationId(c);

	const prisma = getPrismaClient(c.env.DB);
	const assessments = await prisma.orgRiskAssessment.findMany({
		where: { organizationId },
		orderBy: { version: "asc" },
		include: { elements: true },
	});

	const evolution = assessments.map((a) => ({
		version: a.version,
		date: a.createdAt,
		riskLevel: a.riskLevel,
		inherentRiskScore: a.inherentRiskScore,
		residualRiskScore: a.residualRiskScore,
		requiredAuditType: a.requiredAuditType,
		elements: a.elements.map((e) => ({
			elementType: e.elementType,
			riskScore: e.riskScore,
			riskLevel: e.riskLevel,
		})),
	}));

	return c.json({ organizationId, evolution });
});

// ---------- Authority Reporting (GAFI R.1 Cr.1.12.d) ----------

riskRouter.get("/authority-report", async (c) => {
	const organizationId = getOrganizationId(c);
	const prisma = getPrismaClient(c.env.DB);

	const tenant = getTenantContext(c);
	const [orgAssessment, distribution, highRiskClients] = await Promise.all([
		prisma.orgRiskAssessment.findFirst({
			where: { organizationId, status: "ACTIVE" },
			include: { elements: true, mitigants: true },
		}),
		new ClientRiskService(prisma).getRiskDistribution(tenant),
		prisma.client.findMany({
			where: {
				organizationId,
				riskLevel: "HIGH",
				deletedAt: null,
			},
			select: {
				id: true,
				rfc: true,
				personType: true,
				firstName: true,
				lastName: true,
				businessName: true,
				riskLevel: true,
				dueDiligenceLevel: true,
				isPEP: true,
			},
		}),
	]);

	return c.json({
		generatedAt: new Date().toISOString(),
		organizationId,
		entityRiskAssessment: orgAssessment,
		clientRiskDistribution: distribution,
		highRiskClients,
	});
});

riskRouter.get("/export", async (c) => {
	const organizationId = getOrganizationId(c);
	const prisma = getPrismaClient(c.env.DB);

	const [orgAssessments, clientAssessments] = await Promise.all([
		prisma.orgRiskAssessment.findMany({
			where: { organizationId },
			include: { elements: true, mitigants: true },
			orderBy: { version: "desc" },
		}),
		prisma.clientRiskAssessment.findMany({
			where: { organizationId },
			orderBy: { version: "desc" },
		}),
	]);

	return c.json({
		exportedAt: new Date().toISOString(),
		organizationId,
		orgAssessments,
		clientAssessments,
	});
});

// ---------- Methodology (org-scoped) ----------

/**
 * GET /api/v1/risk/methodology
 * Get the effective methodology for the current org (with source scope)
 */
riskRouter.get("/methodology", async (c) => {
	const organizationId = getOrganizationId(c);
	const prisma = getPrismaClient(c.env.DB);
	const repo = new RiskMethodologyRepository(prisma);

	const orgSettings = await prisma.organizationSettings.findFirst({
		where: { organizationId },
		select: { activityKey: true },
	});
	const activityKey = orgSettings?.activityKey ?? "DEFAULT";

	const methodology = await repo.resolve(getTenantContext(c), activityKey);

	return c.json({ success: true, data: methodology });
});

/**
 * PUT /api/v1/risk/methodology
 * Save org-level methodology override (clones effective into ORGANIZATION scope)
 */
riskRouter.put("/methodology", async (c) => {
	const organizationId = getOrganizationId(c);
	const prisma = getPrismaClient(c.env.DB);
	const repo = new RiskMethodologyRepository(prisma);
	const body = await c.req.json();
	const userId = c.get("user").id;

	// Archive any existing org override
	await repo.resetOrgToDefault(getTenantContext(c), userId);

	const methodology = await repo.create({
		scope: "ORGANIZATION",
		organizationId,
		name: body.name ?? "Custom Methodology",
		description: body.description,
		createdBy: userId,
		categories: body.categories ?? [],
		thresholds: body.thresholds ?? [],
		mitigants: body.mitigants ?? [],
	});

	return c.json({ success: true, data: methodology });
});

/**
 * POST /api/v1/risk/methodology/reset
 * Archive org override, revert to activity/system default
 */
riskRouter.post("/methodology/reset", async (c) => {
	const organizationId = getOrganizationId(c);
	const prisma = getPrismaClient(c.env.DB);
	const repo = new RiskMethodologyRepository(prisma);
	const userId = c.get("user").id;

	await repo.resetOrgToDefault(getTenantContext(c), userId);

	// Return the new effective methodology after reset
	const orgSettings = await prisma.organizationSettings.findFirst({
		where: { organizationId },
		select: { activityKey: true },
	});
	const activityKey = orgSettings?.activityKey ?? "DEFAULT";
	const methodology = await repo.resolve(getTenantContext(c), activityKey);

	return c.json({ success: true, data: methodology });
});

// ---------- Evaluations List/Detail ----------

/**
 * GET /api/v1/risk/evaluations
 * Paginated list of client risk assessments for the org
 */
riskRouter.get("/evaluations", async (c) => {
	const organizationId = getOrganizationId(c);
	const prisma = getPrismaClient(c.env.DB);

	const page = Math.max(1, parseInt(c.req.query("page") || "1", 10));
	const limit = Math.min(parseInt(c.req.query("limit") || "20", 10), 100);
	const search = c.req.query("search") ?? "";
	const riskLevel = c.req.query("riskLevel") ?? "";
	const triggerReason = c.req.query("triggerReason") ?? "";
	const clientId = c.req.query("clientId") ?? "";
	const sortField = c.req.query("sort") ?? "assessedAt";
	const sortDirection = c.req.query("direction") === "asc" ? "asc" : "desc";

	const where: Prisma.ClientRiskAssessmentWhereInput = { organizationId };

	if (riskLevel) where.riskLevel = riskLevel;
	if (triggerReason) where.triggerReason = triggerReason;
	if (clientId) where.clientId = clientId;

	if (search) {
		where.client = {
			OR: [
				{ firstName: { contains: search } },
				{ lastName: { contains: search } },
				{ businessName: { contains: search } },
				{ rfc: { contains: search } },
			],
		};
	}

	const orderBy: Record<string, string> = {};
	const allowedSortFields = [
		"assessedAt",
		"residualRiskScore",
		"riskLevel",
		"createdAt",
	];
	if (allowedSortFields.includes(sortField)) {
		orderBy[sortField] = sortDirection;
	} else {
		orderBy.assessedAt = "desc";
	}

	const [assessments, total] = await Promise.all([
		prisma.clientRiskAssessment.findMany({
			where,
			skip: (page - 1) * limit,
			take: limit,
			orderBy,
			include: {
				client: {
					select: {
						id: true,
						firstName: true,
						lastName: true,
						businessName: true,
						rfc: true,
						personType: true,
					},
				},
			},
		}),
		prisma.clientRiskAssessment.count({ where }),
	]);

	// Get filter metadata
	const [riskLevelCounts, triggerReasonCounts] = await Promise.all([
		prisma.clientRiskAssessment.groupBy({
			by: ["riskLevel"],
			where: { organizationId },
			_count: { riskLevel: true },
		}),
		prisma.clientRiskAssessment.groupBy({
			by: ["triggerReason"],
			where: { organizationId, triggerReason: { not: null } },
			_count: { triggerReason: true },
		}),
	]);

	return c.json({
		success: true,
		data: assessments.map((a) => ({
			id: a.id,
			clientId: a.clientId,
			clientName:
				a.client.businessName ||
				`${a.client.firstName ?? ""} ${a.client.lastName ?? ""}`.trim(),
			clientRfc: a.client.rfc,
			clientPersonType: a.client.personType,
			riskLevel: a.riskLevel,
			dueDiligenceLevel: a.dueDiligenceLevel,
			inherentRiskScore: a.inherentRiskScore,
			residualRiskScore: a.residualRiskScore,
			triggerReason: a.triggerReason,
			assessedAt: a.assessedAt.toISOString(),
			methodologyId: a.methodologyId,
			version: a.version,
		})),
		pagination: {
			page,
			limit,
			total,
			totalPages: Math.ceil(total / limit),
		},
		filterMeta: {
			riskLevels: riskLevelCounts.map((r) => ({
				value: r.riskLevel,
				count: r._count.riskLevel,
			})),
			triggerReasons: triggerReasonCounts.map((t) => ({
				value: t.triggerReason,
				count: t._count.triggerReason,
			})),
		},
	});
});

/**
 * GET /api/v1/risk/evaluations/:id
 * Single assessment detail with parsed factors
 */
riskRouter.get("/evaluations/:id", async (c) => {
	const organizationId = getOrganizationId(c);
	const id = c.req.param("id");
	const prisma = getPrismaClient(c.env.DB);

	const assessment = await prisma.clientRiskAssessment.findFirst({
		where: { id, organizationId },
		include: {
			client: {
				select: {
					id: true,
					firstName: true,
					lastName: true,
					businessName: true,
					rfc: true,
					personType: true,
					isPEP: true,
					countryCode: true,
					stateCode: true,
				},
			},
		},
	});

	if (!assessment) {
		return c.json({ success: false, error: "Not found" }, 404);
	}

	return c.json({
		success: true,
		data: {
			id: assessment.id,
			clientId: assessment.clientId,
			client: {
				id: assessment.client.id,
				name:
					assessment.client.businessName ||
					`${assessment.client.firstName ?? ""} ${assessment.client.lastName ?? ""}`.trim(),
				rfc: assessment.client.rfc,
				personType: assessment.client.personType,
				isPEP: assessment.client.isPEP,
				countryCode: assessment.client.countryCode,
				stateCode: assessment.client.stateCode,
			},
			riskLevel: assessment.riskLevel,
			dueDiligenceLevel: assessment.dueDiligenceLevel,
			inherentRiskScore: assessment.inherentRiskScore,
			residualRiskScore: assessment.residualRiskScore,
			clientFactors: JSON.parse(assessment.clientFactors),
			geographicFactors: JSON.parse(assessment.geographicFactors),
			activityFactors: JSON.parse(assessment.activityFactors),
			transactionFactors: JSON.parse(assessment.transactionFactors),
			mitigantFactors: JSON.parse(assessment.mitigantFactors),
			assessedAt: assessment.assessedAt.toISOString(),
			nextReviewAt: assessment.nextReviewAt.toISOString(),
			assessedBy: assessment.assessedBy,
			triggerReason: assessment.triggerReason,
			methodologyId: assessment.methodologyId,
			version: assessment.version,
		},
	});
});
