/**
 * Alert Seeker Types and Interfaces
 *
 * This file defines the base types and interfaces for the alert seeker system.
 * Alert seekers are responsible for detecting specific types of suspicious activities
 * based on client and transaction data.
 */

import type {
	AlertMetadata,
	AlertRuleEntity,
	Client,
	Operation,
	UmaValueEntity,
} from "../types";

/**
 * Supported vulnerable activity codes (all 19 LFPIORPI activities)
 */
export type VulnerableActivityCode =
	| "VEH"
	| "INM"
	| "MJR"
	| "AVI"
	| "JYS"
	| "ARI"
	| "BLI"
	| "DON"
	| "MPC"
	| "FEP"
	| "FES"
	| "SPR"
	| "CHV"
	| "TSC"
	| "TPP"
	| "TDR"
	| "TCV"
	| "OBA"
	| "DIN";

/**
 * Alert rule types for VEH (Vehículos) vulnerable activity (legacy)
 */
export type VehAlertRuleType =
	| "operation_amount_uma"
	| "aggregate_amount_uma"
	| "cash_payment_limit"
	| "cash_fragmentation"
	| "payer_buyer_mismatch"
	| "pep_above_threshold"
	| "pep_or_high_risk"
	| "frequent_operations"
	| "new_client_high_value"
	| "third_party_accounts";

/**
 * Universal alert rule types (pattern-based, all activities)
 */
export type UniversalAlertRuleType =
	| "operation_amount_uma"
	| "aggregate_amount_uma"
	| "frequent_operations"
	| "foreign_transfer_payment"
	| "foreign_currency_cash"
	| "virtual_currency_payment"
	| "cash_high_value"
	| "third_party_payer"
	| "quick_refund_pattern"
	| "minor_client"
	| "multiple_cards_requests"
	| "address_changes"
	| "split_payment"
	| "quick_fund_movement"
	| "profile_mismatch"
	| "structuring_detection"
	| "shared_address_analysis"
	| "price_anomaly"
	| "pep_screening"
	| "sanctions_screening"
	| "adverse_media";

/**
 * Union of all alert rule types across activities
 */
export type AlertRuleType = VehAlertRuleType | UniversalAlertRuleType;

/**
 * Severity levels for alerts
 */
export type AlertSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

/**
 * Extended client interface with additional fields for alert evaluation
 */
export interface AlertClient extends Client {
	/** Whether the client is a Politically Exposed Person */
	isPep?: boolean;
	/** Client risk level */
	riskLevel?: "LOW" | "MEDIUM" | "HIGH";
	/** Date when the client was first created */
	createdAt?: string;
	/** Client's full name (for persons) or business name */
	name?: string;
	/** Client's nationality code */
	nationality?: string;
	/** Client's economic activity code */
	economicActivityCode?: string;
}

/**
 * Extended operation interface with payment method details
 */
export interface AlertOperation extends Operation {
	/** Operation date in ISO format */
	operationDate?: string;
	/** Payment methods used in this operation */
	paymentMethods?: OperationPaymentMethod[];
	/** Payer information (if different from buyer) */
	payerId?: string;
	payerName?: string;
	/** UMA value calculated for this operation */
	umaValue?: number;
	/** Vehicle-specific fields */
	vehicleType?: "LAND" | "MARINE" | "AIR";
	brandId?: string;
	model?: string;
	year?: number;
}

/**
 * Payment method details for an operation
 */
export interface OperationPaymentMethod {
	id: string;
	method: string;
	amount: number;
	/** Account holder information */
	accountHolderId?: string;
	accountHolderName?: string;
	/** Bank account details */
	bankName?: string;
	accountNumber?: string;
}

/**
 * Context provided to alert seekers for evaluation
 */
