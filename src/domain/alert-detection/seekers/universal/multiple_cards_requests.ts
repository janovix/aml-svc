/**
 * Universal Multiple Cards/Instruments Requests Seeker
 *
 * Detects when a client requests multiple similar financial instruments
 * (cards, checks, etc.) in a short period — applicable mainly to TSC, TPP, TDR, CHV.
 */

import { FREQUENT_OPERATION_WINDOW_DAYS } from "../constants";
import {
	UniversalAlertSeeker,
	type AlertContext,
	type SeekerEvaluationResult,
	type AlertSeverity,
	type UniversalAlertRuleType,
} from "../types";
import type { PatternType } from "../../config/alert-patterns";

export class UniversalMultipleCardsRequestsSeeker extends UniversalAlertSeeker {
	readonly patternType: PatternType = "multiple_cards_requests";
	readonly ruleType: UniversalAlertRuleType = "multiple_cards_requests";
	readonly name = "Multiple card/instrument requests detected";
	readonly description =
		"Detects when a client requests multiple similar financial instruments in a short period";
	readonly defaultSeverity: AlertSeverity = "MEDIUM";

	private readonly MIN_REQUESTS = 3;

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

		if (recentOperations.length < this.MIN_REQUESTS) return null;

		const totalAmount = this.sumOperationAmounts(recentOperations);
		const matchedRule = this.findMatchingRule(context.alertRules);

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
				alertType: "multiple_cards_requests",
				requestCount: recentOperations.length,
				windowDays: FREQUENT_OPERATION_WINDOW_DAYS,
			},
			matchedOperations: recentOperations,
			metadata: {
				seekerType: this.ruleType,
				activityCode: context.activityCode,
				requestCount: recentOperations.length,
			},
		};
	}
}
