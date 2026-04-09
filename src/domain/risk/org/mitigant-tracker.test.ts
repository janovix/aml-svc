import { describe, expect, it } from "vitest";
import { evaluateMitigants } from "./mitigant-tracker";
import type { OrgRiskInput } from "./types";

function buildInput(
	mitigantOverrides: Partial<OrgRiskInput["mitigantInputs"]> = {},
): OrgRiskInput {
	return {
		organizationId: "org-test",
		clientStats: {
			totalClients: 100,
			pepCount: 0,
			highRiskNationalityCount: 0,
			moralEntityCount: 0,
			trustCount: 0,
			newClientCount: 0,
			avgBcLayers: 0,
		},
		geoStats: {
			highRiskStateOperationPct: 0,
			borderAreaExposure: false,
			crossBorderPct: 0,
			locationMismatchPct: 0,
		},
		productStats: {
			primaryActivityCode: "INM",
			primaryActivityRiskScore: 0,
			cashIntensity: 0,
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
			kycCompletenessRate: 0,
			screeningCoverage: 0,
			monitoringQuality: 0,
			complianceStructure: 0,
			trainingProgram: 0,
			auditFindings: 0,
			...mitigantOverrides,
		},
	};
}

describe("evaluateMitigants", () => {
	it("returns evaluations for all 6 mitigant keys", () => {
		const result = evaluateMitigants(buildInput());
		expect(result).toHaveLength(6);
		const keys = result.map((m) => m.mitigantKey);
		expect(keys).toEqual([
			"kyc_completeness",
			"screening_coverage",
			"monitoring_quality",
			"compliance_structure",
			"training_program",
			"audit_findings",
		]);
	});

	it("marks mitigants as absent when scores are 0", () => {
		const result = evaluateMitigants(buildInput());
		for (const m of result) {
			expect(m.exists).toBe(false);
			expect(m.effectivenessScore).toBe(0);
			expect(m.riskEffect).toBeLessThan(0);
		}
	});

	it("marks mitigants as existing when scores are > 0", () => {
		const result = evaluateMitigants(
			buildInput({
				kycCompletenessRate: 0.9,
				screeningCoverage: 0.8,
				monitoringQuality: 0.7,
				complianceStructure: 0.6,
				trainingProgram: 0.5,
				auditFindings: 0.4,
			}),
		);
		for (const m of result) {
			expect(m.exists).toBe(true);
			expect(m.riskEffect).toBeGreaterThan(0);
		}
	});

	it("computes negative riskEffect for absent controls: -(maxEffect * 0.5)", () => {
		const result = evaluateMitigants(buildInput());
		const kyc = result.find((m) => m.mitigantKey === "kyc_completeness")!;
		expect(kyc.riskEffect).toBeCloseTo(-(0.8 * 0.5));

		const screening = result.find(
			(m) => m.mitigantKey === "screening_coverage",
		)!;
		expect(screening.riskEffect).toBeCloseTo(-(0.7 * 0.5));
	});

	it("computes positive riskEffect for existing controls: maxEffect * effectiveness", () => {
		const result = evaluateMitigants(buildInput({ kycCompletenessRate: 0.9 }));
		const kyc = result.find((m) => m.mitigantKey === "kyc_completeness")!;
		expect(kyc.riskEffect).toBeCloseTo(0.8 * 0.9);
		expect(kyc.effectivenessScore).toBeCloseTo(0.9);
	});

	it("clamps effectiveness at 1 even if input > 1", () => {
		const result = evaluateMitigants(buildInput({ kycCompletenessRate: 1.5 }));
		const kyc = result.find((m) => m.mitigantKey === "kyc_completeness")!;
		expect(kyc.effectivenessScore).toBe(1);
		expect(kyc.riskEffect).toBeCloseTo(0.8 * 1);
	});

	it("returns human-readable mitigant names", () => {
		const result = evaluateMitigants(buildInput());
		expect(result[0].mitigantName).toContain("KYC");
		expect(result[4].mitigantName).toContain("capacitación");
	});
});