export interface AlertContext {
	/** The client being evaluated */
	client: AlertClient;
	/** All operations for the client */
	operations: AlertOperation[];
	/** The specific operation that triggered the evaluation (if any) */
	triggerOperation?: AlertOperation;
	/** Active UMA value for threshold calculations */
	umaValue: UmaValueEntity | null;
	/** Alert rules that apply to this activity */
	alertRules: AlertRuleEntity[];
	/** The vulnerable activity code */
	activityCode: VulnerableActivityCode;
	/** Timestamp of the evaluation */
	evaluationTimestamp: string;
}

/**
 * Result of a seeker evaluation
 */
export interface SeekerEvaluationResult {
	/** Whether the alert condition was triggered */
	triggered: boolean;
	/** The alert rule that was matched (if triggered) */
	matchedRule?: AlertRuleEntity;
	/** Alert metadata to be stored */
	alertMetadata: AlertMetadata;
	/** Operations that matched the alert condition */
	matchedOperations: AlertOperation[];
	/** Additional metadata about the evaluation */
	metadata?: SeekerMetadata;
}

/**
 * Metadata about the seeker evaluation
 */
export interface SeekerMetadata {
	/** Seeker that performed the evaluation */
	seekerType: AlertRuleType;
	/** Activity code */
	activityCode: VulnerableActivityCode;
	/** Evaluation duration in milliseconds */
	evaluationDurationMs?: number;
	/** Additional context-specific data */
	[key: string]: unknown;
}

/**
 * Configuration for alert thresholds and parameters
 */
export interface AlertThresholdConfig {
	/** UMA threshold for aviso obligatorio (default: 6420) */
	umaThreshold?: number;
	/** Maximum cash payment amount allowed */
	maxCashAmount?: number;
	/** Minimum operation amount for high-value alerts */
	minHighValueAmount?: number;
	/** Time window for aggregation in days */
	aggregationWindowDays?: number;
	/** Minimum number of operations for frequent operation alerts */
	minFrequentOperationCount?: number;
	/** Time window for frequent operations in days */
	frequentOperationWindowDays?: number;
	/** Time window for cash fragmentation detection in days */
	cashFragmentationWindowDays?: number;
}

/**
 * Base interface that all alert seekers must implement
 */
export interface AlertSeeker {
	/** The vulnerable activity code this seeker applies to */
	readonly activityCode: VulnerableActivityCode;

	/** The specific rule type this seeker evaluates */
	readonly ruleType: AlertRuleType;

	/** Human-readable name of the seeker */
	readonly name: string;

	/** Description of what this seeker detects */
	readonly description: string;

	/** Default severity for alerts generated by this seeker */
	readonly defaultSeverity: AlertSeverity;

	/**
	 * Evaluates the context and returns an evaluation result
	 * @param context The alert context containing client and operation data
	 * @returns The evaluation result, or null if the seeker cannot evaluate
	 */
	evaluate(context: AlertContext): Promise<SeekerEvaluationResult | null>;

	/**
	 * Generates an idempotency key for deduplication
	 * @param context The alert context
	 * @param result The evaluation result
	 * @returns A unique key for this specific alert instance
	 */
	generateIdempotencyKey(
		context: AlertContext,
		result: SeekerEvaluationResult,
	): Promise<string>;
}

/**
 * Abstract base class for alert seekers with common functionality
 */
export abstract class BaseAlertSeeker implements AlertSeeker {
	abstract readonly activityCode: VulnerableActivityCode;
	abstract readonly ruleType: AlertRuleType;
	abstract readonly name: string;
	abstract readonly description: string;
	abstract readonly defaultSeverity: AlertSeverity;

	abstract evaluate(
		context: AlertContext,
	): Promise<SeekerEvaluationResult | null>;

	/**
	 * Default implementation generates key from client ID, rule type, and operation IDs
	 */
	async generateIdempotencyKey(
		context: AlertContext,
		result: SeekerEvaluationResult,
	): Promise<string> {
		const components = [
			context.client.id,
			this.ruleType,
			...result.matchedOperations.map((op) => op.id).sort(),
		];
		const data = components.join(":");
		return this.hashString(data);
	}

