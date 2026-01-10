import { z } from "zod";

export const ALERT_STATUS_VALUES = [
	"DETECTED",
	"FILE_GENERATED",
	"SUBMITTED",
	"OVERDUE",
	"CANCELLED",
] as const;
export const AlertStatusSchema = z.enum(ALERT_STATUS_VALUES);

export const ALERT_SEVERITY_VALUES = [
	"LOW",
	"MEDIUM",
	"HIGH",
	"CRITICAL",
] as const;
export const AlertSeveritySchema = z.enum(ALERT_SEVERITY_VALUES);

const RESOURCE_ID_REGEX = /^[A-Za-z0-9-_]+$/;
const ResourceIdSchema = z
	.string()
	.trim()
	.min(1, "Invalid ID format")
	.max(64, "Invalid ID format")
	.regex(RESOURCE_ID_REGEX, "Invalid ID format");

// ISO datetime helper for alert schemas
const isoString = z
	.string()
	.transform((value) => {
		// Handle partial datetime formats like "2025-09-19T14:06"
		if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) {
			return `${value}:00Z`;
		}
		// Handle date-only formats
		if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
			return `${value}T00:00:00Z`;
		}
		// Handle datetime without seconds: "2025-09-19T14:06:00"
		if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(value)) {
			return `${value}Z`;
		}
		return value;
	})
	.refine(
		(value) => {
			try {
				const date = new Date(value);
				return !isNaN(date.getTime()) && value.includes("T");
			} catch {
				return false;
			}
		},
		{ message: "Invalid ISO datetime" },
	)
	.transform((value) => {
		// Ensure it's a valid ISO string
		const date = new Date(value);
		return date.toISOString();
	});

// Alert Rule Schemas (global - no organizationId)
export const AlertRuleCreateSchema = z.object({
	id: ResourceIdSchema.optional(), // Alert code (e.g., "2501", "AUTO_UMA")
	name: z.string().min(1).max(200),
	description: z.string().max(1000).optional().nullable(),
	active: z.boolean().default(true),
	severity: AlertSeveritySchema.default("MEDIUM"),
	ruleType: z.string().max(100).optional().nullable(), // Matches seeker's ruleType
	isManualOnly: z.boolean().default(false),
	activityCode: z.string().min(1).max(10).default("VEH"), // VEH, JYS, INM, JOY, ART
	metadata: z.record(z.string(), z.any()).optional().nullable(),
});

export const AlertRuleUpdateSchema = z.object({
	name: z.string().min(1).max(200),
	description: z.string().max(1000).optional().nullable(),
	active: z.boolean(),
	severity: AlertSeveritySchema,
	ruleType: z.string().max(100).optional().nullable(),
	isManualOnly: z.boolean().default(false),
	activityCode: z.string().min(1).max(10).default("VEH"),
	metadata: z.record(z.string(), z.any()).optional().nullable(),
});

export const AlertRulePatchSchema = z
	.object({
		name: z.string().min(1).max(200).optional(),
		description: z.string().max(1000).optional().nullable(),
		active: z.boolean().optional(),
		severity: AlertSeveritySchema.optional(),
		ruleType: z.string().max(100).optional().nullable(),
		isManualOnly: z.boolean().optional(),
		activityCode: z.string().min(1).max(10).optional(),
		metadata: z.record(z.string(), z.any()).optional().nullable(),
	})
	.refine((data) => Object.keys(data).length > 0, {
		message: "Payload is empty",
	});

export const AlertRuleFilterSchema = z.object({
	search: z.string().min(2).max(100).optional(),
	active: z.coerce.boolean().optional(),
	severity: AlertSeveritySchema.optional(),
	activityCode: z.string().optional(),
	isManualOnly: z.coerce.boolean().optional(),
	page: z.coerce.number().int().min(1).default(1),
	limit: z.coerce.number().int().min(1).max(100).default(10),
});

export const AlertRuleIdParamSchema = z.object({
	id: ResourceIdSchema,
});

// Alert Rule Config Schemas
export const AlertRuleConfigCreateSchema = z.object({
	key: z.string().min(1).max(100),
	value: z.string().min(1), // JSON string
	isHardcoded: z.boolean().default(false),
	description: z.string().max(500).optional().nullable(),
});

