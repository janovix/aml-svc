import type { CatalogItemEntity } from "./types";

/**
 * Lookup strategy for catalog enrichment
 */
export type EnrichmentLookupStrategy = "BY_ID" | "BY_CODE";

/**
 * Configuration for a single field enrichment
 */
export interface FieldEnrichmentConfig {
	/** The lookup strategy to use */
	strategy: EnrichmentLookupStrategy;
	/** The catalog key(s) to search in - can be single or multiple for BY_ID lookups */
	catalogs: string[];
	/** The output field name where the enriched catalog item will be placed */
	outputField: string;
}

/**
 * Configuration mapping source fields to their enrichment configs
 * Key is the source field name (e.g., 'brandId'), value is the enrichment config
 */
export type EnrichmentConfig = Record<string, FieldEnrichmentConfig>;

/**
 * Extended catalog item with catalog key for context
 */
export interface EnrichedCatalogItem extends CatalogItemEntity {
	/** The catalog key this item belongs to */
	catalogKey: string;
}

/**
 * Result of batch lookup operations
 * Maps source values (IDs or codes) to their catalog items
 */
export type CatalogLookupMap = Map<string, EnrichedCatalogItem>;

/**
 * Options for enrichment operations
 */
export interface EnrichmentOptions {
	/** Whether to skip enrichment for missing values (default: true) */
	skipMissing?: boolean;
	/** Whether to include inactive catalog items (default: false) */
	includeInactive?: boolean;
}

/**
 * Result of an enrichment operation on a single entity
 */
export type EnrichedEntity<T, K extends string> = T & {
	[P in K]?: EnrichedCatalogItem | null;
};
