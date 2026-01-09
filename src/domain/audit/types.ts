/**
 * Audit Trail Entity Types
 *
 * Defines types for the tamper-evident cryptographic audit log system.
 */

/**
 * Audit actions that can be logged
 */
export type AuditAction =
	| "CREATE"
	| "UPDATE"
	| "DELETE"
	| "READ"
	| "EXPORT"
	| "VERIFY"
	| "LOGIN"
	| "LOGOUT"
	| "SUBMIT"
	| "GENERATE";

/**
 * Actor types for identifying who performed the action
 */
export type AuditActorType = "USER" | "SYSTEM" | "API" | "SERVICE_BINDING";

/**
 * Entity types that can be audited
 * Should match the domain entities in the system
 */
export type AuditEntityType =
	| "CLIENT"
	| "CLIENT_DOCUMENT"
	| "CLIENT_ADDRESS"
	| "TRANSACTION"
	| "TRANSACTION_PAYMENT_METHOD"
	| "ALERT"
	| "ALERT_RULE"
	| "ALERT_RULE_CONFIG"
	| "NOTICE"
	| "REPORT"
	| "UMA_VALUE"
	| "ORGANIZATION_SETTINGS"
	| "CATALOG"
	| "CATALOG_ITEM"
	| "AUDIT_LOG"; // For audit log operations like VERIFY

/**
 * Core audit log entity
 */
export interface AuditLogEntity {
	id: string;
	organizationId: string;

	// What changed
	entityType: string;
	entityId: string;
	action: AuditAction;

	// Who/when
	actorId: string | null;
	actorType: AuditActorType;
	timestamp: string; // ISO datetime

	// Change data
	oldData: string | null; // JSON string
	newData: string | null; // JSON string

	// Cryptographic chain
	sequenceNumber: number;
	dataHash: string;
	previousSignature: string | null;
	signature: string;

	// Context
	ipAddress: string | null;
	userAgent: string | null;
	metadata: string | null; // JSON string

	createdAt: string; // ISO datetime
}

/**
 * Parsed audit log entity with JSON fields deserialized
 */
export interface AuditLogEntityParsed
	extends Omit<AuditLogEntity, "oldData" | "newData" | "metadata"> {
	oldData: Record<string, unknown> | null;
	newData: Record<string, unknown> | null;
	metadata: Record<string, unknown> | null;
}

/**
 * Input for creating a new audit log entry
 */
export interface AuditLogCreateInput {
	organizationId: string;
	entityType: string;
	entityId: string;
	action: AuditAction;
	actorId?: string | null;
	actorType: AuditActorType;
	oldData?: Record<string, unknown> | null;
	newData?: Record<string, unknown> | null;
	ipAddress?: string | null;
	userAgent?: string | null;
	metadata?: Record<string, unknown> | null;
}

/**
 * Pagination result
 */
export interface Pagination {
	page: number;
	limit: number;
	total: number;
	totalPages: number;
}

/**
 * List result with pagination
 */
export interface ListResult<T> {
	data: T[];
	pagination: Pagination;
}

/**
 * Chain verification result
 */
export interface ChainVerificationResult {
	valid: boolean;
	organizationId: string;
	entriesVerified: number;
	verifiedAt: string;
	firstInvalidEntry?: {
		id: string;
		sequenceNumber: number;
		error: "DATA_HASH_MISMATCH" | "SIGNATURE_MISMATCH" | "CHAIN_BREAK";
	};
}

/**
 * Audit log statistics
 */
export interface AuditLogStats {
	totalEntries: number;
	firstEntry: string | null; // ISO datetime
	lastEntry: string | null; // ISO datetime
	entriesByAction: Record<string, number>;
	entriesByEntityType: Record<string, number>;
	entriesByActorType: Record<string, number>;
}

/**
 * Export format options
 */
export type AuditExportFormat = "json" | "csv";