export const AlertRuleConfigUpdateSchema = z.object({
	value: z.string().min(1).optional(),
	description: z.string().max(500).optional().nullable(),
});

export const AlertRuleConfigKeyParamSchema = z.object({
	id: ResourceIdSchema, // alertRuleId
	key: z.string().min(1).max(100),
});

// Alert Schemas (organization-specific)
export const AlertCreateSchema = z.object({
	alertRuleId: ResourceIdSchema,
	clientId: z.string().min(1),
	severity: AlertSeveritySchema,
	idempotencyKey: z.string().min(1).max(255),
	contextHash: z.string().min(1).max(255),
	metadata: z.record(z.string(), z.any()), // Renamed from alertData
	transactionId: ResourceIdSchema.optional().nullable(), // Renamed from triggerTransactionId
	isManual: z.boolean().default(false), // True if manually created
	submissionDeadline: isoString.optional().nullable(), // Will be calculated based on alert type
	notes: z.string().max(1000).optional().nullable(),
});

export const AlertUpdateSchema = z.object({
	status: AlertStatusSchema,
	notes: z.string().max(1000).optional().nullable(),
	reviewedBy: z.string().max(100).optional().nullable(),
	// SAT submission fields
	fileGeneratedAt: isoString.optional().nullable(),
	submittedAt: isoString.optional().nullable(),
	satAcknowledgmentReceipt: z.string().max(500).optional().nullable(),
	satFolioNumber: z.string().max(100).optional().nullable(),
	// Cancellation fields
	cancelledBy: z.string().max(100).optional().nullable(),
	cancellationReason: z.string().max(1000).optional().nullable(),
});

export const AlertPatchSchema = z
	.object({
		status: AlertStatusSchema.optional(),
		notes: z.string().max(1000).optional().nullable(),
		reviewedBy: z.string().max(100).optional().nullable(),
		// SAT submission fields
		fileGeneratedAt: isoString.optional().nullable(),
		submittedAt: isoString.optional().nullable(),
		satAcknowledgmentReceipt: z.string().max(500).optional().nullable(),
		satFolioNumber: z.string().max(100).optional().nullable(),
		// Cancellation fields
		cancelledBy: z.string().max(100).optional().nullable(),
		cancellationReason: z.string().max(1000).optional().nullable(),
	})
	.refine((data) => Object.keys(data).length > 0, {
		message: "Payload is empty",
	});

export const AlertFilterSchema = z.object({
	alertRuleId: ResourceIdSchema.optional(),
	clientId: z.string().min(1).optional(),
	status: AlertStatusSchema.optional(),
	severity: AlertSeveritySchema.optional(),
	isOverdue: z.coerce.boolean().optional(), // Filter by overdue status
	isManual: z.coerce.boolean().optional(), // Filter by manual flag
	page: z.coerce.number().int().min(1).default(1),
	limit: z.coerce.number().int().min(1).max(100).default(10),
});

export const AlertIdParamSchema = z.object({
	id: ResourceIdSchema,
});

// Cancel alert schema - requires a reason
export const AlertCancelSchema = z.object({
	reason: z.string().min(1, "Reason is required").max(1000),
});

export type AlertRuleCreateInput = z.infer<typeof AlertRuleCreateSchema>;
export type AlertRuleUpdateInput = z.infer<typeof AlertRuleUpdateSchema>;
export type AlertRulePatchInput = z.infer<typeof AlertRulePatchSchema>;
export type AlertRuleFilters = z.infer<typeof AlertRuleFilterSchema>;
export type AlertRuleConfigCreateInput = z.infer<
	typeof AlertRuleConfigCreateSchema
>;
export type AlertRuleConfigUpdateInput = z.infer<
	typeof AlertRuleConfigUpdateSchema
>;
export type AlertCreateInput = z.infer<typeof AlertCreateSchema>;
export type AlertUpdateInput = z.infer<typeof AlertUpdateSchema>;
export type AlertPatchInput = z.infer<typeof AlertPatchSchema>;
export type AlertFilters = z.infer<typeof AlertFilterSchema>;
export type AlertCancelInput = z.infer<typeof AlertCancelSchema>;
