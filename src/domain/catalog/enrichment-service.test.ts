import { describe, expect, it, vi, beforeEach } from "vitest";
import { CatalogEnrichmentService } from "./enrichment-service";
import type { CatalogRepository } from "./repository";
import type { EnrichmentConfig, EnrichedCatalogItem } from "./enrichment";

// Helper type for enriched entities in tests
type Enriched<T, K extends string> = T & {
	[P in K]?: EnrichedCatalogItem | null;
};

// Mock catalog items for testing
const mockBrandItem: EnrichedCatalogItem = {
	id: "brand-toyota-id",
	catalogId: "catalog-terrestrial-brands",
	name: "Toyota",
	normalizedName: "toyota",
	active: true,
	metadata: { originCountry: "JP" },
	catalogKey: "terrestrial-vehicle-brands",
	createdAt: "2024-01-01T00:00:00Z",
	updatedAt: "2024-01-01T00:00:00Z",
};

const mockCountryItem: EnrichedCatalogItem = {
	id: "country-mx-id",
	catalogId: "catalog-countries",
	name: "México",
	normalizedName: "mexico",
	active: true,
	metadata: { code: "MX" },
	catalogKey: "countries",
	createdAt: "2024-01-01T00:00:00Z",
	updatedAt: "2024-01-01T00:00:00Z",
};

const mockCurrencyItem: EnrichedCatalogItem = {
	id: "currency-mxn-id",
	catalogId: "catalog-currencies",
	name: "Peso Mexicano",
	normalizedName: "peso mexicano",
	active: true,
	metadata: { code: "3" },
	catalogKey: "currencies",
	createdAt: "2024-01-01T00:00:00Z",
	updatedAt: "2024-01-01T00:00:00Z",
};

// Create a mock CatalogRepository
function createMockRepository(): CatalogRepository {
	return {
		findByKey: vi.fn(),
		listItems: vi.fn(),
		findItemByNormalizedName: vi.fn(),
		createItem: vi.fn(),
		findItemById: vi.fn(),
		findItemsByIds: vi.fn().mockResolvedValue(new Map()),
		findItemsByCodes: vi.fn().mockResolvedValue(new Map()),
		findItemsByCodesMultipleCatalogs: vi.fn().mockResolvedValue(new Map()),
	} as unknown as CatalogRepository;
}

