/**
 * Dynamic Factor Scorer
 *
 * Evaluates risk factor scores using methodology configuration instead of
 * hardcoded constants. Supports BOOLEAN, ENUM, NUMERIC_RANGE, and LOOKUP
 * factor types via score maps.
 */

import type {
	ResolvedCategory,
	ResolvedFactor,
	ResolvedScoreMap,
} from "../methodology/types";
import type { ElementScore, FactorScore } from "./types";
import type { RiskLookups } from "./engine";
import { clampScore } from "../types";

export type DataBag = Record<string, unknown>;

/**
 * Scores a single risk category by evaluating all its factors against the
 * provided data bag and lookup tables.
 */
export function scoreCategoryDynamic(
	category: ResolvedCategory,
	dataBag: DataBag,
	lookups: RiskLookups,
	scoreToRiskLevel: (score: number) => string,
): ElementScore {
	const factors: FactorScore[] = category.factors.map((factor) => {
		const rawValue = resolveDataSource(factor.dataSource, dataBag);
		const score = evaluateFactor(factor, rawValue, dataBag, lookups);
		return {
			name: factor.name,
			score: clampScore(score),
			weight: factor.weight,
		};
	});

	const elementScore = weightedAverage(factors);

	return {
		elementType: category.name,
		score: elementScore,
		level: scoreToRiskLevel(elementScore) as ElementScore["level"],
		factors,
	};
}

function evaluateFactor(
	factor: ResolvedFactor,
	rawValue: unknown,
	dataBag: DataBag,
	lookups: RiskLookups,
): number {
	switch (factor.factorType) {
		case "BOOLEAN":
			return evaluateBoolean(factor.scoreMaps, rawValue);
		case "ENUM":
			return evaluateEnum(
				factor.scoreMaps,
				rawValue,
				dataBag,
				factor.dataSource,
			);
		case "NUMERIC_RANGE":
			return evaluateNumericRange(factor.scoreMaps, rawValue);
		case "LOOKUP":
			return evaluateLookup(factor, rawValue, lookups);
		default:
			return 0;
	}
}

function evaluateBoolean(
	scoreMaps: ResolvedScoreMap[],
	value: unknown,
): number {
	const boolVal = String(Boolean(value));
	const match = scoreMaps.find((sm) => sm.conditionValue === boolVal);
	return match?.score ?? 0;
}

function evaluateEnum(
	scoreMaps: ResolvedScoreMap[],
	value: unknown,
	dataBag: DataBag,
	dataSource: string,
): number {
	// Special handling for screening_result which derives from multiple fields
	if (dataSource === "client.screeningResult") {
		return evaluateScreeningResult(scoreMaps, dataBag);
	}

	const strVal = String(value ?? "");
	const match = scoreMaps.find((sm) => sm.conditionValue === strVal);
	return match?.score ?? 0;
}

function evaluateScreeningResult(
	scoreMaps: ResolvedScoreMap[],
	dataBag: DataBag,
): number {
	const ofac = Boolean(dataBag["client.ofacSanctioned"]);
	const unsc = Boolean(dataBag["client.unscSanctioned"]);
	const sat69b = Boolean(dataBag["client.sat69bListed"]);
	const adverseMedia = Boolean(dataBag["client.adverseMediaFlagged"]);
	const screeningResult = String(dataBag["client.screeningResult"] ?? "clear");

	let effectiveValue = "clear";
	if (ofac || unsc) effectiveValue = "ofac_sanctioned";
	else if (sat69b) effectiveValue = "sat69b_listed";
	else if (adverseMedia) effectiveValue = "adverse_media";
	else if (screeningResult === "flagged") effectiveValue = "flagged";

	const match = scoreMaps.find((sm) => sm.conditionValue === effectiveValue);
	return match?.score ?? 0;
}

function evaluateNumericRange(
	scoreMaps: ResolvedScoreMap[],
	value: unknown,
): number {
	const numVal = Number(value ?? 0);
	for (const sm of scoreMaps) {
		const [minStr, maxStr] = sm.conditionValue.split("-");
		const min = Number(minStr);
		const max = Number(maxStr);
		if (numVal >= min && numVal <= max) {
			return sm.score;
		}
	}
	// If no range matched, return the last score map's score (highest range)
	return scoreMaps.length > 0 ? scoreMaps[scoreMaps.length - 1].score : 0;
}

function evaluateLookup(
	factor: ResolvedFactor,
	value: unknown,
	lookups: RiskLookups,
): number {
	const defaultScore = factor.scoreMaps[0]?.score ?? 0;

	const ds = factor.dataSource;
	if (ds.includes("StateCode") && !ds.includes("Codes")) {
		// Single state lookup
		const code = String(value ?? "");
		return lookups.geo.getByStateCode(code)?.riskScore ?? defaultScore;
	}
	if (ds.includes("StateCodes") || ds.includes("operationStateCodes")) {
		// Array of state codes -> average
		const codes = Array.isArray(value) ? value : [];
		if (codes.length === 0) return defaultScore;
		const scores = (codes as string[]).map(
			(code) => lookups.geo.getByStateCode(code)?.riskScore ?? defaultScore,
		);
		return scores.reduce((a, b) => a + b, 0) / scores.length;
	}
	if (ds.includes("CountryCode") || ds.includes("countryCode")) {
		const code = String(value ?? "");
		return (
			lookups.jurisdiction.getByCountryCode(code)?.riskScore ?? defaultScore
		);
	}
	if (ds.includes("activityCodes")) {
		const codes = Array.isArray(value) ? value : [];
		if (codes.length === 0) return defaultScore;
		const scores = (codes as string[]).map(
			(code) => lookups.activity.getByKey(code)?.riskScore ?? defaultScore,
		);
		return scores.reduce((a, b) => a + b, 0) / scores.length;
	}
	return defaultScore;
}

function weightedAverage(factors: FactorScore[]): number {
	const totalWeight = factors.reduce((sum, f) => sum + f.weight, 0);
	if (totalWeight === 0) return 0;
	const weighted = factors.reduce((sum, f) => sum + f.score * f.weight, 0);
	return weighted / totalWeight;
}

/**
 * Resolves a dataSource path to its value from the data bag.
 */
function resolveDataSource(dataSource: string, dataBag: DataBag): unknown {
	return dataBag[dataSource] ?? null;
}
