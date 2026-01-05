import { z } from "zod";

export const REPORT_TYPE_VALUES = [
	"MONTHLY",
	"QUARTERLY",
	"ANNUAL",
	"CUSTOM",
] as const;
export const ReportTypeSchema = z.enum(REPORT_TYPE_VALUES);

export const REPORT_STATUS_VALUES = [
	"DRAFT",
	"GENERATED",
	"SUBMITTED",
	"ACKNOWLEDGED",
] as const;
export const ReportStatusSchema = z.enum(REPORT_STATUS_VALUES);

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

// Report Create Schema
export const ReportCreateSchema = z
	.object({
		name: z.string().min(1).max(200),
		type: ReportTypeSchema.default("MONTHLY"),
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

export type ReportCreateInput = z.infer<typeof ReportCreateSchema>;

// Report Update Schema (full update)
export const ReportUpdateSchema = z.object({
	name: z.string().min(1).max(200),
	status: ReportStatusSchema,
	notes: z.string().max(1000).optional().nullable(),
});

export type ReportUpdateInput = z.infer<typeof ReportUpdateSchema>;

// Report Patch Schema (partial update)
export const ReportPatchSchema = z.object({
	name: z.string().min(1).max(200).optional(),
	status: ReportStatusSchema.optional(),
	notes: z.string().max(1000).optional().nullable(),
	satFolioNumber: z.string().max(100).optional().nullable(),
	submittedAt: isoString.optional().nullable(),
});

export type ReportPatchInput = z.infer<typeof ReportPatchSchema>;

// Report ID Param Schema
export const ReportIdParamSchema = z.object({
	id: ResourceIdSchema,
});

// Report Filter Schema
export const ReportFilterSchema = z.object({
	page: z.coerce.number().int().min(1).default(1),
	limit: z.coerce.number().int().min(1).max(100).default(20),
	type: ReportTypeSchema.optional(),
	status: ReportStatusSchema.optional(),
	periodStart: isoString.optional(),
	periodEnd: isoString.optional(),
});

export type ReportFilterInput = z.infer<typeof ReportFilterSchema>;

// Preview Schema - for checking alerts before creating report
export const ReportPreviewSchema = z.object({
	type: ReportTypeSchema,
	periodStart: isoString,
	periodEnd: isoString,
});

export type ReportPreviewInput = z.infer<typeof ReportPreviewSchema>;
