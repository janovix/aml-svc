import type { EnrichmentConfig } from "../catalog/enrichment";

/**
 * Enrichment configuration for Transaction entities
 * Maps transaction fields to their corresponding catalog lookups
 */
export const TRANSACTION_ENRICHMENT_CONFIG: EnrichmentConfig = {
	// Brand ID -> Vehicle brand catalog items (across all vehicle types)
	brand: {
		strategy: "BY_ID",
		catalogs: [
			"terrestrial-vehicle-brands",
			"maritime-vehicle-brands",
			"air-vehicle-brands",
		],
		outputField: "brandCatalog",
	},
	// Flag country ID -> Countries catalog
	flagCountryId: {
		strategy: "BY_ID",
		catalogs: ["countries"],
		outputField: "flagCountryCatalog",
	},
	// Operation type code -> Operation types catalog (lookup by metadata.code)
	operationTypeCode: {
		strategy: "BY_CODE",
		catalogs: ["veh-operation-types"],
		outputField: "operationTypeCatalog",
	},
	// Currency code -> Currencies catalog (lookup by metadata.code)
	currencyCode: {
		strategy: "BY_CODE",
		catalogs: ["currencies"],
		outputField: "currencyCatalog",
	},
};

/**
 * Output field names for transaction enrichment
 */
export const TRANSACTION_ENRICHMENT_FIELDS = {
	brandCatalog: "brandCatalog",
	flagCountryCatalog: "flagCountryCatalog",
	operationTypeCatalog: "operationTypeCatalog",
	currencyCatalog: "currencyCatalog",
} as const;

export type TransactionEnrichmentField =
	(typeof TRANSACTION_ENRICHMENT_FIELDS)[keyof typeof TRANSACTION_ENRICHMENT_FIELDS];
