import { describe, it, expect } from "vitest";
import {
	ACTIVITY_THRESHOLDS,
	ALL_ACTIVITY_CODES,
	DEFAULT_UMA_DAILY_VALUE,
	exceedsCashLimit,
	exceedsIdentificationThreshold,
	exceedsNoticeThreshold,
	getCashLimitMxn,
	getCashLimitUma,
	getIdentificationThresholdMxn,
	getIdentificationThresholdUma,
	getNoticeThresholdMxn,
	getNoticeThresholdUma,
} from "./activity-thresholds";

const UMA = 117.31;

describe("ACTIVITY_THRESHOLDS", () => {
	it("contains all expected activity codes", () => {
		const expected = [
			"JYS",
			"TSC",
			"TPP",
			"TDR",
			"CHV",
			"MPC",
			"INM",
			"DIN",
			"MJR",
			"OBA",
			"VEH",
			"BLI",
			"TCV",
			"SPR",
			"FEP",
			"FES",
			"DON",
			"ARI",
			"AVI",
		];
		for (const code of expected) {
			expect(ACTIVITY_THRESHOLDS[code]).toBeDefined();
		}
	});

	it("each entry has matching activityCode key", () => {
		for (const [key, value] of Object.entries(ACTIVITY_THRESHOLDS)) {
			expect(value.activityCode).toBe(key);
		}
	});

	it("cashLimitUma Art. 32 caps match expected activities", () => {
		expect(ACTIVITY_THRESHOLDS.VEH.cashLimitUma).toBe(8025);
		expect(ACTIVITY_THRESHOLDS.INM.cashLimitUma).toBe(8025);
		expect(ACTIVITY_THRESHOLDS.DIN.cashLimitUma).toBe(8025);
		expect(ACTIVITY_THRESHOLDS.MJR.cashLimitUma).toBe(3210);
		expect(ACTIVITY_THRESHOLDS.OBA.cashLimitUma).toBe(3210);
		expect(ACTIVITY_THRESHOLDS.BLI.cashLimitUma).toBe(3210);
		expect(ACTIVITY_THRESHOLDS.JYS.cashLimitUma).toBe(3210);
		expect(ACTIVITY_THRESHOLDS.TPP.cashLimitUma).toBe(3210);
		expect(ACTIVITY_THRESHOLDS.TSC.cashLimitUma).toBeNull();
		expect(ACTIVITY_THRESHOLDS.AVI.cashLimitUma).toBeNull();
	});
});

describe("getCashLimitUma / getCashLimitMxn / exceedsCashLimit", () => {
	it("returns Art. 32 UMA for VEH", () => {
		expect(getCashLimitUma("VEH")).toBe(8025);
		expect(getCashLimitMxn("VEH", UMA)).toBeCloseTo(8025 * UMA, 2);
	});

	it("returns null for activities without a configured cash cap", () => {
		expect(getCashLimitUma("TSC")).toBeNull();
		expect(getCashLimitMxn("TSC", UMA)).toBeNull();
	});

	it("exceedsCashLimit when strictly greater than cap", () => {
		const limit = 8025 * UMA;
		expect(exceedsCashLimit("VEH", limit, UMA)).toBe(false);
		expect(exceedsCashLimit("VEH", limit + 0.01, UMA)).toBe(true);
	});

	it("returns false for unknown activity", () => {
		expect(exceedsCashLimit("UNKNOWN", 999999, UMA)).toBe(false);
	});
});

describe("ALL_ACTIVITY_CODES", () => {
	it("matches the keys of ACTIVITY_THRESHOLDS", () => {
		expect(ALL_ACTIVITY_CODES.sort()).toEqual(
			Object.keys(ACTIVITY_THRESHOLDS).sort(),
		);
	});
});

describe("DEFAULT_UMA_DAILY_VALUE", () => {
	it("is a positive number", () => {
		expect(DEFAULT_UMA_DAILY_VALUE).toBeGreaterThan(0);
		expect(DEFAULT_UMA_DAILY_VALUE).toBe(117.31);
	});
});

