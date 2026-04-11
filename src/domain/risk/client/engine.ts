/**
 * Client Risk Classification Engine
 *
 * Calculates client risk scores using 4 element categories (client, geographic,
 * activity, transaction) and mitigant effects. Produces a DD profile per GAFI
 * R.1 NI para.16 with per-factor differentiation.
 *
 * Supports both methodology-driven (dynamic) and legacy (hardcoded) scoring.
 * When a ResolvedMethodology is provided, all weights, score maps, thresholds,
 * and mitigant defs are read from it. Otherwise, falls back to hardcoded defaults.
 */

import {
	clampScore,
	DEFAULT_ELEMENT_WEIGHTS,
	riskLevelToDDLevel,
	riskLevelToReviewMonths,
	scoreToRiskLevel,
} from "../types";
import type { ClientDDProfile, DDLevel, RiskLevel } from "../types";
import type {
	ResolvedMethodology,
	ResolvedThreshold,
} from "../methodology/types";
import {
	scoreActivityElement,
	scoreClientElement,
	scoreGeographicElement,
	scoreMitigants,
	scoreTransactionElement,
} from "./factors";
import type {
	ActivityRiskLookup,
	GeoRiskLookup,
	JurisdictionRiskLookup,
} from "./factors";
import { scoreCategoryDynamic } from "./dynamic-scorer";
import type { DataBag } from "./dynamic-scorer";
import type { ClientRiskInput, ClientRiskResult } from "./types";

export interface RiskLookups {
	geo: GeoRiskLookup;
	jurisdiction: JurisdictionRiskLookup;
	activity: ActivityRiskLookup;
}

export function calculateClientRisk(
	input: ClientRiskInput,
	lookups: RiskLookups,
	methodology?: ResolvedMethodology,
): ClientRiskResult {
	if (methodology) {
		return calculateWithMethodology(input, lookups, methodology);
	}
	return calculateLegacy(input, lookups);
}

// ---- Methodology-driven calculation ----

function calculateWithMethodology(
	input: ClientRiskInput,
	lookups: RiskLookups,
	methodology: ResolvedMethodology,
): ClientRiskResult {
	const dataBag = buildDataBag(input);
	const thresholdScorer = buildThresholdScorer(methodology.thresholds);

	// Score each category dynamically
	const categoryResults = new Map<
		string,
		ReturnType<typeof scoreCategoryDynamic>
	>();
	for (const cat of methodology.categories) {
		categoryResults.set(
			cat.name,
			scoreCategoryDynamic(cat, dataBag, lookups, thresholdScorer.scoreToLevel),
		);
	}

	const clientElement =
		categoryResults.get("CLIENTS") ?? fallbackElement("CLIENTS");
	const geoElement =
		categoryResults.get("GEOGRAPHY") ?? fallbackElement("GEOGRAPHY");
	const activityElement =
		categoryResults.get("PRODUCTS") ?? fallbackElement("PRODUCTS");
	const txElement =
		categoryResults.get("TRANSACTIONS") ?? fallbackElement("TRANSACTIONS");

	// Compute inherent risk from category weights
	let inherentRiskScore = 0;
	for (const cat of methodology.categories) {
		const result = categoryResults.get(cat.name);
		if (result) {
			inherentRiskScore += result.score * cat.weight;
		}
	}
	inherentRiskScore = clampScore(inherentRiskScore);

	// Evaluate mitigants from methodology config
	const mitigantResult = evaluateMitigantsDynamic(input, methodology);

	const residualRiskScore = clampScore(
		inherentRiskScore - mitigantResult.effect,
	);

	const riskLevel = thresholdScorer.scoreToLevel(
		residualRiskScore,
	) as RiskLevel;
	const dueDiligenceLevel = thresholdScorer.scoreToDDLevel(residualRiskScore);
	const nextReviewMonths =
		thresholdScorer.scoreToReviewMonths(residualRiskScore);

	const ddProfile = buildDDProfile(
		riskLevel,
		clientElement.level,
		geoElement.level,
		txElement.level,
		input.client.isPep,
	);

	return {
		clientId: input.clientId,
		organizationId: input.organizationId,
		methodologyId: methodology.id,
		inherentRiskScore,
		residualRiskScore,
		riskLevel,
		dueDiligenceLevel,
		ddProfile,
		elements: {
			client: clientElement,
			geographic: geoElement,
			activity: activityElement,
			transaction: txElement,
		},
		mitigantEffect: mitigantResult.effect,
		mitigantFactors: mitigantResult.factors,
		nextReviewMonths,
	};
}

