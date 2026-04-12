/**
 * Cash Fragmentation Seeker
 *
 * Detects structuring attempts where multiple cash payments are made
 * within a short time period, potentially by different payers.
 */

import {
	CASH_FRAGMENTATION_WINDOW_DAYS,
	CASH_FRAGMENTATION_MIN_PAYMENTS,
} from "../constants";
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
 * Seeker for detecting cash fragmentation / structuring
 *
 * Trigger: Multiple cash deposits detected within 30 days
 * Severity: MEDIUM
 */
export class CashFragmentationSeeker extends BaseAlertSeeker {
	readonly activityCode: VulnerableActivityCode = "VEH";
	readonly ruleType: AlertRuleType = "cash_fragmentation";
	readonly name = "Sistema detecta fraccionamiento de efectivo";
	readonly description =
		"Detecta múltiples pagos en efectivo en un periodo corto que podrían indicar fraccionamiento o estructuración";
	readonly defaultSeverity: AlertSeverity = "MEDIUM";

	async evaluate(
		context: AlertContext,
	): Promise<SeekerEvaluationResult | null> {
		const { client, operations } = context;

		// Filter operations within the time window
		const recentOperations = this.filterOperationsInWindow(
			operations,
			CASH_FRAGMENTATION_WINDOW_DAYS,
		);

		// Get all cash payments from recent operations
		const cashPayments = this.getCashPayments(recentOperations);

		// Need at least MIN_CASH_PAYMENTS to detect fragmentation
		if (cashPayments.length < CASH_FRAGMENTATION_MIN_PAYMENTS) {
			return null;
		}

		// Analyze payment patterns for fragmentation indicators
		const fragmentationAnalysis = this.analyzeFragmentation(cashPayments);

		if (!fragmentationAnalysis.isFragmented) {
			return null;
		}

		// Get unique operations
		const matchedOperations = this.getUniqueOperations(cashPayments);
		const totalCashAmount = cashPayments.reduce(
			(sum, cp) => sum + cp.amount,
			0,
		);

		// Find matching rule
		const matchedRule = this.findMatchingRule(context.alertRules);

		return {
			triggered: true,
			matchedRule,
			alertMetadata: {
				...this.createBaseAlertMetadata(
					matchedOperations,
					totalCashAmount,
					"MXN",
				),
				clientId: client.id,
				clientName: client.name || client.rfc,
				alertType: "cash_fragmentation",
				cashPaymentCount: cashPayments.length,
				windowDays: CASH_FRAGMENTATION_WINDOW_DAYS,
				fragmentationIndicators: fragmentationAnalysis.indicators,
				uniquePayers: fragmentationAnalysis.uniquePayers,
				averagePaymentAmount: totalCashAmount / cashPayments.length,
				paymentDetails: cashPayments.map((cp) => ({
					operationId: cp.operation.id,
					amount: cp.amount,
					date: cp.operation.operationDate || cp.operation.createdAt,
				})),
				possibleStructuring: true,
				riskLevel: fragmentationAnalysis.riskLevel,
			},
			matchedOperations,
			metadata: {
				seekerType: this.ruleType,
				activityCode: this.activityCode,
				cashPaymentCount: cashPayments.length,
				fragmentationScore: fragmentationAnalysis.score,
			},
		};
	}

	/**
	 * Analyzes cash payments for fragmentation patterns
	 */
	private analyzeFragmentation(
		cashPayments: { operation: AlertOperation; amount: number }[],
	): {
		isFragmented: boolean;
		indicators: string[];
		uniquePayers: number;
		riskLevel: "LOW" | "MEDIUM" | "HIGH";
		score: number;
	} {
		const indicators: string[] = [];
		let score = 0;

		// Check for multiple payments
		if (cashPayments.length >= 2) {
			indicators.push("multiple_cash_payments");
			score += 1;
		}

		if (cashPayments.length >= 3) {
			indicators.push("high_frequency_cash_payments");
			score += 1;
		}

		// Check for different payers (account holders)
		const payers = new Set<string>();
		for (const cp of cashPayments) {
			const methods = cp.operation.paymentMethods || [];
			for (const method of methods) {
				if (method.accountHolderId) {
					payers.add(method.accountHolderId);
				}
			}
		}

		const uniquePayers = payers.size;
		if (uniquePayers > 1) {
			indicators.push("different_payers");
			score += 2;
		}

		// Check for similar amounts (possible structuring to stay under limits)
		const amounts = cashPayments.map((cp) => cp.amount);
		const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
		const variance =
			amounts.reduce((sum, a) => sum + Math.pow(a - avgAmount, 2), 0) /
			amounts.length;
		const stdDev = Math.sqrt(variance);
		const coefficientOfVariation = avgAmount > 0 ? stdDev / avgAmount : 0;

		// Low variance suggests intentional structuring
		if (coefficientOfVariation < 0.3 && cashPayments.length >= 2) {
			indicators.push("similar_amounts");
			score += 1;
		}

		// Check for payments just under common thresholds
		const commonThresholds = [10000, 50000, 100000, 500000];
		const nearThresholdPayments = cashPayments.filter((cp) =>
			commonThresholds.some(
				(threshold) =>
					cp.amount >= threshold * 0.9 && cp.amount <= threshold * 0.99,
			),
		);
		if (nearThresholdPayments.length > 0) {
			indicators.push("near_threshold_amounts");
			score += 2;
		}

		// Determine risk level
		let riskLevel: "LOW" | "MEDIUM" | "HIGH" = "LOW";
		if (score >= 4) {
			riskLevel = "HIGH";
		} else if (score >= 2) {
			riskLevel = "MEDIUM";
		}

		return {
			isFragmented: score >= 2,
			indicators,
			uniquePayers,
			riskLevel,
			score,
		};
	}

	/**
	 * Gets unique operations from cash payments
	 */
	private getUniqueOperations(
		cashPayments: { operation: AlertOperation; amount: number }[],
	): AlertOperation[] {
		const seen = new Set<string>();
		const unique: AlertOperation[] = [];

		for (const cp of cashPayments) {
			if (!seen.has(cp.operation.id)) {
				seen.add(cp.operation.id);
				unique.push(cp.operation);
			}
		}

		return unique;
	}
}
