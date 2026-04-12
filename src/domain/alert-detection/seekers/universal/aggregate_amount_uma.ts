/**
 * Universal Aggregate Amount UMA Seeker
 *
 * Detects when 2+ operations from the same client accumulate to meet
 * or exceed the activity-specific notice UMA threshold within a
 * 6-month rolling window.
 */

import { DEFAULT_UMA_DAILY_VALUE } from "../../config/activity-thresholds";
import { AGGREGATION_WINDOW_DAYS } from "../constants";
import {
	UniversalAlertSeeker,
	type AlertContext,
	type SeekerEvaluationResult,
	type AlertSeverity,
	type AlertOperation,
	type UniversalAlertRuleType,
} from "../types";
import type { PatternType } from "../../config/alert-patterns";

export class UniversalAggregateAmountUmaSeeker extends UniversalAlertSeeker {
	readonly patternType: PatternType = "aggregate_amount_uma";
	readonly ruleType: UniversalAlertRuleType = "aggregate_amount_uma";
	readonly name = "Accumulated operations meet notice UMA threshold";
	readonly description =
		"Detects when 2+ operations from the same client sum to meet the activity-specific notice UMA threshold within 6 months";
	readonly defaultSeverity: AlertSeverity = "HIGH";

	private readonly MIN_OPERATIONS = 2;

	async evaluate(
		context: AlertContext,
	): Promise<SeekerEvaluationResult | null> {
		const { client, operations, umaValue } = context;
		const activityCode = context.activityCode;

		if (!this.appliesTo(activityCode)) return null;
		if (operations.length < this.MIN_OPERATIONS) return null;

		const thresholdMxn = this.calculateActivityUmaThreshold(
			activityCode,
			umaValue,
		);

		const recentOperations = this.filterOperationsInWindow(
			operations,
			AGGREGATION_WINDOW_DAYS,
		);

		if (recentOperations.length < this.MIN_OPERATIONS) return null;

		const totalAmount = this.sumOperationAmounts(recentOperations);

		if (totalAmount < thresholdMxn) return null;

		const matchedOperations = this.findMinimalTriggeringSet(
			recentOperations,
			thresholdMxn,
		);

		const dailyValue = umaValue?.dailyValue ?? DEFAULT_UMA_DAILY_VALUE;
		const umaAmount = totalAmount / dailyValue;
		const noticeThresholdUma = this.getNoticeThresholdUma(activityCode);

		const matchedRule = this.findMatchingRule(context.alertRules);

		const sortedByDate = [...matchedOperations].sort(
			(a, b) =>
				new Date(a.operationDate || a.createdAt).getTime() -
				new Date(b.operationDate || b.createdAt).getTime(),
		);

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
				alertType: "aviso_obligatorio_acumulacion",
				operationCount: matchedOperations.length,
				aggregationWindowDays: AGGREGATION_WINDOW_DAYS,
				firstOperationDate:
					sortedByDate[0]?.operationDate ?? sortedByDate[0]?.createdAt,
				lastOperationDate:
					sortedByDate[sortedByDate.length - 1]?.operationDate ??
					sortedByDate[sortedByDate.length - 1]?.createdAt,
			},
			matchedOperations,
			metadata: {
				seekerType: this.ruleType,
				activityCode: context.activityCode,
				umaThreshold: noticeThresholdUma,
				aggregationWindowDays: AGGREGATION_WINDOW_DAYS,
				operationsInWindow: recentOperations.length,
			},
		};
	}

	private findMinimalTriggeringSet(
		operations: AlertOperation[],
		threshold: number,
	): AlertOperation[] {
		const sorted = [...operations].sort(
			(a, b) =>
				new Date(b.operationDate || b.createdAt).getTime() -
				new Date(a.operationDate || a.createdAt).getTime(),
		);

		const result: AlertOperation[] = [];
		let runningTotal = 0;

		for (const op of sorted) {
			result.push(op);
			runningTotal += op.amount;
			if (runningTotal >= threshold && result.length >= this.MIN_OPERATIONS) {
				break;
			}
		}

		return result;
	}
}
