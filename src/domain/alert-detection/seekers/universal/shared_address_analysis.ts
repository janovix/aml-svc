/**
 * Universal Shared Address Analysis Seeker
 *
 * Detects when multiple unrelated clients share the same address or
 * legal representative. This requires cross-client data that is
 * passed via the client's metadata.
 *
 * NOTE: The actual cross-client address matching must be performed
 * by aml-svc before alert evaluation. The worker checks for a
 * `sharedAddressClientCount` field on the client.
 */

import {
	UniversalAlertSeeker,
	type AlertContext,
	type SeekerEvaluationResult,
	type AlertSeverity,
	type UniversalAlertRuleType,
} from "../types";
import type { PatternType } from "../../config/alert-patterns";

export class UniversalSharedAddressAnalysisSeeker extends UniversalAlertSeeker {
	readonly patternType: PatternType = "shared_address_analysis";
	readonly ruleType: UniversalAlertRuleType = "shared_address_analysis";
	readonly name = "Shared address detected across clients";
	readonly description =
		"Detects when multiple unrelated clients share the same address or representative";
	readonly defaultSeverity: AlertSeverity = "MEDIUM";

	private readonly MIN_SHARED_CLIENTS = 2;

	async evaluate(
		context: AlertContext,
	): Promise<SeekerEvaluationResult | null> {
		const { client, operations, triggerOperation } = context;
		const activityCode = context.activityCode;

		if (!this.appliesTo(activityCode)) return null;

		const clientRecord = client as Record<string, unknown>;
		const sharedAddressClientCount =
			(clientRecord.sharedAddressClientCount as number) ?? 0;
		const sharedRepresentativeCount =
			(clientRecord.sharedRepresentativeCount as number) ?? 0;

		const maxShared = Math.max(
			sharedAddressClientCount,
			sharedRepresentativeCount,
		);

		if (maxShared < this.MIN_SHARED_CLIENTS) return null;

		const matchedOperations = triggerOperation
			? [triggerOperation]
			: operations.slice(-1);

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
				alertType: "shared_address_analysis",
				sharedAddressClientCount,
				sharedRepresentativeCount,
			},
			matchedOperations,
			metadata: {
				seekerType: this.ruleType,
				activityCode: context.activityCode,
				sharedAddressClientCount,
				sharedRepresentativeCount,
			},
		};
	}

	async generateIdempotencyKey(
		context: AlertContext,
		_result: SeekerEvaluationResult,
	): Promise<string> {
		const monthKey = `${new Date().getFullYear()}-${new Date().getMonth()}`;
		const data = `${context.activityCode}:${context.client.id}:${this.ruleType}:${monthKey}`;
		return this.hashString(data);
	}
}
