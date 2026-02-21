/**
 * Shared list result types used across all domain repositories.
 * All list endpoints return ListResultWithMeta<T> which includes server-driven
 * filter metadata so the UI can render dynamic filter options with counts.
 */

export interface Pagination {
	page: number;
	limit: number;
	total: number;
	totalPages: number;
}

export interface ListResult<T> {
	data: T[];
	pagination: Pagination;
}

// ---------------------------------------------------------------------------
// Filter metadata – describes available filter options for a given dataset
// ---------------------------------------------------------------------------

export type FilterType = "enum" | "date-range" | "number-range";

export interface FilterMetaOption {
	/** Raw value that maps to the query param (e.g., "physical") */
	value: string;
	/** Human-readable label (e.g., "Persona Física") */
	label: string;
	/** Number of records matching this option under current active filters */
	count: number;
}

export interface FilterMetaDef {
	/** Matches the query param key (e.g., "personType", "stateCode") */
	id: string;
	/** Human-readable label shown in the filter bar */
	label: string;
	type: FilterType;
	/** For "enum" filters: available options with counts */
	options?: FilterMetaOption[];
	/** For "date-range" / "number-range": current dataset minimum as ISO string or numeric string */
	min?: string;
	/** For "date-range" / "number-range": current dataset maximum as ISO string or numeric string */
	max?: string;
}

export interface ListResultWithMeta<T> {
	data: T[];
	pagination: Pagination;
	/** Server-driven filter metadata. Empty array when the endpoint doesn't compute it. */
	filterMeta: FilterMetaDef[];
}

/**
 * Backwards-compatible list result where filterMeta is optional.
 * Used in contexts where the filter engine is not yet wired up
 * (e.g., row-level list endpoints or legacy callers).
 */
export interface ListResultMaybeWithMeta<T> extends ListResult<T> {
	filterMeta?: FilterMetaDef[];
}
