import { z } from "zod";

const booleanFromQuery = z.preprocess((value) => {
	if (typeof value === "string") {
		const normalized = value.trim().toLowerCase();
		if (["true", "1", "yes"].includes(normalized)) {
			return true;
		}
		if (["false", "0", "no"].includes(normalized)) {
			return false;
		}
	}
	return value;
}, z.boolean());

export const CatalogKeySchema = z
	.string()
	.trim()
	.min(3, "catalogKey must have at least 3 characters")
	.max(64, "catalogKey must have at most 64 characters")
	.regex(
		/^[a-z0-9-]+$/i,
		"catalogKey must be alphanumeric and may include dashes",
	);

export const CatalogKeyParamSchema = z.object({
	catalogKey: CatalogKeySchema,
});

export const CatalogItemIdParamSchema = z.object({
	catalogKey: CatalogKeySchema,
	itemId: z.string().trim().min(1, "itemId is required"),
});

/**
 * Preprocessor for optional search strings that treats empty/whitespace-only
 * strings as undefined, allowing catalog selectors to load initial data without
 * triggering validation errors.
 */
const optionalSearchString = z.preprocess((val) => {
	if (typeof val === "string") {
		const trimmed = val.trim();
		return trimmed === "" ? undefined : trimmed;
	}
	return val;
}, z.string().min(2, "search must be at least 2 characters long").max(100, "search must be at most 100 characters long").optional());

export const CatalogListQuerySchema = z.object({
	search: optionalSearchString,
	page: z.coerce.number().int().min(1).default(1),
	pageSize: z.coerce.number().int().min(1).max(100).default(10),
	active: booleanFromQuery.optional(),
});

export const CatalogItemCreateSchema = z.object({
	name: z
		.string()
		.trim()
		.min(1, "name is required")
		.max(200, "name must be at most 200 characters long"),
});

export type CatalogListQueryInput = z.infer<typeof CatalogListQuerySchema>;
export type CatalogKeyInput = z.infer<typeof CatalogKeySchema>;
export type CatalogItemCreateInput = z.infer<typeof CatalogItemCreateSchema>;
