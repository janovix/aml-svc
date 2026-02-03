import { Prisma } from "@prisma/client";
import type { UmaValue as PrismaUmaValueModel } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

import {
	mapPrismaUmaValue,
	mapUmaValueCreateInputToPrisma,
	mapUmaValuePatchInputToPrisma,
	mapUmaValueUpdateInputToPrisma,
} from "./mappers";
import type {
	UmaValueCreateInput,
	UmaValuePatchInput,
	UmaValueUpdateInput,
} from "./schemas";

// Mock the id generator
vi.mock("../../lib/id-generator", () => ({
	generateId: vi.fn(() => "UMA_VALUE_test123"),
}));

describe("UMA Value Mappers", () => {
	describe("mapPrismaUmaValue", () => {
		it("should map a complete Prisma UMA value to entity", () => {
			const prismaValue: PrismaUmaValueModel = {
				id: "uma_value_123",
				year: 2024,
				dailyValue: new Prisma.Decimal("100.50"),
				effectiveDate: new Date("2024-01-01"),
				endDate: new Date("2024-12-31"),
				approvedBy: "admin@example.com",
				notes: "Test notes",
				active: true,
				createdAt: new Date("2024-01-01T00:00:00Z"),
				updatedAt: new Date("2024-01-02T00:00:00Z"),
			};

			const result = mapPrismaUmaValue(prismaValue);

			expect(result).toEqual({
				id: "uma_value_123",
				year: 2024,
				dailyValue: "100.5",
				effectiveDate: "2024-01-01T00:00:00.000Z",
				endDate: "2024-12-31T00:00:00.000Z",
				approvedBy: "admin@example.com",
				notes: "Test notes",
				active: true,
				createdAt: "2024-01-01T00:00:00.000Z",
				updatedAt: "2024-01-02T00:00:00.000Z",
			});
		});

		it("should handle null optional fields", () => {
			const prismaValue: PrismaUmaValueModel = {
				id: "uma_value_123",
				year: 2024,
				dailyValue: new Prisma.Decimal("100.50"),
				effectiveDate: new Date("2024-01-01"),
				endDate: null,
				approvedBy: null,
				notes: null,
				active: false,
				createdAt: new Date("2024-01-01T00:00:00Z"),
				updatedAt: new Date("2024-01-02T00:00:00Z"),
			};

			const result = mapPrismaUmaValue(prismaValue);

			expect(result).toEqual({
				id: "uma_value_123",
				year: 2024,
				dailyValue: "100.5",
				effectiveDate: "2024-01-01T00:00:00.000Z",
				endDate: null,
				approvedBy: null,
				notes: null,
				active: false,
				createdAt: "2024-01-01T00:00:00.000Z",
				updatedAt: "2024-01-02T00:00:00.000Z",
			});
		});

		it("should handle string dates", () => {
			const prismaValue = {
				id: "uma_value_123",
				year: 2024,
				dailyValue: new Prisma.Decimal("100.50"),
				effectiveDate: "2024-01-01T00:00:00.000Z",
				endDate: "2024-12-31T00:00:00.000Z",
				approvedBy: null,
				notes: null,
				active: true,
				createdAt: "2024-01-01T00:00:00.000Z",
				updatedAt: "2024-01-02T00:00:00.000Z",
			} as unknown as PrismaUmaValueModel;

			const result = mapPrismaUmaValue(prismaValue);

			expect(result.effectiveDate).toBe("2024-01-01T00:00:00.000Z");
			expect(result.endDate).toBe("2024-12-31T00:00:00.000Z");
		});

		it("should handle numeric dailyValue", () => {
			const prismaValue = {
				id: "uma_value_123",
				year: 2024,
				dailyValue: 100.5,
				effectiveDate: new Date("2024-01-01"),
				endDate: null,
				approvedBy: null,
				notes: null,
				active: true,
				createdAt: new Date("2024-01-01T00:00:00Z"),
				updatedAt: new Date("2024-01-02T00:00:00Z"),
			} as unknown as PrismaUmaValueModel;

			const result = mapPrismaUmaValue(prismaValue);

			expect(result.dailyValue).toBe("100.5");
		});

		it("should handle string dailyValue", () => {
			const prismaValue = {
				id: "uma_value_123",
				year: 2024,
				dailyValue: "100.5",
				effectiveDate: new Date("2024-01-01"),
				endDate: null,
				approvedBy: null,
				notes: null,
				active: true,
				createdAt: new Date("2024-01-01T00:00:00Z"),
				updatedAt: new Date("2024-01-02T00:00:00Z"),
			} as unknown as PrismaUmaValueModel;

			const result = mapPrismaUmaValue(prismaValue);

			expect(result.dailyValue).toBe("100.5");
		});

		it("should handle null dailyValue", () => {
			const prismaValue = {
				id: "uma_value_123",
				year: 2024,
				dailyValue: null,
				effectiveDate: new Date("2024-01-01"),
				endDate: null,
				approvedBy: null,
				notes: null,
				active: true,
				createdAt: new Date("2024-01-01T00:00:00Z"),
				updatedAt: new Date("2024-01-02T00:00:00Z"),
			} as unknown as PrismaUmaValueModel;

			const result = mapPrismaUmaValue(prismaValue);

			expect(result.dailyValue).toBe("0");
		});
	});

	describe("mapUmaValueCreateInputToPrisma", () => {
		it("should map create input with all fields", () => {
			const input: UmaValueCreateInput = {
				year: 2024,
				dailyValue: 100.5,
				effectiveDate: "2024-01-01",
				endDate: "2024-12-31",
				approvedBy: "admin@example.com",
				notes: "Test notes",
				active: true,
			};

			const result = mapUmaValueCreateInputToPrisma(input);

			expect(result).toMatchObject({
				year: 2024,
				effectiveDate: new Date("2024-01-01"),
				endDate: new Date("2024-12-31"),
				approvedBy: "admin@example.com",
				notes: "Test notes",
				active: true,
			});
			expect(result.id).toBeTruthy();
			expect(result.dailyValue).toBeInstanceOf(Prisma.Decimal);
			expect(result.dailyValue.toString()).toBe("100.5");
		});

		it("should map create input with minimal fields", () => {
			const input: UmaValueCreateInput = {
				year: 2024,
				dailyValue: 100.5,
				effectiveDate: "2024-01-01",
				active: false,
			};

			const result = mapUmaValueCreateInputToPrisma(input);

			expect(result).toMatchObject({
				year: 2024,
				effectiveDate: new Date("2024-01-01"),
				endDate: null,
				approvedBy: null,
				notes: null,
				active: false,
			});
			expect(result.id).toBeTruthy();
		});

		it("should handle null optional fields explicitly", () => {
			const input: UmaValueCreateInput = {
				year: 2024,
				dailyValue: 100.5,
				effectiveDate: "2024-01-01",
				endDate: null,
				approvedBy: null,
				notes: null,
				active: true,
			};

			const result = mapUmaValueCreateInputToPrisma(input);

			expect(result.endDate).toBeNull();
			expect(result.approvedBy).toBeNull();
			expect(result.notes).toBeNull();
		});
	});

	describe("mapUmaValueUpdateInputToPrisma", () => {
		it("should map update input with all fields", () => {
			const input: UmaValueUpdateInput = {
				year: 2024,
				dailyValue: 150.75,
				effectiveDate: "2024-02-01",
				endDate: "2024-12-31",
				approvedBy: "admin@example.com",
				notes: "Updated notes",
				active: true,
			};

			const result = mapUmaValueUpdateInputToPrisma(input);

			expect(result).toMatchObject({
				year: 2024,
				effectiveDate: new Date("2024-02-01"),
				endDate: new Date("2024-12-31"),
				approvedBy: "admin@example.com",
				notes: "Updated notes",
				active: true,
			});
			expect(result.dailyValue).toBeInstanceOf(Prisma.Decimal);
			expect(result.dailyValue?.toString()).toBe("150.75");
		});

		it("should handle null optional fields", () => {
			const input: UmaValueUpdateInput = {
				year: 2024,
				dailyValue: 100.5,
				effectiveDate: "2024-01-01",
				endDate: null,
				approvedBy: null,
				notes: null,
				active: false,
			};

			const result = mapUmaValueUpdateInputToPrisma(input);

			expect(result.endDate).toBeNull();
			expect(result.approvedBy).toBeNull();
			expect(result.notes).toBeNull();
		});
	});

	describe("mapUmaValuePatchInputToPrisma", () => {
		it("should map patch input with all fields", () => {
			const input: UmaValuePatchInput = {
				year: 2024,
				dailyValue: 150.75,
				effectiveDate: "2024-02-01",
				endDate: "2024-12-31",
				approvedBy: "admin@example.com",
				notes: "Patched notes",
				active: true,
			};

			const result = mapUmaValuePatchInputToPrisma(input);

			expect(result).toMatchObject({
				year: 2024,
				effectiveDate: new Date("2024-02-01"),
				endDate: new Date("2024-12-31"),
				approvedBy: "admin@example.com",
				notes: "Patched notes",
				active: true,
			});
			expect(result.dailyValue).toBeInstanceOf(Prisma.Decimal);
		});

		it("should only include provided fields", () => {
			const input: UmaValuePatchInput = {
				year: 2025,
			};

			const result = mapUmaValuePatchInputToPrisma(input);

			expect(result).toEqual({
				year: 2025,
			});
		});

		it("should handle partial updates", () => {
			const input: UmaValuePatchInput = {
				dailyValue: 200.0,
				active: false,
			};

			const result = mapUmaValuePatchInputToPrisma(input);

			expect(Object.keys(result)).toHaveLength(2);
			expect(result.active).toBe(false);
			expect(result.dailyValue).toBeInstanceOf(Prisma.Decimal);
		});

		it("should handle null values in patch", () => {
			const input: UmaValuePatchInput = {
				endDate: null,
				approvedBy: null,
				notes: null,
			};

			const result = mapUmaValuePatchInputToPrisma(input);

			expect(result.endDate).toBeNull();
			expect(result.approvedBy).toBeNull();
			expect(result.notes).toBeNull();
		});

		it("should convert endDate string to Date when provided", () => {
			const input: UmaValuePatchInput = {
				endDate: "2024-12-31",
			};

			const result = mapUmaValuePatchInputToPrisma(input);

			expect(result.endDate).toEqual(new Date("2024-12-31"));
		});

		it("should handle empty patch input", () => {
			const input: UmaValuePatchInput = {};

			const result = mapUmaValuePatchInputToPrisma(input);

			expect(result).toEqual({});
		});
	});
});
