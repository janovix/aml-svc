/**
 * Organization EBR Element Evaluators
 *
 * Each evaluator scores one of the 4 risk elements (clients, geography,
 * products, transactions) on the 0-9 scale, producing a factor breakdown.
 */

import { scoreToRiskLevel } from "../types";
import type { OrgElementEvaluation, OrgRiskInput } from "./types";

export function evaluateClientElement(
	input: OrgRiskInput,
): OrgElementEvaluation {
	const { clientStats } = input;
	const totalClients = clientStats.totalClients || 1;

	const pepConcentration = (clientStats.pepCount / totalClients) * 9;
	const highRiskNationalityConcentration =
		(clientStats.highRiskNationalityCount / totalClients) * 9;
	const moralPct =
		((clientStats.moralEntityCount + clientStats.trustCount) / totalClients) *
		9;
	const newClientRatio = (clientStats.newClientCount / totalClients) * 9;
	const bcComplexity = Math.min(clientStats.avgBcLayers * 2.5, 9);

	const factors = {
		pep_concentration: Math.min(pepConcentration, 9),
		high_risk_nationality: Math.min(highRiskNationalityConcentration, 9),
		moral_entity_pct: Math.min(moralPct, 9),
		new_client_ratio: Math.min(newClientRatio, 9),
		bc_complexity: bcComplexity,
	};

	const weights = [0.25, 0.2, 0.15, 0.2, 0.2];
	const scores = Object.values(factors);
	const score = scores.reduce((sum, s, i) => sum + s * weights[i], 0);

	return {
		elementType: "CLIENTS",
		weight: input.weights?.clients ?? 0.3,
		riskScore: Math.min(score, 9),
		riskLevel: scoreToRiskLevel(score),
		factorBreakdown: factors,
	};
}

export function evaluateGeographyElement(
	input: OrgRiskInput,
): OrgElementEvaluation {
	const { geoStats } = input;

	const factors = {
		high_risk_state_operations: Math.min(
			geoStats.highRiskStateOperationPct * 9,
			9,
		),
		border_exposure: geoStats.borderAreaExposure ? 6.0 : 0,
		cross_border_pct: Math.min(geoStats.crossBorderPct * 9, 9),
		location_mismatch: Math.min(geoStats.locationMismatchPct * 9, 9),
	};

	const weights = [0.35, 0.2, 0.25, 0.2];
	const scores = Object.values(factors);
	const score = scores.reduce((sum, s, i) => sum + s * weights[i], 0);

	return {
		elementType: "GEOGRAPHY",
		weight: input.weights?.geography ?? 0.2,
		riskScore: Math.min(score, 9),
		riskLevel: scoreToRiskLevel(score),
		factorBreakdown: factors,
	};
}

export function evaluateProductElement(
	input: OrgRiskInput,
): OrgElementEvaluation {
	const { productStats } = input;

	const factors = {
		activity_enr_risk: productStats.primaryActivityRiskScore,
		cash_intensity: Math.min(productStats.cashIntensity * 9, 9),
		anonymity_enabling: productStats.anonymityEnabling ? 7.0 : 1.0,
		non_presential_channel: Math.min(
			productStats.nonPresentialChannelUsage * 9,
			9,
		),
	};

	const weights = [0.4, 0.25, 0.2, 0.15];
	const scores = Object.values(factors);
	const score = scores.reduce((sum, s, i) => sum + s * weights[i], 0);

	return {
		elementType: "PRODUCTS",
		weight: input.weights?.products ?? 0.25,
		riskScore: Math.min(score, 9),
		riskLevel: scoreToRiskLevel(score),
		factorBreakdown: factors,
	};
}

export function evaluateTransactionElement(
	input: OrgRiskInput,
): OrgElementEvaluation {
	const { transactionStats } = input;

	const factors = {
		cash_operation_pct: Math.min(transactionStats.cashOperationPct * 9, 9),
		near_threshold_pct: Math.min(transactionStats.nearThresholdPct * 15, 9),
		high_frequency_pct: Math.min(transactionStats.highFrequencyPct * 9, 9),
		third_party_pct: Math.min(transactionStats.thirdPartyPct * 12, 9),
	};

	const weights = [0.3, 0.3, 0.2, 0.2];
	const scores = Object.values(factors);
	const score = scores.reduce((sum, s, i) => sum + s * weights[i], 0);

	return {
		elementType: "TRANSACTIONS",
		weight: input.weights?.transactions ?? 0.25,
		riskScore: Math.min(score, 9),
		riskLevel: scoreToRiskLevel(score),
		factorBreakdown: factors,
	};
}
