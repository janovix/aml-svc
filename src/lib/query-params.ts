import { z } from "zod";

/**
 * Parses URLSearchParams into a plain object, collecting multiple values for
 * the same key into an array.  All keys that appear more than once, or that
 * are listed in `multiValueFields`, will be represented as `string[]`.
 *
 * This fixes the classic `Object.fromEntries(searchParams.entries())` footgun
 * where duplicate keys (e.g. `?status=A&status=B`) are silently collapsed to
 * the last value.
 *
 * Usage:
 * ```ts
 * const query = parseQueryParams(new URL(c.req.url).searchParams, ["status", "personType"]);
 * const filters = parseWithZod(MyFilterSchema, query);
 * ```
 */
export function parseQueryParams(
	searchParams: URLSearchParams,
	multiValueFields: string[] = [],
): Record<string, string | string[]> {
	const result: Record<string, string | string[]> = {};

	for (const key of new Set(searchParams.keys())) {
		const values = searchParams.getAll(key);
		if (multiValueFields.includes(key) || values.length > 1) {
			result[key] = values;
		} else {
			result[key] = values[0];
		}
	}

	return result;
}

/**
 * Zod helper that normalises a query-string enum field to always be an array.
 * Accepts either a single value or an already-parsed array.
 * Returns `undefined` when nothing is provided.
 *
 * Usage:
 * ```ts
 * const MyFilterSchema = z.object({
 *   status: multiEnum(z.enum(["ACTIVE", "INACTIVE"])),
 * });
 * ```
 */
export function multiEnum<T extends z.ZodTypeAny>(
	schema: T,
): z.ZodOptional<z.ZodEffects<z.ZodArray<T>>> {
	return z
		.preprocess((val) => {
			if (val == null) return undefined;
			return Array.isArray(val) ? val : [val];
		}, z.array(schema))
		.optional() as unknown as z.ZodOptional<z.ZodEffects<z.ZodArray<T>>>;
}
