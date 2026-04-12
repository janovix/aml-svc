import { describe, expect, it } from "vitest";
import { calculateOrgRisk } from "./engine";
import type { OrgRiskInput } from "./types";

function buildOrgInput(overrides: Partial<OrgRiskInput> = {}): OrgRiskInput {
	return {
		organizationId: "test-org",
		clientStats: {
			totalClients: 100,
			pepCount: 2,
			highRiskNationalityCount: 1,
			moralEntityCount: 20,
			trustCount: 0,
			newClientCount: 10,
			avgBcLayers: 1.5,
		},
		geoStats: {
			highRiskStateOperationPct: 0.1,
			borderAreaExposure: false,
			crossBorderPct: 0.05,
			locationMismatchPct: 0.02,
		},
		productStats: {
			primaryActivityCode: "INM",
			primaryActivityRiskScore: 6.2,
			cashIntensity: 0.2,
			anonymityEnabling: false,
			nonPresentialChannelUsage: 0.1,
		},
		transactionStats: {
			cashOperationPct: 0.15,
			nearThresholdPct: 0.02,
			highFrequencyPct: 0.1,
			thirdPartyPct: 0.05,
		},
		fpStats: {
			sanctionsScreeningCoverage: 0.95,
			crossBorderExposure: 0.05,
			sanctionsListRecency: 0.95,
		},
		mitigantInputs: {
			kycCompletenessRate: 0.9,
			screeningCoverage: 0.95,
			monitoringQuality: 0.8,
			complianceStructure: 0.7,
			trainingProgram: 0.8,
			auditFindings: 0.1,
		},
		...overrides,
	};
}

describe("calculateOrgRisk", () => {
	it("returns a complete assessment result", () => {
		const result = calculateOrgRisk(buildOrgInput());

		expect(result.organizationId).toBe("test-org");
		expect(result.inherentRiskScore).toBeGreaterThanOrEqual(0);
		expect(result.inherentRiskScore).toBeLessThanOrEqual(9);
		expect(result.residualRiskScore).toBeGreaterThanOrEqual(0);
		expect(result.residualRiskScore).toBeLessThanOrEqual(9);
		expect(["LOW", "MEDIUM_LOW", "MEDIUM", "HIGH"]).toContain(result.riskLevel);
		expect(["INTERNAL", "EXTERNAL_INDEPENDENT"]).toContain(
			result.requiredAuditType,
		);
		expect(result.elements).toHaveLength(4);
		expect(result.mitigants.length).toBeGreaterThan(0);
	});

	it("residual risk <= inherent risk when mitigants exist", () => {
		const result = calculateOrgRisk(buildOrgInput());
		expect(result.residualRiskScore).toBeLessThanOrEqual(
			result.inherentRiskScore,
		);
	});

	it("evaluates all 4 GAFI risk elements", () => {
		const result = calculateOrgRisk(buildOrgInput());
		const types = result.elements.map((e) => e.elementType);
		expect(types).toContain("CLIENTS");
		expect(types).toContain("GEOGRAPHY");
		expect(types).toContain("PRODUCTS");
		expect(types).toContain("TRANSACTIONS");
	});

	it("increases risk for high-risk profile", () => {
		const highRisk = buildOrgInput({
			clientStats: {
				totalClients: 500,
				pepCount: 50,
				highRiskNationalityCount: 30,
				moralEntityCount: 200,
				trustCount: 50,
				newClientCount: 200,
				avgBcLayers: 4.0,
			},
			geoStats: {
				highRiskStateOperationPct: 0.6,
				borderAreaExposure: true,
				crossBorderPct: 0.3,
				locationMismatchPct: 0.2,
			},
			productStats: {
				primaryActivityCode: "OBA",
				primaryActivityRiskScore: 7.8,
				cashIntensity: 0.8,
				anonymityEnabling: true,
				nonPresentialChannelUsage: 0.5,
			},
			transactionStats: {
				cashOperationPct: 0.6,
				nearThresholdPct: 0.15,
				highFrequencyPct: 0.4,
				thirdPartyPct: 0.2,
			},
		});

		const lowResult = calculateOrgRisk(buildOrgInput());
		const highResult = calculateOrgRisk(highRisk);

		expect(highResult.inherentRiskScore).toBeGreaterThan(
			lowResult.inherentRiskScore,
		);
	});

	it("determines correct audit type based on risk level", () => {
		const result = calculateOrgRisk(buildOrgInput());
		if (result.riskLevel === "HIGH") {
			expect(result.requiredAuditType).toBe("EXTERNAL_INDEPENDENT");
		} else {
			expect(result.requiredAuditType).toBe("INTERNAL");
		}
	});

	it("includes FP risk assessment", () => {
		const result = calculateOrgRisk(buildOrgInput());
		expect(["LOW", "MEDIUM_LOW", "MEDIUM", "HIGH"]).toContain(
			result.fpRiskLevel,
		);
		expect(result.fpRiskJustification).toBeTruthy();
		expect(result.fpRiskJustification).toContain("Screening coverage");
	});

	it("FP risk increases with poor sanctions screening", () => {
		const good = calculateOrgRisk(
			buildOrgInput({
				fpStats: {
					sanctionsScreeningCoverage: 0.95,
					crossBorderExposure: 0.05,
					sanctionsListRecency: 0.95,
				},
			}),
		);
		const poor = calculateOrgRisk(
			buildOrgInput({
				fpStats: {
					sanctionsScreeningCoverage: 0.3,
					crossBorderExposure: 0.8,
					sanctionsListRecency: 0.2,
				},
			}),
		);

		const fpLevels = ["LOW", "MEDIUM_LOW", "MEDIUM", "HIGH"];
		expect(fpLevels.indexOf(poor.fpRiskLevel)).toBeGreaterThanOrEqual(
			fpLevels.indexOf(good.fpRiskLevel),
		);
	});

	it("supports custom element weights", () => {
		const input = buildOrgInput({
			weights: {
				clients: 0.7,
				geography: 0.1,
				products: 0.1,
				transactions: 0.1,
			},
		});
		const result = calculateOrgRisk(input);
		expect(result.inherentRiskScore).toBeGreaterThanOrEqual(0);
	});
});
