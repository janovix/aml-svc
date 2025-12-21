import { z } from "zod";

const RESOURCE_ID_REGEX = /^[A-Za-z0-9-]+$/;
const ResourceIdSchema = z
	.string()
	.trim()
	.min(1, "Invalid ID format")
	.max(64, "Invalid ID format")
	.regex(RESOURCE_ID_REGEX, "Invalid ID format");

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

// UMA Value Schemas
export const UmaValueCreateSchema = z.object({
	year: z.coerce.number().int().min(2000).max(2100),
	dailyValue: z.coerce.number().positive(),
	effectiveDate: isoString,
	endDate: isoString.optional().nullable(),
	approvedBy: z.string().max(100).optional().nullable(),
	notes: z.string().max(1000).optional().nullable(),
	active: z.boolean().default(false), // Usually false, will be activated manually
});

export const UmaValueUpdateSchema = UmaValueCreateSchema;

export const UmaValuePatchSchema = z
	.object({
		year: z.coerce.number().int().min(2000).max(2100).optional(),
		dailyValue: z.coerce.number().positive().optional(),
		effectiveDate: isoString.optional(),
		endDate: isoString.optional().nullable(),
		approvedBy: z.string().max(100).optional().nullable(),
		notes: z.string().max(1000).optional().nullable(),
		active: z.boolean().optional(),
	})
	.refine((data) => Object.keys(data).length > 0, {
		message: "Payload is empty",
	});

export const UmaValueFilterSchema = z.object({
	year: z.coerce.number().int().min(2000).max(2100).optional(),
	active: z.coerce.boolean().optional(),
	page: z.coerce.number().int().min(1).default(1),
	limit: z.coerce.number().int().min(1).max(100).default(10),
});

export const UmaValueIdParamSchema = z.object({
	id: ResourceIdSchema,
});

export const UmaValueYearParamSchema = z.object({
	year: z.coerce.number().int().min(2000).max(2100),
});

export type UmaValueCreateInput = z.infer<typeof UmaValueCreateSchema>;
export type UmaValueUpdateInput = z.infer<typeof UmaValueUpdateSchema>;
export type UmaValuePatchInput = z.infer<typeof UmaValuePatchSchema>;
export type UmaValueFilters = z.infer<typeof UmaValueFilterSchema>;
