/**
 * Universal Split Payment Seeker
 *
 * Detects when a single operation is paid using multiple instruments,
 * potentially to keep individual payment amounts below thresholds.
 */

import {
	UniversalAlertSeeker,
	type AlertContext,
	type SeekerEvaluationResult,
	type AlertSeverity,
	type UniversalAlertRuleType,
} from "../types";
import type { PatternType } from "../../config/alert-patterns";

export class UniversalSplitPaymentSeeker extends UniversalAlertSeeker {
	readonly patternType: PatternType = "split_payment";
	readonly ruleType: UniversalAlertRuleType = "split_payment";
	readonly name = "Split payment detected";
	readonly description =
		"Detects single operations paid with multiple instruments to stay below thresholds";
	readonly defaultSeverity: AlertSeverity = "MEDIUM";

	/** Minimum number of payment methods to flag as split */
	private readonly MIN_PAYMENT_METHODS = 3;

	async evaluate(
		context: AlertContext,
	): Promise<SeekerEvaluationResult | null> {
		const { client, operations, triggerOperation } = context;
		const activityCode = context.activityCode;

		if (!this.appliesTo(activityCode)) return null;

		const operationsToEvaluate = triggerOperation
			? [triggerOperation]
			: operations;

		const splitOps = operationsToEvaluate.filter(
			(op) =>
				op.paymentMethods &&
				op.paymentMethods.length >= this.MIN_PAYMENT_METHODS,
		);

		if (splitOps.length === 0) return null;

		const totalAmount = this.sumOperationAmounts(splitOps);
		const matchedRule = this.findMatchingRule(context.alertRules);

		return {
			triggered: true,
			matchedRule,
			alertMetadata: {
				...this.createBaseAlertMetadata(splitOps, totalAmount, "MXN"),
				clientId: client.id,
				clientName: client.name || client.rfc,
				activityCode,
				alertType: "split_payment",
				splitOperations: splitOps.map((op) => ({
					operationId: op.id,
					paymentMethodCount: op.paymentMethods?.length ?? 0,
					amount: op.amount,
				})),
			},
			matchedOperations: splitOps,
			metadata: {
				seekerType: this.ruleType,
				activityCode: context.activityCode,
				splitOperationCount: splitOps.length,
			},
		};
	}
}