	/**
	 * Calculates the UMA threshold amount
	 * @param umaValue The UMA value entity
	 * @param umaMultiplier The UMA multiplier (default: 6420)
	 * @returns The calculated threshold in MXN
	 */
	protected calculateUmaThreshold(
		umaValue: UmaValueEntity | null,
		umaMultiplier: number = 6420,
	): number {
		if (!umaValue) {
			// Fallback to a reasonable default (2025 UMA value)
			return umaMultiplier * 113.14;
		}
		return umaMultiplier * umaValue.dailyValue;
	}

	/**
	 * Filters operations within a time window
	 * @param operations All operations
	 * @param windowDays Number of days to look back
	 * @param referenceDate Optional reference date (defaults to now)
	 * @returns Operations within the window
	 */
	protected filterOperationsInWindow(
		operations: AlertOperation[],
		windowDays: number,
		referenceDate: Date = new Date(),
	): AlertOperation[] {
		const windowStart = new Date(referenceDate);
		windowStart.setDate(windowStart.getDate() - windowDays);

		return operations.filter((op) => {
			const opDate = new Date(op.operationDate || op.createdAt);
			return opDate >= windowStart && opDate <= referenceDate;
		});
	}

	/**
	 * Sums the amounts of operations
	 * @param operations Operations to sum
	 * @param currency Optional currency filter
	 * @returns Total amount
	 */
	protected sumOperationAmounts(
		operations: AlertOperation[],
		currency?: string,
	): number {
		return operations
			.filter((op) => !currency || op.currency === currency)
			.reduce((sum, op) => sum + op.amount, 0);
	}

	/**
	 * Filters cash payments from operations
	 * @param operations Operations to filter
	 * @returns Cash payment amounts
	 */
	protected getCashPayments(
		operations: AlertOperation[],
	): { operation: AlertOperation; amount: number }[] {
		const cashPayments: { operation: AlertOperation; amount: number }[] = [];

		for (const op of operations) {
			if (op.paymentMethods) {
				for (const pm of op.paymentMethods) {
					// Cash payment methods typically have method codes like "CASH", "EFECTIVO", or "1"
					if (
						pm.method === "CASH" ||
						pm.method === "EFECTIVO" ||
						pm.method === "1"
					) {
						cashPayments.push({ operation: op, amount: pm.amount });
					}
				}
			}
		}

		return cashPayments;
	}

	/**
	 * Creates a base alert metadata object
	 */
	protected createBaseAlertMetadata(
		operations: AlertOperation[],
		totalAmount: number,
		currency: string = "MXN",
	): AlertMetadata {
		return {
			operationIds: operations.map((op) => op.id),
			totalAmount,
			currency,
			triggeredAt: new Date().toISOString(),
		};
	}

