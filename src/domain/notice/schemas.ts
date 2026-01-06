import { z } from "zod";

export const NOTICE_STATUS_VALUES = [
	"DRAFT",
	"GENERATED",
	"SUBMITTED",
	"ACKNOWLEDGED",
] as const;
export const NoticeStatusSchema = z.enum(NOTICE_STATUS_VALUES);

const RESOURCE_ID_REGEX = /^[A-Za-z0-9-_]+$/;
const ResourceIdSchema = z
	.string()
	.trim()
	.min(1, "Invalid ID format")
	.max(64, "Invalid ID format")
	.regex(RESOURCE_ID_REGEX, "Invalid ID format");

// ISO datetime helper
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
		const date = new Date(value);
		return date.toISOString();
	});

// Notice Create Schema - uses year/month to calculate 17-17 period
export const NoticeCreateSchema = z.object({
	name: z.string().min(1).max(200),
	year: z.coerce.number().int().min(2020).max(2100),
	month: z.coerce.number().int().min(1).max(12),
	notes: z.string().max(1000).optional().nullable(),
});

export type NoticeCreateInput = z.infer<typeof NoticeCreateSchema>;

// Notice Create with Period Schema - for direct period specification
export const NoticeCreateWithPeriodSchema = z
	.object({
		name: z.string().min(1).max(200),
		periodStart: isoString,
		periodEnd: isoString,
		reportedMonth: z
			.string()
			.regex(/^\d{4}(0[1-9]|1[0-2])$/, "Must be YYYYMM format"),
		notes: z.string().max(1000).optional().nullable(),
	})
	.refine(
		(data) => {
			const start = new Date(data.periodStart);
			const end = new Date(data.periodEnd);
			return start < end;
		},
		{ message: "periodStart must be before periodEnd" },
	);

export type NoticeCreateWithPeriodInput = z.infer<
	typeof NoticeCreateWithPeriodSchema
>;

// Notice Patch Schema (partial update)
export const NoticePatchSchema = z.object({
	name: z.string().min(1).max(200).optional(),
	notes: z.string().max(1000).optional().nullable(),
	satFolioNumber: z.string().max(100).optional().nullable(),
});

export type NoticePatchInput = z.infer<typeof NoticePatchSchema>;

// Notice ID Param Schema
export const NoticeIdParamSchema = z.object({
	id: ResourceIdSchema,
});

// Notice Filter Schema
export const NoticeFilterSchema = z.object({
	page: z.coerce.number().int().min(1).default(1),
	limit: z.coerce.number().int().min(1).max(100).default(20),
	status: NoticeStatusSchema.optional(),
	periodStart: isoString.optional(),
	periodEnd: isoString.optional(),
	year: z.coerce.number().int().min(2020).max(2100).optional(),
});

export type NoticeFilterInput = z.infer<typeof NoticeFilterSchema>;

// Preview Schema - for checking alerts before creating notice
export const NoticePreviewSchema = z.object({
	year: z.coerce.number().int().min(2020).max(2100),
	month: z.coerce.number().int().min(1).max(12),
});

export type NoticePreviewInput = z.infer<typeof NoticePreviewSchema>;

// Submit Schema - for marking notice as submitted to SAT
export const NoticeSubmitSchema = z.object({
	satFolioNumber: z.string().max(100).optional(),
});

export type NoticeSubmitInput = z.infer<typeof NoticeSubmitSchema>;

// Acknowledge Schema - for recording SAT acknowledgment
export const NoticeAcknowledgeSchema = z.object({
	satFolioNumber: z.string().min(1).max(100),
});

export type NoticeAcknowledgeInput = z.infer<typeof NoticeAcknowledgeSchema>;
