import { describe, expect, it, vi, beforeEach } from "vitest";
import { OrgRiskService } from "./service";
import { OrgRiskRepository } from "./repository";
import { RiskMethodologyRepository } from "../methodology/repository";

describe("OrgRiskService", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	it("getActiveAssessment and getAssessmentHistory delegate to repository", async () => {
		const prisma = {} as never;
		const service = new OrgRiskService(prisma);

		vi.spyOn(OrgRiskRepository.prototype, "getActive").mockResolvedValue({
			id: "a1",
		} as never);
		vi.spyOn(OrgRiskRepository.prototype, "getHistory").mockResolvedValue([]);

		await expect(service.getActiveAssessment("org-1")).resolves.toEqual({
			id: "a1",
		});
		await expect(service.getAssessmentHistory("org-1")).resolves.toEqual([]);
	});

	it("assessOrganization computes risk and saves assessment", async () => {
		const prisma = {
			client: {
				findMany: vi.fn().mockResolvedValue([
					{
						id: "c1",
						personType: "PHYSICAL",
						isPEP: false,
						countryCode: "MEX",
						stateCode: "CMX",
						createdAt: new Date("2020-01-01"),
						kycStatus: "COMPLETE",
						screeningResult: "clear",
						beneficialControllers: [],
					},
				]),
			},
			operation: {
				findMany: vi.fn().mockResolvedValue([]),
				aggregate: vi.fn().mockResolvedValue({
					_count: { id: 0 },
					_sum: { amountMxn: null },
				}),
				findFirst: vi.fn().mockResolvedValue(null),
			},
			operationPayment: { findMany: vi.fn().mockResolvedValue([]) },
			organizationSettings: {
				findUnique: vi.fn().mockResolvedValue({ activityKey: "INM" }),
				findFirst: vi.fn().mockResolvedValue({ activityKey: "INM" }),
			},
			activityRiskProfile: {
				findUnique: vi.fn().mockResolvedValue({ riskScore: 4 }),
			},
		} as never;

		const saveAssessment = vi
			.spyOn(OrgRiskRepository.prototype, "saveAssessment")
			.mockResolvedValue({
				assessment: { id: "new" },
				previousLevel: "LOW",
				previousAuditType: "INTERNAL",
			} as never);

		vi.spyOn(RiskMethodologyRepository.prototype, "resolve").mockResolvedValue({
			id: "meth-1",
			scope: "SYSTEM",
			name: "Default",
			version: 1,
			status: "ACTIVE",
			scoringFormula: "WEIGHTED_AVERAGE",
			scaleMax: 9,
			categories: [],
			thresholds: [
				{
					riskLevel: "LOW",
					minScore: 0,
					maxScore: 3,
					ddLevel: "SIMPLIFIED",
					reviewMonths: 12,
				},
				{
					riskLevel: "MEDIUM_LOW",
					minScore: 3.01,
					maxScore: 4.5,
					ddLevel: "STANDARD",
					reviewMonths: 9,
				},
				{
					riskLevel: "MEDIUM_HIGH",
					minScore: 4.51,
					maxScore: 6,
					ddLevel: "STANDARD",
					reviewMonths: 6,
				},
				{
					riskLevel: "HIGH",
					minScore: 6.01,
					maxScore: 9,
					ddLevel: "ENHANCED",
					reviewMonths: 3,
				},
			],
			mitigants: [],
			sourceScope: "SYSTEM",
		} as never);

		const service = new OrgRiskService(prisma);

		const out = await service.assessOrganization("org-svc", "scheduled");

		expect(out.result.organizationId).toBe("org-svc");
		expect(out.previousLevel).toBe("LOW");
		expect(saveAssessment).toHaveBeenCalled();
		const saved = saveAssessment.mock.calls[0][0];
		expect(saved.organizationId).toBe("org-svc");
	});
});
