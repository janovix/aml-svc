/**
 * Universal PEP or high-risk client seeker.
 */

import {
	UniversalAlertSeeker,
	type AlertContext,
	type SeekerEvaluationResult,
	type AlertSeverity,
	type UniversalAlertRuleType,
} from "../types";
import type { PatternType } from "../../config/alert-patterns";

export class UniversalPepOrHighRiskSeeker extends UniversalAlertSeeker {
	readonly patternType: PatternType = "pep_or_high_risk";
	readonly ruleType: UniversalAlertRuleType = "pep_or_high_risk";
	readonly name = "PEP or high-risk client — intensified monitoring";
	readonly description =
		"Detects operations from PEP or high-risk clients for enhanced follow-up";
	readonly defaultSeverity: AlertSeverity = "HIGH";

	async evaluate(
		context: AlertContext,
	): Promise<SeekerEvaluationResult | null> {
		const { client, operations, triggerOperation } = context;
		const activityCode = context.activityCode;

		if (!this.appliesTo(activityCode)) return null;

		const isPep = client.isPep === true;
		const isHighRisk = client.riskLevel === "HIGH";

		if (!isPep && !isHighRisk) return null;

		let matchedOperations = triggerOperation ? [triggerOperation] : operations;

		if (matchedOperations.length === 0) return null;

		if (!triggerOperation) {
			const sorted = [...matchedOperations].sort(
				(a, b) =>
					new Date(b.operationDate || b.createdAt).getTime() -
					new Date(a.operationDate || a.createdAt).getTime(),
			);
			matchedOperations = [sorted[0]];
		}

		const totalAmount = this.sumOperationAmounts(matchedOperations);
		const matchedRule = this.findMatchingRule(context.alertRules);

		const riskFactors: string[] = [];
		if (isPep) riskFactors.push("politically_exposed_person");
		if (isHighRisk) riskFactors.push("high_risk_client");

		return {
			triggered: true,
			matchedRule,
			alertMetadata: {
				...this.createBaseAlertMetadata(
					matchedOperations,
					totalAmount,
					matchedOperations[0]?.currency || "MXN",
				),
				clientId: client.id,
				clientName: client.name || client.rfc,
				activityCode,
				isPep,
				isHighRisk,
				riskLevel: client.riskLevel || (isPep ? "HIGH" : "MEDIUM"),
				alertType: "pep_or_high_risk",
				riskFactors,
				requiresEnhancedMonitoring: true,
				requiresManualReview: true,
			},
			matchedOperations,
			metadata: {
				seekerType: this.ruleType,
				activityCode: context.activityCode,
				isPep,
				isHighRisk,
			},
		};
	}

	async generateIdempotencyKey(
		context: AlertContext,
		result: SeekerEvaluationResult,
	): Promise<string> {
		const operationId = result.matchedOperations[0]?.id || "unknown";
		const riskType = context.client.isPep ? "PEP" : "HIGH_RISK";
		const data = `${context.activityCode}:${context.client.id}:${riskType}:${this.patternType}:${operationId}`;
		return this.hashString(data);
	}
}
