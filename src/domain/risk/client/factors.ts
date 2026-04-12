/**
 * Client Risk Factor Calculations
 *
 * Individual factor scoring functions for each risk element.
 * All scores on 0-9 scale (ENR alignment).
 */

import type {
	ActivityFactorInput,
	ClientFactorInput,
	ClientMitigantInput,
	ElementScore,
	FactorScore,
	GeographicFactorInput,
	TransactionFactorInput,
} from "./types";
import { scoreToRiskLevel } from "../types";

// ---- Reference data lookup types ----

export interface GeoRiskLookup {
	getByStateCode(code: string): { riskScore: number } | null;
}

export interface JurisdictionRiskLookup {
	getByCountryCode(code: string): { riskScore: number } | null;
}

export interface ActivityRiskLookup {
	getByKey(key: string): { riskScore: number } | null;
}

// ---- Client element ----

export function scoreClientElement(
	input: ClientFactorInput,
	jurisdictionLookup: JurisdictionRiskLookup,
): ElementScore {
	const factors: FactorScore[] = [];

	// PEP status: PEP = 8.0, non-PEP = 0
	const pepScore = input.isPep ? 8.0 : 0;
	factors.push({ name: "pep_status", score: pepScore, weight: 0.25 });

	// Nationality / jurisdiction risk
	const jurisdictionData = input.countryCode
		? jurisdictionLookup.getByCountryCode(input.countryCode)
		: null;
	const nationalityScore = jurisdictionData?.riskScore ?? 2.0;
	factors.push({
		name: "nationality_risk",
		score: nationalityScore,
		weight: 0.15,
	});

	// Person type: TRUST > MORAL > PHYSICAL
	const personTypeScore =
		input.personType === "TRUST"
			? 7.0
			: input.personType === "MORAL"
				? 5.0
				: 2.0;
	factors.push({ name: "person_type", score: personTypeScore, weight: 0.1 });

	// Screening result
	const screeningScore =
		input.ofacSanctioned || input.unscSanctioned
			? 9.0
			: input.sat69bListed
				? 8.0
				: input.adverseMediaFlagged
					? 6.0
					: input.screeningResult === "flagged"
						? 5.0
						: 0;
	factors.push({
		name: "screening_result",
		score: screeningScore,
		weight: 0.25,
	});

	// BC complexity: more layers = higher risk
	const bcScore = Math.min(input.bcCount * 1.5, 9);
	factors.push({
		name: "bc_complexity",
		score: bcScore,
		weight: 0.1,
	});

	// Client age: new clients (< 6 months) are higher risk
	const monthsOld = getMonthsSinceCreation(input.createdAt);
	const ageScore = monthsOld < 6 ? 6.0 : monthsOld < 12 ? 4.0 : 1.0;
	factors.push({ name: "client_age", score: ageScore, weight: 0.15 });

	const elementScore = weightedAverage(factors);

	return {
		elementType: "CLIENTS",
		score: elementScore,
		level: scoreToRiskLevel(elementScore),
		factors,
	};
}

// ---- Geographic element ----

export function scoreGeographicElement(
	input: GeographicFactorInput,
	geoLookup: GeoRiskLookup,
	jurisdictionLookup: JurisdictionRiskLookup,
): ElementScore {
	const factors: FactorScore[] = [];

	// Client domicile state risk
	const stateData = input.clientStateCode
		? geoLookup.getByStateCode(input.clientStateCode)
		: null;
	const stateScore = stateData?.riskScore ?? 3.0;
	factors.push({
		name: "domicile_state_risk",
		score: stateScore,
		weight: 0.3,
	});

	// Operation location risk (average of operation states)
	let opStateScoreAvg = 3.0;
	if (input.operationStateCodes.length > 0) {
		const scores = input.operationStateCodes.map(
			(code) => geoLookup.getByStateCode(code)?.riskScore ?? 3.0,
		);
		opStateScoreAvg = scores.reduce((a, b) => a + b, 0) / scores.length;
	}
	factors.push({
		name: "operation_location_risk",
		score: opStateScoreAvg,
		weight: 0.25,
	});

	// Cross-border operations
	const crossBorderScore = input.hasCrossBorderOps ? 6.0 : 0;
	factors.push({
		name: "cross_border",
		score: crossBorderScore,
		weight: 0.25,
	});

	// Country of origin risk
	const countryData = input.clientCountryCode
		? jurisdictionLookup.getByCountryCode(input.clientCountryCode)
		: null;
	const countryScore = countryData?.riskScore ?? 2.0;
	factors.push({
		name: "country_risk",
		score: countryScore,
		weight: 0.2,
	});

	const elementScore = weightedAverage(factors);

	return {
		elementType: "GEOGRAPHY",
		score: elementScore,
		level: scoreToRiskLevel(elementScore),
		factors,
	};
}

// ---- Activity/Product element ----