// ---- Legacy (hardcoded) calculation ----

function calculateLegacy(
	input: ClientRiskInput,
	lookups: RiskLookups,
): ClientRiskResult {
	const weights = input.weights ?? DEFAULT_ELEMENT_WEIGHTS;

	const clientElement = scoreClientElement(input.client, lookups.jurisdiction);
	const geoElement = scoreGeographicElement(
		input.geographic,
		lookups.geo,
		lookups.jurisdiction,
	);
	const activityElement = scoreActivityElement(
		input.activity,
		lookups.activity,
	);
	const txElement = scoreTransactionElement(input.transaction);

	const inherentRiskScore = clampScore(
		clientElement.score * weights.clients +
			geoElement.score * weights.geography +
			activityElement.score * weights.products +
			txElement.score * weights.transactions,
	);

	const mitigantResult = scoreMitigants(input.mitigants);

	const residualRiskScore = clampScore(
		inherentRiskScore - mitigantResult.effect,
	);

	const riskLevel = scoreToRiskLevel(residualRiskScore);
	const dueDiligenceLevel = riskLevelToDDLevel(riskLevel);

	const ddProfile = buildDDProfile(
		riskLevel,
		clientElement.level,
		geoElement.level,
		txElement.level,
		input.client.isPep,
	);

	const nextReviewMonths = riskLevelToReviewMonths(riskLevel);

	return {
		clientId: input.clientId,
		organizationId: input.organizationId,
		inherentRiskScore,
		residualRiskScore,
		riskLevel,
		dueDiligenceLevel,
		ddProfile,
		elements: {
			client: clientElement,
			geographic: geoElement,
			activity: activityElement,
			transaction: txElement,
		},
		mitigantEffect: mitigantResult.effect,
		mitigantFactors: mitigantResult.factors,
		nextReviewMonths,
	};
}

// ---- Data bag builder ----

function buildDataBag(input: ClientRiskInput): DataBag {
	const totalOps = input.transaction.totalOperations || 1;
	const monthsSinceCreation = getMonthsSince(input.client.createdAt);

	return {
		// Client factors
		"client.isPep": input.client.isPep,
		"client.countryCode": input.client.countryCode,
		"client.personType": input.client.personType,
		"client.screeningResult": input.client.screeningResult,
		"client.ofacSanctioned": input.client.ofacSanctioned,
		"client.unscSanctioned": input.client.unscSanctioned,
		"client.sat69bListed": input.client.sat69bListed,
		"client.adverseMediaFlagged": input.client.adverseMediaFlagged,
		"client.bcCount": input.client.bcCount,
		"client.monthsSinceCreation": monthsSinceCreation,
		// Geographic factors
		"geographic.clientStateCode": input.geographic.clientStateCode,
		"geographic.operationStateCodes": input.geographic.operationStateCodes,
		"geographic.clientCountryCode": input.geographic.clientCountryCode,
		"geographic.hasCrossBorderOps": input.geographic.hasCrossBorderOps,
		// Activity factors
		"activity.activityCodes": input.activity.activityCodes,
		"activity.activityCodeCount": input.activity.activityCodes.length,
		// Transaction factors
		"transaction.cashRatio": input.transaction.cashOperations / totalOps,
		"transaction.nearThresholdRatio":
			input.transaction.nearThresholdCount / totalOps,
		"transaction.thirdPartyRatio": input.transaction.thirdPartyCount / totalOps,
		"transaction.avgFrequencyPerMonth": input.transaction.avgFrequencyPerMonth,
		"transaction.totalAmountMxn": input.transaction.totalAmountMxn,
		// Mitigants
		"mitigants.kycComplete": input.mitigants.kycComplete,
		"mitigants.documentsVerified": input.mitigants.documentsVerified,
		"mitigants.relationshipMonths": input.mitigants.relationshipMonths,
		"mitigants.regulatedCounterparty": input.mitigants.regulatedCounterparty,
	};
}

