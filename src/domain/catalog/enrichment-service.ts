import type { CatalogRepository } from "./repository";
import type {
	CatalogLookupMap,
	EnrichmentConfig,
	EnrichmentOptions,
} from "./enrichment";

/**
 * Service for enriching entities with catalog item data
 * Provides batch lookups for efficient database queries
 */
export class CatalogEnrichmentService {
	constructor(private readonly catalogRepository: CatalogRepository) {}

	/**
	 * Enriches an array of entities with catalog items based on the provided configuration
	 * @param entities - Array of entities to enrich
	 * @param config - Enrichment configuration mapping source fields to catalog lookups
	 * @param options - Optional enrichment options
	 * @returns Array of enriched entities with catalog items attached
	 */
	async enrichEntities<T extends Record<string, unknown>>(
		entities: T[],
		config: EnrichmentConfig,
		options: EnrichmentOptions = {},
	): Promise<T[]> {
		if (entities.length === 0) {
			return entities;
		}

		const { includeInactive = false } = options;

		// Collect all values that need to be looked up, grouped by lookup type
		const idLookups = new Map<
			string,
			{ ids: Set<string>; catalogs: string[] }
		>();
		const codeLookups = new Map<
			string,
			{ codes: Set<string>; catalogs: string[] }
		>();

		for (const [sourceField, fieldConfig] of Object.entries(config)) {
			const values = new Set<string>();
			for (const entity of entities) {
				const value = entity[sourceField];
				if (typeof value === "string" && value.length > 0) {
					values.add(value);
				}
			}

			if (values.size === 0) continue;

			if (fieldConfig.strategy === "BY_ID") {
				idLookups.set(fieldConfig.outputField, {
					ids: values,
					catalogs: fieldConfig.catalogs,
				});
			} else if (fieldConfig.strategy === "BY_CODE") {
				codeLookups.set(fieldConfig.outputField, {
					codes: values,
					catalogs: fieldConfig.catalogs,
				});
			}
		}

		// Perform batch lookups
		const lookupMaps = new Map<string, CatalogLookupMap>();

		// ID-based lookups
		for (const [outputField, { ids, catalogs }] of idLookups) {
			const map = await this.catalogRepository.findItemsByIds(
				Array.from(ids),
				catalogs,
				includeInactive,
			);
			lookupMaps.set(outputField, map);
		}

		// Code-based lookups
		for (const [outputField, { codes, catalogs }] of codeLookups) {
			let map: CatalogLookupMap;
			if (catalogs.length === 1) {
				map = await this.catalogRepository.findItemsByCodes(
					catalogs[0],
					Array.from(codes),
					includeInactive,
				);
			} else {
				map = await this.catalogRepository.findItemsByCodesMultipleCatalogs(
					catalogs,
					Array.from(codes),
					includeInactive,
				);
			}
			lookupMaps.set(outputField, map);
		}

		// Enrich entities
		return entities.map((entity) => {
			const enriched: Record<string, unknown> = { ...entity };

			for (const [sourceField, fieldConfig] of Object.entries(config)) {
				const value = entity[sourceField];
				const outputField = fieldConfig.outputField;
				const lookupMap = lookupMaps.get(outputField);

				if (typeof value === "string" && value.length > 0 && lookupMap) {
					enriched[outputField] = lookupMap.get(value) ?? null;
				} else {
					enriched[outputField] = null;
				}
			}

			return enriched as T;
		});
	}

	/**
	 * Enriches a single entity with catalog items
	 * @param entity - Entity to enrich
	 * @param config - Enrichment configuration
	 * @param options - Optional enrichment options
	 * @returns Enriched entity
	 */
	async enrichEntity<T extends Record<string, unknown>>(
		entity: T,
		config: EnrichmentConfig,
		options: EnrichmentOptions = {},
	): Promise<T> {
		const [enriched] = await this.enrichEntities([entity], config, options);
		return enriched;
	}

	/**
	 * Batch lookup catalog items by IDs
	 * @param ids - Array of catalog item IDs
	 * @param catalogKeys - Optional catalog keys to filter by
	 * @param includeInactive - Whether to include inactive items
	 * @returns Map of ID to catalog item
	 */
	async lookupByIds(
		ids: string[],
		catalogKeys?: string[],
		includeInactive = false,
	): Promise<CatalogLookupMap> {
		return this.catalogRepository.findItemsByIds(
			ids,
			catalogKeys,
			includeInactive,
		);
	}

	/**
	 * Batch lookup catalog items by codes
	 * @param catalogKey - The catalog key to search in
	 * @param codes - Array of codes to look up
	 * @param includeInactive - Whether to include inactive items
	 * @returns Map of code to catalog item
	 */
	async lookupByCodes(
		catalogKey: string,
		codes: string[],
		includeInactive = false,
	): Promise<CatalogLookupMap> {
		return this.catalogRepository.findItemsByCodes(
			catalogKey,
			codes,
			includeInactive,
		);
	}
}
