import { Hono } from "hono";

import type { Bindings } from "../types";
import type { AuthVariables } from "../middleware/auth";
import { getOrganizationId } from "../middleware/auth";
import { getPrismaClient } from "../lib/prisma";
import { createRiskQueueService, type RiskJob } from "../lib/risk-queue";
import { ClientRiskService, loadRiskLookups } from "../domain/risk";

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
		organizationId,
		lookups,
		"manual_trigger",
	);

	return c.json(result, 200);
});

riskRouter.get("/:clientId/assessment", async (c) => {
	const organizationId = getOrganizationId(c);
	const clientId = c.req.param("clientId");

	const prisma = getPrismaClient(c.env.DB);
	const service = new ClientRiskService(prisma);
	const assessment = await service.getLatestAssessment(
		clientId,
		organizationId,
	);

	if (!assessment) {
		return c.json({ error: "No risk assessment found" }, 404);
	}

	return c.json({
		...assessment,
		clientFactors: JSON.parse(assessment.clientFactors),
		geographicFactors: JSON.parse(assessment.geographicFactors),
		activityFactors: JSON.parse(assessment.activityFactors),
		transactionFactors: JSON.parse(assessment.transactionFactors),
		mitigantFactors: JSON.parse(assessment.mitigantFactors),
	});
});

riskRouter.get("/:clientId/history", async (c) => {
	const organizationId = getOrganizationId(c);
	const clientId = c.req.param("clientId");

	const prisma = getPrismaClient(c.env.DB);
	const service = new ClientRiskService(prisma);
	const history = await service.getAssessmentHistory(clientId, organizationId);

	return c.json(
		history.map((h) => ({
			...h,
			clientFactors: JSON.parse(h.clientFactors),
			geographicFactors: JSON.parse(h.geographicFactors),
			activityFactors: JSON.parse(h.activityFactors),
			transactionFactors: JSON.parse(h.transactionFactors),
			mitigantFactors: JSON.parse(h.mitigantFactors),
		})),
	);
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

	const distribution = await service.getRiskDistribution(organizationId);
	const dueForReview = await service.getClientsDueForReview(organizationId);

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
		return c.json({ error: "No org risk assessment found" }, 404);
	}

	return c.json({
		...assessment,
		elements: assessment.elements.map((e) => ({
			...e,
			factorBreakdown: JSON.parse(e.factorBreakdown),
		})),
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

	const [orgAssessment, distribution, highRiskClients] = await Promise.all([
		prisma.orgRiskAssessment.findFirst({
			where: { organizationId, status: "ACTIVE" },
			include: { elements: true, mitigants: true },
		}),
		new ClientRiskService(prisma).getRiskDistribution(organizationId),
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
