/**
 * Universal Virtual Currency Payment Seeker
 *
 * Detects attempts to pay using virtual currencies or crypto assets.
 * Not applicable to AVI (virtual assets) since that IS the activity.
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

export class UniversalVirtualCurrencyPaymentSeeker extends UniversalAlertSeeker {
	readonly patternType: PatternType = "virtual_currency_payment";
	readonly ruleType: UniversalAlertRuleType = "virtual_currency_payment";
	readonly name = "Virtual currency payment attempt";
	readonly description =
		"Detects attempts to pay using virtual currencies or crypto assets";
	readonly defaultSeverity: AlertSeverity = "MEDIUM";

	private readonly CRYPTO_INDICATORS = [
		"CRYPTO",
		"BITCOIN",
		"BTC",
		"ETH",
		"USDT",
		"VIRTUAL",
		"MONEDA_VIRTUAL",
		"ACTIVO_VIRTUAL",
		"CRIPTOMONEDA",
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

		const cryptoOps = this.findCryptoPaymentAttempts(operationsToEvaluate);

		if (cryptoOps.length === 0) return null;

		const totalAmount = this.sumOperationAmounts(cryptoOps);
		const matchedRule = this.findMatchingRule(context.alertRules);

		return {
			triggered: true,
			matchedRule,
			alertMetadata: {
				...this.createBaseAlertMetadata(cryptoOps, totalAmount, "MXN"),
				clientId: client.id,
				clientName: client.name || client.rfc,
				activityCode,
				alertType: "virtual_currency_payment",
				cryptoPaymentAttempts: cryptoOps.length,
			},
			matchedOperations: cryptoOps,
			metadata: {
				seekerType: this.ruleType,
				activityCode: context.activityCode,
				cryptoPaymentAttempts: cryptoOps.length,
			},
		};
	}

	private findCryptoPaymentAttempts(
		operations: AlertOperation[],
	): AlertOperation[] {
		return operations.filter((op) => {
			if (!op.paymentMethods) return false;

			return op.paymentMethods.some((pm) => {
				const method = pm.method.toUpperCase();
				return this.CRYPTO_INDICATORS.some((indicator) =>
					method.includes(indicator),
				);
			});
		});
	}
}
