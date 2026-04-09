/**
 * Shared risk types used across both org-level and client-level risk engines.
 * Scale: 0-9 (ENR 2023 alignment). Levels: LOW (0-3), MEDIUM_LOW (3-5), MEDIUM (5-7), HIGH (7-9).
 */

export type RiskLevel = "LOW" | "MEDIUM_LOW" | "MEDIUM" | "HIGH";

export type DDLevel = "SIMPLIFIED" | "STANDARD" | "ENHANCED";

export type ElementType = "CLIENTS" | "GEOGRAPHY" | "PRODUCTS" | "TRANSACTIONS";

export type AuditType = "INTERNAL" | "EXTERNAL_INDEPENDENT";

export interface ClientDDProfile {
	overall: DDLevel;
	acceptance: DDLevel;
	ongoingMonitoring: DDLevel;
	reviewFrequency: DDLevel;
	reporting: DDLevel;
}

export interface ElementWeights {
	clients: number;
	geography: number;
	products: number;
	transactions: number;
}

export const DEFAULT_ELEMENT_WEIGHTS: ElementWeights = {
	clients: 0.3,
	geography: 0.2,
	products: 0.25,
	transactions: 0.25,
};

export function scoreToRiskLevel(score: number): RiskLevel {
	if (score < 3) return "LOW";
	if (score < 5) return "MEDIUM_LOW";
	if (score < 7) return "MEDIUM";
	return "HIGH";
}

export function riskLevelToScore(level: RiskLevel): number {
	switch (level) {
		case "LOW":
			return 1.5;
		case "MEDIUM_LOW":
			return 4.0;
		case "MEDIUM":
			return 6.0;
		case "HIGH":
			return 8.0;
	}
}

export function riskLevelToDDLevel(level: RiskLevel): DDLevel {
	switch (level) {
		case "LOW":
			return "SIMPLIFIED";
		case "MEDIUM_LOW":
		case "MEDIUM":
			return "STANDARD";
		case "HIGH":
			return "ENHANCED";
	}
}

export function riskLevelToAuditType(level: RiskLevel): AuditType {
	return level === "HIGH" ? "EXTERNAL_INDEPENDENT" : "INTERNAL";
}

/**
 * Review frequency in months based on risk level.
 * LOW: 12 months, MEDIUM_LOW: 6, MEDIUM: 3, HIGH: 1
 */
export function riskLevelToReviewMonths(level: RiskLevel): number {
	switch (level) {
		case "LOW":
			return 12;
		case "MEDIUM_LOW":
			return 6;
		case "MEDIUM":
			return 3;
		case "HIGH":
			return 1;
	}
}

export function clampScore(score: number): number {
	return Math.max(0, Math.min(9, score));
}
