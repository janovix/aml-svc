/**
 * Universal Operation Amount UMA Seeker
 *
 * Detects individual operations that meet or exceed the activity-specific
 * notice UMA threshold for mandatory SAT reporting.
 *
 * Unlike the legacy VEH-specific version, this seeker uses the correct
 * threshold for each vulnerable activity (e.g., 6420 UMA for VEH,
 * 210 UMA for AVI, 8025 UMA for INM).
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

export class UniversalOperationAmountUmaSeeker extends UniversalAlertSeeker {
	readonly patternType: PatternType = "operation_amount_uma";
	readonly ruleType: UniversalAlertRuleType = "operation_amount_uma";
	readonly name = "Single operation meets notice UMA threshold";
	readonly description =
		"Detects individual operations meeting or exceeding the activity-specific notice UMA threshold";
	readonly defaultSeverity: AlertSeverity = "HIGH";

	async evaluate(
		context: AlertContext,
	): Promise<SeekerEvaluationResult | null> {
		const { client, operations, umaValue, triggerOperation } = context;
		const activityCode = context.activityCode;

		if (!this.appliesTo(activityCode)) return null;

		const thresholdMxn = this.calculateActivityUmaThreshold(
			activityCode,
			umaValue,
		);

		// "ALWAYS" means threshold is 0 — every operation triggers
		const operationsToEvaluate = triggerOperation
			? [triggerOperation]
			: operations;

		const matchedOperations = operationsToEvaluate.filter(
			(op) => op.amount >= thresholdMxn,
		);

		if (matchedOperations.length === 0) return null;

		const totalAmount = this.sumOperationAmounts(matchedOperations);
		const dailyValue = umaValue?.dailyValue ?? DEFAULT_UMA_DAILY_VALUE;
		const umaAmount = totalAmount / dailyValue;
		const noticeThresholdUma = this.getNoticeThresholdUma(activityCode);

		const matchedRule = this.findMatchingRule(context.alertRules);

		return {
			triggered: true,
			matchedRule,
			alertMetadata: {
				...this.createBaseAlertMetadata(
					matchedOperations,
					totalAmount,
					matchedOperations[0]?.currency ?? "MXN",
				),
				umaAmount: Math.round(umaAmount * 100) / 100,
				umaDailyValue: dailyValue,
				threshold: noticeThresholdUma,
				thresholdMxn,
				clientId: client.id,
				clientName: client.name || client.rfc,
				activityCode,
				alertType: "aviso_obligatorio",
				requiresCompleteFile: true,
			},
			matchedOperations,
			metadata: {
				seekerType: this.ruleType,
				activityCode: context.activityCode,
				umaThreshold: noticeThresholdUma,
				calculatedThresholdMxn: thresholdMxn,
			},
		};
	}

	async generateIdempotencyKey(
		context: AlertContext,
		result: SeekerEvaluationResult,
	): Promise<string> {
		const operationId = result.matchedOperations[0]?.id ?? "unknown";
		const data = `${context.activityCode}:${context.client.id}:${this.ruleType}:${operationId}`;
		return this.hashString(data);
	}
}
