/**
 * Universal Structuring Detection Seeker
 *
 * Detects when operations appear to be structured just below the reporting
 * threshold to avoid triggering SAT notices (smurfing / structuring).
 */

import { AGGREGATION_WINDOW_DAYS } from "../constants";
import {
	UniversalAlertSeeker,
	type AlertContext,
	type SeekerEvaluationResult,
	type AlertSeverity,
	type UniversalAlertRuleType,
} from "../types";
import type { PatternType } from "../../config/alert-patterns";

export class UniversalStructuringDetectionSeeker extends UniversalAlertSeeker {
	readonly patternType: PatternType = "structuring_detection";
	readonly ruleType: UniversalAlertRuleType = "structuring_detection";
	readonly name = "Structuring pattern detected";
	readonly description =
		"Detects operations structured just below the reporting threshold to avoid SAT notices";
	readonly defaultSeverity: AlertSeverity = "HIGH";

	/** Operations within this percentage below threshold are suspicious */
	private readonly BELOW_THRESHOLD_PERCENT = 0.15;
	/** Minimum operations to detect structuring */
	private readonly MIN_OPERATIONS = 3;

	async evaluate(
		context: AlertContext,
	): Promise<SeekerEvaluationResult | null> {
		const { client, operations } = context;
		const activityCode = context.activityCode;

		if (!this.appliesTo(activityCode)) return null;

		const thresholdMxn = this.calculateActivityUmaThreshold(
			activityCode,
			context.umaValue,
		);

		if (thresholdMxn === 0) return null; // "ALWAYS" activities — no structuring possible

		const lowerBound = thresholdMxn * (1 - this.BELOW_THRESHOLD_PERCENT);

		const recentOps = this.filterOperationsInWindow(
			operations,
			AGGREGATION_WINDOW_DAYS,
		);

		// Find operations that are suspiciously close to (but below) the threshold
		const suspiciousOps = recentOps.filter(
			(op) => op.amount >= lowerBound && op.amount < thresholdMxn,
		);

		if (suspiciousOps.length < this.MIN_OPERATIONS) return null;

		const totalAmount = this.sumOperationAmounts(suspiciousOps);
		const matchedRule = this.findMatchingRule(context.alertRules);

		return {
			triggered: true,
			matchedRule,
			alertMetadata: {
				...this.createBaseAlertMetadata(suspiciousOps, totalAmount, "MXN"),
				clientId: client.id,
				clientName: client.name || client.rfc,
				activityCode,
				alertType: "structuring_detection",
				threshold: thresholdMxn,
				lowerBound,
				suspiciousOperationCount: suspiciousOps.length,
				averageAmount:
					Math.round((totalAmount / suspiciousOps.length) * 100) / 100,
				percentBelowThreshold: this.BELOW_THRESHOLD_PERCENT * 100,
			},
			matchedOperations: suspiciousOps,
			metadata: {
				seekerType: this.ruleType,
				activityCode: context.activityCode,
				suspiciousOperationCount: suspiciousOps.length,
			},
		};
	}
}
