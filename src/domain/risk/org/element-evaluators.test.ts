import { describe, expect, it } from "vitest";
import {
	evaluateClientElement,
	evaluateGeographyElement,
	evaluateProductElement,
	evaluateTransactionElement,
} from "./element-evaluators";
import type { OrgRiskInput } from "./types";

function buildInput(overrides: Partial<OrgRiskInput> = {}): OrgRiskInput {
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
		},
		...overrides,
	};
}

describe("evaluateClientElement", () => {
	it("returns LOW risk for zero-risk client stats", () => {
		const result = evaluateClientElement(buildInput());
		expect(result.elementType).toBe("CLIENTS");
		expect(result.riskScore).toBe(0);
		expect(result.riskLevel).toBe("LOW");
		expect(result.weight).toBe(0.3);
	});

	it("uses custom weight when provided", () => {
		const result = evaluateClientElement(
			buildInput({
				weights: {
					clients: 0.5,
					geography: 0.2,
					products: 0.15,
					transactions: 0.15,
				},
			}),
		);
		expect(result.weight).toBe(0.5);
	});

	it("increases score with high PEP concentration", () => {
		const result = evaluateClientElement(
			buildInput({
				clientStats: {
					totalClients: 100,
					pepCount: 80,
					highRiskNationalityCount: 0,
					moralEntityCount: 0,
					trustCount: 0,
					newClientCount: 0,
					avgBcLayers: 0,
				},
			}),
		);
		expect(result.riskScore).toBeGreaterThan(0);
		expect(result.factorBreakdown).toHaveProperty("pep_concentration");
		expect(
			(result.factorBreakdown as Record<string, number>).pep_concentration,
		).toBeGreaterThan(0);
	});

	it("caps all factors at 9", () => {
		const result = evaluateClientElement(
			buildInput({
				clientStats: {
					totalClients: 1,
					pepCount: 100,
					highRiskNationalityCount: 100,
					moralEntityCount: 100,
					trustCount: 100,
					newClientCount: 100,
					avgBcLayers: 100,
				},
			}),
		);
		const factors = result.factorBreakdown as Record<string, number>;
		for (const value of Object.values(factors)) {
			expect(value).toBeLessThanOrEqual(9);
		}
		expect(result.riskScore).toBeLessThanOrEqual(9);
	});

	it("guards against totalClients = 0", () => {
		const result = evaluateClientElement(
			buildInput({
				clientStats: {
					totalClients: 0,
					pepCount: 5,
					highRiskNationalityCount: 0,
					moralEntityCount: 0,
					trustCount: 0,
					newClientCount: 0,
					avgBcLayers: 0,
				},
			}),
		);
		expect(result.riskScore).toBeGreaterThanOrEqual(0);
		expect(Number.isFinite(result.riskScore)).toBe(true);
	});

	it("scores bc_complexity from avgBcLayers", () => {
		const result = evaluateClientElement(
			buildInput({
				clientStats: {
					totalClients: 100,
					pepCount: 0,
					highRiskNationalityCount: 0,
					moralEntityCount: 0,
					trustCount: 0,
					newClientCount: 0,
					avgBcLayers: 3.6,
				},
			}),
		);
		expect(
			(result.factorBreakdown as Record<string, number>).bc_complexity,
		).toBe(9);
	});
});

describe("evaluateGeographyElement", () => {
	it("returns LOW risk for zero-risk geo stats", () => {
		const result = evaluateGeographyElement(buildInput());
		expect(result.elementType).toBe("GEOGRAPHY");
		expect(result.riskScore).toBe(0);
		expect(result.riskLevel).toBe("LOW");
		expect(result.weight).toBe(0.2);
	});

	it("increases score for border area exposure", () => {
		const withBorder = evaluateGeographyElement(
			buildInput({
				geoStats: {
					highRiskStateOperationPct: 0,
					borderAreaExposure: true,
					crossBorderPct: 0,
					locationMismatchPct: 0,
				},
			}),
		);
		const withoutBorder = evaluateGeographyElement(buildInput());
		expect(withBorder.riskScore).toBeGreaterThan(withoutBorder.riskScore);
		expect(
			(withBorder.factorBreakdown as Record<string, number>).border_exposure,
		).toBe(6.0);
	});

	it("caps factors at 9 for extreme values", () => {
		const result = evaluateGeographyElement(
			buildInput({
				geoStats: {
					highRiskStateOperationPct: 5.0,
					borderAreaExposure: true,
					crossBorderPct: 5.0,
					locationMismatchPct: 5.0,
				},
			}),
		);
		const factors = result.factorBreakdown as Record<string, number>;
		for (const value of Object.values(factors)) {
			expect(value).toBeLessThanOrEqual(9);
		}
	});

	it("uses custom weight when provided", () => {
		const result = evaluateGeographyElement(
			buildInput({
				weights: {
					clients: 0.2,
					geography: 0.5,
					products: 0.15,
					transactions: 0.15,
				},
			}),
		);
		expect(result.weight).toBe(0.5);
	});
});

