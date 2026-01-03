import { describe, expect, it, vi, beforeEach } from "vitest";
import { CatalogQueryService } from "./service";
import type { CatalogRepository } from "./repository";
import type { CatalogEntity, CatalogItemEntity } from "./types";

function createMockRepository(): CatalogRepository {
	return {
		findByKey: vi.fn(),
		listItems: vi.fn(),
		findItemByNormalizedName: vi.fn(),
		createItem: vi.fn(),
		findItemById: vi.fn(),
		findItemsByIds: vi.fn(),
		findItemsByCodes: vi.fn(),
		findItemsByCodesMultipleCatalogs: vi.fn(),
	} as unknown as CatalogRepository;
}

describe("CatalogQueryService", () => {
	let mockRepository: CatalogRepository;
	let service: CatalogQueryService;

	beforeEach(() => {
		mockRepository = createMockRepository();
		service = new CatalogQueryService(mockRepository);
	});

	describe("getItemById", () => {
		const mockCatalog: CatalogEntity = {
			id: "catalog-1",
			key: "test-catalog",
			name: "Test Catalog",
			active: true,
			allowNewItems: false,
			createdAt: "2024-01-01T00:00:00Z",
			updatedAt: "2024-01-01T00:00:00Z",
		};

		const mockItem: CatalogItemEntity = {
			id: "item-1",
			catalogId: "catalog-1",
			name: "Test Item",
			normalizedName: "test item",
			active: true,
			metadata: null,
			createdAt: "2024-01-01T00:00:00Z",
			updatedAt: "2024-01-01T00:00:00Z",
		};

		it("returns catalog item when found", async () => {
			vi.mocked(mockRepository.findByKey).mockResolvedValue(mockCatalog);
			vi.mocked(mockRepository.findItemById).mockResolvedValue(mockItem);

			const result = await service.getItemById("test-catalog", "item-1");

			expect(result).toEqual(mockItem);
			expect(mockRepository.findByKey).toHaveBeenCalledWith("test-catalog");
			expect(mockRepository.findItemById).toHaveBeenCalledWith(
				"catalog-1",
				"item-1",
				false,
			);
		});

		it("throws CATALOG_NOT_FOUND when catalog does not exist", async () => {
			vi.mocked(mockRepository.findByKey).mockResolvedValue(null);

			await expect(
				service.getItemById("nonexistent-catalog", "item-1"),
			).rejects.toThrow("CATALOG_NOT_FOUND");

			expect(mockRepository.findItemById).not.toHaveBeenCalled();
		});

		it("throws CATALOG_NOT_FOUND when catalog is inactive", async () => {
			const inactiveCatalog: CatalogEntity = {
				...mockCatalog,
				active: false,
			};
			vi.mocked(mockRepository.findByKey).mockResolvedValue(inactiveCatalog);

			await expect(
				service.getItemById("test-catalog", "item-1"),
			).rejects.toThrow("CATALOG_NOT_FOUND");

			expect(mockRepository.findItemById).not.toHaveBeenCalled();
		});

		it("throws CATALOG_ITEM_NOT_FOUND when item does not exist", async () => {
			vi.mocked(mockRepository.findByKey).mockResolvedValue(mockCatalog);
			vi.mocked(mockRepository.findItemById).mockResolvedValue(null);

			await expect(
				service.getItemById("test-catalog", "nonexistent-item"),
			).rejects.toThrow("CATALOG_ITEM_NOT_FOUND");

			expect(mockRepository.findByKey).toHaveBeenCalledWith("test-catalog");
			expect(mockRepository.findItemById).toHaveBeenCalledWith(
				"catalog-1",
				"nonexistent-item",
				false,
			);
		});

		it("includes inactive items when includeInactive is true", async () => {
			const inactiveItem: CatalogItemEntity = {
				...mockItem,
				active: false,
			};
			vi.mocked(mockRepository.findByKey).mockResolvedValue(mockCatalog);
			vi.mocked(mockRepository.findItemById).mockResolvedValue(inactiveItem);

			const result = await service.getItemById("test-catalog", "item-1", true);

			expect(result).toEqual(inactiveItem);
			expect(mockRepository.findItemById).toHaveBeenCalledWith(
				"catalog-1",
				"item-1",
				true,
			);
		});
	});
});
