import { describe, it, expect } from "vitest";
import {
	ALERT_PATTERNS,
	getAlertCode,
	getPatternsForActivity,
	getPatternsByTier,
	type PatternType,
} from "./alert-patterns";

describe("ALERT_PATTERNS", () => {
	it("has configKey matching the pattern key for every entry", () => {
		for (const [key, config] of Object.entries(ALERT_PATTERNS)) {
			expect(config.configKey).toBe(key);
		}
	});

	it("every entry has a valid tier (1, 2, or 3)", () => {
		for (const [, config] of Object.entries(ALERT_PATTERNS)) {
			expect([1, 2, 3]).toContain(config.tier);
		}
	});

	it("every entry has a valid defaultSeverity", () => {
		const validSeverities = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
		for (const [, config] of Object.entries(ALERT_PATTERNS)) {
			expect(validSeverities).toContain(config.defaultSeverity);
		}
	});

	it("has non-empty name and description for every pattern", () => {
		for (const [, config] of Object.entries(ALERT_PATTERNS)) {
			expect(config.name.length).toBeGreaterThan(0);
			expect(config.description.length).toBeGreaterThan(0);
		}
	});
});

describe("getAlertCode", () => {
	it("returns '100' for operation_amount_uma + VEH", () => {
		expect(getAlertCode("operation_amount_uma", "VEH")).toBe("100");
	});

	it("returns specific code for frequent_operations + VEH", () => {
		expect(getAlertCode("frequent_operations", "VEH")).toBe("2516");
	});

	it("returns null when pattern not applicable to activity", () => {
		expect(getAlertCode("frequent_operations", "TSC")).toBeNull();
	});

	it("returns null for unknown activity code", () => {
		expect(getAlertCode("operation_amount_uma", "UNKNOWN")).toBeNull();
	});

	it("returns null for unknown pattern type", () => {
		expect(getAlertCode("nonexistent" as PatternType, "VEH")).toBeNull();
	});

	it("returns the correct code for tier 3 patterns", () => {
		expect(getAlertCode("pep_screening", "VEH")).toBe("2506");
		expect(getAlertCode("sanctions_screening", "VEH")).toBe("2505");
		expect(getAlertCode("adverse_media", "AVI")).toBe("4114");
	});
});

describe("getPatternsForActivity", () => {
	it("returns patterns applicable to VEH", () => {
		const patterns = getPatternsForActivity("VEH");
		expect(patterns).toContain("operation_amount_uma");
		expect(patterns).toContain("aggregate_amount_uma");
		expect(patterns).toContain("frequent_operations");
		expect(patterns).toContain("third_party_payer");
	});

	it("excludes patterns not applicable to VEH", () => {
		const patterns = getPatternsForActivity("VEH");
		expect(patterns).not.toContain("multiple_cards_requests");
		expect(patterns).not.toContain("quick_fund_movement");
	});

	it("returns patterns applicable to AVI", () => {
		const patterns = getPatternsForActivity("AVI");
		expect(patterns).toContain("quick_fund_movement");
		expect(patterns).toContain("structuring_detection");
	});

	it("returns empty array for unknown activity", () => {
		expect(getPatternsForActivity("UNKNOWN")).toEqual([]);
	});
});

describe("getPatternsByTier", () => {
	it("tier 1 contains expected low-complexity patterns", () => {
		const tier1 = getPatternsByTier(1);
		expect(tier1).toContain("operation_amount_uma");
		expect(tier1).toContain("aggregate_amount_uma");
		expect(tier1).toContain("frequent_operations");
		expect(tier1).toContain("cash_high_value");
		expect(tier1).toContain("minor_client");
	});

	it("tier 2 contains medium-complexity patterns", () => {
		const tier2 = getPatternsByTier(2);
		expect(tier2).toContain("profile_mismatch");
		expect(tier2).toContain("structuring_detection");
		expect(tier2).toContain("shared_address_analysis");
		expect(tier2).toContain("price_anomaly");
	});

	it("tier 3 contains external integration patterns", () => {
		const tier3 = getPatternsByTier(3);
		expect(tier3).toContain("pep_screening");
		expect(tier3).toContain("sanctions_screening");
		expect(tier3).toContain("adverse_media");
	});

	it("all patterns are accounted for across tiers", () => {
		const all = [
			...getPatternsByTier(1),
			...getPatternsByTier(2),
			...getPatternsByTier(3),
		];
		const patternKeys = Object.keys(ALERT_PATTERNS);
		expect(all.sort()).toEqual(patternKeys.sort());
	});
});