describe("evaluateProductElement", () => {
	it("returns LOW risk for zero-risk product stats", () => {
		const result = evaluateProductElement(buildInput());
		expect(result.elementType).toBe("PRODUCTS");
		expect(result.riskLevel).toBe("LOW");
		expect(result.weight).toBe(0.25);
	});

	it("sets anonymity factor to 7 when enabled", () => {
		const result = evaluateProductElement(
			buildInput({
				productStats: {
					primaryActivityCode: "INM",
					primaryActivityRiskScore: 0,
					cashIntensity: 0,
					anonymityEnabling: true,
					nonPresentialChannelUsage: 0,
				},
			}),
		);
		expect(
			(result.factorBreakdown as Record<string, number>).anonymity_enabling,
		).toBe(7.0);
	});

	it("sets anonymity factor to 1 when disabled", () => {
		const result = evaluateProductElement(buildInput());
		expect(
			(result.factorBreakdown as Record<string, number>).anonymity_enabling,
		).toBe(1.0);
	});

	it("uses primaryActivityRiskScore directly as activity_enr_risk", () => {
		const result = evaluateProductElement(
			buildInput({
				productStats: {
					primaryActivityCode: "OBA",
					primaryActivityRiskScore: 7.8,
					cashIntensity: 0,
					anonymityEnabling: false,
					nonPresentialChannelUsage: 0,
				},
			}),
		);
		expect(
			(result.factorBreakdown as Record<string, number>).activity_enr_risk,
		).toBe(7.8);
	});
});

describe("evaluateTransactionElement", () => {
	it("returns LOW risk for zero-risk transaction stats", () => {
		const result = evaluateTransactionElement(buildInput());
		expect(result.elementType).toBe("TRANSACTIONS");
		expect(result.riskScore).toBe(0);
		expect(result.riskLevel).toBe("LOW");
		expect(result.weight).toBe(0.25);
	});

	it("amplifies near_threshold_pct by 15x", () => {
		const result = evaluateTransactionElement(
			buildInput({
				transactionStats: {
					cashOperationPct: 0,
					nearThresholdPct: 0.3,
					highFrequencyPct: 0,
					thirdPartyPct: 0,
				},
			}),
		);
		expect(
			(result.factorBreakdown as Record<string, number>).near_threshold_pct,
		).toBe(Math.min(0.3 * 15, 9));
	});

	it("amplifies third_party_pct by 12x", () => {
		const result = evaluateTransactionElement(
			buildInput({
				transactionStats: {
					cashOperationPct: 0,
					nearThresholdPct: 0,
					highFrequencyPct: 0,
					thirdPartyPct: 0.5,
				},
			}),
		);
		expect(
			(result.factorBreakdown as Record<string, number>).third_party_pct,
		).toBe(Math.min(0.5 * 12, 9));
	});

	it("caps all factors at 9", () => {
		const result = evaluateTransactionElement(
			buildInput({
				transactionStats: {
					cashOperationPct: 5.0,
					nearThresholdPct: 5.0,
					highFrequencyPct: 5.0,
					thirdPartyPct: 5.0,
				},
			}),
		);
		const factors = result.factorBreakdown as Record<string, number>;
		for (const value of Object.values(factors)) {
			expect(value).toBeLessThanOrEqual(9);
		}
		expect(result.riskScore).toBeLessThanOrEqual(9);
	});
});
