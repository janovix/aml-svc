import { describe, expect, it } from "vitest";
import {
	scoreClientElement,
	scoreGeographicElement,
	scoreActivityElement,
	scoreTransactionElement,
	scoreMitigants,
} from "./factors";
import type {
	ClientFactorInput,
	GeographicFactorInput,
	ActivityFactorInput,
	TransactionFactorInput,
	ClientMitigantInput,
} from "./types";

const mockGeoLookup = {
	getByStateCode: (code: string) => {
		const scores: Record<string, number> = {
			CMX: 5.0,
			BCN: 7.8,
			AGU: 2.5,
		};
		return scores[code] ? { riskScore: scores[code] } : null;
	},
};

const mockJurisdictionLookup = {
	getByCountryCode: (code: string) => {
		const scores: Record<string, number> = {
			MX: 3.0,
			US: 2.0,
			IR: 9.0,
			AF: 9.0,
		};
		return scores[code] ? { riskScore: scores[code] } : null;
	},
};

const mockActivityLookup = {
	getByKey: (key: string) => {
		const scores: Record<string, number> = {
			INM: 6.2,
			OBA: 7.8,
			NOT: 3.5,
		};
		return scores[key] ? { riskScore: scores[key] } : null;
	},
};

// ─── Client Element ─────────────────────────────────────────────────────────

describe("scoreClientElement", () => {
	const baseInput: ClientFactorInput = {
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
	};

	it("returns LOW for clean physical client", () => {
		const result = scoreClientElement(baseInput, mockJurisdictionLookup);
		expect(result.elementType).toBe("CLIENTS");
		expect(result.level).toBe("LOW");
		expect(result.score).toBeGreaterThanOrEqual(0);
		expect(result.score).toBeLessThan(3);
	});

	it("increases score for PEP clients", () => {
		const pepInput = { ...baseInput, isPep: true };
		const result = scoreClientElement(pepInput, mockJurisdictionLookup);
		expect(result.score).toBeGreaterThan(
			scoreClientElement(baseInput, mockJurisdictionLookup).score,
		);
	});

	it("increases score for OFAC-sanctioned", () => {
		const sanctioned = { ...baseInput, ofacSanctioned: true };
		const result = scoreClientElement(sanctioned, mockJurisdictionLookup);
		expect(result.score).toBeGreaterThan(
			scoreClientElement(baseInput, mockJurisdictionLookup).score,
		);
	});

	it("differentiates person types", () => {
		const physical = scoreClientElement(
			{ ...baseInput, personType: "PHYSICAL" },
			mockJurisdictionLookup,
		);
		const moral = scoreClientElement(
			{ ...baseInput, personType: "MORAL" },
			mockJurisdictionLookup,
		);
		const trust = scoreClientElement(
			{ ...baseInput, personType: "TRUST" },
			mockJurisdictionLookup,
		);

		expect(trust.score).toBeGreaterThan(moral.score);
		expect(moral.score).toBeGreaterThan(physical.score);
	});

	it("returns correct number of factors", () => {
		const result = scoreClientElement(baseInput, mockJurisdictionLookup);
		expect(result.factors.length).toBe(6);
	});

	it("gives higher score to high-risk jurisdiction", () => {
		const irClient = { ...baseInput, countryCode: "IR" };
		const mxClient = { ...baseInput, countryCode: "MX" };
		const irResult = scoreClientElement(irClient, mockJurisdictionLookup);
		const mxResult = scoreClientElement(mxClient, mockJurisdictionLookup);
		expect(irResult.score).toBeGreaterThan(mxResult.score);
	});
});

// ─── Geographic Element ─────────────────────────────────────────────────────

describe("scoreGeographicElement", () => {
	const baseInput: GeographicFactorInput = {
		clientStateCode: "AGU",
		operationStateCodes: ["AGU"],
		clientCountryCode: "MX",
		hasCrossBorderOps: false,
	};

	it("returns LOW for low-risk state, no cross-border", () => {
		const result = scoreGeographicElement(
			baseInput,
			mockGeoLookup,
			mockJurisdictionLookup,
		);
		expect(result.elementType).toBe("GEOGRAPHY");
		expect(result.level).toBe("LOW");
	});

	it("increases score for high-risk state", () => {
		const highRiskInput = {
			...baseInput,
			clientStateCode: "BCN",
			operationStateCodes: ["BCN"],
		};
		const lowResult = scoreGeographicElement(
			baseInput,
			mockGeoLookup,
			mockJurisdictionLookup,
		);
		const highResult = scoreGeographicElement(
			highRiskInput,
			mockGeoLookup,
			mockJurisdictionLookup,
		);
		expect(highResult.score).toBeGreaterThan(lowResult.score);
	});

	it("increases score for cross-border operations", () => {
		const crossBorder = { ...baseInput, hasCrossBorderOps: true };
		const result = scoreGeographicElement(
			crossBorder,
			mockGeoLookup,
			mockJurisdictionLookup,
		);
		const baseResult = scoreGeographicElement(
			baseInput,
			mockGeoLookup,
			mockJurisdictionLookup,
		);
		expect(result.score).toBeGreaterThan(baseResult.score);
	});
});