describe("getNoticeThresholdUma", () => {
	it("returns numeric threshold for VEH", () => {
		expect(getNoticeThresholdUma("VEH")).toBe(6420);
	});

	it("returns ALWAYS for SPR", () => {
		expect(getNoticeThresholdUma("SPR")).toBe("ALWAYS");
	});

	it("returns null for unknown activity", () => {
		expect(getNoticeThresholdUma("UNKNOWN")).toBeNull();
	});
});

describe("getIdentificationThresholdUma", () => {
	it("returns numeric threshold for VEH", () => {
		expect(getIdentificationThresholdUma("VEH")).toBe(3210);
	});

	it("returns ALWAYS for CHV", () => {
		expect(getIdentificationThresholdUma("CHV")).toBe("ALWAYS");
	});

	it("returns null for unknown activity", () => {
		expect(getIdentificationThresholdUma("UNKNOWN")).toBeNull();
	});
});

describe("getNoticeThresholdMxn", () => {
	it("converts UMA to MXN for VEH", () => {
		expect(getNoticeThresholdMxn("VEH", UMA)).toBeCloseTo(6420 * UMA, 2);
	});

	it("returns 0 for ALWAYS threshold (SPR)", () => {
		expect(getNoticeThresholdMxn("SPR", UMA)).toBe(0);
	});

	it("returns null for unknown activity", () => {
		expect(getNoticeThresholdMxn("UNKNOWN", UMA)).toBeNull();
	});
});

describe("getIdentificationThresholdMxn", () => {
	it("converts UMA to MXN for JYS", () => {
		expect(getIdentificationThresholdMxn("JYS", UMA)).toBeCloseTo(325 * UMA, 2);
	});

	it("returns 0 for ALWAYS threshold (INM)", () => {
		expect(getIdentificationThresholdMxn("INM", UMA)).toBe(0);
	});

	it("returns null for unknown activity", () => {
		expect(getIdentificationThresholdMxn("UNKNOWN", UMA)).toBeNull();
	});
});

describe("exceedsNoticeThreshold", () => {
	it("returns true when amount meets threshold", () => {
		const threshold = 6420 * UMA;
		expect(exceedsNoticeThreshold("VEH", threshold, UMA)).toBe(true);
	});

	it("returns true when amount exceeds threshold", () => {
		const threshold = 6420 * UMA;
		expect(exceedsNoticeThreshold("VEH", threshold + 1, UMA)).toBe(true);
	});

	it("returns false when amount is below threshold", () => {
		const threshold = 6420 * UMA;
		expect(exceedsNoticeThreshold("VEH", threshold - 1, UMA)).toBe(false);
	});

	it("returns true for any amount when threshold is ALWAYS (SPR)", () => {
		expect(exceedsNoticeThreshold("SPR", 0, UMA)).toBe(true);
		expect(exceedsNoticeThreshold("SPR", 1, UMA)).toBe(true);
	});

	it("returns false for unknown activity", () => {
		expect(exceedsNoticeThreshold("UNKNOWN", 999999, UMA)).toBe(false);
	});
});

describe("exceedsIdentificationThreshold", () => {
	it("returns true when amount meets threshold", () => {
		const threshold = 3210 * UMA;
		expect(exceedsIdentificationThreshold("VEH", threshold, UMA)).toBe(true);
	});

	it("returns false when amount is below threshold", () => {
		const threshold = 3210 * UMA;
		expect(exceedsIdentificationThreshold("VEH", threshold - 1, UMA)).toBe(
			false,
		);
	});

	it("returns true for any amount when threshold is ALWAYS (CHV)", () => {
		expect(exceedsIdentificationThreshold("CHV", 0, UMA)).toBe(true);
	});

	it("returns false for unknown activity", () => {
		expect(exceedsIdentificationThreshold("UNKNOWN", 999999, UMA)).toBe(false);
	});
});
