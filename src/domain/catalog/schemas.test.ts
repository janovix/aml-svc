import { describe, expect, it } from "vitest";
import { CatalogListQuerySchema } from "./schemas";

describe("CatalogListQuerySchema", () => {
	describe("search field", () => {
		it("accepts undefined search (no filter)", () => {
			const result = CatalogListQuerySchema.parse({});

			expect(result.search).toBeUndefined();
		});

		it("treats empty string as undefined (no filter)", () => {
			const result = CatalogListQuerySchema.parse({ search: "" });

			expect(result.search).toBeUndefined();
		});

		it("treats whitespace-only string as undefined (no filter)", () => {
			const result = CatalogListQuerySchema.parse({ search: "   " });

			expect(result.search).toBeUndefined();
		});

		it("rejects single character search", () => {
			expect(() => CatalogListQuerySchema.parse({ search: "a" })).toThrow(
				"search must be at least 2 characters long",
			);
		});

		it("accepts valid 2+ character search", () => {
			const result = CatalogListQuerySchema.parse({ search: "ab" });

			expect(result.search).toBe("ab");
		});

		it("trims whitespace from valid search", () => {
			const result = CatalogListQuerySchema.parse({ search: "  test  " });

			expect(result.search).toBe("test");
		});

		it("rejects search exceeding 100 characters", () => {
			const longSearch = "a".repeat(101);

			expect(() =>
				CatalogListQuerySchema.parse({ search: longSearch }),
			).toThrow("search must be at most 100 characters long");
		});

		it("accepts search at exactly 100 characters", () => {
			const maxSearch = "a".repeat(100);
			const result = CatalogListQuerySchema.parse({ search: maxSearch });

			expect(result.search).toBe(maxSearch);
		});
	});

	describe("pagination defaults", () => {
		it("uses default page=1 when not provided", () => {
			const result = CatalogListQuerySchema.parse({});

			expect(result.page).toBe(1);
		});

		it("uses default pageSize=10 when not provided", () => {
			const result = CatalogListQuerySchema.parse({});

			expect(result.pageSize).toBe(10);
		});
	});
});
