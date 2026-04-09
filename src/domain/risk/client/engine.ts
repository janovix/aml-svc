/**
 * Client Risk Classification Engine
 *
 * Calculates client risk scores using 4 element categories (client, geographic,
 * activity, transaction) and mitigant effects. Produces a DD profile per GAFI
 * R.1 NI para.16 with per-factor differentiation.
 */

import {
	clampScore,
	DEFAULT_ELEMENT_WEIGHTS,
	riskLevelToDDLevel,
	riskLevelToReviewMonths,
	scoreToRiskLevel,
} from "../types";
import type { ClientDDProfile, DDLevel, RiskLevel } from "../types";
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
import type { ClientRiskInput, ClientRiskResult } from "./types";

export interface RiskLookups {
	geo: GeoRiskLookup;
	jurisdiction: JurisdictionRiskLookup;
	activity: ActivityRiskLookup;
}

export function calculateClientRisk(
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

/**
 * Per-factor DD differentiation per GAFI R.1 NI para.16.
 * Different DD levels for acceptance vs monitoring vs review.
 */
function buildDDProfile(
	overall: RiskLevel,
	clientLevel: RiskLevel,
	geoLevel: RiskLevel,
	txLevel: RiskLevel,
	isPep: boolean,
): ClientDDProfile {
	const overallDD = riskLevelToDDLevel(overall);

	// PEP always gets enhanced monitoring regardless of overall level
	const monitoringLevel: DDLevel =
		isPep || txLevel === "HIGH" || geoLevel === "HIGH"
			? "ENHANCED"
			: riskLevelToDDLevel(maxRiskLevel(overall, txLevel));

	// Acceptance based on client element (identity risk)
	const acceptanceLevel: DDLevel = riskLevelToDDLevel(
		maxRiskLevel(overall, clientLevel),
	);

	// Review frequency driven by highest risk among geographic and transaction
	const reviewLevel: DDLevel = riskLevelToDDLevel(
		maxRiskLevel(geoLevel, txLevel),
	);

	// Reporting follows overall
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
