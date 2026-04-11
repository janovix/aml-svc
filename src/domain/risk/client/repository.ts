import type { PrismaClient } from "@prisma/client";
import { generateId } from "../../../lib/id-generator";
import type { ClientRiskResult } from "./types";

export class ClientRiskRepository {
	constructor(private readonly prisma: PrismaClient) {}

	async saveAssessment(
		result: ClientRiskResult,
		assessedBy: string,
		triggerReason?: string,
	) {
		const now = new Date();
		const nextReviewAt = new Date(now);
		nextReviewAt.setMonth(nextReviewAt.getMonth() + result.nextReviewMonths);

		const latestVersion = await this.prisma.clientRiskAssessment.findFirst({
			where: {
				clientId: result.clientId,
				organizationId: result.organizationId,
			},
			orderBy: { version: "desc" },
			select: { version: true, riskLevel: true },
		});

		const version = (latestVersion?.version ?? 0) + 1;
		const previousLevel = latestVersion?.riskLevel ?? null;

		const assessment = await this.prisma.clientRiskAssessment.create({
			data: {
				id: generateId("CLIENT_RISK_ASSESSMENT"),
				clientId: result.clientId,
				organizationId: result.organizationId,
				methodologyId: result.methodologyId ?? null,
				inherentRiskScore: result.inherentRiskScore,
				residualRiskScore: result.residualRiskScore,
				riskLevel: result.riskLevel,
				dueDiligenceLevel: result.dueDiligenceLevel,
				clientFactors: JSON.stringify({
					...result.elements.client,
					ddProfile: result.ddProfile,
				}),
				geographicFactors: JSON.stringify(result.elements.geographic),
				activityFactors: JSON.stringify(result.elements.activity),
				transactionFactors: JSON.stringify(result.elements.transaction),
				mitigantFactors: JSON.stringify({
					effect: result.mitigantEffect,
					factors: result.mitigantFactors,
				}),
				assessedAt: now,
				nextReviewAt,
				assessedBy,
				triggerReason: triggerReason ?? null,
				version,
			},
		});

		await this.prisma.client.update({
			where: { id: result.clientId },
			data: {
				riskLevel: result.riskLevel,
				dueDiligenceLevel: result.dueDiligenceLevel,
				lastRiskAssessment: now,
				nextRiskReview: nextReviewAt,
			},
		});

		return { assessment, previousLevel };
	}

	async getLatest(clientId: string, organizationId: string) {
		return this.prisma.clientRiskAssessment.findFirst({
			where: { clientId, organizationId },
			orderBy: { version: "desc" },
		});
	}

	async getHistory(clientId: string, organizationId: string) {
		return this.prisma.clientRiskAssessment.findMany({
			where: { clientId, organizationId },
			orderBy: { version: "desc" },
		});
	}

	async getClientsDueForReview(organizationId: string, asOf: Date) {
		return this.prisma.client.findMany({
			where: {
				organizationId,
				nextRiskReview: { lte: asOf },
				deletedAt: null,
			},
			select: { id: true, organizationId: true },
		});
	}

	async getRiskDistribution(organizationId: string) {
		const clients = await this.prisma.client.findMany({
			where: { organizationId, deletedAt: null },
			select: { riskLevel: true },
		});

		const distribution = {
			LOW: 0,
			MEDIUM_LOW: 0,
			MEDIUM: 0,
			HIGH: 0,
			UNASSESSED: 0,
		};
		for (const c of clients) {
			if (c.riskLevel && c.riskLevel in distribution) {
				distribution[c.riskLevel as keyof typeof distribution]++;
			} else {
				distribution.UNASSESSED++;
			}
		}

		return { total: clients.length, distribution };
	}
}
