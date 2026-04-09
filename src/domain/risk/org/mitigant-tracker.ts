/**
 * Mitigant Tracker
 *
 * Evaluates the existence and effectiveness of organizational controls.
 * Effective mitigants reduce inherent risk; absent/deficient mitigants can increase it.
 */

import type { OrgMitigantEvaluation, OrgRiskInput } from "./types";

const MITIGANT_CATALOG = [
	{
		key: "kyc_completeness",
		name: "Completitud del proceso KYC",
		maxEffect: 0.8,
	},
	{
		key: "screening_coverage",
		name: "Cobertura de listas de vigilancia",
		maxEffect: 0.7,
	},
	{
		key: "monitoring_quality",
		name: "Calidad del monitoreo automatizado",
		maxEffect: 0.6,
	},
	{
		key: "compliance_structure",
		name: "Estructura de cumplimiento",
		maxEffect: 0.5,
	},
	{
		key: "training_program",
		name: "Programa de capacitación (Art. 18-IX)",
		maxEffect: 0.4,
	},
	{
		key: "audit_findings",
		name: "Resultados de auditoría",
		maxEffect: 0.5,
	},
] as const;

export function evaluateMitigants(
	input: OrgRiskInput,
): OrgMitigantEvaluation[] {
	const m = input.mitigantInputs;

	return MITIGANT_CATALOG.map((catalog) => {
		const rawScore = getInputScore(catalog.key, m);
		const exists = rawScore > 0;
		const effectiveness = Math.min(rawScore, 1);

		// Positive effect (reduces risk) for good controls, negative for absent/deficient ones
		let riskEffect: number;
		if (!exists) {
			riskEffect = -(catalog.maxEffect * 0.5);
		} else {
			riskEffect = catalog.maxEffect * effectiveness;
		}

		return {
			mitigantKey: catalog.key,
			mitigantName: catalog.name,
			exists,
			effectivenessScore: effectiveness,
			riskEffect,
		};
	});
}

function getInputScore(
	key: string,
	inputs: OrgRiskInput["mitigantInputs"],
): number {
	switch (key) {
		case "kyc_completeness":
			return inputs.kycCompletenessRate;
		case "screening_coverage":
			return inputs.screeningCoverage;
		case "monitoring_quality":
			return inputs.monitoringQuality;
		case "compliance_structure":
			return inputs.complianceStructure;
		case "training_program":
			return inputs.trainingProgram;
		case "audit_findings":
			return inputs.auditFindings;
		default:
			return 0;
	}
}
