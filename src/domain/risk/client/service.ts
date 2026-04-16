import type { PrismaClient } from "@prisma/client";
import { calculateClientRisk } from "./engine";
import type { RiskLookups } from "./engine";
import { ClientRiskRepository } from "./repository";
import type { ClientRiskInput, ClientRiskResult } from "./types";
import { RiskMethodologyRepository } from "../methodology/repository";
import type { TenantContext } from "../../../lib/tenant-context";

export class ClientRiskService {
	private repository: ClientRiskRepository;
	private methodologyRepo: RiskMethodologyRepository;

	constructor(private readonly prisma: PrismaClient) {
		this.repository = new ClientRiskRepository(prisma);
		this.methodologyRepo = new RiskMethodologyRepository(prisma);
	}

	async assessClient(
		clientId: string,
		tenant: TenantContext,
		lookups: RiskLookups,
		triggerReason: string,
		assessedBy = "SYSTEM",
		activityKey?: string,
	): Promise<{ result: ClientRiskResult; previousLevel: string | null }> {
		const { organizationId } = tenant;
		const input = await this.buildRiskInput(clientId, organizationId);

		const effectiveActivityKey =
			activityKey ?? (await this.getOrgActivityKey(organizationId));
		const methodology = await this.methodologyRepo.resolve(
			tenant,
			effectiveActivityKey,
		);

		const result = calculateClientRisk(input, lookups, methodology);
		const { previousLevel } = await this.repository.saveAssessment(
			result,
			assessedBy,
			triggerReason,
		);

		return { result, previousLevel };
	}

	async getLatestAssessment(clientId: string, tenant: TenantContext) {
		return this.repository.getLatest(clientId, tenant);
	}

	async getAssessmentHistory(clientId: string, tenant: TenantContext) {
		return this.repository.getHistory(clientId, tenant);
	}

	async getClientsDueForReview(tenant: TenantContext) {
		return this.repository.getClientsDueForReview(tenant, new Date());
	}

	async getRiskDistribution(tenant: TenantContext) {
		return this.repository.getRiskDistribution(tenant);
	}

	private async getOrgActivityKey(organizationId: string): Promise<string> {
		const settings = await this.prisma.organizationSettings.findFirst({
			where: { organizationId },
			select: { activityKey: true },
		});
		return settings?.activityKey ?? "DEFAULT";
	}

	private async buildRiskInput(
		clientId: string,
		organizationId: string,
	): Promise<ClientRiskInput> {
		const client = await this.prisma.client.findUniqueOrThrow({
			where: { id: clientId },
			include: {
				beneficialControllers: { select: { id: true } },
				operations: {
					where: { deletedAt: null },
					select: {
						activityCode: true,
						amountMxn: true,
						branchPostalCode: true,
					},
				},
			},
		});

		if (client.organizationId !== organizationId) {
			throw new Error("CLIENT_ORG_MISMATCH");
		}

		const operationAggs = await this.prisma.operation.aggregate({
			where: { clientId, organizationId, deletedAt: null },
			_count: { id: true },
			_sum: { amountMxn: true },
		});

		const paymentStats = await this.prisma.operationPayment.findMany({
			where: { operation: { clientId, organizationId, deletedAt: null } },
			select: { paymentFormCode: true },
		});

		const cashPayments = paymentStats.filter(
			(p) => p.paymentFormCode === "01",
		).length;

		const uniqueActivityCodes = [
			...new Set(client.operations.map((o) => o.activityCode)),
		];

		const uniqueStateCodes = [
			...new Set(
				client.operations
					.map((o) => o.branchPostalCode?.slice(0, 2))
					.filter(Boolean),
			),
		] as string[];

		const totalOps = operationAggs._count.id ?? 0;
		const totalAmountMxn = Number(operationAggs._sum.amountMxn ?? 0);

		const oldestOp = await this.prisma.operation.findFirst({
			where: { clientId, organizationId, deletedAt: null },
			orderBy: { operationDate: "asc" },
			select: { operationDate: true },
		});

		let avgFreqPerMonth = 0;
		if (oldestOp && totalOps > 0) {
			const firstOpDate = new Date(oldestOp.operationDate);
			const now = new Date();
			const months =
				(now.getFullYear() - firstOpDate.getFullYear()) * 12 +
					(now.getMonth() - firstOpDate.getMonth()) || 1;
			avgFreqPerMonth = totalOps / months;
		}

		return {
			clientId,
			organizationId,
			client: {
				personType: client.personType,
				nationality: client.nationality,
				countryCode: client.countryCode,
				isPep: client.isPEP,
				bcCount: client.beneficialControllers.length,
				screeningResult: client.screeningResult,
				ofacSanctioned: client.ofacSanctioned,
				unscSanctioned: client.unscSanctioned,
				sat69bListed: client.sat69bListed,
				adverseMediaFlagged: client.adverseMediaFlagged,
				economicActivityCode: client.economicActivityCode,
				createdAt: client.createdAt.toISOString(),
			},
			geographic: {
				clientStateCode: client.stateCode,
				operationStateCodes: uniqueStateCodes,
				clientCountryCode: client.countryCode,
				hasCrossBorderOps: client.countryCode !== "MEX",
			},
			activity: {
				activityCodes: uniqueActivityCodes,
			},
			transaction: {
				totalOperations: totalOps,
				cashOperations: cashPayments,
				totalAmountMxn,
				nearThresholdCount: 0,
				thirdPartyCount: 0,
				avgFrequencyPerMonth: avgFreqPerMonth,
			},
			mitigants: {
				kycComplete: client.kycStatus === "COMPLETE",
				documentsVerified: client.completenessStatus === "COMPLETE",
				relationshipMonths: getMonthsSince(client.createdAt),
				regulatedCounterparty: false,
			},
		};
	}
}

function getMonthsSince(date: Date): number {
	const now = new Date();
	return (
		(now.getFullYear() - date.getFullYear()) * 12 +
		(now.getMonth() - date.getMonth())
	);
}
