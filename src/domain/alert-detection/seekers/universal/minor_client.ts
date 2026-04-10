/**
 * Universal Minor Client Seeker
 *
 * Detects when a client is under 18 years of age.
 */

import {
	UniversalAlertSeeker,
	type AlertContext,
	type SeekerEvaluationResult,
	type AlertSeverity,
	type UniversalAlertRuleType,
} from "../types";
import type { PatternType } from "../../config/alert-patterns";

export class UniversalMinorClientSeeker extends UniversalAlertSeeker {
	readonly patternType: PatternType = "minor_client";
	readonly ruleType: UniversalAlertRuleType = "minor_client";
	readonly name = "Minor client detected";
	readonly description = "Detects when a client is under 18 years of age";
	readonly defaultSeverity: AlertSeverity = "MEDIUM";

	async evaluate(
		context: AlertContext,
	): Promise<SeekerEvaluationResult | null> {
		const { client, operations, triggerOperation } = context;
		const activityCode = context.activityCode;

		if (!this.appliesTo(activityCode)) return null;

		// Need date of birth to check
		const dob = (client as Record<string, unknown>).dateOfBirth as
			| string
			| undefined;
		if (!dob) return null;

		const birthDate = new Date(dob);
		const now = new Date();
		let age = now.getFullYear() - birthDate.getFullYear();
		const monthDiff = now.getMonth() - birthDate.getMonth();
		if (
			monthDiff < 0 ||
			(monthDiff === 0 && now.getDate() < birthDate.getDate())
		) {
			age--;
		}

		if (age >= 18) return null;

		const matchedOperations = triggerOperation
			? [triggerOperation]
			: operations.length > 0
				? [operations[operations.length - 1]]
				: [];

		if (matchedOperations.length === 0) return null;

		const totalAmount = this.sumOperationAmounts(matchedOperations);
		const matchedRule = this.findMatchingRule(context.alertRules);

		return {
			triggered: true,
			matchedRule,
			alertMetadata: {
				...this.createBaseAlertMetadata(matchedOperations, totalAmount, "MXN"),
				clientId: client.id,
				clientName: client.name || client.rfc,
				activityCode,
				alertType: "minor_client",
				clientAge: age,
				requiresGuardianVerification: true,
			},
			matchedOperations,
			metadata: {
				seekerType: this.ruleType,
				activityCode: context.activityCode,
				clientAge: age,
			},
		};
	}

	async generateIdempotencyKey(
		context: AlertContext,
		_result: SeekerEvaluationResult,
	): Promise<string> {
		// Once per client — a minor doesn't stop being a minor mid-session
		const data = `${context.activityCode}:${context.client.id}:${this.ruleType}`;
		return this.hashString(data);
	}
}
