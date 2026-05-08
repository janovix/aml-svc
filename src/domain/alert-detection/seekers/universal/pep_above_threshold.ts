/**
 * Universal PEP + notice-threshold seeker.
 */

import { DEFAULT_UMA_DAILY_VALUE } from "../../config/activity-thresholds";
import {
	UniversalAlertSeeker,
	type AlertContext,
	type SeekerEvaluationResult,
	type AlertSeverity,
	type UniversalAlertRuleType,
} from "../types";
import type { PatternType } from "../../config/alert-patterns";

export class UniversalPepAboveThresholdSeeker extends UniversalAlertSeeker {
	readonly patternType: PatternType = "pep_above_threshold";
	readonly ruleType: UniversalAlertRuleType = "pep_above_threshold";
	readonly name = "PEP operation at or above notice UMA threshold";
	readonly description =
		"PEP client with operation meeting or exceeding the activity-specific notice threshold";
	readonly defaultSeverity: AlertSeverity = "CRITICAL";

	async evaluate(
		context: AlertContext,
	): Promise<SeekerEvaluationResult | null> {
		const { client, operations, umaValue, triggerOperation } = context;
		const activityCode = context.activityCode;

		if (!this.appliesTo(activityCode)) return null;
		if (!client.isPep) return null;

		const noticeUma = this.getNoticeThresholdUma(activityCode);
		const thresholdUmaNumeric = noticeUma === "ALWAYS" ? 0 : noticeUma;

		const thresholdMxn = this.calculateActivityUmaThreshold(
			activityCode,
			umaValue,
		);

		const operationsToEvaluate = triggerOperation
			? [triggerOperation]
			: operations;

		const matchedOperations = operationsToEvaluate.filter(
			(op) => op.currency === "MXN" && op.amount >= thresholdMxn,
		);

		if (matchedOperations.length === 0) return null;

		const totalAmount = this.sumOperationAmounts(matchedOperations, "MXN");
		const dailyValue = umaValue?.dailyValue ?? DEFAULT_UMA_DAILY_VALUE;
		const umaAmount = totalAmount / dailyValue;

		const matchedRule = this.findMatchingRule(context.alertRules);

		return {
			triggered: true,
			matchedRule,
			alertMetadata: {
				...this.createBaseAlertMetadata(matchedOperations, totalAmount, "MXN"),
				umaAmount: Math.round(umaAmount * 100) / 100,
				umaDailyValue: dailyValue,
				threshold: thresholdUmaNumeric,
				thresholdMxn,
				clientId: client.id,
				clientName: client.name || client.rfc,
				activityCode,
				isPep: true,
				alertType: "pep_above_threshold",
				requiresEnhancedMonitoring: true,
				requiresManualReview: true,
				requiresResourceOriginDocumentation: true,
			},
			matchedOperations,
			metadata: {
				seekerType: this.ruleType,
				activityCode: context.activityCode,
				isPep: true,
				umaThreshold: thresholdUmaNumeric,
				calculatedThresholdMxn: thresholdMxn,
			},
		};
	}

	async generateIdempotencyKey(
		context: AlertContext,
		result: SeekerEvaluationResult,
	): Promise<string> {
		const operationIds = result.matchedOperations
			.map((op) => op.id)
			.sort()
			.join(",");
		const data = `${context.activityCode}:${context.client.id}:PEP:${this.patternType}:${operationIds}`;
		return this.hashString(data);
	}
}
