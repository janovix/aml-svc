/**
 * Universal cash fragmentation seeker (multiple cash payments / structuring signals).
 */

import {
	DEFAULT_UMA_DAILY_VALUE,
	getIdentificationThresholdMxn,
	getNoticeThresholdMxn,
} from "../../config/activity-thresholds";
import {
	CASH_FRAGMENTATION_MIN_PAYMENTS,
	CASH_FRAGMENTATION_WINDOW_DAYS,
} from "../window-constants";
import {
	UniversalAlertSeeker,
	type AlertContext,
	type SeekerEvaluationResult,
	type AlertSeverity,
	type AlertOperation,
	type UniversalAlertRuleType,
} from "../types";
import type { PatternType } from "../../config/alert-patterns";

export class UniversalCashFragmentationSeeker extends UniversalAlertSeeker {
	readonly patternType: PatternType = "cash_fragmentation";
	readonly ruleType: UniversalAlertRuleType = "cash_fragmentation";
	readonly name = "Cash fragmentation pattern detected";
	readonly description =
		"Detects multiple cash payments in a short window suggesting fragmentation";
	readonly defaultSeverity: AlertSeverity = "MEDIUM";

	async evaluate(
		context: AlertContext,
	): Promise<SeekerEvaluationResult | null> {
		const { client, operations } = context;
		const activityCode = context.activityCode;

		if (!this.appliesTo(activityCode)) return null;

		const recentOperations = this.filterOperationsInWindow(
			operations,
			CASH_FRAGMENTATION_WINDOW_DAYS,
		);

		const cashPayments = this.getCashPayments(recentOperations);
		if (cashPayments.length < CASH_FRAGMENTATION_MIN_PAYMENTS) return null;

		const daily = context.umaValue?.dailyValue ?? DEFAULT_UMA_DAILY_VALUE;
		const fragmentationAnalysis = this.analyzeFragmentation(
			cashPayments,
			activityCode,
			daily,
		);

		if (!fragmentationAnalysis.isFragmented) return null;

		const matchedOperations = this.getUniqueOperations(cashPayments);
		const totalCashAmount = cashPayments.reduce(
			(sum, cp) => sum + cp.amount,
			0,
		);

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
				activityCode,
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
				activityCode: context.activityCode,
				cashPaymentCount: cashPayments.length,
				fragmentationScore: fragmentationAnalysis.score,
			},
		};
	}

	private analyzeFragmentation(
		cashPayments: { operation: AlertOperation; amount: number }[],
		activityCode: string,
		umaDailyValue: number,
	): {
		isFragmented: boolean;
		indicators: string[];
		uniquePayers: number;
		riskLevel: "LOW" | "MEDIUM" | "HIGH";
		score: number;
	} {
		const indicators: string[] = [];
		let score = 0;

		if (cashPayments.length >= 2) {
			indicators.push("multiple_cash_payments");
			score += 1;
		}

		if (cashPayments.length >= 3) {
			indicators.push("high_frequency_cash_payments");
			score += 1;
		}

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

		const amounts = cashPayments.map((cp) => cp.amount);
		const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
		const variance =
			amounts.reduce((sum, a) => sum + Math.pow(a - avgAmount, 2), 0) /
			amounts.length;
		const stdDev = Math.sqrt(variance);
		const coefficientOfVariation = avgAmount > 0 ? stdDev / avgAmount : 0;

		if (coefficientOfVariation < 0.3 && cashPayments.length >= 2) {
			indicators.push("similar_amounts");
			score += 1;
		}

		let refMxn = getNoticeThresholdMxn(activityCode, umaDailyValue);
		if (refMxn === null) {
			refMxn = 1000 * umaDailyValue;
		} else if (refMxn === 0) {
			const idMxn = getIdentificationThresholdMxn(activityCode, umaDailyValue);
			refMxn = idMxn === null || idMxn === 0 ? 1000 * umaDailyValue : idMxn;
		}

		const commonThresholds = [0.25, 0.5, 0.9, 1.0].map((f) => refMxn * f);
		const nearThresholdPayments = cashPayments.filter((cp) =>
			commonThresholds.some(
				(threshold) =>
					threshold > 0 &&
					cp.amount >= threshold * 0.9 &&
					cp.amount <= threshold * 0.99,
			),
		);
		if (nearThresholdPayments.length > 0) {
			indicators.push("near_threshold_amounts");
			score += 2;
		}

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
