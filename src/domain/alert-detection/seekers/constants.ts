/**
 * Hardcoded constants for alert seekers
 * These values are based on LFPIORPI legal requirements
 */

/**
 * UMA threshold for mandatory SAT report (6,420 UMA per Art. 17 LFPIORPI)
 */
export const UMA_THRESHOLD = 6420;

/**
 * Time window in days for aggregating operations (6 months per LFPIORPI)
 */
export const AGGREGATION_WINDOW_DAYS = 180;

/**
 * Time window in days for detecting frequent operations
 */
export const FREQUENT_OPERATION_WINDOW_DAYS = 30;

/**
 * Minimum number of operations to trigger frequent operations alert
 */
export const FREQUENT_OPERATION_MIN_COUNT = 3;

/**
 * Time window in days for detecting cash fragmentation
 */
export const CASH_FRAGMENTATION_WINDOW_DAYS = 30;

/**
 * Minimum number of cash payments to trigger fragmentation alert
 */
export const CASH_FRAGMENTATION_MIN_PAYMENTS = 2;

/**
 * Multiplier for "very high value" determination for new clients
 * An operation is considered very high value if it's >= UMA_THRESHOLD * this multiplier
 */
export const NEW_CLIENT_HIGH_VALUE_MULTIPLIER = 1.5;

/**
 * Seeker rule types - matches AlertRule.ruleType
 */
export const RULE_TYPES = {
	OPERATION_AMOUNT_UMA: "operation_amount_uma",
	AGGREGATE_AMOUNT_UMA: "aggregate_amount_uma",
	PAYER_BUYER_MISMATCH: "payer_buyer_mismatch",
	FREQUENT_OPERATIONS: "frequent_operations",
	THIRD_PARTY_ACCOUNTS: "third_party_accounts",
	CASH_PAYMENT_LIMIT: "cash_payment_limit",
	CASH_FRAGMENTATION: "cash_fragmentation",
	PEP_ABOVE_THRESHOLD: "pep_above_threshold",
	PEP_OR_HIGH_RISK: "pep_or_high_risk",
	NEW_CLIENT_HIGH_VALUE: "new_client_high_value",
} as const;

export type RuleType = (typeof RULE_TYPES)[keyof typeof RULE_TYPES];
