import { describe, it, expect, vi, beforeEach } from "vitest";
import { CatalogNameResolver } from "./name-resolver";
import type { CatalogRepository } from "./repository";
import type { EnrichedCatalogItem } from "./enrichment";

describe("CatalogNameResolver", () => {
	let mockFindItemsByIds: ReturnType<typeof vi.fn>;
	let mockFindItemsByCodes: ReturnType<typeof vi.fn>;
	let resolver: CatalogNameResolver;

	const createMockItem = (
		id: string,
		name: string,
		code: string,
	): EnrichedCatalogItem => ({
		id,
		catalogId: "test-catalog",
		name,
		normalizedName: name.toLowerCase(),
		active: true,
		metadata: { code },
		catalogKey: "test-key",
		createdAt: "2024-01-01T00:00:00Z",
		updatedAt: "2024-01-01T00:00:00Z",
	});

	beforeEach(() => {
		mockFindItemsByIds = vi.fn();
		mockFindItemsByCodes = vi.fn();
		const mockRepo: Partial<CatalogRepository> = {
			findItemsByIds: mockFindItemsByIds,
			findItemsByCodes: mockFindItemsByCodes,
		};
		resolver = new CatalogNameResolver(mockRepo as CatalogRepository);
	});

	describe("resolveNames", () => {
		it("should resolve names for BY_ID strategy", async () => {
			const data = { brand: "BRAND001", color: "COLOR001" };
			const config = {
				brand: { catalog: "BRANDS", strategy: "BY_ID" as const },
				color: { catalog: "COLORS", strategy: "BY_ID" as const },
			};

			mockFindItemsByIds.mockResolvedValueOnce(
				new Map([
					["BRAND001", createMockItem("BRAND001", "Toyota", "TOYOTA")],
					["COLOR001", createMockItem("COLOR001", "Red", "RED")],
				]),
			);

			const result = await resolver.resolveNames(data, config);

			expect(result).toEqual({
				brand: "Toyota",
				color: "Red",
			});
			expect(mockFindItemsByIds).toHaveBeenCalledWith(
				["BRAND001", "COLOR001"],
				["BRANDS", "COLORS"],
			);
		});

		it("should resolve names for BY_CODE strategy", async () => {
			const data = { status: "ACTIVE", type: "VEH" };
			const config = {
				status: { catalog: "STATUSES", strategy: "BY_CODE" as const },
				type: { catalog: "OPERATION_TYPES", strategy: "BY_CODE" as const },
			};

			mockFindItemsByCodes
				.mockResolvedValueOnce(
					new Map([["ACTIVE", createMockItem("S001", "Active", "ACTIVE")]]),
				)
				.mockResolvedValueOnce(
					new Map([["VEH", createMockItem("T001", "Vehicle", "VEH")]]),
				);

			const result = await resolver.resolveNames(data, config);

			expect(result).toEqual({
				status: "Active",
				type: "Vehicle",
			});
			expect(mockFindItemsByCodes).toHaveBeenCalledTimes(2);
		});

		it("should batch lookups by catalog for BY_CODE strategy", async () => {
			const data = { status1: "ACTIVE", status2: "INACTIVE" };
			const config = {
				status1: { catalog: "STATUSES", strategy: "BY_CODE" as const },
				status2: { catalog: "STATUSES", strategy: "BY_CODE" as const },
			};

			mockFindItemsByCodes.mockResolvedValueOnce(
				new Map([
					["ACTIVE", createMockItem("S001", "Active", "ACTIVE")],
					["INACTIVE", createMockItem("S002", "Inactive", "INACTIVE")],
				]),
			);

			const result = await resolver.resolveNames(data, config);

			expect(result).toEqual({
				status1: "Active",
				status2: "Inactive",
			});
			expect(mockFindItemsByCodes).toHaveBeenCalledOnce();
		});

		it("should skip null values", async () => {
			const data = { brand: null, color: "COLOR001" };
			const config = {
				brand: { catalog: "BRANDS", strategy: "BY_ID" as const },
				color: { catalog: "COLORS", strategy: "BY_ID" as const },
			};

			mockFindItemsByIds.mockResolvedValueOnce(
				new Map([["COLOR001", createMockItem("COLOR001", "Red", "RED")]]),
			);

			const result = await resolver.resolveNames(data, config);

			expect(result).toEqual({
				color: "Red",
			});
		});

		it("should skip undefined values", async () => {
			const data = { brand: undefined, color: "COLOR001" };
			const config = {
				brand: { catalog: "BRANDS", strategy: "BY_ID" as const },
				color: { catalog: "COLORS", strategy: "BY_ID" as const },
			};

			mockFindItemsByIds.mockResolvedValueOnce(
				new Map([["COLOR001", createMockItem("COLOR001", "Red", "RED")]]),
			);

			const result = await resolver.resolveNames(data, config);

			expect(result).toEqual({
				color: "Red",
			});
		});

		it("should skip empty string values", async () => {
			const data = { brand: "", color: "COLOR001" };
			const config = {
				brand: { catalog: "BRANDS", strategy: "BY_ID" as const },
				color: { catalog: "COLORS", strategy: "BY_ID" as const },
			};

			mockFindItemsByIds.mockResolvedValueOnce(
				new Map([["COLOR001", createMockItem("COLOR001", "Red", "RED")]]),
			);

			const result = await resolver.resolveNames(data, config);

			expect(result).toEqual({
				color: "Red",
			});
		});

		it("should skip whitespace-only string values", async () => {
			const data = { brand: "   ", color: "COLOR001" };
			const config = {
				brand: { catalog: "BRANDS", strategy: "BY_ID" as const },
				color: { catalog: "COLORS", strategy: "BY_ID" as const },
			};

			mockFindItemsByIds.mockResolvedValueOnce(
				new Map([["COLOR001", createMockItem("COLOR001", "Red", "RED")]]),
			);

			const result = await resolver.resolveNames(data, config);

			expect(result).toEqual({
				color: "Red",
			});
		});

		it("should return empty object when no items found", async () => {
			const data = { brand: "UNKNOWN" };
			const config = {
				brand: { catalog: "BRANDS", strategy: "BY_ID" as const },
			};

			mockFindItemsByIds.mockResolvedValueOnce(new Map());

			const result = await resolver.resolveNames(data, config);

			expect(result).toEqual({});
		});

		it("should handle mixed strategies", async () => {
			const data = { brand: "BRAND001", status: "ACTIVE" };
			const config = {
				brand: { catalog: "BRANDS", strategy: "BY_ID" as const },
				status: { catalog: "STATUSES", strategy: "BY_CODE" as const },
			};

			mockFindItemsByIds.mockResolvedValueOnce(
				new Map([["BRAND001", createMockItem("BRAND001", "Toyota", "TOYOTA")]]),
			);
			mockFindItemsByCodes.mockResolvedValueOnce(
				new Map([["ACTIVE", createMockItem("S001", "Active", "ACTIVE")]]),
			);

			const result = await resolver.resolveNames(data, config);

			expect(result).toEqual({
				brand: "Toyota",
				status: "Active",
			});
		});
	});

	describe("resolveSingleName", () => {
		it("should resolve a single name by ID", async () => {
			const config = { catalog: "BRANDS", strategy: "BY_ID" as const };

			mockFindItemsByIds.mockResolvedValueOnce(
				new Map([["BRAND001", createMockItem("BRAND001", "Toyota", "TOYOTA")]]),
			);

			const result = await resolver.resolveSingleName("BRAND001", config);

			expect(result).toBe("Toyota");
		});

		it("should resolve a single name by code", async () => {
			const config = { catalog: "STATUSES", strategy: "BY_CODE" as const };

			mockFindItemsByCodes.mockResolvedValueOnce(
				new Map([["ACTIVE", createMockItem("S001", "Active", "ACTIVE")]]),
			);

			const result = await resolver.resolveSingleName("ACTIVE", config);

			expect(result).toBe("Active");
		});

		it("should return null when value is null", async () => {
			const config = { catalog: "BRANDS", strategy: "BY_ID" as const };

			const result = await resolver.resolveSingleName(null, config);

			expect(result).toBeNull();
			expect(mockFindItemsByIds).not.toHaveBeenCalled();
		});

		it("should return null when value is undefined", async () => {
			const config = { catalog: "BRANDS", strategy: "BY_ID" as const };

			const result = await resolver.resolveSingleName(undefined, config);

			expect(result).toBeNull();
			expect(mockFindItemsByIds).not.toHaveBeenCalled();
		});

		it("should return null when value is empty string", async () => {
			const config = { catalog: "BRANDS", strategy: "BY_ID" as const };

			const result = await resolver.resolveSingleName("", config);

			expect(result).toBeNull();
			expect(mockFindItemsByIds).not.toHaveBeenCalled();
		});

		it("should return null when value is whitespace only", async () => {
			const config = { catalog: "BRANDS", strategy: "BY_ID" as const };

			const result = await resolver.resolveSingleName("   ", config);

			expect(result).toBeNull();
			expect(mockFindItemsByIds).not.toHaveBeenCalled();
		});

		it("should return null when item not found", async () => {
			const config = { catalog: "BRANDS", strategy: "BY_ID" as const };

			mockFindItemsByIds.mockResolvedValueOnce(new Map());

			const result = await resolver.resolveSingleName("UNKNOWN", config);

			expect(result).toBeNull();
		});

		it("should return null for invalid strategy", async () => {
			const config = {
				catalog: "BRANDS",
				strategy: "INVALID_STRATEGY" as unknown as "BY_ID" | "BY_CODE",
			};

			const result = await resolver.resolveSingleName("BRAND001", config);

			expect(result).toBeNull();
		});
	});
});
