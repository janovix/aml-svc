/**
 * Universal Foreign Currency Cash Seeker
 *
 * Detects cash payments made in foreign currency without justification.
 */

import {
	UniversalAlertSeeker,
	type AlertContext,
	type SeekerEvaluationResult,
	type AlertSeverity,
	type UniversalAlertRuleType,
} from "../types";
import type { PatternType } from "../../config/alert-patterns";

export class UniversalForeignCurrencyCashSeeker extends UniversalAlertSeeker {
	readonly patternType: PatternType = "foreign_currency_cash";
	readonly ruleType: UniversalAlertRuleType = "foreign_currency_cash";
	readonly name = "Foreign currency cash payment detected";
	readonly description =
		"Detects cash payments in foreign currency without justification";
	readonly defaultSeverity: AlertSeverity = "MEDIUM";

	async evaluate(
		context: AlertContext,
	): Promise<SeekerEvaluationResult | null> {
		const { client, operations, triggerOperation } = context;
		const activityCode = context.activityCode;

		if (!this.appliesTo(activityCode)) return null;

		const operationsToEvaluate = triggerOperation
			? [triggerOperation]
			: operations;

		const foreignCashOps = operationsToEvaluate.filter((op) => {
			if (op.currency === "MXN") return false;

			const cashPayments = this.getCashPayments([op]);
			return cashPayments.length > 0;
		});

		if (foreignCashOps.length === 0) return null;

		const totalAmount = this.sumOperationAmounts(foreignCashOps);
		const matchedRule = this.findMatchingRule(context.alertRules);

		return {
			triggered: true,
			matchedRule,
			alertMetadata: {
				...this.createBaseAlertMetadata(
					foreignCashOps,
					totalAmount,
					foreignCashOps[0]?.currency ?? "USD",
				),
				clientId: client.id,
				clientName: client.name || client.rfc,
				activityCode,
				alertType: "foreign_currency_cash",
				currencies: [...new Set(foreignCashOps.map((op) => op.currency))],
			},
			matchedOperations: foreignCashOps,
			metadata: {
				seekerType: this.ruleType,
				activityCode: context.activityCode,
				foreignCashOperationCount: foreignCashOps.length,
			},
		};
	}
}
