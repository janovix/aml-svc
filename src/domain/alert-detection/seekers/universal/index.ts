/**
 * Universal Seekers Index
 *
 * Exports all universal (pattern-based) alert seekers.
 * These seekers work across ALL vulnerable activities,
 * using configuration to determine applicable alert codes.
 */

// Tier 1: Low Complexity
export { UniversalOperationAmountUmaSeeker } from "./operation_amount_uma";
export { UniversalAggregateAmountUmaSeeker } from "./aggregate_amount_uma";
export { UniversalFrequentOperationsSeeker } from "./frequent_operations";
export { UniversalForeignTransferPaymentSeeker } from "./foreign_transfer_payment";
export { UniversalForeignCurrencyCashSeeker } from "./foreign_currency_cash";
export { UniversalVirtualCurrencyPaymentSeeker } from "./virtual_currency_payment";
export { UniversalCashHighValueSeeker } from "./cash_high_value";
export { UniversalThirdPartyPayerSeeker } from "./third_party_payer";
export { UniversalQuickRefundPatternSeeker } from "./quick_refund_pattern";
export { UniversalMinorClientSeeker } from "./minor_client";
export { UniversalMultipleCardsRequestsSeeker } from "./multiple_cards_requests";
export { UniversalAddressChangesSeeker } from "./address_changes";
export { UniversalSplitPaymentSeeker } from "./split_payment";
export { UniversalQuickFundMovementSeeker } from "./quick_fund_movement";

// Tier 2: Medium Complexity
export { UniversalProfileMismatchSeeker } from "./profile_mismatch";
export { UniversalStructuringDetectionSeeker } from "./structuring_detection";
export { UniversalSharedAddressAnalysisSeeker } from "./shared_address_analysis";
export { UniversalPriceAnomalySeeker } from "./price_anomaly";

import type { UniversalAlertSeeker } from "../types";
import { UniversalOperationAmountUmaSeeker } from "./operation_amount_uma";
import { UniversalAggregateAmountUmaSeeker } from "./aggregate_amount_uma";
import { UniversalFrequentOperationsSeeker } from "./frequent_operations";
import { UniversalForeignTransferPaymentSeeker } from "./foreign_transfer_payment";
import { UniversalForeignCurrencyCashSeeker } from "./foreign_currency_cash";
import { UniversalVirtualCurrencyPaymentSeeker } from "./virtual_currency_payment";
import { UniversalCashHighValueSeeker } from "./cash_high_value";
import { UniversalThirdPartyPayerSeeker } from "./third_party_payer";
import { UniversalQuickRefundPatternSeeker } from "./quick_refund_pattern";
import { UniversalMinorClientSeeker } from "./minor_client";
import { UniversalMultipleCardsRequestsSeeker } from "./multiple_cards_requests";
import { UniversalAddressChangesSeeker } from "./address_changes";
import { UniversalSplitPaymentSeeker } from "./split_payment";
import { UniversalQuickFundMovementSeeker } from "./quick_fund_movement";
import { UniversalProfileMismatchSeeker } from "./profile_mismatch";
import { UniversalStructuringDetectionSeeker } from "./structuring_detection";
import { UniversalSharedAddressAnalysisSeeker } from "./shared_address_analysis";
import { UniversalPriceAnomalySeeker } from "./price_anomaly";

/**
 * Creates all universal seeker instances.
 */
export function createAllUniversalSeekers(): UniversalAlertSeeker[] {
	return [
		// Tier 1
		new UniversalOperationAmountUmaSeeker(),
		new UniversalAggregateAmountUmaSeeker(),
		new UniversalFrequentOperationsSeeker(),
		new UniversalForeignTransferPaymentSeeker(),
		new UniversalForeignCurrencyCashSeeker(),
		new UniversalVirtualCurrencyPaymentSeeker(),
		new UniversalCashHighValueSeeker(),
		new UniversalThirdPartyPayerSeeker(),
		new UniversalQuickRefundPatternSeeker(),
		new UniversalMinorClientSeeker(),
		new UniversalMultipleCardsRequestsSeeker(),
		new UniversalAddressChangesSeeker(),
		new UniversalSplitPaymentSeeker(),
		new UniversalQuickFundMovementSeeker(),
		// Tier 2
		new UniversalProfileMismatchSeeker(),
		new UniversalStructuringDetectionSeeker(),
		new UniversalSharedAddressAnalysisSeeker(),
		new UniversalPriceAnomalySeeker(),
	];
}