describe("CatalogEnrichmentService", () => {
	let mockRepository: CatalogRepository;
	let service: CatalogEnrichmentService;

	beforeEach(() => {
		mockRepository = createMockRepository();
		service = new CatalogEnrichmentService(mockRepository);
	});

	describe("enrichEntities", () => {
		it("returns empty array when given empty array", async () => {
			const result = await service.enrichEntities([], {});
			expect(result).toEqual([]);
			expect(mockRepository.findItemsByIds).not.toHaveBeenCalled();
		});

		it("enriches entities with BY_ID strategy", async () => {
			const entities = [
				{ id: "tx-1", brand: "brand-toyota-id", model: "Corolla" },
				{ id: "tx-2", brand: "brand-honda-id", model: "Civic" },
			];

			const config: EnrichmentConfig = {
				brand: {
					strategy: "BY_ID",
					catalogs: ["terrestrial-vehicle-brands"],
					outputField: "brandCatalog",
				},
			};

			const brandMap = new Map<string, EnrichedCatalogItem>([
				["brand-toyota-id", mockBrandItem],
			]);

			vi.mocked(mockRepository.findItemsByIds).mockResolvedValue(brandMap);

			const result = await service.enrichEntities(entities, config);

			expect(result).toHaveLength(2);
			expect(
				(result[0] as Enriched<(typeof result)[0], "brandCatalog">)
					.brandCatalog,
			).toEqual(mockBrandItem);
			expect(
				(result[1] as Enriched<(typeof result)[1], "brandCatalog">)
					.brandCatalog,
			).toBeNull(); // honda not found
			expect(mockRepository.findItemsByIds).toHaveBeenCalledWith(
				expect.arrayContaining(["brand-toyota-id", "brand-honda-id"]),
				["terrestrial-vehicle-brands"],
				false,
			);
		});

		it("enriches entities with BY_CODE strategy (single catalog)", async () => {
			const entities = [
				{ id: "tx-1", currencyCode: "3", amount: "1000" },
				{ id: "tx-2", currencyCode: "2", amount: "2000" },
			];

			const config: EnrichmentConfig = {
				currencyCode: {
					strategy: "BY_CODE",
					catalogs: ["currencies"],
					outputField: "currencyCatalog",
				},
			};

			const currencyMap = new Map<string, EnrichedCatalogItem>([
				["3", mockCurrencyItem],
			]);

			vi.mocked(mockRepository.findItemsByCodes).mockResolvedValue(currencyMap);

			const result = await service.enrichEntities(entities, config);

			expect(result).toHaveLength(2);
			expect(
				(result[0] as Enriched<(typeof result)[0], "currencyCatalog">)
					.currencyCatalog,
			).toEqual(mockCurrencyItem);
			expect(
				(result[1] as Enriched<(typeof result)[1], "currencyCatalog">)
					.currencyCatalog,
			).toBeNull(); // code "2" not found
			expect(mockRepository.findItemsByCodes).toHaveBeenCalledWith(
				"currencies",
				expect.arrayContaining(["3", "2"]),
				false,
			);
		});

		it("enriches entities with BY_CODE strategy (multiple catalogs)", async () => {
			const entities = [{ id: "tx-1", operationTypeCode: "802" }];

			const config: EnrichmentConfig = {
				operationTypeCode: {
					strategy: "BY_CODE",
					catalogs: ["veh-operation-types", "other-types"],
					outputField: "operationTypeCatalog",
				},
			};

			vi.mocked(
				mockRepository.findItemsByCodesMultipleCatalogs,
			).mockResolvedValue(new Map());

			await service.enrichEntities(entities, config);

			expect(
				mockRepository.findItemsByCodesMultipleCatalogs,
			).toHaveBeenCalledWith(
				["veh-operation-types", "other-types"],
				["802"],
				false,
			);
		});

		it("handles multiple enrichment fields in one call", async () => {
			const entities = [
				{
					id: "tx-1",
					brand: "brand-toyota-id",
					flagCountryId: "country-mx-id",
				},
			];

			const config: EnrichmentConfig = {
				brand: {
					strategy: "BY_ID",
					catalogs: ["terrestrial-vehicle-brands"],
					outputField: "brandCatalog",
				},
				flagCountryId: {
					strategy: "BY_ID",
					catalogs: ["countries"],
					outputField: "flagCountryCatalog",
				},
			};

			const brandMap = new Map<string, EnrichedCatalogItem>([
				["brand-toyota-id", mockBrandItem],
			]);
			const countryMap = new Map<string, EnrichedCatalogItem>([
				["country-mx-id", mockCountryItem],
			]);

			// The service makes separate calls for different output fields
			vi.mocked(mockRepository.findItemsByIds)
				.mockResolvedValueOnce(brandMap)
				.mockResolvedValueOnce(countryMap);

			const result = await service.enrichEntities(entities, config);

			expect(
				(
					result[0] as Enriched<
						(typeof result)[0],
						"brandCatalog" | "flagCountryCatalog"
					>
				).brandCatalog,
			).toEqual(mockBrandItem);
			expect(
				(
					result[0] as Enriched<
						(typeof result)[0],
						"brandCatalog" | "flagCountryCatalog"
					>
				).flagCountryCatalog,
			).toEqual(mockCountryItem);
		});

		it("skips fields with empty string values", async () => {
			const entities = [{ id: "tx-1", brand: "", model: "Corolla" }];

			const config: EnrichmentConfig = {
				brand: {
					strategy: "BY_ID",
					catalogs: ["terrestrial-vehicle-brands"],
					outputField: "brandCatalog",
				},
			};

			const result = await service.enrichEntities(entities, config);

			expect(
				(result[0] as Enriched<(typeof result)[0], "brandCatalog">)
					.brandCatalog,
			).toBeNull();
			// findItemsByIds should not be called since there are no valid IDs
			expect(mockRepository.findItemsByIds).not.toHaveBeenCalled();
		});

		it("preserves original entity properties", async () => {
			const entities = [
				{
					id: "tx-1",
					brand: "brand-toyota-id",
					model: "Corolla",
					year: 2024,
					custom: { nested: true },
				},
			];

			const config: EnrichmentConfig = {
				brand: {
					strategy: "BY_ID",
					catalogs: ["terrestrial-vehicle-brands"],
					outputField: "brandCatalog",
				},
			};

			const brandMap = new Map<string, EnrichedCatalogItem>([
				["brand-toyota-id", mockBrandItem],
			]);
			vi.mocked(mockRepository.findItemsByIds).mockResolvedValue(brandMap);

			const result = await service.enrichEntities(entities, config);

			expect(result[0].id).toBe("tx-1");
			expect(result[0].model).toBe("Corolla");
			expect(result[0].year).toBe(2024);
			expect(result[0].custom).toEqual({ nested: true });
			expect(
				(result[0] as Enriched<(typeof result)[0], "brandCatalog">)
					.brandCatalog,
			).toEqual(mockBrandItem);
		});

		it("passes includeInactive option to repository", async () => {
			const entities = [{ id: "tx-1", brand: "brand-id" }];
			const config: EnrichmentConfig = {
				brand: {
					strategy: "BY_ID",
					catalogs: ["brands"],
					outputField: "brandCatalog",
				},
			};

			await service.enrichEntities(entities, config, { includeInactive: true });

			expect(mockRepository.findItemsByIds).toHaveBeenCalledWith(
				["brand-id"],
				["brands"],
				true,
			);
		});
	});

	describe("enrichEntity", () => {
		it("enriches a single entity", async () => {
			const entity = { id: "tx-1", brand: "brand-toyota-id" };
			const config: EnrichmentConfig = {
				brand: {
					strategy: "BY_ID",
					catalogs: ["terrestrial-vehicle-brands"],
					outputField: "brandCatalog",
				},
			};

			const brandMap = new Map<string, EnrichedCatalogItem>([
				["brand-toyota-id", mockBrandItem],
			]);
			vi.mocked(mockRepository.findItemsByIds).mockResolvedValue(brandMap);

			const result = await service.enrichEntity(entity, config);

			expect(
				(result as Enriched<typeof result, "brandCatalog">).brandCatalog,
			).toEqual(mockBrandItem);
		});
	});

	describe("lookupByIds", () => {
		it("delegates to repository.findItemsByIds", async () => {
			const brandMap = new Map<string, EnrichedCatalogItem>([
				["id-1", mockBrandItem],
			]);
			vi.mocked(mockRepository.findItemsByIds).mockResolvedValue(brandMap);

			const result = await service.lookupByIds(["id-1"], ["catalogs"]);

			expect(result).toBe(brandMap);
			expect(mockRepository.findItemsByIds).toHaveBeenCalledWith(
				["id-1"],
				["catalogs"],
				false,
			);
		});
	});

	describe("lookupByCodes", () => {
		it("delegates to repository.findItemsByCodes", async () => {
			const currencyMap = new Map<string, EnrichedCatalogItem>([
				["3", mockCurrencyItem],
			]);
			vi.mocked(mockRepository.findItemsByCodes).mockResolvedValue(currencyMap);

			const result = await service.lookupByCodes("currencies", ["3"]);

			expect(result).toBe(currencyMap);
			expect(mockRepository.findItemsByCodes).toHaveBeenCalledWith(
				"currencies",
				["3"],
				false,
			);
		});
	});
});
