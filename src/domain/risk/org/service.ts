import type { PrismaClient } from "@prisma/client";
import { calculateOrgRisk } from "./engine";
import { OrgRiskRepository } from "./repository";
import { RiskMethodologyRepository } from "../methodology/repository";
import type { OrgAssessmentResult, OrgRiskInput } from "./types";

export class OrgRiskService {
	private repository: OrgRiskRepository;
	private methodologyRepo: RiskMethodologyRepository;

	constructor(private readonly prisma: PrismaClient) {
		this.repository = new OrgRiskRepository(prisma);
		this.methodologyRepo = new RiskMethodologyRepository(prisma);
	}

	async assessOrganization(
		organizationId: string,
		triggerReason: string,
		assessedBy = "SYSTEM",
	): Promise<{
		result: OrgAssessmentResult;
		previousLevel: string | null;
		previousAuditType: string | null;
	}> {
		const input = await this.buildOrgInput(organizationId);

		const orgSettings = await this.prisma.organizationSettings.findFirst({
			where: { organizationId },
			select: { activityKey: true },
		});
		const activityKey = orgSettings?.activityKey ?? "DEFAULT";
		const methodology = await this.methodologyRepo.resolve(
			organizationId,
			activityKey,
		);

		const result = calculateOrgRisk(input, methodology);

		const periodEnd = new Date();
		const periodStart = new Date(periodEnd);
		periodStart.setFullYear(periodStart.getFullYear() - 1);

		const { previousLevel, previousAuditType } =
			await this.repository.saveAssessment(
				result,
				assessedBy,
				periodStart,
				periodEnd,
			);

		return { result, previousLevel, previousAuditType };
	}

	async getActiveAssessment(organizationId: string) {
		return this.repository.getActive(organizationId);
	}

	async getAssessmentHistory(organizationId: string) {
		return this.repository.getHistory(organizationId);
	}

	private async buildOrgInput(organizationId: string): Promise<OrgRiskInput> {
		const clients = await this.prisma.client.findMany({
			where: { organizationId, deletedAt: null },
			select: {
				id: true,
				personType: true,
				isPEP: true,
				countryCode: true,
				stateCode: true,
				createdAt: true,
				kycStatus: true,
				screeningResult: true,
				beneficialControllers: { select: { id: true } },
			},
		});

		const totalClients = clients.length || 1;
		const pepCount = clients.filter((c) => c.isPEP).length;
		const highRiskNationalityCodes = new Set([
			"PRK",
			"IRN",
			"MMR",
			"SYR",
			"VEN",
		]);
		const highRiskNationalityCount = clients.filter(
			(c) => c.countryCode && highRiskNationalityCodes.has(c.countryCode),
		).length;
		const moralEntityCount = clients.filter(
			(c) => c.personType === "MORAL",
		).length;
		const trustCount = clients.filter((c) => c.personType === "TRUST").length;

		const sixMonthsAgo = new Date();
		sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
		const newClientCount = clients.filter(
			(c) => new Date(c.createdAt) > sixMonthsAgo,
		).length;

		const totalBcLayers =
			clients.reduce((sum, c) => sum + c.beneficialControllers.length, 0) /
			totalClients;

		// Geographic stats
		const highRiskStates = new Set([
			"BCN",
			"CHP",
			"CHH",
			"COL",
			"GUA",
			"GRO",
			"JAL",
			"MIC",
			"SIN",
			"SON",
			"TAM",
			"ZAC",
		]);

		const operations = await this.prisma.operation.findMany({
			where: { organizationId, deletedAt: null },
			select: {
				branchPostalCode: true,
				amountMxn: true,
				activityCode: true,
			},
		});

		const totalOps = operations.length || 1;
		const highRiskStateOps = operations.filter((o) => {
			const stateCode = o.branchPostalCode?.slice(0, 3);
			return stateCode && highRiskStates.has(stateCode);
		}).length;

		const orgSettings = await this.prisma.organizationSettings.findUnique({
			where: { organizationId },
			select: { activityKey: true },
		});

		const activityProfile = await this.prisma.activityRiskProfile.findUnique({
			where: { activityKey: orgSettings?.activityKey ?? "OTR" },
		});

		const payments = await this.prisma.operationPayment.findMany({
			where: {
				operation: { organizationId, deletedAt: null },
			},
			select: { paymentFormCode: true },
		});

		const cashPayments = payments.filter(
			(p) => p.paymentFormCode === "01",
		).length;
		const totalPayments = payments.length || 1;

		const kycCompleteCount = clients.filter(
			(c) => c.kycStatus === "COMPLETE",
		).length;
		const screenedCount = clients.filter(
			(c) => c.screeningResult !== "pending",
		).length;

		return {
			organizationId,
			clientStats: {
				totalClients,
				pepCount,
				highRiskNationalityCount,
				moralEntityCount,
				trustCount,
				newClientCount,
				avgBcLayers: totalBcLayers,
			},
			geoStats: {
				highRiskStateOperationPct: highRiskStateOps / totalOps,
				borderAreaExposure: highRiskStateOps > 0,
				crossBorderPct: 0,
				locationMismatchPct: 0,
			},
			productStats: {
				primaryActivityCode: orgSettings?.activityKey ?? "OTR",
				primaryActivityRiskScore: activityProfile?.riskScore ?? 3.0,
				cashIntensity: cashPayments / totalPayments,
				anonymityEnabling: false,
				nonPresentialChannelUsage: 0,
			},
			transactionStats: {
				cashOperationPct: cashPayments / totalPayments,
				nearThresholdPct: 0,
				highFrequencyPct: 0,
				thirdPartyPct: 0,
			},
			fpStats: {
				sanctionsScreeningCoverage: screenedCount / totalClients,
				crossBorderExposure: 0,
				sanctionsListRecency: 1.0,
			},
			mitigantInputs: {
				kycCompletenessRate: kycCompleteCount / totalClients,
				screeningCoverage: screenedCount / totalClients,
				monitoringQuality: 0.5,
				complianceStructure: 0.5,
				trainingProgram: 0.3,
				auditFindings: 0.5,
			},
		};
	}
}
