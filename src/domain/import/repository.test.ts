import { PrismaClient } from "@prisma/client";
import { PrismaD1 } from "@prisma/adapter-d1";
import { beforeEach, describe, expect, it } from "vitest";
import { env } from "cloudflare:test";

import { ImportRepository } from "./repository";
import type {
	ImportCreateInput,
	ImportFilters,
	ImportRowFilters,
	ImportStatusUpdateInput,
	ImportBulkRowCreateInput,
} from "./schemas";

describe("ImportRepository", () => {
	let prisma: PrismaClient;
	let repository: ImportRepository;
	const organizationId = "org_test123";
	const createdBy = "user_test123";

	beforeEach(async () => {
		const adapter = new PrismaD1(env.DB);
		prisma = new PrismaClient({ adapter });
		repository = new ImportRepository(prisma);

		// Clean up existing data
		await prisma.importRowResult.deleteMany();
		await prisma.import.deleteMany();
	});

	describe("create", () => {
		it("should create a new import", async () => {
			const input: ImportCreateInput = {
				entityType: "CLIENT",
				fileName: "clients.csv",
				fileSize: 1024,
			};

			const result = await repository.create(
				organizationId,
				createdBy,
				input,
				"https://example.com/file.csv",
			);

			expect(result).toMatchObject({
				organizationId,
				entityType: "CLIENT",
				fileName: "clients.csv",
				fileSize: 1024,
				fileUrl: "https://example.com/file.csv",
				createdBy,
				status: "PENDING",
			});
			expect(result.id).toBeTruthy();
		});

		it("should create import for TRANSACTION entity type", async () => {
			const input: ImportCreateInput = {
				entityType: "TRANSACTION",
				fileName: "transactions.xlsx",
				fileSize: 2048,
			};

			const result = await repository.create(
				organizationId,
				createdBy,
				input,
				"https://example.com/transactions.xlsx",
			);

			expect(result.entityType).toBe("TRANSACTION");
		});
	});

	describe("list", () => {
		beforeEach(async () => {
			// Create test data
			await repository.create(
				organizationId,
				createdBy,
				{
					entityType: "CLIENT",
					fileName: "clients1.csv",
					fileSize: 1024,
				},
				"https://example.com/file1.csv",
			);
			await repository.create(
				organizationId,
				createdBy,
				{
					entityType: "TRANSACTION",
					fileName: "transactions.csv",
					fileSize: 2048,
				},
				"https://example.com/file2.csv",
			);
			await repository.create(
				"other_org",
				createdBy,
				{
					entityType: "CLIENT",
					fileName: "other.csv",
					fileSize: 512,
				},
				"https://example.com/other.csv",
			);
		});

		it("should list imports for organization with pagination", async () => {
			const filters: ImportFilters = {
				page: 1,
				limit: 10,
			};

			const result = await repository.list(organizationId, filters);

			expect(result.data).toHaveLength(2);
			expect(result.pagination).toEqual({
				page: 1,
				limit: 10,
				total: 2,
				totalPages: 1,
			});
		});

		it("should filter by entity type", async () => {
			const filters: ImportFilters = {
				page: 1,
				limit: 10,
				entityType: "CLIENT",
			};

			const result = await repository.list(organizationId, filters);

			expect(result.data).toHaveLength(1);
			expect(result.data[0].entityType).toBe("CLIENT");
		});

		it("should filter by status", async () => {
			const imports = await repository.list(organizationId, {
				page: 1,
				limit: 10,
			});
			await repository.updateStatus(imports.data[0].id, {
				status: "COMPLETED",
			});

			const filters: ImportFilters = {
				page: 1,
				limit: 10,
				status: "COMPLETED",
			};

			const result = await repository.list(organizationId, filters);

			expect(result.data).toHaveLength(1);
			expect(result.data[0].status).toBe("COMPLETED");
		});

		it("should handle pagination correctly", async () => {
			const filters: ImportFilters = {
				page: 1,
				limit: 1,
			};

			const result = await repository.list(organizationId, filters);

			expect(result.data).toHaveLength(1);
			expect(result.pagination.totalPages).toBe(2);
		});

		it("should return empty list for organization with no imports", async () => {
			const filters: ImportFilters = {
				page: 1,
				limit: 10,
			};

			const result = await repository.list("empty_org", filters);

			expect(result.data).toHaveLength(0);
			expect(result.pagination.total).toBe(0);
		});
	});

	describe("getById", () => {
		it("should get import by ID", async () => {
			const created = await repository.create(
				organizationId,
				createdBy,
				{
					entityType: "CLIENT",
					fileName: "test.csv",
					fileSize: 1024,
				},
				"https://example.com/test.csv",
			);

			const result = await repository.getById(organizationId, created.id);

			expect(result).toMatchObject({
				id: created.id,
				fileName: "test.csv",
			});
		});

		it("should return null for non-existent import", async () => {
			const result = await repository.getById(organizationId, "non_existent");

			expect(result).toBeNull();
		});

		it("should return null for import from different organization", async () => {
			const created = await repository.create(
				"other_org",
				createdBy,
				{
					entityType: "CLIENT",
					fileName: "test.csv",
					fileSize: 1024,
				},
				"https://example.com/test.csv",
			);

			const result = await repository.getById(organizationId, created.id);

			expect(result).toBeNull();
		});
	});

	describe("updateStatus", () => {
		it("should update import status", async () => {
			const created = await repository.create(
				organizationId,
				createdBy,
				{
					entityType: "CLIENT",
					fileName: "test.csv",
					fileSize: 1024,
				},
				"https://example.com/test.csv",
			);

			const update: ImportStatusUpdateInput = {
				status: "VALIDATING",
			};

			const result = await repository.updateStatus(created.id, update);

			expect(result.status).toBe("VALIDATING");
			expect(result.startedAt).toBeTruthy();
		});

		it("should update counts", async () => {
			const created = await repository.create(
				organizationId,
				createdBy,
				{
					entityType: "CLIENT",
					fileName: "test.csv",
					fileSize: 1024,
				},
				"https://example.com/test.csv",
			);

			const update: ImportStatusUpdateInput = {
				status: "PROCESSING",
				totalRows: 100,
				processedRows: 50,
				successCount: 45,
				warningCount: 3,
				errorCount: 2,
			};

			const result = await repository.updateStatus(created.id, update);

			expect(result).toMatchObject({
				totalRows: 100,
				processedRows: 50,
				successCount: 45,
				warningCount: 3,
				errorCount: 2,
			});
		});

		it("should set startedAt when status changes to VALIDATING", async () => {
			const created = await repository.create(
				organizationId,
				createdBy,
				{
					entityType: "CLIENT",
					fileName: "test.csv",
					fileSize: 1024,
				},
				"https://example.com/test.csv",
			);

			const result = await repository.updateStatus(created.id, {
				status: "VALIDATING",
			});

			expect(result.startedAt).toBeTruthy();
		});

		it("should set startedAt when status changes to PROCESSING", async () => {
			const created = await repository.create(
				organizationId,
				createdBy,
				{
					entityType: "CLIENT",
					fileName: "test.csv",
					fileSize: 1024,
				},
				"https://example.com/test.csv",
			);

			const result = await repository.updateStatus(created.id, {
				status: "PROCESSING",
			});

			expect(result.startedAt).toBeTruthy();
		});

		it("should set completedAt when status changes to COMPLETED", async () => {
			const created = await repository.create(
				organizationId,
				createdBy,
				{
					entityType: "CLIENT",
					fileName: "test.csv",
					fileSize: 1024,
				},
				"https://example.com/test.csv",
			);

			const result = await repository.updateStatus(created.id, {
				status: "COMPLETED",
			});

			expect(result.completedAt).toBeTruthy();
		});

		it("should set completedAt when status changes to FAILED", async () => {
			const created = await repository.create(
				organizationId,
				createdBy,
				{
					entityType: "CLIENT",
					fileName: "test.csv",
					fileSize: 1024,
				},
				"https://example.com/test.csv",
			);

			const result = await repository.updateStatus(created.id, {
				status: "FAILED",
				errorMessage: "Test error",
			});

			expect(result.completedAt).toBeTruthy();
			expect(result.errorMessage).toBe("Test error");
		});
	});

	describe("incrementCounts", () => {
		it("should increment counts atomically", async () => {
			const created = await repository.create(
				organizationId,
				createdBy,
				{
					entityType: "CLIENT",
					fileName: "test.csv",
					fileSize: 1024,
				},
				"https://example.com/test.csv",
			);

			await repository.incrementCounts(created.id, {
				processedRows: 1,
				successCount: 1,
			});

			await repository.incrementCounts(created.id, {
				processedRows: 1,
				warningCount: 1,
			});

			const result = await repository.getById(organizationId, created.id);

			expect(result).toMatchObject({
				processedRows: 2,
				successCount: 1,
				warningCount: 1,
				errorCount: 0,
			});
		});
	});

	describe("createRowResults", () => {
		it("should create multiple row results in bulk", async () => {
			const importRecord = await repository.create(
				organizationId,
				createdBy,
				{
					entityType: "CLIENT",
					fileName: "test.csv",
					fileSize: 1024,
				},
				"https://example.com/test.csv",
			);

			const input: ImportBulkRowCreateInput = {
				rows: [
					{ rowNumber: 1, rawData: JSON.stringify({ name: "Client 1" }) },
					{ rowNumber: 2, rawData: JSON.stringify({ name: "Client 2" }) },
					{ rowNumber: 3, rawData: JSON.stringify({ name: "Client 3" }) },
				],
			};

			await repository.createRowResults(importRecord.id, input);

			const results = await repository.listRowResults(importRecord.id, {
				page: 1,
				limit: 10,
			});

			expect(results.data).toHaveLength(3);
			expect(results.data[0].rowNumber).toBe(1);
			expect(results.data[0].status).toBe("PENDING");
		});
	});

	describe("updateRowResult", () => {
		it("should update a row result", async () => {
			const importRecord = await repository.create(
				organizationId,
				createdBy,
				{
					entityType: "CLIENT",
					fileName: "test.csv",
					fileSize: 1024,
				},
				"https://example.com/test.csv",
			);

			await repository.createRowResults(importRecord.id, {
				rows: [{ rowNumber: 1, rawData: JSON.stringify({ name: "Client 1" }) }],
			});

			const result = await repository.updateRowResult(importRecord.id, 1, {
				status: "SUCCESS",
				entityId: "client_123",
				message: "Created successfully",
			});

			expect(result).toMatchObject({
				rowNumber: 1,
				status: "SUCCESS",
				entityId: "client_123",
				message: "Created successfully",
			});
		});

		it("should handle errors array", async () => {
			const importRecord = await repository.create(
				organizationId,
				createdBy,
				{
					entityType: "CLIENT",
					fileName: "test.csv",
					fileSize: 1024,
				},
				"https://example.com/test.csv",
			);

			await repository.createRowResults(importRecord.id, {
				rows: [{ rowNumber: 1, rawData: JSON.stringify({ name: "Client 1" }) }],
			});

			const result = await repository.updateRowResult(importRecord.id, 1, {
				status: "ERROR",
				errors: ["Invalid email", "Missing required field"],
			});

			expect(result?.status).toBe("ERROR");
			expect(result?.errors).toBe(
				JSON.stringify(["Invalid email", "Missing required field"]),
			);
		});

		it("should return null for non-existent row", async () => {
			const importRecord = await repository.create(
				organizationId,
				createdBy,
				{
					entityType: "CLIENT",
					fileName: "test.csv",
					fileSize: 1024,
				},
				"https://example.com/test.csv",
			);

			const result = await repository.updateRowResult(importRecord.id, 999, {
				status: "SUCCESS",
			});

			expect(result).toBeNull();
		});
	});

	describe("listRowResults", () => {
		it("should list row results with pagination", async () => {
			const importRecord = await repository.create(
				organizationId,
				createdBy,
				{
					entityType: "CLIENT",
					fileName: "test.csv",
					fileSize: 1024,
				},
				"https://example.com/test.csv",
			);

			await repository.createRowResults(importRecord.id, {
				rows: [
					{ rowNumber: 1, rawData: JSON.stringify({}) },
					{ rowNumber: 2, rawData: JSON.stringify({}) },
					{ rowNumber: 3, rawData: JSON.stringify({}) },
				],
			});

			const filters: ImportRowFilters = {
				page: 1,
				limit: 2,
			};

			const result = await repository.listRowResults(importRecord.id, filters);

			expect(result.data).toHaveLength(2);
			expect(result.pagination).toEqual({
				page: 1,
				limit: 2,
				total: 3,
				totalPages: 2,
			});
		});

		it("should filter by status", async () => {
			const importRecord = await repository.create(
				organizationId,
				createdBy,
				{
					entityType: "CLIENT",
					fileName: "test.csv",
					fileSize: 1024,
				},
				"https://example.com/test.csv",
			);

			await repository.createRowResults(importRecord.id, {
				rows: [
					{ rowNumber: 1, rawData: JSON.stringify({}) },
					{ rowNumber: 2, rawData: JSON.stringify({}) },
				],
			});

			await repository.updateRowResult(importRecord.id, 1, {
				status: "SUCCESS",
			});

			const filters: ImportRowFilters = {
				page: 1,
				limit: 10,
				status: "SUCCESS",
			};

			const result = await repository.listRowResults(importRecord.id, filters);

			expect(result.data).toHaveLength(1);
			expect(result.data[0].status).toBe("SUCCESS");
		});
	});

	describe("getWithResults", () => {
		it("should get import with row results", async () => {
			const importRecord = await repository.create(
				organizationId,
				createdBy,
				{
					entityType: "CLIENT",
					fileName: "test.csv",
					fileSize: 1024,
				},
				"https://example.com/test.csv",
			);

			await repository.createRowResults(importRecord.id, {
				rows: [
					{ rowNumber: 1, rawData: JSON.stringify({}) },
					{ rowNumber: 2, rawData: JSON.stringify({}) },
				],
			});

			const result = await repository.getWithResults(
				organizationId,
				importRecord.id,
			);

			expect(result).toBeTruthy();
			expect(result?.id).toBe(importRecord.id);
			expect(result?.rowResults).toHaveLength(2);
		});

		it("should return null for non-existent import", async () => {
			const result = await repository.getWithResults(
				organizationId,
				"non_existent",
			);

			expect(result).toBeNull();
		});

		it("should filter row results by status", async () => {
			const importRecord = await repository.create(
				organizationId,
				createdBy,
				{
					entityType: "CLIENT",
					fileName: "test.csv",
					fileSize: 1024,
				},
				"https://example.com/test.csv",
			);

			await repository.createRowResults(importRecord.id, {
				rows: [
					{ rowNumber: 1, rawData: JSON.stringify({}) },
					{ rowNumber: 2, rawData: JSON.stringify({}) },
				],
			});

			await repository.updateRowResult(importRecord.id, 1, {
				status: "SUCCESS",
			});

			const result = await repository.getWithResults(
				organizationId,
				importRecord.id,
				{ page: 1, limit: 10, status: "SUCCESS" },
			);

			expect(result?.rowResults).toHaveLength(1);
			expect(result?.rowResults[0].status).toBe("SUCCESS");
		});
	});

	describe("getRecentRowUpdates", () => {
		it("should get row updates since a specific time", async () => {
			const importRecord = await repository.create(
				organizationId,
				createdBy,
				{
					entityType: "CLIENT",
					fileName: "test.csv",
					fileSize: 1024,
				},
				"https://example.com/test.csv",
			);

			await repository.createRowResults(importRecord.id, {
				rows: [{ rowNumber: 1, rawData: JSON.stringify({}) }],
			});

			const beforeUpdate = new Date();
			// Wait a bit to ensure timestamp difference
			await new Promise((resolve) => setTimeout(resolve, 10));

			await repository.updateRowResult(importRecord.id, 1, {
				status: "SUCCESS",
			});

			const result = await repository.getRecentRowUpdates(
				importRecord.id,
				beforeUpdate,
			);

			expect(result).toHaveLength(1);
			expect(result[0].status).toBe("SUCCESS");
		});
	});

	describe("delete", () => {
		it("should delete an import", async () => {
			const created = await repository.create(
				organizationId,
				createdBy,
				{
					entityType: "CLIENT",
					fileName: "test.csv",
					fileSize: 1024,
				},
				"https://example.com/test.csv",
			);

			await repository.delete(organizationId, created.id);

			const result = await repository.getById(organizationId, created.id);
			expect(result).toBeNull();
		});

		it("should delete import with row results (cascade)", async () => {
			const importRecord = await repository.create(
				organizationId,
				createdBy,
				{
					entityType: "CLIENT",
					fileName: "test.csv",
					fileSize: 1024,
				},
				"https://example.com/test.csv",
			);

			await repository.createRowResults(importRecord.id, {
				rows: [{ rowNumber: 1, rawData: JSON.stringify({}) }],
			});

			await repository.delete(organizationId, importRecord.id);

			const result = await repository.getById(organizationId, importRecord.id);
			expect(result).toBeNull();

			const rows = await repository.listRowResults(importRecord.id, {
				page: 1,
				limit: 10,
			});
			expect(rows.data).toHaveLength(0);
		});

		it("should throw error when deleting non-existent import", async () => {
			await expect(
				repository.delete(organizationId, "non_existent"),
			).rejects.toThrow("IMPORT_NOT_FOUND");
		});

		it("should throw error when deleting import from different organization", async () => {
			const created = await repository.create(
				"other_org",
				createdBy,
				{
					entityType: "CLIENT",
					fileName: "test.csv",
					fileSize: 1024,
				},
				"https://example.com/test.csv",
			);

			await expect(
				repository.delete(organizationId, created.id),
			).rejects.toThrow("IMPORT_NOT_FOUND");
		});
	});
});
