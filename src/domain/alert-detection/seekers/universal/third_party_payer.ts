/**
 * Universal Third-Party Payer Seeker
 *
 * Detects when the payer of an operation differs from the client,
 * indicating possible "testaferro" (straw man) or "prestanombres" use.
 * Replaces the legacy VEH payer_buyer_mismatch and third_party_accounts seekers.
 */

import {
	UniversalAlertSeeker,
	type AlertContext,
	type SeekerEvaluationResult,
	type AlertSeverity,
	type AlertOperation,
	type UniversalAlertRuleType,
} from "../types";
import type { PatternType } from "../../config/alert-patterns";

interface PayerMismatch {
	operation: AlertOperation;
	payerId: string;
	payerName?: string;
	paymentMethod: string;
	amount: number;
}

export class UniversalThirdPartyPayerSeeker extends UniversalAlertSeeker {
	readonly patternType: PatternType = "third_party_payer";
	readonly ruleType: UniversalAlertRuleType = "third_party_payer";
	readonly name = "Third-party payer detected";
	readonly description =
		"Detects when the payer of an operation is different from the client";
	readonly defaultSeverity: AlertSeverity = "MEDIUM";

	async evaluate(
		context: AlertContext,
	): Promise<SeekerEvaluationResult | null> {
		const { client, operations, triggerOperation } = context;
		const activityCode = context.activityCode;

		if (!this.appliesTo(activityCode)) return null;

		const operationsToEvaluate = triggerOperation
			? [triggerOperation]
			: operations;

		const mismatches = this.findPayerMismatches(
			operationsToEvaluate,
			client.id,
		);

		if (mismatches.length === 0) return null;

		const matchedOperations = [
			...new Map(mismatches.map((m) => [m.operation.id, m.operation])).values(),
		];

		const totalMismatchAmount = mismatches.reduce(
			(sum, m) => sum + m.amount,
			0,
		);
		const uniquePayers = new Set(mismatches.map((m) => m.payerId)).size;

		const matchedRule = this.findMatchingRule(context.alertRules);

		return {
			triggered: true,
			matchedRule,
			alertMetadata: {
				...this.createBaseAlertMetadata(
					matchedOperations,
					totalMismatchAmount,
					"MXN",
				),
				clientId: client.id,
				clientName: client.name || client.rfc,
				activityCode,
				alertType: "third_party_payer",
				mismatchCount: mismatches.length,
				uniqueThirdPartyPayers: uniquePayers,
				mismatches: mismatches.map((m) => ({
					operationId: m.operation.id,
					payerId: m.payerId,
					payerName: m.payerName,
					paymentMethod: m.paymentMethod,
					amount: m.amount,
				})),
				testaferroRisk: true,
				requiresEnhancedDueDiligence: true,
			},
			matchedOperations,
			metadata: {
				seekerType: this.ruleType,
				activityCode: context.activityCode,
				mismatchCount: mismatches.length,
				uniquePayers,
			},
		};
	}

	private findPayerMismatches(
		operations: AlertOperation[],
		buyerId: string,
	): PayerMismatch[] {
		const mismatches: PayerMismatch[] = [];

		for (const op of operations) {
			if (op.payerId && op.payerId !== buyerId) {
				mismatches.push({
					operation: op,
					payerId: op.payerId,
					payerName: op.payerName,
					paymentMethod: "operation_level",
					amount: op.amount,
				});
				continue;
			}

			if (op.paymentMethods) {
				for (const pm of op.paymentMethods) {
					if (pm.accountHolderId && pm.accountHolderId !== buyerId) {
						mismatches.push({
							operation: op,
							payerId: pm.accountHolderId,
							payerName: pm.accountHolderName,
							paymentMethod: pm.method,
							amount: pm.amount,
						});
					}
				}
			}
		}

		return mismatches;
	}
}
