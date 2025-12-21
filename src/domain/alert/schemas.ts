import { z } from "zod";

export const ALERT_STATUS_VALUES = [
	"PENDING",
	"REVIEWED",
	"RESOLVED",
	"DISMISSED",
] as const;
export const AlertStatusSchema = z.enum(ALERT_STATUS_VALUES);

export const ALERT_SEVERITY_VALUES = [
	"LOW",
	"MEDIUM",
	"HIGH",
	"CRITICAL",
] as const;
export const AlertSeveritySchema = z.enum(ALERT_SEVERITY_VALUES);

const RESOURCE_ID_REGEX = /^[A-Za-z0-9-]+$/;
const ResourceIdSchema = z
	.string()
	.trim()
	.min(1, "Invalid ID format")
	.max(64, "Invalid ID format")
	.regex(RESOURCE_ID_REGEX, "Invalid ID format");

// Alert Rule Schemas
export const AlertRuleCreateSchema = z.object({
	name: z.string().min(1).max(200),
	description: z.string().max(1000).optional().nullable(),
	active: z.boolean().default(true),
	severity: AlertSeveritySchema.default("MEDIUM"),
	ruleConfig: z.record(z.string(), z.any()), // Dynamic JSON configuration
	metadata: z.record(z.string(), z.any()).optional().nullable(),
});

export const AlertRuleUpdateSchema = AlertRuleCreateSchema;

export const AlertRulePatchSchema = z
	.object({
		name: z.string().min(1).max(200).optional(),
		description: z.string().max(1000).optional().nullable(),
		active: z.boolean().optional(),
		severity: AlertSeveritySchema.optional(),
		ruleConfig: z.record(z.string(), z.any()).optional(),
		metadata: z.record(z.string(), z.any()).optional().nullable(),
	})
	.refine((data) => Object.keys(data).length > 0, {
		message: "Payload is empty",
	});

export const AlertRuleFilterSchema = z.object({
	search: z.string().min(2).max(100).optional(),
	active: z.coerce.boolean().optional(),
	severity: AlertSeveritySchema.optional(),
	page: z.coerce.number().int().min(1).default(1),
	limit: z.coerce.number().int().min(1).max(100).default(10),
});

export const AlertRuleIdParamSchema = z.object({
	id: ResourceIdSchema,
});

// Alert Schemas
export const AlertCreateSchema = z.object({
	alertRuleId: ResourceIdSchema,
	clientId: z.string().min(1),
	severity: AlertSeveritySchema,
	idempotencyKey: z.string().min(1).max(255),
	contextHash: z.string().min(1).max(255),
	alertData: z.record(z.string(), z.any()),
	triggerTransactionId: ResourceIdSchema.optional().nullable(),
	notes: z.string().max(1000).optional().nullable(),
});

export const AlertUpdateSchema = z.object({
	status: AlertStatusSchema,
	notes: z.string().max(1000).optional().nullable(),
	reviewedBy: z.string().max(100).optional().nullable(),
	resolvedBy: z.string().max(100).optional().nullable(),
});

export const AlertPatchSchema = z
	.object({
		status: AlertStatusSchema.optional(),
		notes: z.string().max(1000).optional().nullable(),
		reviewedBy: z.string().max(100).optional().nullable(),
		resolvedBy: z.string().max(100).optional().nullable(),
	})
	.refine((data) => Object.keys(data).length > 0, {
		message: "Payload is empty",
	});

export const AlertFilterSchema = z.object({
	alertRuleId: ResourceIdSchema.optional(),
	clientId: z.string().min(1).optional(),
	status: AlertStatusSchema.optional(),
	severity: AlertSeveritySchema.optional(),
	page: z.coerce.number().int().min(1).default(1),
	limit: z.coerce.number().int().min(1).max(100).default(10),
});

export const AlertIdParamSchema = z.object({
	id: ResourceIdSchema,
});

export type AlertRuleCreateInput = z.infer<typeof AlertRuleCreateSchema>;
export type AlertRuleUpdateInput = z.infer<typeof AlertRuleUpdateSchema>;
export type AlertRulePatchInput = z.infer<typeof AlertRulePatchSchema>;
export type AlertRuleFilters = z.infer<typeof AlertRuleFilterSchema>;
export type AlertCreateInput = z.infer<typeof AlertCreateSchema>;
export type AlertUpdateInput = z.infer<typeof AlertUpdateSchema>;
export type AlertPatchInput = z.infer<typeof AlertPatchSchema>;
export type AlertFilters = z.infer<typeof AlertFilterSchema>;
