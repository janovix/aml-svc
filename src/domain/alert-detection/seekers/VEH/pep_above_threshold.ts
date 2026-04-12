/**
 * PEP Above Threshold Seeker
 *
 * Detects when a Politically Exposed Person (PEP) has an operation
 * that meets or exceeds the 6,420 UMA threshold.
 */

import { UMA_THRESHOLD } from "../constants";
import {
	BaseAlertSeeker,
	type AlertContext,
	type SeekerEvaluationResult,
	type VulnerableActivityCode,
	type AlertRuleType,
	type AlertSeverity,
} from "../types";

/**
 * Seeker for detecting PEP operations above the UMA threshold
 *
 * Trigger: PEP client has operation >= 6,420 UMA
 * Severity: CRITICAL
 */
export class PepAboveThresholdSeeker extends BaseAlertSeeker {
	readonly activityCode: VulnerableActivityCode = "VEH";
	readonly ruleType: AlertRuleType = "pep_above_threshold";
	readonly name =
		"Operación de PEP por encima del umbral de aviso – seguimiento reforzado";
	readonly description =
		"Detecta operaciones de Personas Políticamente Expuestas (PEP) con monto igual o superior a 6,420 UMA";
	readonly defaultSeverity: AlertSeverity = "CRITICAL";

	async evaluate(
		context: AlertContext,
	): Promise<SeekerEvaluationResult | null> {
		const { client, operations, umaValue, triggerOperation } = context;

		// Check if client is a PEP
		if (!client.isPep) {
			return null;
		}

		// Calculate the threshold in MXN
		const thresholdMxn = this.calculateUmaThreshold(umaValue, UMA_THRESHOLD);

		// If we have a trigger operation, evaluate only that one
		const operationsToEvaluate = triggerOperation
			? [triggerOperation]
			: operations;

		// Find operations that meet or exceed the threshold
		const matchedOperations = operationsToEvaluate.filter(
			(op) => op.currency === "MXN" && op.amount >= thresholdMxn,
		);

		if (matchedOperations.length === 0) {
			return null;
		}

		// Calculate totals
		const totalAmount = this.sumOperationAmounts(matchedOperations, "MXN");
		const umaAmount = umaValue
			? totalAmount / umaValue.dailyValue
			: totalAmount / 113.14;

		// Find matching rule
		const matchedRule = this.findMatchingRule(context.alertRules);

		return {
			triggered: true,
			matchedRule,
			alertMetadata: {
				...this.createBaseAlertMetadata(matchedOperations, totalAmount, "MXN"),
				umaAmount: Math.round(umaAmount * 100) / 100,
				umaDailyValue: umaValue?.dailyValue || 113.14,
				threshold: UMA_THRESHOLD,
				thresholdMxn,
				clientId: client.id,
				clientName: client.name || client.rfc,
				isPep: true,
				alertType: "pep_above_threshold",
				requiresEnhancedMonitoring: true,
				requiresManualReview: true,
				requiresResourceOriginDocumentation: true,
				riskIndicators: [
					"politically_exposed_person",
					"high_value_operation",
					"enhanced_due_diligence_required",
				],
				complianceRequirements: [
					"reinforced_documentation",
					"resource_origin_verification",
					"compliance_officer_review",
					"enhanced_monitoring",
				],
			},
			matchedOperations,
			metadata: {
				seekerType: this.ruleType,
				activityCode: this.activityCode,
				isPep: true,
				umaThreshold: UMA_THRESHOLD,
				calculatedThresholdMxn: thresholdMxn,
			},
		};
	}

	/**
	 * Override idempotency key to include PEP flag
	 */
	async generateIdempotencyKey(
		context: AlertContext,
		result: SeekerEvaluationResult,
	): Promise<string> {
		const operationIds = result.matchedOperations
			.map((op) => op.id)
			.sort()
			.join(",");
		const data = `${context.client.id}:PEP:${this.ruleType}:${operationIds}`;
		return this.hashString(data);
	}
}
