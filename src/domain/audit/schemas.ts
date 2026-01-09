/**
 * Audit Trail Zod Schemas
 *
 * Validation schemas for audit log API operations.
 */

import { z } from "zod";

/**
 * Audit action enum
 */
export const AuditActionSchema = z.enum([
	"CREATE",
	"UPDATE",
	"DELETE",
	"READ",
	"EXPORT",
	"VERIFY",
	"LOGIN",
	"LOGOUT",
	"SUBMIT",
	"GENERATE",
]);

/**
 * Actor type enum
 */
export const AuditActorTypeSchema = z.enum([
	"USER",
	"SYSTEM",
	"API",
	"SERVICE_BINDING",
]);

/**
 * Entity type enum (all auditable entities)
 */
export const AuditEntityTypeSchema = z.enum([
	"CLIENT",
	"CLIENT_DOCUMENT",
	"CLIENT_ADDRESS",
	"TRANSACTION",
	"TRANSACTION_PAYMENT_METHOD",
	"ALERT",
	"ALERT_RULE",
	"ALERT_RULE_CONFIG",
	"NOTICE",
	"REPORT",
	"UMA_VALUE",
	"ORGANIZATION_SETTINGS",
	"CATALOG",
	"CATALOG_ITEM",
	"AUDIT_LOG",
]);

/**
 * Audit log entity schema (response)
 */
export const AuditLogEntitySchema = z.object({
	id: z.string(),
	organizationId: z.string(),
	entityType: z.string(),
	entityId: z.string(),
	action: AuditActionSchema,
	actorId: z.string().nullable(),
	actorType: AuditActorTypeSchema,
	timestamp: z.string(),
	oldData: z.string().nullable(),
	newData: z.string().nullable(),
	sequenceNumber: z.number().int(),
	dataHash: z.string(),
	previousSignature: z.string().nullable(),
	signature: z.string(),
	ipAddress: z.string().nullable(),
	userAgent: z.string().nullable(),
	metadata: z.string().nullable(),
	createdAt: z.string(),
});

/**
 * Parsed audit log entity schema (with JSON fields deserialized)
 */
export const AuditLogEntityParsedSchema = z.object({
	id: z.string(),
	organizationId: z.string(),
	entityType: z.string(),
	entityId: z.string(),
	action: AuditActionSchema,
	actorId: z.string().nullable(),
	actorType: AuditActorTypeSchema,
	timestamp: z.string(),
	oldData: z.record(z.unknown()).nullable(),
	newData: z.record(z.unknown()).nullable(),
	sequenceNumber: z.number().int(),
	dataHash: z.string(),
	previousSignature: z.string().nullable(),
	signature: z.string(),
	ipAddress: z.string().nullable(),
	userAgent: z.string().nullable(),
	metadata: z.record(z.unknown()).nullable(),
	createdAt: z.string(),
});

/**
 * Filters for listing audit logs
 */
export const AuditLogFiltersSchema = z.object({
	page: z.coerce.number().int().min(1).default(1),
	limit: z.coerce.number().int().min(1).max(100).default(20),
	entityType: AuditEntityTypeSchema.optional(),
	entityId: z.string().optional(),
	action: AuditActionSchema.optional(),
	actorId: z.string().optional(),
	actorType: AuditActorTypeSchema.optional(),
	startDate: z
		.string()
		.regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD format")
		.optional(),
	endDate: z
		.string()
		.regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD format")
		.optional(),
});

export type AuditLogFilters = z.infer<typeof AuditLogFiltersSchema>;

/**
 * Chain verification request schema
 */
export const ChainVerifyRequestSchema = z.object({
	startSequence: z.number().int().min(1).optional(),
	endSequence: z.number().int().min(1).optional(),
	limit: z.number().int().min(1).max(10000).default(1000),
});

export type ChainVerifyRequest = z.infer<typeof ChainVerifyRequestSchema>;

/**
 * Chain verification result schema
 */
export const ChainVerificationResultSchema = z.object({
	valid: z.boolean(),
	organizationId: z.string(),
	entriesVerified: z.number().int(),
	verifiedAt: z.string(),
	firstInvalidEntry: z
		.object({
			id: z.string(),
			sequenceNumber: z.number().int(),
			error: z.enum([
				"DATA_HASH_MISMATCH",
				"SIGNATURE_MISMATCH",
				"CHAIN_BREAK",
			]),
		})
		.optional(),
});

/**
 * Audit log stats schema
 */
export const AuditLogStatsSchema = z.object({
	totalEntries: z.number().int(),
	firstEntry: z.string().nullable(),
	lastEntry: z.string().nullable(),
	entriesByAction: z.record(z.number().int()),
	entriesByEntityType: z.record(z.number().int()),
	entriesByActorType: z.record(z.number().int()),
});

/**
 * Export request schema
 */
export const AuditExportRequestSchema = z.object({
	format: z.enum(["json", "csv"]).default("json"),
	startDate: z
		.string()
		.regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD format")
		.optional(),
	endDate: z
		.string()
		.regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD format")
		.optional(),
	entityType: AuditEntityTypeSchema.optional(),
	limit: z.coerce.number().int().min(1).max(50000).default(10000),
});

export type AuditExportRequest = z.infer<typeof AuditExportRequestSchema>;

/**
 * Pagination schema
 */
export const PaginationSchema = z.object({
	page: z.number().int(),
	limit: z.number().int(),
	total: z.number().int(),
	totalPages: z.number().int(),
});

/**
 * List response schema
 */
export const AuditLogListResponseSchema = z.object({
	data: z.array(AuditLogEntityParsedSchema),
	pagination: PaginationSchema,
});

/**
 * Entity history request schema
 */
export const EntityHistoryRequestSchema = z.object({
	page: z.coerce.number().int().min(1).default(1),
	limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type EntityHistoryRequest = z.infer<typeof EntityHistoryRequestSchema>;
