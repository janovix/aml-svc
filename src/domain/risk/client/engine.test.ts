import { describe, expect, it } from "vitest";
import { calculateClientRisk } from "./engine";
import type { ClientRiskInput } from "./types";
import type { RiskLookups } from "./engine";

const mockLookups: RiskLookups = {
	geo: {
		getByStateCode: (code: string) => {
			const scores: Record<string, number> = {
				CMX: 5.0,
				BCN: 7.8,
				AGU: 2.5,
			};
			return scores[code] ? { riskScore: scores[code] } : null;
		},
	},
	jurisdiction: {
		getByCountryCode: (code: string) => {
			const scores: Record<string, number> = {
				MX: 3.0,
				IR: 9.0,
			};
			return scores[code] ? { riskScore: scores[code] } : null;
		},
	},
	activity: {
		getByKey: (key: string) => {
			const scores: Record<string, number> = {
				INM: 6.2,
				OBA: 7.8,
			};
			return scores[key] ? { riskScore: scores[key] } : null;
		},
	},
};

function buildInput(overrides: Partial<ClientRiskInput> = {}): ClientRiskInput {
	return {
		clientId: "test-client",
		organizationId: "test-org",
		client: {
			personType: "PHYSICAL",
			nationality: "MX",
			countryCode: "MX",
			isPep: false,
			bcCount: 0,
			screeningResult: "clean",
			ofacSanctioned: false,
			unscSanctioned: false,
			sat69bListed: false,
			adverseMediaFlagged: false,
			economicActivityCode: "INM",
			createdAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
		},
		geographic: {
			clientStateCode: "AGU",
			operationStateCodes: [],
			clientCountryCode: "MX",
			hasCrossBorderOps: false,
		},
		activity: {
			activityCodes: ["INM"],
		},
		transaction: {
			totalOperations: 5,
			cashOperations: 0,
			totalAmountMxn: 50000,
			nearThresholdCount: 0,
			thirdPartyCount: 0,
			avgFrequencyPerMonth: 2,
		},
		mitigants: {
			kycComplete: true,
			documentsVerified: true,
			relationshipMonths: 24,
			regulatedCounterparty: false,
		},
		...overrides,
	};
}

describe("calculateClientRisk", () => {
	it("produces a complete result structure", () => {
		const result = calculateClientRisk(buildInput(), mockLookups);

		expect(result.clientId).toBe("test-client");
		expect(result.organizationId).toBe("test-org");
		expect(result.inherentRiskScore).toBeGreaterThanOrEqual(0);
		expect(result.inherentRiskScore).toBeLessThanOrEqual(9);
		expect(result.residualRiskScore).toBeGreaterThanOrEqual(0);
		expect(result.residualRiskScore).toBeLessThanOrEqual(9);
		expect(["LOW", "MEDIUM_LOW", "MEDIUM", "HIGH"]).toContain(result.riskLevel);
		expect(["SIMPLIFIED", "STANDARD", "ENHANCED"]).toContain(
			result.dueDiligenceLevel,
		);
		expect(result.elements.client).toBeDefined();
		expect(result.elements.geographic).toBeDefined();
		expect(result.elements.activity).toBeDefined();
		expect(result.elements.transaction).toBeDefined();
		expect(result.nextReviewMonths).toBeGreaterThan(0);
	});

	it("returns LOW risk for clean, simple client", () => {
		const result = calculateClientRisk(buildInput(), mockLookups);
		expect(result.riskLevel).toBe("LOW");
		expect(result.dueDiligenceLevel).toBe("SIMPLIFIED");
	});

	it("residual risk is lower than or equal to inherent risk (when mitigants are positive)", () => {
		const result = calculateClientRisk(buildInput(), mockLookups);
		expect(result.residualRiskScore).toBeLessThanOrEqual(
			result.inherentRiskScore,
		);
	});

	it("increases risk for PEP client with high-risk geography", () => {
		const input = buildInput({
			client: {
				personType: "TRUST",
				nationality: "IR",
				countryCode: "IR",
				isPep: true,
				bcCount: 3,
				screeningResult: "flagged",
				ofacSanctioned: false,
				unscSanctioned: false,
				sat69bListed: false,
				adverseMediaFlagged: true,
				economicActivityCode: "OBA",
				createdAt: new Date().toISOString(),
			},
			geographic: {
				clientStateCode: "BCN",
				operationStateCodes: ["BCN"],
				clientCountryCode: "IR",
				hasCrossBorderOps: true,
			},
			activity: {
				activityCodes: ["OBA"],
			},
			transaction: {
				totalOperations: 50,
				cashOperations: 30,
				totalAmountMxn: 15_000_000,
				nearThresholdCount: 10,
				thirdPartyCount: 5,
				avgFrequencyPerMonth: 25,
			},
		});

		const result = calculateClientRisk(input, mockLookups);
		const lowResult = calculateClientRisk(buildInput(), mockLookups);
		expect(result.residualRiskScore).toBeGreaterThan(
			lowResult.residualRiskScore,
		);
		expect(["MEDIUM", "HIGH"]).toContain(result.riskLevel);
		expect(["STANDARD", "ENHANCED"]).toContain(result.dueDiligenceLevel);
	});

	it("produces DD profile with per-factor differentiation", () => {
		const result = calculateClientRisk(buildInput(), mockLookups);

		expect(result.ddProfile).toBeDefined();
		expect(result.ddProfile.overall).toBeDefined();
		expect(result.ddProfile.acceptance).toBeDefined();
		expect(result.ddProfile.ongoingMonitoring).toBeDefined();
		expect(result.ddProfile.reviewFrequency).toBeDefined();
		expect(result.ddProfile.reporting).toBeDefined();
	});

	it("PEP client always gets ENHANCED ongoingMonitoring", () => {
		const input = buildInput({
			client: {
				...buildInput().client,
				isPep: true,
			},
		});
		const result = calculateClientRisk(input, mockLookups);
		expect(result.ddProfile.ongoingMonitoring).toBe("ENHANCED");
	});

	it("respects custom element weights", () => {
		const input = buildInput({
			weights: {
				clients: 0.8,
				geography: 0.1,
				products: 0.05,
				transactions: 0.05,
			},
		});
		const result = calculateClientRisk(input, mockLookups);
		expect(result.inherentRiskScore).toBeGreaterThanOrEqual(0);
	});

	it("mitigant effect is reflected in result", () => {
		const result = calculateClientRisk(buildInput(), mockLookups);
		expect(typeof result.mitigantEffect).toBe("number");
		expect(result.mitigantFactors.length).toBeGreaterThan(0);
	});
});
