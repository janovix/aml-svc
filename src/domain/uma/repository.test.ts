import { PrismaClient } from "@prisma/client";
import { PrismaD1 } from "@prisma/adapter-d1";
import { beforeEach, describe, expect, it } from "vitest";
import { env } from "cloudflare:test";

import { UmaValueRepository } from "./repository";
import type {
	UmaValueCreateInput,
	UmaValueFilters,
	UmaValuePatchInput,
	UmaValueUpdateInput,
} from "./schemas";

describe("UmaValueRepository", () => {
	let prisma: PrismaClient;
	let repository: UmaValueRepository;

	beforeEach(async () => {
		const adapter = new PrismaD1(env.DB);
		prisma = new PrismaClient({ adapter });
		repository = new UmaValueRepository(prisma);

		// Clean up existing data
		await prisma.umaValue.deleteMany();
	});

	describe("create", () => {
		it("should create a new UMA value", async () => {
			const input: UmaValueCreateInput = {
				year: 2024,
				dailyValue: 100.5,
				effectiveDate: "2024-01-01",
				active: false,
			};

			const result = await repository.create(input);

			expect(result).toMatchObject({
				year: 2024,
				dailyValue: "100.5",
				effectiveDate: "2024-01-01T00:00:00.000Z",
				active: false,
			});
			expect(result.id).toBeTruthy();
		});

		it("should create UMA value with all optional fields", async () => {
			const input: UmaValueCreateInput = {
				year: 2024,
				dailyValue: 100.5,
				effectiveDate: "2024-01-01",
				endDate: "2024-12-31",
				approvedBy: "admin@example.com",
				notes: "Test notes",
				active: true,
			};

			const result = await repository.create(input);

			expect(result).toMatchObject({
				year: 2024,
				dailyValue: "100.5",
				effectiveDate: "2024-01-01T00:00:00.000Z",
				endDate: "2024-12-31T00:00:00.000Z",
				approvedBy: "admin@example.com",
				notes: "Test notes",
				active: true,
			});
		});

		it("should deactivate other UMA values when creating an active one", async () => {
			// Create first active UMA value
			await repository.create({
				year: 2023,
				dailyValue: 90.0,
				effectiveDate: "2023-01-01",
				active: true,
			});

			// Create second active UMA value
			const result = await repository.create({
				year: 2024,
				dailyValue: 100.0,
				effectiveDate: "2024-01-01",
				active: true,
			});

			expect(result.active).toBe(true);

			// Check that the first one is now inactive
			const firstValue = await repository.getByYear(2023);
			expect(firstValue?.active).toBe(false);
		});

		it("should not deactivate others when creating inactive UMA value", async () => {
			// Create first active UMA value
			const first = await repository.create({
				year: 2023,
				dailyValue: 90.0,
				effectiveDate: "2023-01-01",
				active: true,
			});

			// Create second inactive UMA value
			await repository.create({
				year: 2024,
				dailyValue: 100.0,
				effectiveDate: "2024-01-01",
				active: false,
			});

			// Check that the first one is still active
			const firstValue = await repository.getById(first.id);
			expect(firstValue?.active).toBe(true);
		});
	});

	describe("list", () => {
		beforeEach(async () => {
			// Create test data
			await repository.create({
				year: 2022,
				dailyValue: 80.0,
				effectiveDate: "2022-01-01",
				active: false,
			});
			await repository.create({
				year: 2023,
				dailyValue: 90.0,
				effectiveDate: "2023-01-01",
				active: false,
			});
			await repository.create({
				year: 2024,
				dailyValue: 100.0,
				effectiveDate: "2024-01-01",
				active: true,
			});
		});

		it("should list all UMA values with pagination", async () => {
			const filters: UmaValueFilters = {
				page: 1,
				limit: 10,
			};

			const result = await repository.list(filters);

			expect(result.data).toHaveLength(3);
			expect(result.pagination).toEqual({
				page: 1,
				limit: 10,
				total: 3,
				totalPages: 1,
			});
			// Should be ordered by year descending
			expect(result.data[0].year).toBe(2024);
			expect(result.data[1].year).toBe(2023);
			expect(result.data[2].year).toBe(2022);
		});

		it("should filter by year", async () => {
			const filters: UmaValueFilters = {
				page: 1,
				limit: 10,
				year: 2024,
			};

			const result = await repository.list(filters);

			expect(result.data).toHaveLength(1);
			expect(result.data[0].year).toBe(2024);
		});

		it("should filter by active status", async () => {
			const filters: UmaValueFilters = {
				page: 1,
				limit: 10,
				active: true,
			};

			const result = await repository.list(filters);

			expect(result.data).toHaveLength(1);
			expect(result.data[0].active).toBe(true);
			expect(result.data[0].year).toBe(2024);
		});

		it("should handle pagination correctly", async () => {
			const filters: UmaValueFilters = {
				page: 1,
				limit: 2,
			};

			const result = await repository.list(filters);

			expect(result.data).toHaveLength(2);
			expect(result.pagination).toEqual({
				page: 1,
				limit: 2,
				total: 3,
				totalPages: 2,
			});
		});

		it("should return empty list when no matches", async () => {
			const filters: UmaValueFilters = {
				page: 1,
				limit: 10,
				year: 2025,
			};

			const result = await repository.list(filters);

			expect(result.data).toHaveLength(0);
			expect(result.pagination.total).toBe(0);
			expect(result.pagination.totalPages).toBe(0);
		});
	});

	describe("getById", () => {
		it("should get UMA value by ID", async () => {
			const created = await repository.create({
				year: 2024,
				dailyValue: 100.0,
				effectiveDate: "2024-01-01",
				active: true,
			});

			const result = await repository.getById(created.id);

			expect(result).toMatchObject({
				id: created.id,
				year: 2024,
				dailyValue: "100",
			});
		});

		it("should return null for non-existent ID", async () => {
			const result = await repository.getById("non_existent_id");

			expect(result).toBeNull();
		});
	});

	describe("getByYear", () => {
		it("should get UMA value by year", async () => {
			await repository.create({
				year: 2024,
				dailyValue: 100.0,
				effectiveDate: "2024-01-01",
				active: true,
			});

			const result = await repository.getByYear(2024);

			expect(result).toMatchObject({
				year: 2024,
				dailyValue: "100",
			});
		});

		it("should return null for non-existent year", async () => {
			const result = await repository.getByYear(2025);

			expect(result).toBeNull();
		});
	});

	describe("getActive", () => {
		it("should get the active UMA value", async () => {
			await repository.create({
				year: 2023,
				dailyValue: 90.0,
				effectiveDate: "2023-01-01",
				active: false,
			});
			await repository.create({
				year: 2024,
				dailyValue: 100.0,
				effectiveDate: "2024-01-01",
				active: true,
			});

			const result = await repository.getActive();

			expect(result).toMatchObject({
				year: 2024,
				active: true,
			});
		});

		it("should return null when no active UMA value", async () => {
			await repository.create({
				year: 2024,
				dailyValue: 100.0,
				effectiveDate: "2024-01-01",
				active: false,
			});

			const result = await repository.getActive();

			expect(result).toBeNull();
		});

		it("should return most recent when multiple active", async () => {
			// This shouldn't happen in practice, but test the behavior
			await prisma.umaValue.create({
				data: {
					id: "uma_1",
					year: 2023,
					dailyValue: 90.0,
					effectiveDate: new Date("2023-01-01"),
					active: true,
				},
			});
			await prisma.umaValue.create({
				data: {
					id: "uma_2",
					year: 2024,
					dailyValue: 100.0,
					effectiveDate: new Date("2024-01-01"),
					active: true,
				},
			});

			const result = await repository.getActive();

			expect(result?.year).toBe(2024);
		});
	});

	describe("getByDate", () => {
		it("should get UMA value effective on a specific date", async () => {
			await repository.create({
				year: 2024,
				dailyValue: 100.0,
				effectiveDate: "2024-01-01",
				endDate: "2024-12-31",
				active: true,
			});

			const result = await repository.getByDate(new Date("2024-06-15"));

			expect(result).toMatchObject({
				year: 2024,
				dailyValue: "100",
			});
		});

		it("should return null for date before effective date", async () => {
			await repository.create({
				year: 2024,
				dailyValue: 100.0,
				effectiveDate: "2024-01-01",
				active: true,
			});

			const result = await repository.getByDate(new Date("2023-12-31"));

			expect(result).toBeNull();
		});

		it("should return null for date after end date", async () => {
			await repository.create({
				year: 2024,
				dailyValue: 100.0,
				effectiveDate: "2024-01-01",
				endDate: "2024-12-31",
				active: true,
			});

			const result = await repository.getByDate(new Date("2025-01-01"));

			expect(result).toBeNull();
		});

		it("should handle UMA value with no end date", async () => {
			await repository.create({
				year: 2024,
				dailyValue: 100.0,
				effectiveDate: "2024-01-01",
				active: true,
			});

			const result = await repository.getByDate(new Date("2025-06-15"));

			expect(result).toMatchObject({
				year: 2024,
			});
		});

		it("should return most recent when multiple values match", async () => {
			await repository.create({
				year: 2023,
				dailyValue: 90.0,
				effectiveDate: "2023-01-01",
				active: false,
			});
			await repository.create({
				year: 2024,
				dailyValue: 100.0,
				effectiveDate: "2024-01-01",
				active: true,
			});

			const result = await repository.getByDate(new Date("2024-06-15"));

			expect(result?.year).toBe(2024);
		});
	});

	describe("update", () => {
		it("should update an existing UMA value", async () => {
			const created = await repository.create({
				year: 2024,
				dailyValue: 100.0,
				effectiveDate: "2024-01-01",
				active: false,
			});

			const input: UmaValueUpdateInput = {
				year: 2024,
				dailyValue: 150.0,
				effectiveDate: "2024-02-01",
				active: true,
			};

			const result = await repository.update(created.id, input);

			expect(result).toMatchObject({
				id: created.id,
				year: 2024,
				dailyValue: "150",
				effectiveDate: "2024-02-01T00:00:00.000Z",
				active: true,
			});
		});

		it("should deactivate other UMA values when updating to active", async () => {
			const first = await repository.create({
				year: 2023,
				dailyValue: 90.0,
				effectiveDate: "2023-01-01",
				active: true,
			});

			const second = await repository.create({
				year: 2024,
				dailyValue: 100.0,
				effectiveDate: "2024-01-01",
				active: false,
			});

			await repository.update(second.id, {
				year: 2024,
				dailyValue: 100.0,
				effectiveDate: "2024-01-01",
				active: true,
			});

			const firstValue = await repository.getById(first.id);
			expect(firstValue?.active).toBe(false);
		});

		it("should throw error when updating non-existent UMA value", async () => {
			const input: UmaValueUpdateInput = {
				year: 2024,
				dailyValue: 100.0,
				effectiveDate: "2024-01-01",
				active: true,
			};

			await expect(repository.update("non_existent_id", input)).rejects.toThrow(
				"UMA_VALUE_NOT_FOUND",
			);
		});
	});

	describe("patch", () => {
		it("should patch specific fields", async () => {
			const created = await repository.create({
				year: 2024,
				dailyValue: 100.0,
				effectiveDate: "2024-01-01",
				active: false,
			});

			const input: UmaValuePatchInput = {
				dailyValue: 150.0,
			};

			const result = await repository.patch(created.id, input);

			expect(result).toMatchObject({
				id: created.id,
				year: 2024,
				dailyValue: "150",
				active: false,
			});
		});

		it("should deactivate others when patching to active", async () => {
			const first = await repository.create({
				year: 2023,
				dailyValue: 90.0,
				effectiveDate: "2023-01-01",
				active: true,
			});

			const second = await repository.create({
				year: 2024,
				dailyValue: 100.0,
				effectiveDate: "2024-01-01",
				active: false,
			});

			await repository.patch(second.id, { active: true });

			const firstValue = await repository.getById(first.id);
			expect(firstValue?.active).toBe(false);
		});

		it("should throw error when patching non-existent UMA value", async () => {
			await expect(
				repository.patch("non_existent_id", { dailyValue: 100.0 }),
			).rejects.toThrow("UMA_VALUE_NOT_FOUND");
		});
	});

	describe("delete", () => {
		it("should delete an existing UMA value", async () => {
			const created = await repository.create({
				year: 2024,
				dailyValue: 100.0,
				effectiveDate: "2024-01-01",
				active: false,
			});

			await repository.delete(created.id);

			const result = await repository.getById(created.id);
			expect(result).toBeNull();
		});

		it("should throw error when deleting non-existent UMA value", async () => {
			await expect(repository.delete("non_existent_id")).rejects.toThrow(
				"UMA_VALUE_NOT_FOUND",
			);
		});
	});

	describe("activate", () => {
		it("should activate a UMA value", async () => {
			const created = await repository.create({
				year: 2024,
				dailyValue: 100.0,
				effectiveDate: "2024-01-01",
				active: false,
			});

			const result = await repository.activate(created.id);

			expect(result.active).toBe(true);
		});

		it("should deactivate all other UMA values", async () => {
			const first = await repository.create({
				year: 2023,
				dailyValue: 90.0,
				effectiveDate: "2023-01-01",
				active: true,
			});

			const second = await repository.create({
				year: 2024,
				dailyValue: 100.0,
				effectiveDate: "2024-01-01",
				active: false,
			});

			await repository.activate(second.id);

			const firstValue = await repository.getById(first.id);
			expect(firstValue?.active).toBe(false);

			const secondValue = await repository.getById(second.id);
			expect(secondValue?.active).toBe(true);
		});

		it("should throw error when activating non-existent UMA value", async () => {
			await expect(repository.activate("non_existent_id")).rejects.toThrow(
				"UMA_VALUE_NOT_FOUND",
			);
		});
	});
});
