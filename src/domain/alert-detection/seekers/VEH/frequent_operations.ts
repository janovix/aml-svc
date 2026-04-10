/**
 * Frequent Operations Seeker
 *
 * Detects when a client has an unusually high number of operations
 * within a short time period, which may indicate structuring.
 */

import {
	FREQUENT_OPERATION_WINDOW_DAYS,
	FREQUENT_OPERATION_MIN_COUNT,
} from "../constants";
import {
	BaseAlertSeeker,
	type AlertContext,
	type SeekerEvaluationResult,
	type VulnerableActivityCode,
	type AlertRuleType,
	type AlertSeverity,
} from "../types";

/**
 * Seeker for detecting frequent operations
 *
 * Trigger: Client has 3+ operations within 30 days
 * Severity: MEDIUM
 */
export class FrequentOperationsSeeker extends BaseAlertSeeker {
	readonly activityCode: VulnerableActivityCode = "VEH";
	readonly ruleType: AlertRuleType = "frequent_operations";
	readonly name = "Operaciones frecuentes en corto plazo";
	readonly description =
		"Detecta cuando un cliente realiza 3 o más operaciones en un periodo de 30 días";
	readonly defaultSeverity: AlertSeverity = "MEDIUM";

	async evaluate(
		context: AlertContext,
	): Promise<SeekerEvaluationResult | null> {
		const { client, operations } = context;

		// Filter operations within the time window
		const recentOperations = this.filterOperationsInWindow(
			operations,
			FREQUENT_OPERATION_WINDOW_DAYS,
		);

		// Check if threshold is met
		if (recentOperations.length < FREQUENT_OPERATION_MIN_COUNT) {
			return null;
		}

		// Calculate metrics
		const totalAmount = this.sumOperationAmounts(recentOperations);
		const averageAmount = totalAmount / recentOperations.length;

		// Sort by date for analysis
		const sortedOperations = [...recentOperations].sort(
			(a, b) =>
				new Date(a.operationDate || a.createdAt).getTime() -
				new Date(b.operationDate || b.createdAt).getTime(),
		);

		// Calculate days between first and last operation
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

		// Calculate operation frequency
		const operationsPerDay =
			daysBetween > 0
				? recentOperations.length / daysBetween
				: recentOperations.length;

		// Find matching rule
		const matchedRule = this.findMatchingRule(context.alertRules);

		// Determine risk indicators
		const riskIndicators: string[] = ["high_operation_frequency"];

		if (recentOperations.length >= 5) {
			riskIndicators.push("very_high_frequency");
		}

		if (daysBetween <= 7) {
			riskIndicators.push("concentrated_in_short_period");
		}

		// Check if amounts are similar (possible structuring)
		const amounts = recentOperations.map((op) => op.amount);
		const variance =
			amounts.reduce((sum, a) => sum + Math.pow(a - averageAmount, 2), 0) /
			amounts.length;
		const stdDev = Math.sqrt(variance);
		const coefficientOfVariation =
			averageAmount > 0 ? stdDev / averageAmount : 0;

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
					recentOperations[0]?.currency || "MXN",
				),
				clientId: client.id,
				clientName: client.name || client.rfc,
				alertType: "frequent_operations",
				operationCount: recentOperations.length,
				windowDays: FREQUENT_OPERATION_WINDOW_DAYS,
				actualDays: daysBetween || 1,
				averageAmount: Math.round(averageAmount * 100) / 100,
				operationsPerDay: Math.round(operationsPerDay * 100) / 100,
				firstOperationDate: firstDate.toISOString(),
				lastOperationDate: lastDate.toISOString(),
				riskIndicators,
				possibleStructuring: true,
				requiresAccumulationCheck: true,
				complianceActions: [
					"review_operation_pattern",
					"check_accumulation_threshold",
					"verify_business_justification",
				],
			},
			matchedOperations: recentOperations,
			metadata: {
				seekerType: this.ruleType,
				activityCode: this.activityCode,
				operationCount: recentOperations.length,
				windowDays: FREQUENT_OPERATION_WINDOW_DAYS,
				operationsPerDay,
			},
		};
	}

	/**
	 * Override idempotency key to be based on the date range
	 * This prevents duplicate alerts for the same frequency pattern
	 */
	async generateIdempotencyKey(
		context: AlertContext,
		_result: SeekerEvaluationResult,
	): Promise<string> {
		// Use the week number to create weekly idempotency windows
		const now = new Date();
		const weekNumber = Math.floor(now.getTime() / (7 * 24 * 60 * 60 * 1000));
		const data = `${context.client.id}:${this.ruleType}:week${weekNumber}`;
		return this.hashString(data);
	}
}
