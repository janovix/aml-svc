/**
 * Universal Cash High-Value Seeker
 *
 * Detects cash payments that exceed the legal limit or are unusually
 * high for the activity type. Based on Art. 32 LFPIORPI.
 */

import {
	UniversalAlertSeeker,
	type AlertContext,
	type SeekerEvaluationResult,
	type AlertSeverity,
	type UniversalAlertRuleType,
} from "../types";
import type { PatternType } from "../../config/alert-patterns";

export class UniversalCashHighValueSeeker extends UniversalAlertSeeker {
	readonly patternType: PatternType = "cash_high_value";
	readonly ruleType: UniversalAlertRuleType = "cash_high_value";
	readonly name = "High-value cash payment detected";
	readonly description =
		"Detects cash payments exceeding the legal limit for the activity";
	readonly defaultSeverity: AlertSeverity = "HIGH";

	async evaluate(
		context: AlertContext,
	): Promise<SeekerEvaluationResult | null> {
		const { client, operations, umaValue, triggerOperation } = context;
		const activityCode = context.activityCode;

		if (!this.appliesTo(activityCode)) return null;

		const maxCashAmount = this.calculateActivityUmaThreshold(
			activityCode,
			umaValue,
		);

		const operationsToEvaluate = triggerOperation
			? [triggerOperation]
			: operations;

		const cashPayments = this.getCashPayments(operationsToEvaluate);
		const excessivePayments = cashPayments.filter(
			(cp) => cp.amount > maxCashAmount,
		);

		if (excessivePayments.length === 0) return null;

		const matchedOperations = excessivePayments.map((ep) => ep.operation);
		const totalCashAmount = excessivePayments.reduce(
			(sum, ep) => sum + ep.amount,
			0,
		);

		const matchedRule = this.findMatchingRule(context.alertRules);

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
				activityCode,
				alertType: "cash_payment_limit_exceeded",
				maxCashAmount,
				cashPayments: excessivePayments.map((ep) => ({
					operationId: ep.operation.id,
					cashAmount: ep.amount,
					exceededBy: ep.amount - maxCashAmount,
				})),
				legalBasis: "Art_32_LFPIORPI",
				requiredAction: "reject_operation",
			},
			matchedOperations,
			metadata: {
				seekerType: this.ruleType,
				activityCode: context.activityCode,
				maxCashAmount,
				excessivePaymentsCount: excessivePayments.length,
			},
		};
	}
}
