import { describe, expect, it, vi, beforeEach } from "vitest";
import { CatalogRepository } from "./repository";
import type { PrismaClient } from "@prisma/client";

// Mock Prisma client
function createMockPrisma(): PrismaClient {
	return {
		catalog: {
			findUnique: vi.fn(),
			findMany: vi.fn(),
		},
		catalogItem: {
			findMany: vi.fn(),
			findFirst: vi.fn(),
			create: vi.fn(),
			count: vi.fn(),
		},
	} as unknown as PrismaClient;
}

describe("CatalogRepository", () => {
	let mockPrisma: PrismaClient;
	let repository: CatalogRepository;

	beforeEach(() => {
		mockPrisma = createMockPrisma();
		repository = new CatalogRepository(mockPrisma);
	});

	describe("findItemsByIds", () => {
		it("returns empty map when given empty array", async () => {
			const result = await repository.findItemsByIds([]);
			expect(result.size).toBe(0);
			expect(mockPrisma.catalogItem.findMany).not.toHaveBeenCalled();
		});

		it("removes duplicate IDs before querying", async () => {
			vi.mocked(mockPrisma.catalogItem.findMany).mockResolvedValue([]);

			await repository.findItemsByIds(["id-1", "id-1", "id-2", "id-2"]);

			expect(mockPrisma.catalogItem.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: expect.objectContaining({
						id: { in: ["id-1", "id-2"] },
					}),
				}),
			);
		});

		it("returns map of ID to enriched catalog item", async () => {
			const mockItems = [
				{
					id: "item-1",
					catalogId: "catalog-1",
					name: "Toyota",
					normalizedName: "toyota",
					active: true,
					metadata: '{"originCountry": "JP"}',
					createdAt: new Date("2024-01-01"),
					updatedAt: new Date("2024-01-01"),
					catalog: { key: "terrestrial-vehicle-brands" },
				},
				{
					id: "item-2",
					catalogId: "catalog-1",
					name: "Honda",
					normalizedName: "honda",
					active: true,
					metadata: null,
					createdAt: new Date("2024-01-01"),
					updatedAt: new Date("2024-01-01"),
					catalog: { key: "terrestrial-vehicle-brands" },
				},
			];

			vi.mocked(mockPrisma.catalogItem.findMany).mockResolvedValue(
				mockItems as never,
			);

			const result = await repository.findItemsByIds(["item-1", "item-2"]);

			expect(result.size).toBe(2);
			expect(result.get("item-1")).toMatchObject({
				id: "item-1",
				name: "Toyota",
				catalogKey: "terrestrial-vehicle-brands",
				metadata: { originCountry: "JP" },
			});
			expect(result.get("item-2")).toMatchObject({
				id: "item-2",
				name: "Honda",
				catalogKey: "terrestrial-vehicle-brands",
				metadata: null,
			});
		});

		it("filters by catalog keys when provided", async () => {
			vi.mocked(mockPrisma.catalogItem.findMany).mockResolvedValue([]);

			await repository.findItemsByIds(["id-1"], ["catalog-a", "catalog-b"]);

			expect(mockPrisma.catalogItem.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: expect.objectContaining({
						catalog: { key: { in: ["catalog-a", "catalog-b"] } },
					}),
				}),
			);
		});

		it("filters active items by default", async () => {
			vi.mocked(mockPrisma.catalogItem.findMany).mockResolvedValue([]);

			await repository.findItemsByIds(["id-1"]);

			expect(mockPrisma.catalogItem.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: expect.objectContaining({
						active: true,
					}),
				}),
			);
		});

		it("includes inactive items when includeInactive is true", async () => {
			vi.mocked(mockPrisma.catalogItem.findMany).mockResolvedValue([]);

			await repository.findItemsByIds(["id-1"], undefined, true);

			expect(mockPrisma.catalogItem.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: expect.not.objectContaining({
						active: true,
					}),
				}),
			);
		});
	});

	describe("findItemsByCodes", () => {
		it("returns empty map when given empty codes array", async () => {
			const result = await repository.findItemsByCodes("currencies", []);
			expect(result.size).toBe(0);
		});

		it("returns empty map when catalog not found", async () => {
			vi.mocked(mockPrisma.catalog.findUnique).mockResolvedValue(null);

			const result = await repository.findItemsByCodes("nonexistent", ["3"]);

			expect(result.size).toBe(0);
		});

		it("finds items by metadata.code and returns map keyed by code", async () => {
			vi.mocked(mockPrisma.catalog.findUnique).mockResolvedValue({
				id: "catalog-currencies",
				key: "currencies",
				name: "Currencies",
				active: true,
				allowNewItems: false,
				createdAt: new Date(),
				updatedAt: new Date(),
			});

			const mockItems = [
				{
					id: "item-mxn",
					catalogId: "catalog-currencies",
					name: "Peso Mexicano",
					normalizedName: "peso mexicano",
					active: true,
					metadata: '{"code": "3"}',
					createdAt: new Date("2024-01-01"),
					updatedAt: new Date("2024-01-01"),
				},
				{
					id: "item-usd",
					catalogId: "catalog-currencies",
					name: "US Dollar",
					normalizedName: "us dollar",
					active: true,
					metadata: '{"code": "2"}',
					createdAt: new Date("2024-01-01"),
					updatedAt: new Date("2024-01-01"),
				},
			];

			vi.mocked(mockPrisma.catalogItem.findMany).mockResolvedValue(
				mockItems as never,
			);

			const result = await repository.findItemsByCodes("currencies", [
				"3",
				"2",
			]);

			expect(result.size).toBe(2);
			expect(result.get("3")).toMatchObject({
				id: "item-mxn",
				name: "Peso Mexicano",
				catalogKey: "currencies",
			});
			expect(result.get("2")).toMatchObject({
				id: "item-usd",
				name: "US Dollar",
				catalogKey: "currencies",
			});
		});

		it("ignores items without matching code in metadata", async () => {
			vi.mocked(mockPrisma.catalog.findUnique).mockResolvedValue({
				id: "catalog-1",
				key: "currencies",
				name: "Currencies",
				active: true,
				allowNewItems: false,
				createdAt: new Date(),
				updatedAt: new Date(),
			});

			const mockItems = [
				{
					id: "item-1",
					catalogId: "catalog-1",
					name: "Item 1",
					normalizedName: "item 1",
					active: true,
					metadata: '{"code": "3"}',
					createdAt: new Date(),
					updatedAt: new Date(),
				},
				{
					id: "item-2",
					catalogId: "catalog-1",
					name: "Item 2",
					normalizedName: "item 2",
					active: true,
					metadata: '{"code": "999"}', // Not in requested codes
					createdAt: new Date(),
					updatedAt: new Date(),
				},
				{
					id: "item-3",
					catalogId: "catalog-1",
					name: "Item 3",
					normalizedName: "item 3",
					active: true,
					metadata: null, // No metadata
					createdAt: new Date(),
					updatedAt: new Date(),
				},
			];

			vi.mocked(mockPrisma.catalogItem.findMany).mockResolvedValue(
				mockItems as never,
			);

			const result = await repository.findItemsByCodes("currencies", ["3"]);

			expect(result.size).toBe(1);
			expect(result.has("3")).toBe(true);
			expect(result.has("999")).toBe(false);
		});
	});

	describe("findItemsByCodesMultipleCatalogs", () => {
		it("returns empty map when given empty codes array", async () => {
			const result = await repository.findItemsByCodesMultipleCatalogs(
				["catalog-a"],
				[],
			);
			expect(result.size).toBe(0);
		});

		it("returns empty map when given empty catalogs array", async () => {
			const result = await repository.findItemsByCodesMultipleCatalogs(
				[],
				["code-1"],
			);
			expect(result.size).toBe(0);
		});

		it("returns empty map when no catalogs found", async () => {
			vi.mocked(mockPrisma.catalog.findMany).mockResolvedValue([]);

			const result = await repository.findItemsByCodesMultipleCatalogs(
				["nonexistent"],
				["code-1"],
			);

			expect(result.size).toBe(0);
		});

		it("finds items across multiple catalogs by code", async () => {
			vi.mocked(mockPrisma.catalog.findMany).mockResolvedValue([
				{
					id: "catalog-1",
					key: "catalog-a",
					name: "Catalog A",
					active: true,
					allowNewItems: false,
					createdAt: new Date(),
					updatedAt: new Date(),
				},
				{
					id: "catalog-2",
					key: "catalog-b",
					name: "Catalog B",
					active: true,
					allowNewItems: false,
					createdAt: new Date(),
					updatedAt: new Date(),
				},
			]);

			const mockItems = [
				{
					id: "item-1",
					catalogId: "catalog-1",
					name: "Item A1",
					normalizedName: "item a1",
					active: true,
					metadata: '{"code": "100"}',
					createdAt: new Date(),
					updatedAt: new Date(),
				},
				{
					id: "item-2",
					catalogId: "catalog-2",
					name: "Item B1",
					normalizedName: "item b1",
					active: true,
					metadata: '{"code": "200"}',
					createdAt: new Date(),
					updatedAt: new Date(),
				},
			];

			vi.mocked(mockPrisma.catalogItem.findMany).mockResolvedValue(
				mockItems as never,
			);

			const result = await repository.findItemsByCodesMultipleCatalogs(
				["catalog-a", "catalog-b"],
				["100", "200"],
			);

			expect(result.size).toBe(2);
			expect(result.get("100")).toMatchObject({
				id: "item-1",
				name: "Item A1",
				catalogKey: "catalog-a",
			});
			expect(result.get("200")).toMatchObject({
				id: "item-2",
				name: "Item B1",
				catalogKey: "catalog-b",
			});
		});
	});

	describe("findItemById", () => {
		it("returns catalog item when found", async () => {
			const mockItem = {
				id: "item-1",
				catalogId: "catalog-1",
				name: "Toyota",
				normalizedName: "toyota",
				active: true,
				metadata: '{"originCountry": "JP"}',
				createdAt: new Date("2024-01-01"),
				updatedAt: new Date("2024-01-01"),
			};

			vi.mocked(mockPrisma.catalogItem.findFirst).mockResolvedValue(
				mockItem as never,
			);

			const result = await repository.findItemById("catalog-1", "item-1");

			expect(result).toMatchObject({
				id: "item-1",
				catalogId: "catalog-1",
				name: "Toyota",
				normalizedName: "toyota",
				active: true,
				metadata: { originCountry: "JP" },
			});

			expect(mockPrisma.catalogItem.findFirst).toHaveBeenCalledWith({
				where: {
					id: "item-1",
					catalogId: "catalog-1",
					active: true,
				},
			});
		});

		it("returns null when item not found", async () => {
			vi.mocked(mockPrisma.catalogItem.findFirst).mockResolvedValue(null);

			const result = await repository.findItemById("catalog-1", "nonexistent");

			expect(result).toBeNull();
		});

		it("filters active items by default", async () => {
			vi.mocked(mockPrisma.catalogItem.findFirst).mockResolvedValue(null);

			await repository.findItemById("catalog-1", "item-1");

			expect(mockPrisma.catalogItem.findFirst).toHaveBeenCalledWith(
				expect.objectContaining({
					where: expect.objectContaining({
						active: true,
					}),
				}),
			);
		});

		it("includes inactive items when includeInactive is true", async () => {
			const mockItem = {
				id: "item-1",
				catalogId: "catalog-1",
				name: "Inactive Item",
				normalizedName: "inactive item",
				active: false,
				metadata: null,
				createdAt: new Date("2024-01-01"),
				updatedAt: new Date("2024-01-01"),
			};

			vi.mocked(mockPrisma.catalogItem.findFirst).mockResolvedValue(
				mockItem as never,
			);

			await repository.findItemById("catalog-1", "item-1", true);

			expect(mockPrisma.catalogItem.findFirst).toHaveBeenCalledWith(
				expect.objectContaining({
					where: expect.not.objectContaining({
						active: true,
					}),
				}),
			);
		});

		it("filters by catalogId", async () => {
			vi.mocked(mockPrisma.catalogItem.findFirst).mockResolvedValue(null);

			await repository.findItemById("catalog-1", "item-1");

			expect(mockPrisma.catalogItem.findFirst).toHaveBeenCalledWith(
				expect.objectContaining({
					where: expect.objectContaining({
						catalogId: "catalog-1",
					}),
				}),
			);
		});
	});
});
