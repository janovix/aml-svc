/**
 * PEP or High Risk Seeker
 *
 * Detects any operation from a PEP or high-risk client,
 * requiring enhanced monitoring for all their operations.
 */

import {
	BaseAlertSeeker,
	type AlertContext,
	type SeekerEvaluationResult,
	type VulnerableActivityCode,
	type AlertRuleType,
	type AlertSeverity,
} from "../types";

/**
 * Seeker for detecting operations from PEP or high-risk clients
 *
 * Trigger: Any operation from PEP or high-risk client
 * Severity: HIGH
 */
export class PepOrHighRiskSeeker extends BaseAlertSeeker {
	readonly activityCode: VulnerableActivityCode = "VEH";
	readonly ruleType: AlertRuleType = "pep_or_high_risk";
	readonly name = "Cliente PEP o de Alto Riesgo – Seguimiento Intensificado";
	readonly description =
		"Detecta todas las operaciones de clientes PEP o de alto riesgo para seguimiento intensificado";
	readonly defaultSeverity: AlertSeverity = "HIGH";

	async evaluate(
		context: AlertContext,
	): Promise<SeekerEvaluationResult | null> {
		const { client, operations, triggerOperation } = context;

		// Check if client is PEP or high-risk
		const isPep = client.isPep === true;
		const isHighRisk = client.riskLevel === "HIGH";

		if (!isPep && !isHighRisk) {
			return null;
		}

		// If we have a trigger operation, evaluate only that one
		// Otherwise, get the most recent operation
		let matchedOperations = triggerOperation ? [triggerOperation] : operations;

		if (matchedOperations.length === 0) {
			return null;
		}

		// For non-trigger evaluations, only alert on the most recent operation
		// to avoid duplicate alerts for historical operations
		if (!triggerOperation) {
			const sorted = [...matchedOperations].sort(
				(a, b) =>
					new Date(b.operationDate || b.createdAt).getTime() -
					new Date(a.operationDate || a.createdAt).getTime(),
			);
			matchedOperations = [sorted[0]];
		}

		const totalAmount = this.sumOperationAmounts(matchedOperations);

		// Find matching rule
		const matchedRule = this.findMatchingRule(context.alertRules);

		// Determine risk factors
		const riskFactors: string[] = [];
		if (isPep) {
			riskFactors.push("politically_exposed_person");
		}
		if (isHighRisk) {
			riskFactors.push("high_risk_client");
		}

		return {
			triggered: true,
			matchedRule,
			alertMetadata: {
				...this.createBaseAlertMetadata(
					matchedOperations,
					totalAmount,
					matchedOperations[0]?.currency || "MXN",
				),
				clientId: client.id,
				clientName: client.name || client.rfc,
				isPep,
				isHighRisk,
				riskLevel: client.riskLevel || (isPep ? "HIGH" : "MEDIUM"),
				alertType: "pep_or_high_risk",
				riskFactors,
				requiresEnhancedMonitoring: true,
				requiresManualReview: true,
				requiresReinforcedDocumentation: true,
				monitoringRequirements: [
					"enhanced_operation_monitoring",
					"periodic_review",
					"source_of_funds_verification",
					"beneficial_ownership_verification",
				],
				complianceActions: [
					"apply_enhanced_due_diligence",
					"document_risk_assessment",
					"schedule_periodic_review",
					"notify_compliance_officer",
				],
			},
			matchedOperations,
			metadata: {
				seekerType: this.ruleType,
				activityCode: this.activityCode,
				isPep,
				isHighRisk,
				riskLevel: client.riskLevel,
			},
		};
	}

	/**
	 * Override idempotency key to be per-operation for PEP/high-risk clients
	 * This ensures each operation gets its own alert
	 */
	async generateIdempotencyKey(
		context: AlertContext,
		result: SeekerEvaluationResult,
	): Promise<string> {
		const operationId = result.matchedOperations[0]?.id || "unknown";
		const riskType = context.client.isPep ? "PEP" : "HIGH_RISK";
		const data = `${context.client.id}:${riskType}:${this.ruleType}:${operationId}`;
		return this.hashString(data);
	}
}
