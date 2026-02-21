import type { CatalogRepository } from "./repository";

/**
 * Strategy for resolving catalog names
 */
export type ResolutionStrategy = "BY_ID" | "BY_CODE";

/**
 * Configuration for a single catalog field
 */
export interface CatalogFieldConfig {
	/** The catalog key to search in */
	catalog: string;
	/** The lookup strategy to use */
	strategy: ResolutionStrategy;
}

/**
 * Configuration mapping field names to their catalog configs
 * Key is the field name (e.g., 'brand', 'armorLevelCode')
 */
export type CatalogFieldsConfig = Record<string, CatalogFieldConfig>;

/**
 * Result of name resolution
 * Maps field names to their resolved display names
 */
export type ResolvedNames = Record<string, string>;

/**
 * Service for resolving catalog item names at write time
 */
export class CatalogNameResolver {
	constructor(private readonly catalogRepo: CatalogRepository) {}

	/**
	 * Resolve catalog names for a set of fields
	 * @param data - The data object containing field values
	 * @param config - Configuration mapping field names to catalog configs
	 * @returns A map of field names to resolved display names
	 */
	async resolveNames(
		data: Record<string, unknown>,
		config: CatalogFieldsConfig,
	): Promise<ResolvedNames> {
		const resolved: ResolvedNames = {};

		// Group fields by strategy for efficient batch lookups
		const byIdFields: Array<{ field: string; value: string; catalog: string }> =
			[];
		const byCodeFields: Array<{
			field: string;
			value: string;
			catalog: string;
		}> = [];

		for (const [fieldName, fieldConfig] of Object.entries(config)) {
			const value = data[fieldName];

			// Skip null, undefined, or empty values
			if (
				value === null ||
				value === undefined ||
				value === "" ||
				(typeof value === "string" && value.trim() === "")
			) {
				continue;
			}

			const stringValue = String(value);

			if (fieldConfig.strategy === "BY_ID") {
				byIdFields.push({
					field: fieldName,
					value: stringValue,
					catalog: fieldConfig.catalog,
				});
			} else if (fieldConfig.strategy === "BY_CODE") {
				byCodeFields.push({
					field: fieldName,
					value: stringValue,
					catalog: fieldConfig.catalog,
				});
			}
		}

		// Batch lookup by ID
		if (byIdFields.length > 0) {
			const ids = byIdFields.map((f) => f.value);
			const catalogKeys = [...new Set(byIdFields.map((f) => f.catalog))];
			const itemsMap = await this.catalogRepo.findItemsByIds(ids, catalogKeys);

			for (const { field, value } of byIdFields) {
				const item = itemsMap.get(value);
				if (item) {
					resolved[field] = item.name;
				}
			}
		}

		// Batch lookup by code (grouped by catalog)
		if (byCodeFields.length > 0) {
			const catalogGroups = new Map<
				string,
				Array<{ field: string; value: string }>
			>();

			for (const { field, value, catalog } of byCodeFields) {
				if (!catalogGroups.has(catalog)) {
					catalogGroups.set(catalog, []);
				}
				catalogGroups.get(catalog)!.push({ field, value });
			}

			for (const [catalogKey, fields] of catalogGroups) {
				const codes = fields.map((f) => f.value);
				const itemsMap = await this.catalogRepo.findItemsByCodes(
					catalogKey,
					codes,
				);

				for (const { field, value } of fields) {
					const item = itemsMap.get(value);
					if (item) {
						resolved[field] = item.name;
					}
				}
			}
		}

		return resolved;
	}

	/**
	 * Resolve a single field name
	 * @param value - The field value (ID or code)
	 * @param config - The catalog field configuration
	 * @returns The resolved display name, or null if not found
	 */
	async resolveSingleName(
		value: string | null | undefined,
		config: CatalogFieldConfig,
	): Promise<string | null> {
		if (
			value === null ||
			value === undefined ||
			value === "" ||
			value.trim() === ""
		) {
			return null;
		}

		if (config.strategy === "BY_ID") {
			const itemsMap = await this.catalogRepo.findItemsByIds(
				[value],
				[config.catalog],
			);
			const item = itemsMap.get(value);
			return item ? item.name : null;
		} else if (config.strategy === "BY_CODE") {
			const itemsMap = await this.catalogRepo.findItemsByCodes(config.catalog, [
				value,
			]);
			const item = itemsMap.get(value);
			return item ? item.name : null;
		}

		return null;
	}
}