// ---- Dynamic mitigant evaluation ----

function evaluateMitigantsDynamic(
	input: ClientRiskInput,
	methodology: ResolvedMethodology,
): {
	effect: number;
	factors: Array<{
		name: string;
		score: number;
		weight: number;
		detail?: string;
	}>;
} {
	const factors: Array<{
		name: string;
		score: number;
		weight: number;
		detail?: string;
	}> = [];
	let totalEffect = 0;

	for (const mit of methodology.mitigants) {
		let effectValue = 0;
		let detail: string | undefined;

		switch (mit.mitigantKey) {
			case "kyc_completeness":
				effectValue = input.mitigants.kycComplete
					? mit.maxEffect
					: -(mit.maxEffect * 0.5);
				detail = input.mitigants.kycComplete
					? "Complete"
					: "Incomplete — increases risk";
				break;
			case "documents_verified":
				effectValue = input.mitigants.documentsVerified ? mit.maxEffect : 0;
				break;
			case "relationship_length":
				effectValue =
					input.mitigants.relationshipMonths > 24
						? mit.maxEffect
						: input.mitigants.relationshipMonths > 12
							? mit.maxEffect * 0.5
							: 0;
				detail = `${input.mitigants.relationshipMonths} months`;
				break;
			case "regulated_counterparty":
				effectValue = input.mitigants.regulatedCounterparty ? mit.maxEffect : 0;
				break;
			default:
				break;
		}

		factors.push({
			name: mit.mitigantKey,
			score: effectValue,
			weight: mit.weight,
			detail,
		});
		totalEffect += effectValue * mit.weight;
	}

	return { effect: totalEffect, factors };
}

// ---- Threshold scorer builder ----

function buildThresholdScorer(thresholds: ResolvedThreshold[]) {
	const sorted = [...thresholds].sort((a, b) => a.minScore - b.minScore);

	function findThreshold(score: number): ResolvedThreshold {
		for (const t of sorted) {
			if (score >= t.minScore && score < t.maxScore) return t;
		}
		return sorted[sorted.length - 1];
	}

	return {
		scoreToLevel: (score: number): string => findThreshold(score).riskLevel,
		scoreToDDLevel: (score: number): DDLevel =>
			findThreshold(score).ddLevel as DDLevel,
		scoreToReviewMonths: (score: number): number =>
			findThreshold(score).reviewMonths,
	};
}

// ---- DD Profile builder ----

function buildDDProfile(
	overall: RiskLevel,
	clientLevel: RiskLevel,
	geoLevel: RiskLevel,
	txLevel: RiskLevel,
	isPep: boolean,
): ClientDDProfile {
	const overallDD = riskLevelToDDLevel(overall);

	const monitoringLevel: DDLevel =
		isPep || txLevel === "HIGH" || geoLevel === "HIGH"
			? "ENHANCED"
			: riskLevelToDDLevel(maxRiskLevel(overall, txLevel));

	const acceptanceLevel: DDLevel = riskLevelToDDLevel(
		maxRiskLevel(overall, clientLevel),
	);

	const reviewLevel: DDLevel = riskLevelToDDLevel(
		maxRiskLevel(geoLevel, txLevel),
	);

	const reportingLevel: DDLevel = overallDD;

	return {
		overall: overallDD,
		acceptance: acceptanceLevel,
		ongoingMonitoring: monitoringLevel,
		reviewFrequency: reviewLevel,
		reporting: reportingLevel,
	};
}

function maxRiskLevel(a: RiskLevel, b: RiskLevel): RiskLevel {
	const order: RiskLevel[] = ["LOW", "MEDIUM_LOW", "MEDIUM", "HIGH"];
	return order.indexOf(a) >= order.indexOf(b) ? a : b;
}

function fallbackElement(elementType: string) {
	return {
		elementType,
		score: 0,
		level: "LOW" as RiskLevel,
		factors: [],
	};
}

function getMonthsSince(dateStr: string): number {
	const date = new Date(dateStr);
	const now = new Date();
	return (
		(now.getFullYear() - date.getFullYear()) * 12 +
		(now.getMonth() - date.getMonth())
	);
}
