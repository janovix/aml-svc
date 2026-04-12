/**
 * Cash Payment Limit Seeker
 *
 * Detects when a cash payment exceeds the legal limit for this vulnerable activity.
 * Based on Art. 32 LFPIORPI.
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
 * Seeker for detecting cash payments exceeding legal limits
 *
 * Trigger: Cash payment exceeds legal limit
 * Severity: HIGH
 * Action: Operation must be rejected
 */
export class CashPaymentLimitSeeker extends BaseAlertSeeker {
	readonly activityCode: VulnerableActivityCode = "VEH";
	readonly ruleType: AlertRuleType = "cash_payment_limit";
	readonly name = "Intento de pago en efectivo superior al monto permitido";
	readonly description =
		"Detecta cuando el cliente intenta pagar en efectivo una cantidad mayor a la permitida para esta actividad vulnerable";
	readonly defaultSeverity: AlertSeverity = "HIGH";

	/**
	 * Default maximum cash amount in MXN
	 * This should be configured based on the legal limit for vehicles
	 * Currently set to the same as UMA threshold as a fallback
	 */
	private readonly DEFAULT_MAX_CASH_MXN = 697237.8; // ~6420 UMA at 108.57

	async evaluate(
		context: AlertContext,
	): Promise<SeekerEvaluationResult | null> {
		const { client, operations, umaValue, alertRules, triggerOperation } =
			context;

		// Find the matching rule to get configuration
		const matchedRule = this.findMatchingRule(alertRules);
		const maxCashAmount = this.getMaxCashAmount(matchedRule, umaValue);

		// If we have a trigger operation, evaluate only that one
		const operationsToEvaluate = triggerOperation
			? [triggerOperation]
			: operations;

		// Get all cash payments
		const cashPayments = this.getCashPayments(operationsToEvaluate);

		// Find cash payments that exceed the limit
		const excessivePayments = cashPayments.filter(
			(cp) => cp.amount > maxCashAmount,
		);

		if (excessivePayments.length === 0) {
			return null;
		}

		// Get the operations with excessive cash payments
		const matchedOperations = excessivePayments.map((ep) => ep.operation);
		const totalCashAmount = excessivePayments.reduce(
			(sum, ep) => sum + ep.amount,
			0,
		);

		return {
			triggered: true,
			matchedRule,
			alertMetadata: {
				...this.createBaseAlertMetadata(
					matchedOperations,
					totalCashAmount,
					"MXN",
				),
				clientId: client.id,
				clientName: client.name || client.rfc,
				alertType: "cash_payment_limit_exceeded",
				maxCashAmount,
				cashPayments: excessivePayments.map((ep) => ({
					operationId: ep.operation.id,
					cashAmount: ep.amount,
					exceededBy: ep.amount - maxCashAmount,
				})),
				legalBasis: "Art_32_LFPIORPI",
				requiredAction: "reject_operation",
				severity: "HIGH",
			},
			matchedOperations,
			metadata: {
				seekerType: this.ruleType,
				activityCode: this.activityCode,
				maxCashAmount,
				excessivePaymentsCount: excessivePayments.length,
			},
		};
	}

	/**
	 * Gets the maximum cash amount from rule configuration or uses default
	 */
	private getMaxCashAmount(
		_rule: ReturnType<typeof this.findMatchingRule>,
		umaValue: AlertContext["umaValue"],
	): number {
		// Note: max cash amount could be fetched from alert_rule_config in the future
		// For now, use UMA-based threshold

		// Fall back to UMA-based threshold if available
		if (umaValue) {
			return this.calculateUmaThreshold(umaValue, UMA_THRESHOLD);
		}

		// Use default
		return this.DEFAULT_MAX_CASH_MXN;
	}
}
