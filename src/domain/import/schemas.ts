/**
 * Import Domain Schemas
 * Zod validation schemas for import operations
 */

import { z } from "zod";

// Import ID format: IMP + 9 base62 characters (12 characters total)
const IMPORT_ID_REGEX = /^IMP[A-Za-z0-9]{9}$/;
const IMPORT_ROW_ID_REGEX = /^IRR[A-Za-z0-9]{9}$/;

export const IMPORT_STATUS_VALUES = [
	"PENDING",
	"VALIDATING",
	"PROCESSING",
	"COMPLETED",
	"FAILED",
] as const;

export const IMPORT_ENTITY_TYPE_VALUES = ["CLIENT", "TRANSACTION"] as const;

export const IMPORT_ROW_STATUS_VALUES = [
	"PENDING",
	"SUCCESS",
	"WARNING",
	"ERROR",
	"SKIPPED",
] as const;

export const ImportStatusSchema = z.enum(IMPORT_STATUS_VALUES);
export const ImportEntityTypeSchema = z.enum(IMPORT_ENTITY_TYPE_VALUES);
export const ImportRowStatusSchema = z.enum(IMPORT_ROW_STATUS_VALUES);

export const ImportIdParamSchema = z.object({
	id: z
		.string()
		.regex(
			IMPORT_ID_REGEX,
			"Invalid Import ID format (expected: IMP + 9 characters)",
		),
});

export const ImportRowIdParamSchema = z.object({
	id: z
		.string()
		.regex(
			IMPORT_ID_REGEX,
			"Invalid Import ID format (expected: IMP + 9 characters)",
		),
	rowId: z
		.string()
		.regex(
			IMPORT_ROW_ID_REGEX,
			"Invalid Import Row ID format (expected: IRR + 9 characters)",
		),
});

export const ImportCreateSchema = z.object({
	entityType: ImportEntityTypeSchema,
	fileName: z.string().min(1).max(255),
	fileSize: z
		.number()
		.int()
		.positive()
		.max(50 * 1024 * 1024), // Max 50MB
});

export const ImportFilterSchema = z.object({
	status: ImportStatusSchema.optional(),
	entityType: ImportEntityTypeSchema.optional(),
	page: z.coerce.number().int().min(1).default(1),
	limit: z.coerce.number().int().min(1).max(100).default(10),
});

export const ImportRowFilterSchema = z.object({
	status: ImportRowStatusSchema.optional(),
	page: z.coerce.number().int().min(1).default(1),
	limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const ImportProgressUpdateSchema = z.object({
	rowNumber: z.number().int().positive(),
	status: ImportRowStatusSchema,
	entityId: z.string().optional(),
	message: z.string().optional(),
	errors: z.array(z.string()).optional(),
});

export const ImportStatusUpdateSchema = z.object({
	status: ImportStatusSchema,
	totalRows: z.number().int().nonnegative().optional(),
	processedRows: z.number().int().nonnegative().optional(),
	successCount: z.number().int().nonnegative().optional(),
	warningCount: z.number().int().nonnegative().optional(),
	errorCount: z.number().int().nonnegative().optional(),
	errorMessage: z.string().optional(),
});

export const ImportBulkRowCreateSchema = z.object({
	rows: z.array(
		z.object({
			rowNumber: z.number().int().positive(),
			rawData: z.string(),
		}),
	),
});

// Type exports
export type ImportStatus = z.infer<typeof ImportStatusSchema>;
export type ImportEntityType = z.infer<typeof ImportEntityTypeSchema>;
export type ImportRowStatus = z.infer<typeof ImportRowStatusSchema>;
export type ImportCreateInput = z.infer<typeof ImportCreateSchema>;
export type ImportFilters = z.infer<typeof ImportFilterSchema>;
export type ImportRowFilters = z.infer<typeof ImportRowFilterSchema>;
export type ImportProgressUpdateInput = z.infer<
	typeof ImportProgressUpdateSchema
>;
export type ImportStatusUpdateInput = z.infer<typeof ImportStatusUpdateSchema>;
export type ImportBulkRowCreateInput = z.infer<
	typeof ImportBulkRowCreateSchema
>;
