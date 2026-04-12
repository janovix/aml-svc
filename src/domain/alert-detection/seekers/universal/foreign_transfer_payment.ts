/**
 * Universal Foreign Transfer Payment Seeker
 *
 * Detects payments made via international bank transfers from foreign countries.
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

export class UniversalForeignTransferPaymentSeeker extends UniversalAlertSeeker {
	readonly patternType: PatternType = "foreign_transfer_payment";
	readonly ruleType: UniversalAlertRuleType = "foreign_transfer_payment";
	readonly name = "Foreign transfer payment detected";
	readonly description =
		"Detects payments via international transfer from a foreign country";
	readonly defaultSeverity: AlertSeverity = "MEDIUM";

	private readonly TRANSFER_METHODS = [
		"TRANSFER",
		"TRANSFERENCIA",
		"WIRE",
		"2",
		"03",
	];

	async evaluate(
		context: AlertContext,
	): Promise<SeekerEvaluationResult | null> {
		const { client, operations, triggerOperation } = context;
		const activityCode = context.activityCode;

		if (!this.appliesTo(activityCode)) return null;

		const operationsToEvaluate = triggerOperation
			? [triggerOperation]
			: operations;

		const foreignTransfers = this.findForeignTransfers(operationsToEvaluate);

		if (foreignTransfers.length === 0) return null;

		const matchedOperations = [
			...new Map(foreignTransfers.map((ft) => [ft.id, ft])).values(),
		];
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
				alertType: "foreign_transfer_payment",
				foreignTransferCount: foreignTransfers.length,
			},
			matchedOperations,
			metadata: {
				seekerType: this.ruleType,
				activityCode: context.activityCode,
				foreignTransferCount: foreignTransfers.length,
			},
		};
	}

	private findForeignTransfers(operations: AlertOperation[]): AlertOperation[] {
		const results: AlertOperation[] = [];

		for (const op of operations) {
			if (!op.paymentMethods) continue;

			for (const pm of op.paymentMethods) {
				const isTransfer = this.TRANSFER_METHODS.some((m) =>
					pm.method.toUpperCase().includes(m.toUpperCase()),
				);

				// Check if bank name or method suggests foreign origin
				const pmAny = pm as unknown as Record<string, unknown>;
				const isForeign =
					pmAny.countryCode !== undefined &&
					pmAny.countryCode !== "MX" &&
					pmAny.countryCode !== "MEX";

				if (isTransfer && isForeign) {
					results.push(op);
					break;
				}
			}
		}

		return results;
	}
}
