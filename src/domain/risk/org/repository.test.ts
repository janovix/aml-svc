import { describe, expect, it, vi } from "vitest";
import { calculateOrgRisk } from "./engine";
import { OrgRiskRepository } from "./repository";
import type { OrgRiskInput } from "./types";

function buildOrgInput(): OrgRiskInput {
	return {
		organizationId: "org-repo-test",
		clientStats: {
			totalClients: 10,
			pepCount: 0,
			highRiskNationalityCount: 0,
			moralEntityCount: 2,
			trustCount: 0,
			newClientCount: 1,
			avgBcLayers: 1,
		},
		geoStats: {
			highRiskStateOperationPct: 0,
			borderAreaExposure: false,
			crossBorderPct: 0,
			locationMismatchPct: 0,
		},
		productStats: {
			primaryActivityCode: "INM",
			primaryActivityRiskScore: 4,
			cashIntensity: 0.1,
			anonymityEnabling: false,
			nonPresentialChannelUsage: 0,
		},
		transactionStats: {
			cashOperationPct: 0,
			nearThresholdPct: 0,
			highFrequencyPct: 0,
			thirdPartyPct: 0,
		},
		fpStats: {
			sanctionsScreeningCoverage: 0.95,
			crossBorderExposure: 0,
			sanctionsListRecency: 0.95,
		},
		mitigantInputs: {
			kycCompletenessRate: 0.8,
			screeningCoverage: 0.9,
			monitoringQuality: 0.7,
			complianceStructure: 0.6,
			trainingProgram: 0.5,
			auditFindings: 0.4,
		},
	};
}

describe("OrgRiskRepository", () => {
	it("saveAssessment creates first version and supersedes prior active", async () => {
		const assessmentResult = calculateOrgRisk(buildOrgInput());

		const create = vi.fn().mockResolvedValue({ id: "org-assess-1" });
		const elementCreate = vi.fn().mockResolvedValue({});
		const mitigantCreate = vi.fn().mockResolvedValue({});
		const updateMany = vi.fn().mockResolvedValue({ count: 1 });

		const prisma = {
			orgRiskAssessment: {
				findFirst: vi.fn().mockResolvedValue({
					id: "prev-1",
					version: 1,
					riskLevel: "LOW",
					requiredAuditType: "INTERNAL",
				}),
				updateMany,
				create,
			},
			orgRiskElement: { create: elementCreate },
			orgMitigant: { create: mitigantCreate },
		};

		const repo = new OrgRiskRepository(prisma as never);
		const start = new Date("2024-01-01");
		const end = new Date("2024-12-31");

		const out = await repo.saveAssessment(
			assessmentResult,
			"auditor",
			start,
			end,
		);

		expect(updateMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { organizationId: "org-repo-test", status: "ACTIVE" },
				data: { status: "SUPERSEDED" },
			}),
		);
		expect(create.mock.calls[0][0].data.version).toBe(2);
		expect(out.previousLevel).toBe("LOW");
		expect(out.previousAuditType).toBe("INTERNAL");
		expect(elementCreate).toHaveBeenCalled();
		expect(mitigantCreate).toHaveBeenCalled();
	});

	it("saveAssessment version 1 when no prior assessment", async () => {
		const assessmentResult = calculateOrgRisk(buildOrgInput());
		const create = vi.fn().mockResolvedValue({ id: "a-new" });
		const prisma = {
			orgRiskAssessment: {
				findFirst: vi.fn().mockResolvedValue(null),
				create,
			},
			orgRiskElement: { create: vi.fn().mockResolvedValue({}) },
			orgMitigant: { create: vi.fn().mockResolvedValue({}) },
		};

		const repo = new OrgRiskRepository(prisma as never);
		await repo.saveAssessment(assessmentResult, "sys", new Date(), new Date());

		expect(create.mock.calls[0][0].data.version).toBe(1);
	});

	it("getActive filters ACTIVE and orders by version", async () => {
		const findFirst = vi.fn().mockResolvedValue(null);
		const prisma = { orgRiskAssessment: { findFirst } };
		const repo = new OrgRiskRepository(prisma as never);

		await repo.getActive("org-x");

		expect(findFirst).toHaveBeenCalledWith({
			where: { organizationId: "org-x", status: "ACTIVE" },
			orderBy: { version: "desc" },
			include: { elements: true, mitigants: true },
		});
	});
});
