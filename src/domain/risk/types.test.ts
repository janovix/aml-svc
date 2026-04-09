import { describe, expect, it } from "vitest";
import {
	scoreToRiskLevel,
	riskLevelToScore,
	riskLevelToDDLevel,
	riskLevelToAuditType,
	riskLevelToReviewMonths,
	clampScore,
} from "./types";

describe("scoreToRiskLevel", () => {
	it("maps 0-2.9 to LOW", () => {
		expect(scoreToRiskLevel(0)).toBe("LOW");
		expect(scoreToRiskLevel(1.5)).toBe("LOW");
		expect(scoreToRiskLevel(2.99)).toBe("LOW");
	});

	it("maps 3-4.9 to MEDIUM_LOW", () => {
		expect(scoreToRiskLevel(3)).toBe("MEDIUM_LOW");
		expect(scoreToRiskLevel(4.5)).toBe("MEDIUM_LOW");
	});

	it("maps 5-6.9 to MEDIUM", () => {
		expect(scoreToRiskLevel(5)).toBe("MEDIUM");
		expect(scoreToRiskLevel(6.9)).toBe("MEDIUM");
	});

	it("maps 7+ to HIGH", () => {
		expect(scoreToRiskLevel(7)).toBe("HIGH");
		expect(scoreToRiskLevel(9)).toBe("HIGH");
	});
});

describe("riskLevelToScore", () => {
	it("returns representative scores for each level", () => {
		expect(riskLevelToScore("LOW")).toBe(1.5);
		expect(riskLevelToScore("MEDIUM_LOW")).toBe(4.0);
		expect(riskLevelToScore("MEDIUM")).toBe(6.0);
		expect(riskLevelToScore("HIGH")).toBe(8.0);
	});
});

describe("riskLevelToDDLevel", () => {
	it("maps LOW to SIMPLIFIED", () => {
		expect(riskLevelToDDLevel("LOW")).toBe("SIMPLIFIED");
	});

	it("maps MEDIUM_LOW and MEDIUM to STANDARD", () => {
		expect(riskLevelToDDLevel("MEDIUM_LOW")).toBe("STANDARD");
		expect(riskLevelToDDLevel("MEDIUM")).toBe("STANDARD");
	});

	it("maps HIGH to ENHANCED", () => {
		expect(riskLevelToDDLevel("HIGH")).toBe("ENHANCED");
	});
});

describe("riskLevelToAuditType", () => {
	it("requires external audit only for HIGH", () => {
		expect(riskLevelToAuditType("HIGH")).toBe("EXTERNAL_INDEPENDENT");
		expect(riskLevelToAuditType("MEDIUM")).toBe("INTERNAL");
		expect(riskLevelToAuditType("LOW")).toBe("INTERNAL");
	});
});

describe("riskLevelToReviewMonths", () => {
	it("returns correct review frequency for each level", () => {
		expect(riskLevelToReviewMonths("LOW")).toBe(12);
		expect(riskLevelToReviewMonths("MEDIUM_LOW")).toBe(6);
		expect(riskLevelToReviewMonths("MEDIUM")).toBe(3);
		expect(riskLevelToReviewMonths("HIGH")).toBe(1);
	});
});

describe("clampScore", () => {
	it("clamps values to 0-9 range", () => {
		expect(clampScore(-1)).toBe(0);
		expect(clampScore(0)).toBe(0);
		expect(clampScore(5)).toBe(5);
		expect(clampScore(9)).toBe(9);
		expect(clampScore(10)).toBe(9);
	});
});
