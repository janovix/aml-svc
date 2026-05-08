/**
 * Universal new-client high-value seeker (notice threshold × multiplier).
 */

import {
	DEFAULT_UMA_DAILY_VALUE,
	getNoticeThresholdUma,
} from "../../config/activity-thresholds";
import {
	NEW_CLIENT_HIGH_VALUE_ALWAYS_NOTICE_FLOOR_UMA,
	NEW_CLIENT_HIGH_VALUE_MULTIPLIER,
} from "../window-constants";
import {
	UniversalAlertSeeker,
	type AlertContext,
	type SeekerEvaluationResult,
	type AlertSeverity,
	type UniversalAlertRuleType,
} from "../types";
import type { PatternType } from "../../config/alert-patterns";

export class UniversalNewClientHighValueSeeker extends UniversalAlertSeeker {
	readonly patternType: PatternType = "new_client_high_value";
	readonly ruleType: UniversalAlertRuleType = "new_client_high_value";
	readonly name = "New client high-value operation";
	readonly description =
		"Recently onboarded or low-history client with operation materially above the activity notice threshold";
	readonly defaultSeverity: AlertSeverity = "HIGH";

	private readonly NEW_CLIENT_MAX_AGE_DAYS = 30;

	async evaluate(
		context: AlertContext,
	): Promise<SeekerEvaluationResult | null> {
		const { client, operations, alertRules, triggerOperation } = context;
		const activityCode = context.activityCode;

		if (!this.appliesTo(activityCode)) return null;
		if (!this.isNewClient(client, operations)) return null;

		const matchedRule = this.findMatchingRule(alertRules);
		const highValueThreshold = this.computeHighValueThresholdMxn(
			activityCode,
			context.umaValue,
		);

		const operationsToEvaluate = triggerOperation
			? [triggerOperation]
			: operations;

		const highValueOperations = operationsToEvaluate.filter(
			(op) => op.amount >= highValueThreshold,
		);

		if (highValueOperations.length === 0) return null;

		const totalAmount = this.sumOperationAmounts(highValueOperations);

		const riskFactors: string[] = [
			"new_client",
			"high_value_purchase",
			"no_operation_history",
		];

		if (highValueOperations.some((op) => op.amount >= highValueThreshold * 2)) {
			riskFactors.push("extremely_high_value");
		}

		const luxuryOrSpecial = highValueOperations.filter(
			(op) => op.vehicleType === "AIR" || op.vehicleType === "MARINE",
		);
		if (luxuryOrSpecial.length > 0) {
			riskFactors.push("non_land_vehicle_or_special");
		}

		return {
			triggered: true,
			matchedRule,
			alertMetadata: {
				...this.createBaseAlertMetadata(
					highValueOperations,
					totalAmount,
					highValueOperations[0]?.currency || "MXN",
				),
				clientId: client.id,
				clientName: client.name || client.rfc,
				activityCode,
				alertType: "new_client_high_value",
				isNewClient: true,
				clientCreatedAt: client.createdAt,
				highValueThreshold,
				operationCount: highValueOperations.length,
				riskFactors,
				operationDetails: highValueOperations.map((op) => ({
					operationId: op.id,
					amount: op.amount,
					vehicleType: op.vehicleType,
					brand: op.brandId,
					model: op.model,
					year: op.year,
				})),
				requiresEnhancedDueDiligence: true,
			},
			matchedOperations: highValueOperations,
			metadata: {
				seekerType: this.ruleType,
				activityCode: context.activityCode,
				isNewClient: true,
				highValueThreshold,
				maxOperationAmount: Math.max(
					...highValueOperations.map((op) => op.amount),
				),
			},
		};
	}

	private computeHighValueThresholdMxn(
		activityCode: string,
		umaValue: AlertContext["umaValue"],
	): number {
		const daily = umaValue?.dailyValue ?? DEFAULT_UMA_DAILY_VALUE;
		const noticeUma = getNoticeThresholdUma(activityCode);

		let baseNoticeMxn: number;
		if (noticeUma === "ALWAYS") {
			baseNoticeMxn = NEW_CLIENT_HIGH_VALUE_ALWAYS_NOTICE_FLOOR_UMA * daily;
		} else if (noticeUma === null) {
			baseNoticeMxn = NEW_CLIENT_HIGH_VALUE_ALWAYS_NOTICE_FLOOR_UMA * daily;
		} else {
			baseNoticeMxn = noticeUma * daily;
		}

		return baseNoticeMxn * NEW_CLIENT_HIGH_VALUE_MULTIPLIER;
	}

	private isNewClient(
		client: AlertContext["client"],
		operations: AlertContext["operations"],
	): boolean {
		if (client.createdAt) {
			const clientCreatedDate = new Date(client.createdAt);
			const now = new Date();
			const daysSinceCreation = Math.floor(
				(now.getTime() - clientCreatedDate.getTime()) / (1000 * 60 * 60 * 24),
			);

			if (daysSinceCreation <= this.NEW_CLIENT_MAX_AGE_DAYS) {
				return true;
			}
		}

		const historicalOperations = operations.filter((op) => {
			const opDate = new Date(op.operationDate || op.createdAt);
			const now = new Date();
			const daysAgo = Math.floor(
				(now.getTime() - opDate.getTime()) / (1000 * 60 * 60 * 24),
			);
			return daysAgo > 0;
		});

		return historicalOperations.length === 0;
	}

	async generateIdempotencyKey(
		context: AlertContext,
		result: SeekerEvaluationResult,
	): Promise<string> {
		const operationIds = result.matchedOperations
			.map((op) => op.id)
			.sort()
			.join(",");
		const data = `${context.activityCode}:${context.client.id}:NEW_CLIENT:${this.patternType}:${operationIds}`;
		return this.hashString(data);
	}
}
