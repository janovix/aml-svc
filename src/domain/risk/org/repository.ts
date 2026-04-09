import type { PrismaClient } from "@prisma/client";
import { generateId } from "../../../lib/id-generator";
import type { OrgAssessmentResult } from "./types";

export class OrgRiskRepository {
	constructor(private readonly prisma: PrismaClient) {}

	async saveAssessment(
		result: OrgAssessmentResult,
		assessedBy: string,
		periodStart: Date,
		periodEnd: Date,
	) {
		const latestVersion = await this.prisma.orgRiskAssessment.findFirst({
			where: { organizationId: result.organizationId },
			orderBy: { version: "desc" },
			select: {
				id: true,
				version: true,
				riskLevel: true,
				requiredAuditType: true,
			},
		});

		const version = (latestVersion?.version ?? 0) + 1;
		const previousLevel = latestVersion?.riskLevel ?? null;
		const previousAuditType = latestVersion?.requiredAuditType ?? null;

		// Supersede previous active assessment
		if (latestVersion) {
			await this.prisma.orgRiskAssessment.updateMany({
				where: {
					organizationId: result.organizationId,
					status: "ACTIVE",
				},
				data: { status: "SUPERSEDED" },
			});
		}

		const nextReviewDeadline = new Date(periodEnd);
		nextReviewDeadline.setFullYear(nextReviewDeadline.getFullYear() + 1);

		const assessmentId = generateId("ORG_RISK_ASSESSMENT");

		const assessment = await this.prisma.orgRiskAssessment.create({
			data: {
				id: assessmentId,
				organizationId: result.organizationId,
				status: "ACTIVE",
				inherentRiskScore: result.inherentRiskScore,
				residualRiskScore: result.residualRiskScore,
				riskLevel: result.riskLevel,
				requiredAuditType: result.requiredAuditType,
				fpRiskLevel: result.fpRiskLevel,
				fpRiskJustification: result.fpRiskJustification,
				periodStartDate: periodStart,
				periodEndDate: periodEnd,
				assessedBy,
				nextReviewDeadline,
				version,
			},
		});

		// Save elements
		for (const el of result.elements) {
			await this.prisma.orgRiskElement.create({
				data: {
					id: generateId("ORG_RISK_ELEMENT"),
					assessmentId: assessment.id,
					elementType: el.elementType,
					weight: el.weight,
					riskScore: el.riskScore,
					riskLevel: el.riskLevel,
					factorBreakdown: JSON.stringify(el.factorBreakdown),
					justification: el.justification ?? null,
				},
			});
		}

		// Save mitigants
		for (const m of result.mitigants) {
			await this.prisma.orgMitigant.create({
				data: {
					id: generateId("ORG_MITIGANT"),
					assessmentId: assessment.id,
					mitigantKey: m.mitigantKey,
					mitigantName: m.mitigantName,
					exists: m.exists,
					effectivenessScore: m.effectivenessScore,
					riskEffect: m.riskEffect,
					justification: m.justification ?? null,
				},
			});
		}

		return { assessment, previousLevel, previousAuditType };
	}

	async getActive(organizationId: string) {
		return this.prisma.orgRiskAssessment.findFirst({
			where: { organizationId, status: "ACTIVE" },
			orderBy: { version: "desc" },
			include: { elements: true, mitigants: true },
		});
	}

	async getHistory(organizationId: string) {
		return this.prisma.orgRiskAssessment.findMany({
			where: { organizationId },
			orderBy: { version: "desc" },
		});
	}
}
