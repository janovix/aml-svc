import { describe, it, expect } from "vitest";
import {
	mapPrismaImport,
	mapPrismaImportRowResult,
	toPrismaEntityType,
	toPrismaImportStatus,
	toPrismaRowStatus,
} from "../../../src/domain/import/mappers";

describe("Import Mappers", () => {
	describe("mapPrismaImport", () => {
		it("should map Prisma Import to ImportEntity", () => {
			const prismaImport = {
				id: "IMP123456789",
				organizationId: "org-123",
				entityType: "CLIENT" as const,
				fileName: "clients.csv",
				fileUrl: "imports/org-123/clients.csv",
				fileSize: 1024,
				status: "PROCESSING" as const,
				totalRows: 100,
				processedRows: 50,
				successCount: 45,
				warningCount: 3,
				errorCount: 2,
				errorMessage: null,
				createdBy: "user-123",
				startedAt: new Date("2025-01-15T10:00:00Z"),
				completedAt: null,
				createdAt: new Date("2025-01-15T09:00:00Z"),
				updatedAt: new Date("2025-01-15T10:30:00Z"),
			};

			const result = mapPrismaImport(prismaImport);

			expect(result.id).toBe("IMP123456789");
			expect(result.organizationId).toBe("org-123");
			expect(result.entityType).toBe("CLIENT");
			expect(result.fileName).toBe("clients.csv");
			expect(result.status).toBe("PROCESSING");
			expect(result.totalRows).toBe(100);
			expect(result.processedRows).toBe(50);
			expect(result.startedAt).toBe("2025-01-15T10:00:00.000Z");
			expect(result.completedAt).toBeNull();
		});
	});

	describe("mapPrismaImportRowResult", () => {
		it("should map Prisma ImportRowResult to ImportRowResultEntity", () => {
			const prismaRow = {
				id: "IRR123456789",
				importId: "IMP123456789",
				rowNumber: 1,
				status: "SUCCESS" as const,
				rawData: '{"name":"John"}',
				entityId: "CLT123456789",
				message: "Created successfully",
				errors: null,
				createdAt: new Date("2025-01-15T10:00:00Z"),
				updatedAt: new Date("2025-01-15T10:00:00Z"),
			};

			const result = mapPrismaImportRowResult(prismaRow);

			expect(result.id).toBe("IRR123456789");
			expect(result.importId).toBe("IMP123456789");
			expect(result.rowNumber).toBe(1);
			expect(result.status).toBe("SUCCESS");
			expect(result.rawData).toBe('{"name":"John"}');
			expect(result.entityId).toBe("CLT123456789");
			expect(result.message).toBe("Created successfully");
		});
	});

	describe("toPrismaEntityType", () => {
		it("should convert CLIENT to Prisma enum", () => {
			expect(toPrismaEntityType("CLIENT")).toBe("CLIENT");
			expect(toPrismaEntityType("client")).toBe("CLIENT");
		});

		it("should convert TRANSACTION to Prisma enum", () => {
			expect(toPrismaEntityType("TRANSACTION")).toBe("TRANSACTION");
			expect(toPrismaEntityType("transaction")).toBe("TRANSACTION");
		});

		it("should throw for invalid entity type", () => {
			expect(() => toPrismaEntityType("INVALID")).toThrow(
				"Invalid entity type",
			);
		});
	});

	describe("toPrismaImportStatus", () => {
		it("should convert all valid statuses", () => {
			expect(toPrismaImportStatus("PENDING")).toBe("PENDING");
			expect(toPrismaImportStatus("VALIDATING")).toBe("VALIDATING");
			expect(toPrismaImportStatus("PROCESSING")).toBe("PROCESSING");
			expect(toPrismaImportStatus("COMPLETED")).toBe("COMPLETED");
			expect(toPrismaImportStatus("FAILED")).toBe("FAILED");
		});

		it("should be case-insensitive", () => {
			expect(toPrismaImportStatus("pending")).toBe("PENDING");
			expect(toPrismaImportStatus("Processing")).toBe("PROCESSING");
		});

		it("should throw for invalid status", () => {
			expect(() => toPrismaImportStatus("INVALID")).toThrow(
				"Invalid import status",
			);
		});
	});

	describe("toPrismaRowStatus", () => {
		it("should convert all valid row statuses", () => {
			expect(toPrismaRowStatus("PENDING")).toBe("PENDING");
			expect(toPrismaRowStatus("SUCCESS")).toBe("SUCCESS");
			expect(toPrismaRowStatus("WARNING")).toBe("WARNING");
			expect(toPrismaRowStatus("ERROR")).toBe("ERROR");
			expect(toPrismaRowStatus("SKIPPED")).toBe("SKIPPED");
		});

		it("should throw for invalid row status", () => {
			expect(() => toPrismaRowStatus("INVALID")).toThrow("Invalid row status");
		});
	});
});
