/**
 * Universal Quick Fund Movement Seeker
 *
 * Detects when funds leave an account or platform very quickly after
 * deposit, without apparent justification. Primarily for AVI (virtual assets).
 */

import {
	UniversalAlertSeeker,
	type AlertContext,
	type SeekerEvaluationResult,
	type AlertSeverity,
	type AlertOperation,
	type UniversalAlertRuleType,
} from "../types";
import type { PatternType } from "../../config/alert-patterns";

export class UniversalQuickFundMovementSeeker extends UniversalAlertSeeker {
	readonly patternType: PatternType = "quick_fund_movement";
	readonly ruleType: UniversalAlertRuleType = "quick_fund_movement";
	readonly name = "Quick fund movement detected";
	readonly description =
		"Detects funds leaving account/platform very quickly after deposit";
	readonly defaultSeverity: AlertSeverity = "MEDIUM";

	/** Max hours between deposit and withdrawal to flag */
	private readonly QUICK_WINDOW_HOURS = 48;

	async evaluate(
		context: AlertContext,
	): Promise<SeekerEvaluationResult | null> {
		const { client, operations } = context;
		const activityCode = context.activityCode;

		if (!this.appliesTo(activityCode)) return null;

		// Look for deposit-withdrawal pairs that happen within the window
		const deposits = operations.filter(
			(op) =>
				op.operationType === "DEPOSIT" ||
				op.operationType === "BUY" ||
				op.operationType === "COMPRA",
		);
		const withdrawals = operations.filter(
			(op) =>
				op.operationType === "WITHDRAWAL" ||
				op.operationType === "SELL" ||
				op.operationType === "VENTA" ||
				op.operationType === "TRANSFER_OUT",
		);

		const quickPairs: AlertOperation[] = [];

		for (const deposit of deposits) {
			const depositDate = new Date(deposit.operationDate || deposit.createdAt);

			for (const withdrawal of withdrawals) {
				const withdrawalDate = new Date(
					withdrawal.operationDate || withdrawal.createdAt,
				);
				const hoursDiff =
					(withdrawalDate.getTime() - depositDate.getTime()) / (1000 * 60 * 60);

				if (hoursDiff > 0 && hoursDiff <= this.QUICK_WINDOW_HOURS) {
					quickPairs.push(deposit, withdrawal);
				}
			}
		}

		if (quickPairs.length === 0) return null;

		const uniqueOps = [
			...new Map(quickPairs.map((op) => [op.id, op])).values(),
		];
		const totalAmount = this.sumOperationAmounts(uniqueOps);
		const matchedRule = this.findMatchingRule(context.alertRules);

		return {
			triggered: true,
			matchedRule,
			alertMetadata: {
				...this.createBaseAlertMetadata(uniqueOps, totalAmount, "MXN"),
				clientId: client.id,
				clientName: client.name || client.rfc,
				activityCode,
				alertType: "quick_fund_movement",
				quickWindowHours: this.QUICK_WINDOW_HOURS,
				pairCount: quickPairs.length / 2,
			},
			matchedOperations: uniqueOps,
			metadata: {
				seekerType: this.ruleType,
				activityCode: context.activityCode,
				pairCount: quickPairs.length / 2,
			},
		};
	}
}