	/**
	 * Hash a string using SHA-256
	 */
	protected async hashString(data: string): Promise<string> {
		const encoder = new TextEncoder();
		const dataBuffer = encoder.encode(data);
		const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer);
		const hashArray = Array.from(new Uint8Array(hashBuffer));
		return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
	}

	/**
	 * Finds the matching alert rule for this seeker by ruleType
	 */
	protected findMatchingRule(
		alertRules: AlertRuleEntity[],
	): AlertRuleEntity | undefined {
		return alertRules.find(
			(rule) =>
				rule.ruleType === this.ruleType && rule.active && !rule.isManualOnly,
		);
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// Universal Alert Seeker (pattern-based, works across all VAs)
// ─────────────────────────────────────────────────────────────────────────────

import {
	ACTIVITY_THRESHOLDS,
	DEFAULT_UMA_DAILY_VALUE,
} from "../config/activity-thresholds";
import { getAlertCode, type PatternType } from "../config/alert-patterns";

/**
 * Abstract base class for universal (pattern-based) alert seekers.
 *
 * Unlike legacy `BaseAlertSeeker` which is tied to a single activity code,
 * a `UniversalAlertSeeker` works across ALL applicable activities.
 * The `activityCode` is resolved at evaluation time from the context.
 */
export abstract class UniversalAlertSeeker extends BaseAlertSeeker {
	/** The pattern type this seeker implements */
	abstract readonly patternType: PatternType;

	/**
	 * For universal seekers, activityCode is dynamic.
	 * We set a default here but the actual code comes from context.
	 */
	readonly activityCode: VulnerableActivityCode = "VEH";

	// ── Activity-aware helpers ──────────────────────────────────────────

	/** Returns the alert code for a given activity, or null if not applicable */
	getAlertCodeForActivity(activityCode: string): string | null {
		return getAlertCode(this.patternType, activityCode);
	}

	/** Whether this pattern applies to the given activity */
	appliesTo(activityCode: string): boolean {
		return this.getAlertCodeForActivity(activityCode) !== null;
	}

	/** Get the LFPIORPI notice threshold in UMA for a given activity */
	getNoticeThresholdUma(activityCode: string): number | "ALWAYS" {
		const threshold = ACTIVITY_THRESHOLDS[activityCode];
		return threshold?.noticeThresholdUma ?? 6420; // fallback
	}

	/** Get the notice threshold in MXN for a given activity */
	getActivityNoticeThresholdMxn(
		activityCode: string,
		umaDailyValue: number,
	): number {
		const umaThreshold = this.getNoticeThresholdUma(activityCode);
		if (umaThreshold === "ALWAYS") return 0;
		return umaThreshold * umaDailyValue;
	}

	/** Calculate UMA threshold using the activity-specific value */
	protected calculateActivityUmaThreshold(
		activityCode: string,
		umaValue: UmaValueEntity | null,
	): number {
		const umaThreshold = this.getNoticeThresholdUma(activityCode);
		const dailyValue = umaValue?.dailyValue ?? DEFAULT_UMA_DAILY_VALUE;
		if (umaThreshold === "ALWAYS") return 0;
		return umaThreshold * dailyValue;
	}

	/**
	 * Override idempotency key to include the dynamic activity code
	 */
	async generateIdempotencyKey(
		context: AlertContext,
		result: SeekerEvaluationResult,
	): Promise<string> {
		const operationIds = result.matchedOperations
			.map((op) => op.id)
			.sort()
			.join(",");
		const data = `${context.activityCode}:${context.client.id}:${this.patternType}:${operationIds}`;
		return this.hashString(data);
	}
}

/**
 * Registry interface for managing seekers
 */
export interface SeekerRegistry {
	/**
	 * Registers a seeker
	 * @param seeker The seeker to register
	 */
	register(seeker: AlertSeeker): void;

	/**
	 * Gets all seekers for a specific activity
	 * @param activityCode The activity code
	 * @returns Array of seekers for the activity
	 */
	getSeekersForActivity(activityCode: VulnerableActivityCode): AlertSeeker[];

	/**
	 * Gets a specific seeker by activity and rule type
	 * @param activityCode The activity code
	 * @param ruleType The rule type
	 * @returns The seeker, or undefined if not found
	 */
	getSeeker(
		activityCode: VulnerableActivityCode,
		ruleType: AlertRuleType,
	): AlertSeeker | undefined;

	/**
	 * Gets all registered seekers
	 * @returns Array of all seekers
	 */
	getAllSeekers(): AlertSeeker[];
}

/**
 * Result of running all seekers for an activity
 */
export interface SeekerRunResult {
	/** Activity code that was evaluated */
	activityCode: VulnerableActivityCode;
	/** Client ID that was evaluated */
	clientId: string;
	/** Number of seekers that were run */
	seekersRun: number;
	/** Number of alerts that were triggered */
	alertsTriggered: number;
	/** Individual seeker results */
	results: SeekerEvaluationResult[];
	/** Any errors that occurred during evaluation */
	errors: SeekerError[];
	/** Total evaluation time in milliseconds */
	totalDurationMs: number;
}

/**
 * Error that occurred during seeker evaluation
 */
export interface SeekerError {
	/** Seeker that failed */
	seekerType: AlertRuleType;
	/** Error message */
	message: string;
	/** Error stack trace */
	stack?: string;
}
