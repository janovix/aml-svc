/**
 * Payer Buyer Mismatch Seeker
 *
 * Detects when the payer of an operation is different from the buyer,
 * which may indicate "testaferro" (straw man) risk.
 */

import {
	BaseAlertSeeker,
	type AlertContext,
	type SeekerEvaluationResult,
	type VulnerableActivityCode,
	type AlertRuleType,
	type AlertSeverity,
	type AlertOperation,
} from "../types";

interface PayerMismatch {
	operation: AlertOperation;
	payerId: string;
	payerName?: string;
	buyerId: string;
	buyerName?: string;
	paymentMethod: string;
	amount: number;
}

/**
 * Seeker for detecting payer/buyer mismatches
 *
 * Trigger: When payer doesn't match buyer
 * Severity: MEDIUM
 */
export class PayerBuyerMismatchSeeker extends BaseAlertSeeker {
	readonly activityCode: VulnerableActivityCode = "VEH";
	readonly ruleType: AlertRuleType = "payer_buyer_mismatch";
	readonly name = "El pagador no coincide con el comprador";
	readonly description =
		"Detecta cuando el pagador de una operación es diferente al comprador, indicando posible riesgo de testaferro";
	readonly defaultSeverity: AlertSeverity = "MEDIUM";

	async evaluate(
		context: AlertContext,
	): Promise<SeekerEvaluationResult | null> {
		const { client, operations, triggerOperation } = context;

		// If we have a trigger operation, evaluate only that one
		const operationsToEvaluate = triggerOperation
			? [triggerOperation]
			: operations;

		// Find operations where payer doesn't match buyer
		const mismatches = this.findPayerMismatches(
			operationsToEvaluate,
			client.id,
		);

		if (mismatches.length === 0) {
			return null;
		}

		// Get unique operations with mismatches
		const matchedOperations = [
			...new Map(mismatches.map((m) => [m.operation.id, m.operation])).values(),
		];

		const totalMismatchAmount = mismatches.reduce(
			(sum, m) => sum + m.amount,
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
					totalMismatchAmount,
					"MXN",
				),
				clientId: client.id,
				clientName: client.name || client.rfc,
				alertType: "payer_buyer_mismatch",
				mismatchCount: mismatches.length,
				mismatches: mismatches.map((m) => ({
					operationId: m.operation.id,
					payerId: m.payerId,
					payerName: m.payerName,
					buyerId: m.buyerId,
					buyerName: m.buyerName,
					paymentMethod: m.paymentMethod,
					amount: m.amount,
				})),
				uniqueThirdPartyPayers: this.getUniquePayerCount(mismatches),
				requiresEnhancedDueDiligence: true,
				testaferroRisk: true,
				riskIndicators: ["third_party_payment", "possible_straw_man"],
			},
			matchedOperations,
			metadata: {
				seekerType: this.ruleType,
				activityCode: this.activityCode,
				mismatchCount: mismatches.length,
				uniquePayers: this.getUniquePayerCount(mismatches),
			},
		};
	}

	/**
	 * Finds operations where the payer doesn't match the buyer
	 */
	private findPayerMismatches(
		operations: AlertOperation[],
		buyerId: string,
	): PayerMismatch[] {
		const mismatches: PayerMismatch[] = [];

		for (const op of operations) {
			// Check if operation has explicit payer info
			if (op.payerId && op.payerId !== buyerId) {
				mismatches.push({
					operation: op,
					payerId: op.payerId,
					payerName: op.payerName,
					buyerId,
					buyerName: undefined,
					paymentMethod: "operation_level",
					amount: op.amount,
				});
				continue;
			}

			// Check payment methods for different account holders
			if (op.paymentMethods) {
				for (const pm of op.paymentMethods) {
					if (pm.accountHolderId && pm.accountHolderId !== buyerId) {
						mismatches.push({
							operation: op,
							payerId: pm.accountHolderId,
							payerName: pm.accountHolderName,
							buyerId,
							buyerName: undefined,
							paymentMethod: pm.method,
							amount: pm.amount,
						});
					}
				}
			}
		}

		return mismatches;
	}

	/**
	 * Gets the count of unique third-party payers
	 */
	private getUniquePayerCount(mismatches: PayerMismatch[]): number {
		return new Set(mismatches.map((m) => m.payerId)).size;
	}

	/**
	 * Override idempotency key to include third-party account info
	 */
	async generateIdempotencyKey(
		context: AlertContext,
		result: SeekerEvaluationResult,
	): Promise<string> {
		const operationIds = result.matchedOperations
			.map((op) => op.id)
			.sort()
			.join(",");
		const data = `${context.client.id}:THIRD_PARTY:${this.ruleType}:${operationIds}`;
		return this.hashString(data);
	}
}
