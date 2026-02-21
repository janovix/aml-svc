/**
 * Filter metadata computation utilities.
 *
 * Repositories call buildEnumFilterMeta / buildRangeFilterMeta after running
 * their own Prisma groupBy / aggregate queries to produce FilterMetaDef[]
 * ready for the API response.
 *
 * Design rationale: rather than a fully generic helper that fights with
 * Prisma's typed model delegates, each repository owns its query and calls
 * these lightweight formatters.  This keeps type safety while eliminating
 * duplicated formatting logic.
 */

import type { FilterMetaDef, FilterMetaOption } from "./list-result";

// ---------------------------------------------------------------------------
// Input shapes (what repositories pass in)
// ---------------------------------------------------------------------------

export interface EnumGroupResult {
	/** Enum / string value from the DB column */
	value: string | null;
	/** Row count for this value */
	count: number;
}

export interface RangeAggResult {
	/** ISO date string or numeric string – minimum in the current filtered set */
	min: string | null;
	/** ISO date string or numeric string – maximum in the current filtered set */
	max: string | null;
}

// ---------------------------------------------------------------------------
// Spec shapes (what callers declare about each filter)
// ---------------------------------------------------------------------------

export interface EnumFilterSpec {
	/** Matches the query param / FilterMetaDef id (e.g., "personType") */
	id: string;
	/** Human-readable label for the filter bar */
	label: string;
	/**
	 * Optional map from DB value → display label.
	 * If omitted, the raw value is used as-is.
	 */
	labelMap?: Record<string, string>;
}

export interface RangeFilterSpec {
	id: string;
	label: string;
	type: "date-range" | "number-range";
}

// ---------------------------------------------------------------------------
// Builders
// ---------------------------------------------------------------------------

/**
 * Formats groupBy query results into a FilterMetaDef for an enum-style filter.
 * Null values are excluded.  Options are sorted by descending count.
 */
export function buildEnumFilterMeta(
	spec: EnumFilterSpec,
	groups: EnumGroupResult[],
): FilterMetaDef {
	const options: FilterMetaOption[] = groups
		.filter((g): g is { value: string; count: number } => g.value !== null)
		.map((g) => ({
			value: g.value,
			label: spec.labelMap?.[g.value] ?? g.value,
			count: g.count,
		}))
		.sort((a, b) => b.count - a.count);

	return {
		id: spec.id,
		label: spec.label,
		type: "enum",
		options,
	};
}

/**
 * Formats aggregate query results into a FilterMetaDef for a date- or
 * number-range filter.  Null min/max are omitted (no value in the dataset).
 */
export function buildRangeFilterMeta(
	spec: RangeFilterSpec,
	range: RangeAggResult,
): FilterMetaDef {
	return {
		id: spec.id,
		label: spec.label,
		type: spec.type,
		...(range.min !== null && { min: range.min }),
		...(range.max !== null && { max: range.max }),
	};
}

// ---------------------------------------------------------------------------
// Prisma groupBy result helpers
// ---------------------------------------------------------------------------

/**
 * Converts the result of a Prisma groupBy query into the generic EnumGroupResult[]
 * shape expected by buildEnumFilterMeta.
 *
 * @param rows  Prisma groupBy result array
 * @param field Field name used in `by` (e.g., "personType")
 * @param countField  The field name inside `_count` (usually the same as field)
 */
export function fromPrismaGroupBy<
	T extends Record<string, unknown> & {
		_count: Record<string, number>;
	},
>(rows: T[], field: keyof T, countField: string): EnumGroupResult[] {
	return rows.map((row) => ({
		value: row[field] != null ? String(row[field]) : null,
		count: (row._count as Record<string, number>)[countField] ?? 0,
	}));
}