// ─── Activity Element ───────────────────────────────────────────────────────

describe("scoreActivityElement", () => {
	it("returns low score for notary (low-risk activity)", () => {
		const input: ActivityFactorInput = { activityCodes: ["NOT"] };
		const result = scoreActivityElement(input, mockActivityLookup);
		expect(result.elementType).toBe("PRODUCTS");
		expect(result.score).toBeLessThan(5);
	});

	it("returns higher score for high-risk activities", () => {
		const input: ActivityFactorInput = { activityCodes: ["OBA"] };
		const result = scoreActivityElement(input, mockActivityLookup);
		expect(result.score).toBeGreaterThan(4);
	});

	it("increases score for diverse activities", () => {
		const single: ActivityFactorInput = { activityCodes: ["NOT"] };
		const diverse: ActivityFactorInput = {
			activityCodes: ["NOT", "OBA", "INM"],
		};
		const singleResult = scoreActivityElement(single, mockActivityLookup);
		const diverseResult = scoreActivityElement(diverse, mockActivityLookup);
		expect(diverseResult.score).toBeGreaterThan(singleResult.score);
	});

	it("handles empty activity codes with default", () => {
		const input: ActivityFactorInput = { activityCodes: [] };
		const result = scoreActivityElement(input, mockActivityLookup);
		expect(result.score).toBeGreaterThanOrEqual(0);
		expect(result.factors).toHaveLength(2);
	});
});

// ─── Transaction Element ────────────────────────────────────────────────────

describe("scoreTransactionElement", () => {
	const baseInput: TransactionFactorInput = {
		totalOperations: 10,
		cashOperations: 0,
		totalAmountMxn: 50000,
		nearThresholdCount: 0,
		thirdPartyCount: 0,
		avgFrequencyPerMonth: 2,
	};

	it("returns LOW for low-volume, non-cash activity", () => {
		const result = scoreTransactionElement(baseInput);
		expect(result.elementType).toBe("TRANSACTIONS");
		expect(result.level).toBe("LOW");
	});

	it("increases score for high cash ratio", () => {
		const cashHeavy = {
			...baseInput,
			cashOperations: 9,
		};
		const result = scoreTransactionElement(cashHeavy);
		expect(result.score).toBeGreaterThan(
			scoreTransactionElement(baseInput).score,
		);
	});

	it("increases score for near-threshold operations", () => {
		const structured = {
			...baseInput,
			nearThresholdCount: 5,
		};
		const result = scoreTransactionElement(structured);
		expect(result.score).toBeGreaterThan(
			scoreTransactionElement(baseInput).score,
		);
	});

	it("increases score for high-volume transactions", () => {
		const highVolume = {
			...baseInput,
			totalAmountMxn: 15_000_000,
		};
		const result = scoreTransactionElement(highVolume);
		expect(result.score).toBeGreaterThan(
			scoreTransactionElement(baseInput).score,
		);
	});

	it("handles zero operations gracefully", () => {
		const empty: TransactionFactorInput = {
			totalOperations: 0,
			cashOperations: 0,
			totalAmountMxn: 0,
			nearThresholdCount: 0,
			thirdPartyCount: 0,
			avgFrequencyPerMonth: 0,
		};
		const result = scoreTransactionElement(empty);
		expect(result.score).toBeGreaterThanOrEqual(0);
	});
});

// ─── Mitigants ──────────────────────────────────────────────────────────────

describe("scoreMitigants", () => {
	it("returns positive effect for well-mitigated client", () => {
		const input: ClientMitigantInput = {
			kycComplete: true,
			documentsVerified: true,
			relationshipMonths: 36,
			regulatedCounterparty: true,
		};
		const result = scoreMitigants(input);
		expect(result.effect).toBeGreaterThan(0);
		expect(result.factors).toHaveLength(4);
	});

	it("returns negative/zero effect when KYC incomplete", () => {
		const input: ClientMitigantInput = {
			kycComplete: false,
			documentsVerified: false,
			relationshipMonths: 0,
			regulatedCounterparty: false,
		};
		const result = scoreMitigants(input);
		expect(result.effect).toBeLessThan(0);
	});

	it("increases effect with longer relationship", () => {
		const short: ClientMitigantInput = {
			kycComplete: true,
			documentsVerified: true,
			relationshipMonths: 6,
			regulatedCounterparty: false,
		};
		const long: ClientMitigantInput = {
			...short,
			relationshipMonths: 30,
		};
		const shortResult = scoreMitigants(short);
		const longResult = scoreMitigants(long);
		expect(longResult.effect).toBeGreaterThan(shortResult.effect);
	});
});
