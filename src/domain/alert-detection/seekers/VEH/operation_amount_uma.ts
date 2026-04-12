/**
 * Operation Amount UMA Seeker
 *
 * Detects individual operations that meet or exceed the 6,420 UMA threshold
 * for mandatory SAT reporting (Aviso Obligatorio).
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
 * Seeker for detecting operations >= 6,420 UMA
 *
 * Trigger: When operation amount >= 6,420 UMA
 * Severity: HIGH
 */
export class OperationAmountUmaSeeker extends BaseAlertSeeker {
	readonly activityCode: VulnerableActivityCode = "VEH";
	readonly ruleType: AlertRuleType = "operation_amount_uma";
	readonly name = "Monto igual o superior a 6,420 UMA – Aviso Obligatorio";
	readonly description =
		"Detecta operaciones individuales con monto igual o superior a 6,420 UMA para generar aviso obligatorio al SAT";
	readonly defaultSeverity: AlertSeverity = "HIGH";

	async evaluate(
		context: AlertContext,
	): Promise<SeekerEvaluationResult | null> {
		const { client, operations, umaValue, triggerOperation } = context;

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
			: totalAmount / 113.14; // Fallback to 2025 UMA value

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
				alertType: "aviso_obligatorio",
				requiresCompleteFile: true,
				checklist: [
					"client_identification",
					"activity_or_occupation",
					"beneficial_owner",
				],
			},
			matchedOperations,
			metadata: {
				seekerType: this.ruleType,
				activityCode: this.activityCode,
				umaThreshold: UMA_THRESHOLD,
				calculatedThresholdMxn: thresholdMxn,
			},
		};
	}

	/**
	 * Override idempotency key to be based on the single operation
	 * that triggered the alert (for individual operation alerts)
	 */
	async generateIdempotencyKey(
		context: AlertContext,
		result: SeekerEvaluationResult,
	): Promise<string> {
		// For individual operations, use client + rule + operation ID
		const operationId = result.matchedOperations[0]?.id || "unknown";
		const data = `${context.client.id}:${this.ruleType}:${operationId}`;
		return this.hashString(data);
	}
}
