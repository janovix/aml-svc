/**
 * Universal Address/Identity Changes Seeker
 *
 * Detects when a client (especially a legal entity) frequently changes
 * address, legal representative, or business name. Applicable mainly to MPC, ARI.
 *
 * NOTE: This seeker requires client history data that may not always be
 * available. It checks client metadata for change counts.
 */

import {
	UniversalAlertSeeker,
	type AlertContext,
	type SeekerEvaluationResult,
	type AlertSeverity,
	type UniversalAlertRuleType,
} from "../types";
import type { PatternType } from "../../config/alert-patterns";

export class UniversalAddressChangesSeeker extends UniversalAlertSeeker {
	readonly patternType: PatternType = "address_changes";
	readonly ruleType: UniversalAlertRuleType = "address_changes";
	readonly name = "Frequent address or identity changes";
	readonly description =
		"Detects when a client frequently changes address, legal representative, or business name";
	readonly defaultSeverity: AlertSeverity = "LOW";

	private readonly MIN_CHANGES = 2;

	async evaluate(
		context: AlertContext,
	): Promise<SeekerEvaluationResult | null> {
		const { client, operations, triggerOperation } = context;
		const activityCode = context.activityCode;

		if (!this.appliesTo(activityCode)) return null;

		// Check for address/identity change metadata on the client
		const clientRecord = client as Record<string, unknown>;
		const addressChangeCount = (clientRecord.addressChangeCount as number) ?? 0;
		const nameChangeCount = (clientRecord.nameChangeCount as number) ?? 0;
		const legalRepChangeCount =
			(clientRecord.legalRepChangeCount as number) ?? 0;

		const totalChanges =
			addressChangeCount + nameChangeCount + legalRepChangeCount;

		if (totalChanges < this.MIN_CHANGES) return null;

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
				alertType: "address_changes",
				addressChangeCount,
				nameChangeCount,
				legalRepChangeCount,
				totalChanges,
			},
			matchedOperations,
			metadata: {
				seekerType: this.ruleType,
				activityCode: context.activityCode,
				totalChanges,
			},
		};
	}
}