export function scoreActivityElement(
	input: ActivityFactorInput,
	activityLookup: ActivityRiskLookup,
): ElementScore {
	const factors: FactorScore[] = [];

	// Average activity risk from ENR matrix
	let activityScoreAvg = 3.0;
	if (input.activityCodes.length > 0) {
		const scores = input.activityCodes.map(
			(code) => activityLookup.getByKey(code)?.riskScore ?? 3.0,
		);
		activityScoreAvg = scores.reduce((a, b) => a + b, 0) / scores.length;
	}
	factors.push({
		name: "activity_enr_risk",
		score: activityScoreAvg,
		weight: 0.6,
	});

	// Activity count diversity: more varied activities = slightly higher risk
	const diversityScore = Math.min(input.activityCodes.length * 1.0, 6);
	factors.push({
		name: "activity_diversity",
		score: diversityScore,
		weight: 0.4,
	});

	const elementScore = weightedAverage(factors);

	return {
		elementType: "PRODUCTS",
		score: elementScore,
		level: scoreToRiskLevel(elementScore),
		factors,
	};
}

// ---- Transaction element ----

export function scoreTransactionElement(
	input: TransactionFactorInput,
): ElementScore {
	const factors: FactorScore[] = [];

	// Cash ratio
	const cashRatio =
		input.totalOperations > 0
			? input.cashOperations / input.totalOperations
			: 0;
	const cashScore = Math.min(cashRatio * 9, 9);
	factors.push({ name: "cash_ratio", score: cashScore, weight: 0.25 });

	// Near-threshold operations (structuring indicator)
	const nearThresholdRatio =
		input.totalOperations > 0
			? input.nearThresholdCount / input.totalOperations
			: 0;
	const thresholdScore = Math.min(nearThresholdRatio * 15, 9);
	factors.push({
		name: "near_threshold_ratio",
		score: thresholdScore,
		weight: 0.25,
	});

	// Third-party operations
	const thirdPartyRatio =
		input.totalOperations > 0
			? input.thirdPartyCount / input.totalOperations
			: 0;
	const thirdPartyScore = Math.min(thirdPartyRatio * 12, 9);
	factors.push({
		name: "third_party_ratio",
		score: thirdPartyScore,
		weight: 0.2,
	});

	// Frequency: high frequency relative to normal
	const freqScore =
		input.avgFrequencyPerMonth > 20
			? 7.0
			: input.avgFrequencyPerMonth > 10
				? 5.0
				: input.avgFrequencyPerMonth > 5
					? 3.0
					: 1.0;
	factors.push({
		name: "operation_frequency",
		score: freqScore,
		weight: 0.15,
	});

	// Volume: total amount (log scale, relative thresholds)
	const volumeScore =
		input.totalAmountMxn > 10_000_000
			? 8.0
			: input.totalAmountMxn > 1_000_000
				? 6.0
				: input.totalAmountMxn > 100_000
					? 4.0
					: 2.0;
	factors.push({
		name: "volume",
		score: volumeScore,
		weight: 0.15,
	});

	const elementScore = weightedAverage(factors);

	return {
		elementType: "TRANSACTIONS",
		score: elementScore,
		level: scoreToRiskLevel(elementScore),
		factors,
	};
}

// ---- Mitigant scoring ----

export function scoreMitigants(input: ClientMitigantInput): {
	effect: number;
	factors: FactorScore[];
} {
	const factors: FactorScore[] = [];

	// KYC completeness
	const kycEffect = input.kycComplete ? 1.0 : -0.5;
	factors.push({
		name: "kyc_completeness",
		score: input.kycComplete ? 1.0 : 0,
		weight: 0.3,
		detail: input.kycComplete ? "Complete" : "Incomplete — increases risk",
	});

	// Document verification
	const docsEffect = input.documentsVerified ? 0.8 : 0;
	factors.push({
		name: "documents_verified",
		score: input.documentsVerified ? 0.8 : 0,
		weight: 0.25,
	});

	// Relationship length
	const relationEffect =
		input.relationshipMonths > 24
			? 0.6
			: input.relationshipMonths > 12
				? 0.3
				: 0;
	factors.push({
		name: "relationship_length",
		score: relationEffect,
		weight: 0.2,
		detail: `${input.relationshipMonths} months`,
	});

	// Regulated counterparty
	const regulatedEffect = input.regulatedCounterparty ? 0.5 : 0;
	factors.push({
		name: "regulated_counterparty",
		score: regulatedEffect,
		weight: 0.25,
	});

	const totalEffect =
		kycEffect * 0.3 +
		docsEffect * 0.25 +
		relationEffect * 0.2 +
		regulatedEffect * 0.25;

	return { effect: totalEffect, factors };
}

// ---- Helpers ----

function weightedAverage(factors: FactorScore[]): number {
	const totalWeight = factors.reduce((sum, f) => sum + f.weight, 0);
	if (totalWeight === 0) return 0;
	const weighted = factors.reduce((sum, f) => sum + f.score * f.weight, 0);
	return weighted / totalWeight;
}

function getMonthsSinceCreation(createdAt: string): number {
	const created = new Date(createdAt);
	const now = new Date();
	return (
		(now.getFullYear() - created.getFullYear()) * 12 +
		(now.getMonth() - created.getMonth())
	);
}
