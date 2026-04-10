/**
 * Aggregate Amount UMA Seeker
 *
 * Detects when 2+ operations from the same client sum >= 6,420 UMA
 * within a 6-month rolling window.
 */

import { UMA_THRESHOLD, AGGREGATION_WINDOW_DAYS } from "../constants";
import {
	BaseAlertSeeker,
	type AlertContext,
	type SeekerEvaluationResult,
	type VulnerableActivityCode,
	type AlertRuleType,
	type AlertSeverity,
	type AlertOperation,
} from "../types";

/**
 * Seeker for detecting accumulated operations >= 6,420 UMA
 *
 * Trigger: 2+ operations from same client sum >= 6,420 UMA within 6 months
 * Severity: HIGH
 */
export class AggregateAmountUmaSeeker extends BaseAlertSeeker {
	readonly activityCode: VulnerableActivityCode = "VEH";
	readonly ruleType: AlertRuleType = "aggregate_amount_uma";
	readonly name = "Acumulación de operaciones que alcanza el umbral de aviso";
	readonly description =
		"Detecta cuando 2 o más operaciones de un mismo cliente suman >= 6,420 UMA en un periodo móvil de 6 meses";
	readonly defaultSeverity: AlertSeverity = "HIGH";

	/** Minimum number of operations required */
	private readonly MIN_OPERATIONS = 2;

	async evaluate(
		context: AlertContext,
	): Promise<SeekerEvaluationResult | null> {
		const { client, operations, umaValue } = context;

		// Need at least 2 operations for accumulation
		if (operations.length < this.MIN_OPERATIONS) {
			return null;
		}

		// Calculate the threshold in MXN
		const thresholdMxn = this.calculateUmaThreshold(umaValue, UMA_THRESHOLD);

		// Filter operations within the 6-month window
		const recentOperations = this.filterOperationsInWindow(
			operations,
			AGGREGATION_WINDOW_DAYS,
		);

		// Need at least 2 operations in the window
		if (recentOperations.length < this.MIN_OPERATIONS) {
			return null;
		}

		// Filter by currency (MXN only for this rule)
		const mxnOperations = recentOperations.filter(
			(op) => op.currency === "MXN",
		);

		if (mxnOperations.length < this.MIN_OPERATIONS) {
			return null;
		}

		// Calculate total amount
		const totalAmount = this.sumOperationAmounts(mxnOperations, "MXN");

		// Check if threshold is met
		if (totalAmount < thresholdMxn) {
			return null;
		}

		// Find the minimal set of operations that trigger the threshold
		const matchedOperations = this.findMinimalTriggeringSet(
			mxnOperations,
			thresholdMxn,
		);

		const umaAmount = umaValue
			? totalAmount / umaValue.dailyValue
			: totalAmount / 113.14;

		// Find matching rule
		const matchedRule = this.findMatchingRule(context.alertRules);

		// Get date range of operations
		const sortedByDate = [...matchedOperations].sort(
			(a, b) =>
				new Date(a.operationDate || a.createdAt).getTime() -
				new Date(b.operationDate || b.createdAt).getTime(),
		);
		const firstOperationDate =
			sortedByDate[0]?.operationDate || sortedByDate[0]?.createdAt;
		const lastOperationDate =
			sortedByDate[sortedByDate.length - 1]?.operationDate ||
			sortedByDate[sortedByDate.length - 1]?.createdAt;

		return {
			triggered: true,
			matchedRule,
			alertMetadata: {
				...this.createBaseAlertMetadata(matchedOperations, totalAmount, "MXN"),
				umaAmount: Math.round(umaAmount * 100) / 100,
				umaDailyValue: umaValue?.dailyValue || 113.14,
				threshold: UMA_THRESHOLD,
				thresholdMxn,
				clientId: client.id,
				clientName: client.name || client.rfc,
				alertType: "aviso_obligatorio_acumulacion",
				operationCount: matchedOperations.length,
				aggregationWindowDays: AGGREGATION_WINDOW_DAYS,
				firstOperationDate,
				lastOperationDate,
				detectionTypes: [
					"multiple_units_same_client",
					"accumulated_amount_threshold",
				],
			},
			matchedOperations,
			metadata: {
				seekerType: this.ruleType,
				activityCode: this.activityCode,
				umaThreshold: UMA_THRESHOLD,
				aggregationWindowDays: AGGREGATION_WINDOW_DAYS,
				operationsInWindow: recentOperations.length,
			},
		};
	}

	/**
	 * Finds the minimal set of operations that trigger the threshold
	 * Prioritizes newer operations
	 */
	private findMinimalTriggeringSet(
		operations: AlertOperation[],
		threshold: number,
	): AlertOperation[] {
		// Sort by date descending (newest first)
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

	/**
	 * Override idempotency key to be based on the operation IDs
	 * and the date window to avoid duplicate alerts for the same accumulation
	 */
	async generateIdempotencyKey(
		context: AlertContext,
		result: SeekerEvaluationResult,
	): Promise<string> {
		// Sort operation IDs for consistent hashing
		const sortedIds = result.matchedOperations
			.map((op) => op.id)
			.sort()
			.join(",");

		const data = `${context.client.id}:${this.ruleType}:${sortedIds}`;
		return this.hashString(data);
	}
}
