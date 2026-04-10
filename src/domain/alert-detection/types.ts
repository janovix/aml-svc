/**
 * Types for the alert detection subsystem.
 *
 * Re-exports shared types from the alert domain and defines
 * alert-detection-specific types that were previously in the
 * standalone aml-alert-worker.
 */

export type {
	AlertRuleEntity,
	AlertRuleConfigEntity,
	AlertEntity,
	AlertSeverity,
} from "../alert/types";

export type AlertJobType =
	| "client.created"
	| "client.updated"
	| "operation.created";

export interface AlertJob {
	type: AlertJobType;
	clientId: string;
	organizationId: string;
	operationId?: string;
	timestamp: string;
}

export interface UmaValueEntity {
	id: string;
	dailyValue: number;
	active: boolean;
	effectiveDate: string;
	createdAt: string;
	updatedAt: string;
}

export interface Client {
	id: string;
	rfc?: string;
	personType?: "PHYSICAL" | "MORAL";
	[key: string]: unknown;
}

export interface Operation {
	id: string;
	clientId: string;
	amount: number;
	currency: string;
	operationType?: string;
	createdAt: string;
	[key: string]: unknown;
}

export interface AlertMetadata {
	operationIds: string[];
	totalAmount: number;
	currency: string;
	triggeredAt: string;
	[key: string]: unknown;
}

export interface EvaluationResult {
	triggered: boolean;
	data: AlertMetadata;
	matchedOperations?: Operation[];
}

export type AlertData = AlertMetadata;

export interface CreateAlertRequest {
	alertRuleId: string;
	clientId: string;
	severity: string;
	idempotencyKey: string;
	contextHash: string;
	metadata: AlertMetadata;
	operationId?: string | null;
	isManual?: boolean;
	notes?: string | null;
}

export type SeekerRuleType =
	| "operation_amount_uma"
	| "aggregate_amount_uma"
	| "payer_buyer_mismatch"
	| "frequent_operations"
	| "third_party_accounts"
	| "cash_payment_limit"
	| "cash_fragmentation"
	| "pep_above_threshold"
	| "pep_or_high_risk"
	| "new_client_high_value";

/**
 * @deprecated Use hardcoded seekers instead
 */
export interface RuleConfig {
	type: RuleType;
	threshold?: number;
	currency?: string;
	timeWindow?: string;
	operationType?: string;
	conditions?: RuleCondition[];
	logic?: "AND" | "OR";
}

/**
 * @deprecated Use hardcoded seekers instead
 */
export type RuleType =
	| "operation_amount"
	| "operation_count"
	| "aggregate_amount"
	| "custom";

/**
 * @deprecated Use hardcoded seekers instead
 */
export interface RuleCondition {
	field: string;
	operator: "equals" | "greaterThan" | "lessThan" | "sum" | "count";
	value?: unknown;
	threshold?: number;
}
