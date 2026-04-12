/**
 * Universal Price Anomaly Seeker
 *
 * Detects when an operation's price is significantly above or below market
 * value, which may indicate money laundering through over/under-invoicing.
 *
 * This is a heuristic-based detector that compares the current operation
 * amount against the client's historical average and the overall pool.
 */

import {
	UniversalAlertSeeker,
	type AlertContext,
	type SeekerEvaluationResult,
	type AlertSeverity,
	type UniversalAlertRuleType,
} from "../types";
import type { PatternType } from "../../config/alert-patterns";

export class UniversalPriceAnomalySeeker extends UniversalAlertSeeker {
	readonly patternType: PatternType = "price_anomaly";
	readonly ruleType: UniversalAlertRuleType = "price_anomaly";
	readonly name = "Price anomaly detected";
	readonly description =
		"Detects prices significantly above or below market value";
	readonly defaultSeverity: AlertSeverity = "MEDIUM";

	/** If price is this many standard deviations from mean, flag it */
	private readonly STD_DEV_THRESHOLD = 2.5;
	/** Minimum historical operations needed for comparison */
	private readonly MIN_HISTORY = 5;

	async evaluate(
		context: AlertContext,
	): Promise<SeekerEvaluationResult | null> {
		const { client, operations, triggerOperation } = context;
		const activityCode = context.activityCode;

		if (!this.appliesTo(activityCode)) return null;
		if (!triggerOperation) return null;
		if (operations.length < this.MIN_HISTORY) return null;

		// Calculate historical statistics
		const historicalAmounts = operations
			.filter((op) => op.id !== triggerOperation.id)
			.map((op) => op.amount);

		if (historicalAmounts.length < this.MIN_HISTORY - 1) return null;

		const mean =
			historicalAmounts.reduce((s, a) => s + a, 0) / historicalAmounts.length;
		const variance =
			historicalAmounts.reduce((s, a) => s + Math.pow(a - mean, 2), 0) /
			historicalAmounts.length;
		const stdDev = Math.sqrt(variance);

		if (stdDev === 0) return null; // All same amount - no anomaly detection possible

		const zScore = (triggerOperation.amount - mean) / stdDev;

		if (Math.abs(zScore) < this.STD_DEV_THRESHOLD) return null;

		const direction = zScore > 0 ? "ABOVE" : "BELOW";
		const matchedRule = this.findMatchingRule(context.alertRules);

		return {
			triggered: true,
			matchedRule,
			alertMetadata: {
				...this.createBaseAlertMetadata(
					[triggerOperation],
					triggerOperation.amount,
					triggerOperation.currency || "MXN",
				),
				clientId: client.id,
				clientName: client.name || client.rfc,
				activityCode,
				alertType: "price_anomaly",
				direction,
				operationAmount: triggerOperation.amount,
				historicalMean: Math.round(mean * 100) / 100,
				historicalStdDev: Math.round(stdDev * 100) / 100,
				zScore: Math.round(zScore * 100) / 100,
				deviationPercent:
					Math.round(
						(Math.abs(triggerOperation.amount - mean) / mean) * 100 * 100,
					) / 100,
			},
			matchedOperations: [triggerOperation],
			metadata: {
				seekerType: this.ruleType,
				activityCode: context.activityCode,
				zScore: Math.round(zScore * 100) / 100,
				direction,
			},
		};
	}
}
