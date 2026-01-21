import { describe, it, expect } from "vitest";
import {
	ImportCreateSchema,
	ImportFilterSchema,
	ImportRowFilterSchema,
	ImportProgressUpdateSchema,
	ImportStatusUpdateSchema,
	ImportBulkRowCreateSchema,
	ImportIdParamSchema,
} from "../../../src/domain/import/schemas";

describe("Import Schemas", () => {
	describe("ImportIdParamSchema", () => {
		it("should validate correct import ID format", () => {
			const result = ImportIdParamSchema.safeParse({ id: "IMP123456789" });
			expect(result.success).toBe(true);
		});

		it("should reject invalid import ID format", () => {
			const result = ImportIdParamSchema.safeParse({ id: "invalid" });
			expect(result.success).toBe(false);
		});

		it("should reject import ID with wrong prefix", () => {
			const result = ImportIdParamSchema.safeParse({ id: "ABC123456789" });
			expect(result.success).toBe(false);
		});
	});

	describe("ImportCreateSchema", () => {
		it("should validate correct input for CLIENT", () => {
			const result = ImportCreateSchema.safeParse({
				entityType: "CLIENT",
				fileName: "clients.csv",
				fileSize: 1024,
			});
			expect(result.success).toBe(true);
			expect(result.data).toEqual({
				entityType: "CLIENT",
				fileName: "clients.csv",
				fileSize: 1024,
			});
		});

		it("should validate correct input for TRANSACTION", () => {
			const result = ImportCreateSchema.safeParse({
				entityType: "TRANSACTION",
				fileName: "transactions.xlsx",
				fileSize: 2048,
			});
			expect(result.success).toBe(true);
		});

		it("should reject invalid entity type", () => {
			const result = ImportCreateSchema.safeParse({
				entityType: "INVALID",
				fileName: "file.csv",
				fileSize: 1024,
			});
			expect(result.success).toBe(false);
		});

		it("should reject file size over 50MB", () => {
			const result = ImportCreateSchema.safeParse({
				entityType: "CLIENT",
				fileName: "file.csv",
				fileSize: 60 * 1024 * 1024,
			});
			expect(result.success).toBe(false);
		});

		it("should reject empty file name", () => {
			const result = ImportCreateSchema.safeParse({
				entityType: "CLIENT",
				fileName: "",
				fileSize: 1024,
			});
			expect(result.success).toBe(false);
		});
	});

	describe("ImportFilterSchema", () => {
		it("should provide defaults for page and limit", () => {
			const result = ImportFilterSchema.safeParse({});
			expect(result.success).toBe(true);
			expect(result.data).toEqual({
				page: 1,
				limit: 10,
			});
		});

		it("should accept valid status filter", () => {
			const result = ImportFilterSchema.safeParse({
				status: "PROCESSING",
			});
			expect(result.success).toBe(true);
			expect(result.data?.status).toBe("PROCESSING");
		});

		it("should accept valid entity type filter", () => {
			const result = ImportFilterSchema.safeParse({
				entityType: "CLIENT",
			});
			expect(result.success).toBe(true);
			expect(result.data?.entityType).toBe("CLIENT");
		});

		it("should coerce string page and limit to numbers", () => {
			const result = ImportFilterSchema.safeParse({
				page: "2",
				limit: "25",
			});
			expect(result.success).toBe(true);
			expect(result.data).toEqual({
				page: 2,
				limit: 25,
			});
		});
	});

	describe("ImportRowFilterSchema", () => {
		it("should provide defaults for page and limit", () => {
			const result = ImportRowFilterSchema.safeParse({});
			expect(result.success).toBe(true);
			expect(result.data).toEqual({
				page: 1,
				limit: 50,
			});
		});

		it("should accept valid row status filter", () => {
			const result = ImportRowFilterSchema.safeParse({
				status: "ERROR",
			});
			expect(result.success).toBe(true);
			expect(result.data?.status).toBe("ERROR");
		});
	});

	describe("ImportProgressUpdateSchema", () => {
		it("should validate success progress update", () => {
			const result = ImportProgressUpdateSchema.safeParse({
				rowNumber: 1,
				status: "SUCCESS",
				entityId: "CLT123456789",
				message: "Created successfully",
			});
			expect(result.success).toBe(true);
		});

		it("should validate error progress update with errors array", () => {
			const result = ImportProgressUpdateSchema.safeParse({
				rowNumber: 5,
				status: "ERROR",
				errors: ["Invalid email format", "Missing required field"],
				message: "Validation failed",
			});
			expect(result.success).toBe(true);
			expect(result.data?.errors).toHaveLength(2);
		});

		it("should reject invalid row number", () => {
			const result = ImportProgressUpdateSchema.safeParse({
				rowNumber: 0,
				status: "SUCCESS",
			});
			expect(result.success).toBe(false);
		});
	});

	describe("ImportStatusUpdateSchema", () => {
		it("should validate status update with counts", () => {
			const result = ImportStatusUpdateSchema.safeParse({
				status: "COMPLETED",
				totalRows: 100,
				processedRows: 100,
				successCount: 95,
				warningCount: 3,
				errorCount: 2,
			});
			expect(result.success).toBe(true);
		});

		it("should validate status update with error message", () => {
			const result = ImportStatusUpdateSchema.safeParse({
				status: "FAILED",
				errorMessage: "Connection lost",
			});
			expect(result.success).toBe(true);
		});

		it("should reject invalid status", () => {
			const result = ImportStatusUpdateSchema.safeParse({
				status: "INVALID",
			});
			expect(result.success).toBe(false);
		});
	});

	describe("ImportBulkRowCreateSchema", () => {
		it("should validate bulk row creation", () => {
			const result = ImportBulkRowCreateSchema.safeParse({
				rows: [
					{ rowNumber: 1, rawData: '{"name":"John"}' },
					{ rowNumber: 2, rawData: '{"name":"Jane"}' },
				],
			});
			expect(result.success).toBe(true);
			expect(result.data?.rows).toHaveLength(2);
		});

		it("should reject row with invalid row number", () => {
			const result = ImportBulkRowCreateSchema.safeParse({
				rows: [{ rowNumber: 0, rawData: "{}" }],
			});
			expect(result.success).toBe(false);
		});
	});
});
