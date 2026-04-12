/**
 * Universal Frequent Operations Seeker
 *
 * Detects when a client performs an unusually high number of operations
 * within a short time period, which may indicate structuring or layering.
 */

import {
	FREQUENT_OPERATION_WINDOW_DAYS,
	FREQUENT_OPERATION_MIN_COUNT,
} from "../constants";
import {
	UniversalAlertSeeker,
	type AlertContext,
	type SeekerEvaluationResult,
	type AlertSeverity,
	type UniversalAlertRuleType,
} from "../types";
import type { PatternType } from "../../config/alert-patterns";

export class UniversalFrequentOperationsSeeker extends UniversalAlertSeeker {
	readonly patternType: PatternType = "frequent_operations";
	readonly ruleType: UniversalAlertRuleType = "frequent_operations";
	readonly name = "Frequent operations in short period";
	readonly description =
		"Detects when a client performs 3+ operations within 30 days";
	readonly defaultSeverity: AlertSeverity = "MEDIUM";

	async evaluate(
		context: AlertContext,
	): Promise<SeekerEvaluationResult | null> {
		const { client, operations } = context;
		const activityCode = context.activityCode;

		if (!this.appliesTo(activityCode)) return null;

		const recentOperations = this.filterOperationsInWindow(
			operations,
			FREQUENT_OPERATION_WINDOW_DAYS,
		);

		if (recentOperations.length < FREQUENT_OPERATION_MIN_COUNT) return null;

		const totalAmount = this.sumOperationAmounts(recentOperations);
		const averageAmount = totalAmount / recentOperations.length;

		const sortedOperations = [...recentOperations].sort(
			(a, b) =>
				new Date(a.operationDate || a.createdAt).getTime() -
				new Date(b.operationDate || b.createdAt).getTime(),
		);

		const firstDate = new Date(
			sortedOperations[0].operationDate || sortedOperations[0].createdAt,
		);
		const lastDate = new Date(
			sortedOperations[sortedOperations.length - 1].operationDate ||
				sortedOperations[sortedOperations.length - 1].createdAt,
		);
		const daysBetween = Math.ceil(
			(lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24),
		);

		const operationsPerDay =
			daysBetween > 0
				? recentOperations.length / daysBetween
				: recentOperations.length;

		const matchedRule = this.findMatchingRule(context.alertRules);

		const riskIndicators: string[] = ["high_operation_frequency"];
		if (recentOperations.length >= 5)
			riskIndicators.push("very_high_frequency");
		if (daysBetween <= 7) riskIndicators.push("concentrated_in_short_period");

		// Check for similar amounts (structuring signal)
		const amounts = recentOperations.map((op) => op.amount);
		const variance =
			amounts.reduce((sum, a) => sum + Math.pow(a - averageAmount, 2), 0) /
			amounts.length;
		const coefficientOfVariation =
			averageAmount > 0 ? Math.sqrt(variance) / averageAmount : 0;
		if (coefficientOfVariation < 0.3) {
			riskIndicators.push("similar_operation_amounts");
		}

		return {
			triggered: true,
			matchedRule,
			alertMetadata: {
				...this.createBaseAlertMetadata(
					recentOperations,
					totalAmount,
					recentOperations[0]?.currency ?? "MXN",
				),
				clientId: client.id,
				clientName: client.name || client.rfc,
				activityCode,
				alertType: "frequent_operations",
				operationCount: recentOperations.length,
				windowDays: FREQUENT_OPERATION_WINDOW_DAYS,
				actualDays: daysBetween || 1,
				averageAmount: Math.round(averageAmount * 100) / 100,
				operationsPerDay: Math.round(operationsPerDay * 100) / 100,
				firstOperationDate: firstDate.toISOString(),
				lastOperationDate: lastDate.toISOString(),
				riskIndicators,
			},
			matchedOperations: recentOperations,
			metadata: {
				seekerType: this.ruleType,
				activityCode: context.activityCode,
				operationCount: recentOperations.length,
				windowDays: FREQUENT_OPERATION_WINDOW_DAYS,
				operationsPerDay,
			},
		};
	}

	async generateIdempotencyKey(
		context: AlertContext,
		_result: SeekerEvaluationResult,
	): Promise<string> {
		const now = new Date();
		const weekNumber = Math.floor(now.getTime() / (7 * 24 * 60 * 60 * 1000));
		const data = `${context.activityCode}:${context.client.id}:${this.ruleType}:week${weekNumber}`;
		return this.hashString(data);
	}
}
