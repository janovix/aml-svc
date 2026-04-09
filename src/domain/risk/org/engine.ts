/**
 * Organization EBR Engine (Art. 18-VII -- entity risk)
 *
 * Evaluates 4 risk elements with configurable weights, applies mitigant effects,
 * and determines audit type (Art. 18-XI) and FP risk (GAFI R.1 Cr.1.15).
 */

import { clampScore, riskLevelToAuditType, scoreToRiskLevel } from "../types";
import type { RiskLevel } from "../types";
import {
	evaluateClientElement,
	evaluateGeographyElement,
	evaluateProductElement,
	evaluateTransactionElement,
} from "./element-evaluators";
import { evaluateMitigants } from "./mitigant-tracker";
import type { OrgAssessmentResult, OrgRiskInput } from "./types";

export function calculateOrgRisk(input: OrgRiskInput): OrgAssessmentResult {
	const elements = [
		evaluateClientElement(input),
		evaluateGeographyElement(input),
		evaluateProductElement(input),
		evaluateTransactionElement(input),
	];

	const inherentRiskScore = clampScore(
		elements.reduce((sum, el) => sum + el.riskScore * el.weight, 0),
	);

	const mitigants = evaluateMitigants(input);
	const totalMitigantEffect = mitigants.reduce(
		(sum, m) => sum + m.riskEffect,
		0,
	);

	const residualRiskScore = clampScore(inherentRiskScore - totalMitigantEffect);

	const riskLevel = scoreToRiskLevel(residualRiskScore);
	const requiredAuditType = riskLevelToAuditType(riskLevel);

	const fpResult = evaluateFPRisk(input);

	return {
		organizationId: input.organizationId,
		inherentRiskScore,
		residualRiskScore,
		riskLevel,
		requiredAuditType,
		fpRiskLevel: fpResult.level,
		fpRiskJustification: fpResult.justification,
		elements,
		mitigants,
	};
}

/**
 * FP Risk Section (GAFI R.1 Cr.1.15)
 * Lightweight for AV entities — scoped to UNSC sanctions compliance.
 */
function evaluateFPRisk(input: OrgRiskInput): {
	level: RiskLevel;
	justification: string;
} {
	const { fpStats } = input;

	const screeningScore =
		fpStats.sanctionsScreeningCoverage >= 0.9
			? 1.0
			: fpStats.sanctionsScreeningCoverage >= 0.7
				? 3.0
				: 5.0;
	const crossBorderScore = Math.min(fpStats.crossBorderExposure * 4, 9);
	const recencyScore =
		fpStats.sanctionsListRecency >= 0.9
			? 1.0
			: fpStats.sanctionsListRecency >= 0.5
				? 3.0
				: 6.0;

	const fpScore =
		screeningScore * 0.4 + crossBorderScore * 0.3 + recencyScore * 0.3;
	const level = scoreToRiskLevel(fpScore);

	const parts: string[] = [];
	parts.push(
		`Screening coverage: ${(fpStats.sanctionsScreeningCoverage * 100).toFixed(0)}%`,
	);
	parts.push(
		`Cross-border exposure: ${(fpStats.crossBorderExposure * 100).toFixed(0)}%`,
	);
	parts.push(
		`Sanctions list recency: ${(fpStats.sanctionsListRecency * 100).toFixed(0)}%`,
	);
	parts.push(`FP risk score: ${fpScore.toFixed(2)} (${level})`);

	return {
		level,
		justification: parts.join(". "),
	};
}
