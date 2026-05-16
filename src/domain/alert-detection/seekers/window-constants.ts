/**
 * Time windows and multipliers for alert seekers (LFPIORPI-aligned).
 */

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
 * Multiplier for "very high value" for new clients vs activity notice threshold (MXN).
 */
export const NEW_CLIENT_HIGH_VALUE_MULTIPLIER = 1.5;

/**
 * Floor (UMA) for new-client high-value when notice threshold is ALWAYS (no numeric notice).
 */
export const NEW_CLIENT_HIGH_VALUE_ALWAYS_NOTICE_FLOOR_UMA = 1500;

/**
 * Seeker rule types - matches AlertRule.ruleType (subset; see UniversalAlertRuleType for full set).
 */
export const RULE_TYPES = {
	OPERATION_AMOUNT_UMA: "operation_amount_uma",
	AGGREGATE_AMOUNT_UMA: "aggregate_amount_uma",
	PAYER_BUYER_MISMATCH: "payer_buyer_mismatch",
	FREQUENT_OPERATIONS: "frequent_operations",
	THIRD_PARTY_ACCOUNTS: "third_party_accounts",
	CASH_PAYMENT_LIMIT: "cash_payment_limit",
	CASH_LIMIT_ART32: "cash_limit_art32",
	CASH_FRAGMENTATION: "cash_fragmentation",
	PEP_ABOVE_THRESHOLD: "pep_above_threshold",
	PEP_OR_HIGH_RISK: "pep_or_high_risk",
	NEW_CLIENT_HIGH_VALUE: "new_client_high_value",
} as const;

export type RuleType = (typeof RULE_TYPES)[keyof typeof RULE_TYPES];
