/**
 * Third Party Accounts Seeker
 *
 * Detects when third-party bank accounts unrelated to the client
 * are used for payment, indicating possible "prestanombres" use.
 */

import {
	BaseAlertSeeker,
	type AlertContext,
	type SeekerEvaluationResult,
	type VulnerableActivityCode,
	type AlertRuleType,
	type AlertSeverity,
	type AlertOperation,
	type OperationPaymentMethod,
} from "../types";

interface ThirdPartyPayment {
	operation: AlertOperation;
	paymentMethod: OperationPaymentMethod;
	accountHolderId: string;
	accountHolderName?: string;
	buyerId: string;
}

/**
 * Seeker for detecting third-party account usage
 *
 * Trigger: Third-party accounts unrelated to client used for payment
 * Severity: HIGH
 */
export class ThirdPartyAccountsSeeker extends BaseAlertSeeker {
	readonly activityCode: VulnerableActivityCode = "VEH";
	readonly ruleType: AlertRuleType = "third_party_accounts";
	readonly name = "Uso de cuentas de terceros no relacionados";
	readonly description =
		"Detecta cuando se utilizan cuentas bancarias de terceros no relacionados para realizar el pago";
	readonly defaultSeverity: AlertSeverity = "HIGH";

	/**
	 * Payment methods that involve bank accounts
	 */
	private readonly BANK_ACCOUNT_METHODS = [
		"TRANSFER",
		"TRANSFERENCIA",
		"WIRE",
		"CHECK",
		"CHEQUE",
		"2", // Transfer code
		"3", // Check code
	];

	async evaluate(
		context: AlertContext,
	): Promise<SeekerEvaluationResult | null> {
		const { client, operations, triggerOperation } = context;

		// If we have a trigger operation, evaluate only that one
		const operationsToEvaluate = triggerOperation
			? [triggerOperation]
			: operations;

		// Find third-party payments
		const thirdPartyPayments = this.findThirdPartyPayments(
			operationsToEvaluate,
			client.id,
		);

		if (thirdPartyPayments.length === 0) {
			return null;
		}

		// Get unique operations
		const matchedOperations = [
			...new Map(
				thirdPartyPayments.map((tp) => [tp.operation.id, tp.operation]),
			).values(),
		];

		const totalThirdPartyAmount = thirdPartyPayments.reduce(
			(sum, tp) => sum + tp.paymentMethod.amount,
			0,
		);

		// Find matching rule
		const matchedRule = this.findMatchingRule(context.alertRules);

		// Get unique third parties
		const uniqueThirdParties = this.getUniqueThirdParties(thirdPartyPayments);

		// Determine risk level
		const riskLevel = this.determineRiskLevel(
			thirdPartyPayments,
			uniqueThirdParties,
		);

		return {
			triggered: true,
			matchedRule,
			alertMetadata: {
				...this.createBaseAlertMetadata(
					matchedOperations,
					totalThirdPartyAmount,
					"MXN",
				),
				clientId: client.id,
				clientName: client.name || client.rfc,
				alertType: "third_party_accounts",
				thirdPartyPaymentCount: thirdPartyPayments.length,
				uniqueThirdPartyCount: uniqueThirdParties.length,
				totalThirdPartyAmount,
				thirdPartyDetails: thirdPartyPayments.map((tp) => ({
					operationId: tp.operation.id,
					accountHolderId: tp.accountHolderId,
					accountHolderName: tp.accountHolderName,
					paymentMethod: tp.paymentMethod.method,
					amount: tp.paymentMethod.amount,
					bankName: tp.paymentMethod.bankName,
					accountNumber: tp.paymentMethod.accountNumber
						? this.maskAccountNumber(tp.paymentMethod.accountNumber)
						: undefined,
				})),
				uniqueThirdParties: uniqueThirdParties.map((tp) => ({
					id: tp.id,
					name: tp.name,
					paymentCount: tp.paymentCount,
					totalAmount: tp.totalAmount,
				})),
				riskLevel,
				prestanombresRisk: true,
				requiresRelationshipVerification: true,
				complianceActions: [
					"verify_third_party_relationship",
					"document_relationship_justification",
					"enhanced_due_diligence",
					"consider_operation_rejection",
				],
				legalBasis: "Art_18_LFPIORPI",
			},
			matchedOperations,
			metadata: {
				seekerType: this.ruleType,
				activityCode: this.activityCode,
				thirdPartyPaymentCount: thirdPartyPayments.length,
				uniqueThirdPartyCount: uniqueThirdParties.length,
				riskLevel,
			},
		};
	}

	/**
	 * Finds payments from third-party accounts
	 */
	private findThirdPartyPayments(
		operations: AlertOperation[],
		buyerId: string,
	): ThirdPartyPayment[] {
		const thirdPartyPayments: ThirdPartyPayment[] = [];

		for (const op of operations) {
			if (!op.paymentMethods) continue;

			for (const pm of op.paymentMethods) {
				// Only check bank account payment methods
				if (!this.isBankAccountMethod(pm.method)) continue;

				// Check if account holder is different from buyer
				if (pm.accountHolderId && pm.accountHolderId !== buyerId) {
					thirdPartyPayments.push({
						operation: op,
						paymentMethod: pm,
						accountHolderId: pm.accountHolderId,
						accountHolderName: pm.accountHolderName,
						buyerId,
					});
				}
			}
		}

		return thirdPartyPayments;
	}

	/**
	 * Checks if a payment method involves a bank account
	 */
	private isBankAccountMethod(method: string): boolean {
		return this.BANK_ACCOUNT_METHODS.some((m) =>
			method.toUpperCase().includes(m.toUpperCase()),
		);
	}

	/**
	 * Gets unique third parties with their payment statistics
	 */
	private getUniqueThirdParties(payments: ThirdPartyPayment[]): {
		id: string;
		name?: string;
		paymentCount: number;
		totalAmount: number;
	}[] {
		const thirdPartyMap = new Map<
			string,
			{ id: string; name?: string; paymentCount: number; totalAmount: number }
		>();

		for (const payment of payments) {
			const existing = thirdPartyMap.get(payment.accountHolderId);
			if (existing) {
				existing.paymentCount++;
				existing.totalAmount += payment.paymentMethod.amount;
			} else {
				thirdPartyMap.set(payment.accountHolderId, {
					id: payment.accountHolderId,
					name: payment.accountHolderName,
					paymentCount: 1,
					totalAmount: payment.paymentMethod.amount,
				});
			}
		}

		return Array.from(thirdPartyMap.values());
	}

	/**
	 * Determines risk level based on third-party payment patterns
	 */
	private determineRiskLevel(
		payments: ThirdPartyPayment[],
		uniqueThirdParties: { paymentCount: number; totalAmount: number }[],
	): "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" {
		// Multiple third parties is higher risk
		if (uniqueThirdParties.length >= 3) {
			return "CRITICAL";
		}

		// Multiple payments from same third party is concerning
		if (payments.length >= 3) {
			return "HIGH";
		}

		// Single third party with high amount
		const totalAmount = payments.reduce(
			(sum, p) => sum + p.paymentMethod.amount,
			0,
		);
		if (totalAmount >= 1000000) {
			return "HIGH";
		}

		if (uniqueThirdParties.length > 1 || payments.length > 1) {
			return "MEDIUM";
		}

		return "LOW";
	}

	/**
	 * Masks account number for security
	 */
	private maskAccountNumber(accountNumber: string): string {
		if (accountNumber.length <= 4) {
			return "****";
		}
		return "*".repeat(accountNumber.length - 4) + accountNumber.slice(-4);
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
