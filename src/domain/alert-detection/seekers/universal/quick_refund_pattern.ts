/**
 * Universal Quick Refund Pattern Seeker
 *
 * Detects refunds or cancellations shortly after purchase, especially
 * when repaid via a different monetary instrument than the original payment.
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

export class UniversalQuickRefundPatternSeeker extends UniversalAlertSeeker {
	readonly patternType: PatternType = "quick_refund_pattern";
	readonly ruleType: UniversalAlertRuleType = "quick_refund_pattern";
	readonly name = "Quick refund or cancellation detected";
	readonly description =
		"Detects refunds or cancellations shortly after purchase";
	readonly defaultSeverity: AlertSeverity = "MEDIUM";

	/** Max days between operation and refund to consider it "quick" */
	private readonly QUICK_REFUND_WINDOW_DAYS = 14;

	async evaluate(
		context: AlertContext,
	): Promise<SeekerEvaluationResult | null> {
		const { client, operations } = context;
		const activityCode = context.activityCode;

		if (!this.appliesTo(activityCode)) return null;

		// Look for pairs: an operation followed by a refund/cancellation
		const refundOps = operations.filter(
			(op) =>
				op.operationType === "REFUND" ||
				op.operationType === "CANCELLATION" ||
				op.operationType === "DEVOLUCION" ||
				op.operationType === "CANCELACION",
		);

		if (refundOps.length === 0) return null;

		const matchedOperations: AlertOperation[] = [];

		for (const refund of refundOps) {
			const refundDate = new Date(refund.operationDate || refund.createdAt);

			// Find the original operation (same or similar amount, before refund)
			const original = operations.find((op) => {
				if (op.id === refund.id) return false;
				const opDate = new Date(op.operationDate || op.createdAt);
				const daysDiff = Math.ceil(
					(refundDate.getTime() - opDate.getTime()) / (1000 * 60 * 60 * 24),
				);
				return (
					daysDiff >= 0 &&
					daysDiff <= this.QUICK_REFUND_WINDOW_DAYS &&
					Math.abs(op.amount - refund.amount) / op.amount < 0.1 // within 10%
				);
			});

			if (original) {
				matchedOperations.push(original, refund);
			}
		}

		if (matchedOperations.length === 0) return null;

		const uniqueOps = [
			...new Map(matchedOperations.map((op) => [op.id, op])).values(),
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
				alertType: "quick_refund_pattern",
				refundCount: refundOps.length,
				quickRefundWindowDays: this.QUICK_REFUND_WINDOW_DAYS,
			},
			matchedOperations: uniqueOps,
			metadata: {
				seekerType: this.ruleType,
				activityCode: context.activityCode,
				refundCount: refundOps.length,
			},
		};
	}
}
