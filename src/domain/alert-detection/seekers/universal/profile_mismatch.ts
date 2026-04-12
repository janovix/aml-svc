/**
 * Universal Profile Mismatch Seeker
 *
 * Detects when an operation is inconsistent with the client's declared
 * economic activity or transactional profile.
 */

import {
	UniversalAlertSeeker,
	type AlertContext,
	type SeekerEvaluationResult,
	type AlertSeverity,
	type UniversalAlertRuleType,
} from "../types";
import type { PatternType } from "../../config/alert-patterns";

export class UniversalProfileMismatchSeeker extends UniversalAlertSeeker {
	readonly patternType: PatternType = "profile_mismatch";
	readonly ruleType: UniversalAlertRuleType = "profile_mismatch";
	readonly name = "Profile mismatch detected";
	readonly description =
		"Detects operations inconsistent with declared economic activity or client profile";
	readonly defaultSeverity: AlertSeverity = "MEDIUM";

	/**
	 * Multiplier: if an operation amount exceeds the average by this factor,
	 * flag as profile mismatch (when combined with other indicators).
	 */
	private readonly AMOUNT_ANOMALY_FACTOR = 5;

	async evaluate(
		context: AlertContext,
	): Promise<SeekerEvaluationResult | null> {
		const { client, operations, triggerOperation } = context;
		const activityCode = context.activityCode;

		if (!this.appliesTo(activityCode)) return null;

		const indicators: string[] = [];

		// Check 1: High-value operation for client profile
		if (operations.length >= 3 && triggerOperation) {
			const avgAmount =
				this.sumOperationAmounts(operations) / operations.length;
			if (triggerOperation.amount > avgAmount * this.AMOUNT_ANOMALY_FACTOR) {
				indicators.push("amount_exceeds_profile_average");
			}
		}

		// Check 2: Missing or suspicious economic activity code
		const clientRecord = client as Record<string, unknown>;
		const economicActivityCode = clientRecord.economicActivityCode as
			| string
			| undefined;
		if (!economicActivityCode) {
			indicators.push("missing_economic_activity");
		}

		// Check 3: New client with very high first operation
		const createdAt = clientRecord.createdAt as string | undefined;
		if (createdAt && triggerOperation) {
			const clientAge =
				(Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24);
			const umaThresholdMxn = this.calculateActivityUmaThreshold(
				activityCode,
				context.umaValue,
			);
			if (clientAge < 30 && triggerOperation.amount >= umaThresholdMxn * 0.8) {
				indicators.push("new_client_high_value");
			}
		}

		if (indicators.length === 0) return null;

		const matchedOperations = triggerOperation
			? [triggerOperation]
			: operations.slice(-1);

		if (matchedOperations.length === 0) return null;

		const totalAmount = this.sumOperationAmounts(matchedOperations);
		const matchedRule = this.findMatchingRule(context.alertRules);

		return {
			triggered: true,
			matchedRule,
			alertMetadata: {
				...this.createBaseAlertMetadata(matchedOperations, totalAmount, "MXN"),
				clientId: client.id,
				clientName: client.name || client.rfc,
				activityCode,
				alertType: "profile_mismatch",
				indicators,
				economicActivityCode: economicActivityCode ?? "UNKNOWN",
			},
			matchedOperations,
			metadata: {
				seekerType: this.ruleType,
				activityCode: context.activityCode,
				indicatorCount: indicators.length,
			},
		};
	}
}
