/**
 * Universal Art. 32 cash payment cap seeker (LFPIORPI).
 */

import {
	DEFAULT_UMA_DAILY_VALUE,
	getCashLimitMxn,
	getCashLimitUma,
} from "../../config/activity-thresholds";
import {
	UniversalAlertSeeker,
	type AlertContext,
	type SeekerEvaluationResult,
	type AlertSeverity,
	type UniversalAlertRuleType,
} from "../types";
import type { PatternType } from "../../config/alert-patterns";

export class UniversalCashLimitArt32Seeker extends UniversalAlertSeeker {
	readonly patternType: PatternType = "cash_limit_art32";
	readonly ruleType: UniversalAlertRuleType = "cash_limit_art32";
	readonly name = "Cash payment exceeds Art. 32 legal cap";
	readonly description =
		"Detects cash payments strictly above the activity-specific Art. 32 UMA limit";
	readonly defaultSeverity: AlertSeverity = "HIGH";

	async evaluate(
		context: AlertContext,
	): Promise<SeekerEvaluationResult | null> {
		const { client, operations, umaValue, triggerOperation } = context;
		const activityCode = context.activityCode;

		if (!this.appliesTo(activityCode)) return null;

		const daily = umaValue?.dailyValue ?? DEFAULT_UMA_DAILY_VALUE;
		const maxCashAmount = getCashLimitMxn(activityCode, daily);
		if (maxCashAmount === null) return null;

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
		const umaCap = getCashLimitUma(activityCode);

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
				cashLimitUma: umaCap,
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
