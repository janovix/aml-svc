import { describe, expect, it, vi, beforeEach } from "vitest";

import { ImportService } from "./service";
import type { ImportRepository } from "./repository";
import type {
	ImportCreateInput,
	ImportFilters,
	ImportRowFilters,
	ImportStatusUpdateInput,
	ImportBulkRowCreateInput,
} from "./schemas";
import type {
	ImportEntity,
	ImportRowResultEntity,
	ImportWithResults,
	ListResult,
} from "./types";

describe("ImportService", () => {
	let service: ImportService;
	let mockRepository: ImportRepository;

	const organizationId = "org_test123";
	const createdBy = "user_test123";

	const mockImport: ImportEntity = {
		id: "import_123",
		organizationId,
		entityType: "CLIENT",
		fileName: "test.csv",
		fileUrl: "https://example.com/test.csv",
		fileSize: 1024,
		status: "PENDING",
		totalRows: 0,
		processedRows: 0,
		successCount: 0,
		warningCount: 0,
		errorCount: 0,
		createdBy,
		createdAt: "2024-01-01T00:00:00Z",
		updatedAt: "2024-01-01T00:00:00Z",
		startedAt: null,
		completedAt: null,
		errorMessage: null,
	};

	beforeEach(() => {
		mockRepository = {
			list: vi.fn(),
			getById: vi.fn(),
			getWithResults: vi.fn(),
			create: vi.fn(),
			updateStatus: vi.fn(),
			incrementCounts: vi.fn(),
			createRowResults: vi.fn(),
			updateRowResult: vi.fn(),
			listRowResults: vi.fn(),
			getRecentRowUpdates: vi.fn(),
			delete: vi.fn(),
		} as unknown as ImportRepository;

		service = new ImportService(mockRepository);
	});

	describe("list", () => {
		it("should list imports for organization", async () => {
			const filters: ImportFilters = {
				page: 1,
				limit: 10,
			};

			const expected: ListResult<ImportEntity> = {
				data: [mockImport],
				pagination: {
					page: 1,
					limit: 10,
					total: 1,
					totalPages: 1,
				},
			};

			vi.mocked(mockRepository.list).mockResolvedValue(expected);

			const result = await service.list(organizationId, filters);

			expect(result).toEqual(expected);
			expect(mockRepository.list).toHaveBeenCalledWith(organizationId, filters);
		});
	});

	describe("get", () => {
		it("should get import by ID", async () => {
			vi.mocked(mockRepository.getById).mockResolvedValue(mockImport);

			const result = await service.get(organizationId, mockImport.id);

			expect(result).toEqual(mockImport);
			expect(mockRepository.getById).toHaveBeenCalledWith(
				organizationId,
				mockImport.id,
			);
		});

		it("should throw error when import not found", async () => {
			vi.mocked(mockRepository.getById).mockResolvedValue(null);

			await expect(service.get(organizationId, "non_existent")).rejects.toThrow(
				"IMPORT_NOT_FOUND",
			);
		});
	});

	describe("getWithResults", () => {
		it("should get import with row results", async () => {
			const mockWithResults: ImportWithResults = {
				...mockImport,
				rowResults: [],
			};

			vi.mocked(mockRepository.getWithResults).mockResolvedValue(
				mockWithResults,
			);

			const result = await service.getWithResults(
				organizationId,
				mockImport.id,
			);

			expect(result).toEqual(mockWithResults);
			expect(mockRepository.getWithResults).toHaveBeenCalledWith(
				organizationId,
				mockImport.id,
				undefined,
			);
		});

		it("should get import with filtered row results", async () => {
			const mockWithResults: ImportWithResults = {
				...mockImport,
				rowResults: [],
			};

			const rowFilters: ImportRowFilters = {
				page: 1,
				limit: 10,
				status: "SUCCESS",
			};

			vi.mocked(mockRepository.getWithResults).mockResolvedValue(
				mockWithResults,
			);

			const result = await service.getWithResults(
				organizationId,
				mockImport.id,
				rowFilters,
			);

			expect(result).toEqual(mockWithResults);
			expect(mockRepository.getWithResults).toHaveBeenCalledWith(
				organizationId,
				mockImport.id,
				rowFilters,
			);
		});

		it("should throw error when import not found", async () => {
			vi.mocked(mockRepository.getWithResults).mockResolvedValue(null);

			await expect(
				service.getWithResults(organizationId, "non_existent"),
			).rejects.toThrow("IMPORT_NOT_FOUND");
		});
	});

	describe("create", () => {
		it("should create import and return job", async () => {
			const input: ImportCreateInput = {
				entityType: "CLIENT",
				fileName: "test.csv",
				fileSize: 1024,
			};

			const fileUrl = "https://example.com/test.csv";

			vi.mocked(mockRepository.create).mockResolvedValue(mockImport);

			const result = await service.create(
				organizationId,
				createdBy,
				input,
				fileUrl,
			);

			expect(result.import).toEqual(mockImport);
			expect(result.job).toEqual({
				importId: mockImport.id,
				organizationId,
				entityType: mockImport.entityType,
				fileUrl: mockImport.fileUrl,
				createdBy,
			});
			expect(mockRepository.create).toHaveBeenCalledWith(
				organizationId,
				createdBy,
				input,
				fileUrl,
			);
		});
	});

	describe("updateStatus", () => {
		it("should update import status", async () => {
			const update: ImportStatusUpdateInput = {
				status: "VALIDATING",
			};

			vi.mocked(mockRepository.updateStatus).mockResolvedValue(mockImport);

			const result = await service.updateStatus(mockImport.id, update);

			expect(result).toEqual(mockImport);
			expect(mockRepository.updateStatus).toHaveBeenCalledWith(
				mockImport.id,
				update,
			);
		});
	});

	describe("startValidation", () => {
		it("should mark import as validating with total rows", async () => {
			vi.mocked(mockRepository.updateStatus).mockResolvedValue({
				...mockImport,
				status: "VALIDATING",
				totalRows: 100,
			});

			const result = await service.startValidation(mockImport.id, 100);

			expect(result.status).toBe("VALIDATING");
			expect(result.totalRows).toBe(100);
			expect(mockRepository.updateStatus).toHaveBeenCalledWith(mockImport.id, {
				status: "VALIDATING",
				totalRows: 100,
			});
		});
	});

	describe("startProcessing", () => {
		it("should mark import as processing", async () => {
			vi.mocked(mockRepository.updateStatus).mockResolvedValue({
				...mockImport,
				status: "PROCESSING",
			});

			const result = await service.startProcessing(mockImport.id);

			expect(result.status).toBe("PROCESSING");
			expect(mockRepository.updateStatus).toHaveBeenCalledWith(mockImport.id, {
				status: "PROCESSING",
			});
		});
	});

	describe("complete", () => {
		it("should mark import as completed with counts", async () => {
			const counts = {
				successCount: 95,
				warningCount: 3,
				errorCount: 2,
			};

			vi.mocked(mockRepository.updateStatus).mockResolvedValue({
				...mockImport,
				status: "COMPLETED",
				...counts,
			});

			const result = await service.complete(mockImport.id, counts);

			expect(result.status).toBe("COMPLETED");
			expect(result.successCount).toBe(95);
			expect(result.warningCount).toBe(3);
			expect(result.errorCount).toBe(2);
			expect(mockRepository.updateStatus).toHaveBeenCalledWith(mockImport.id, {
				status: "COMPLETED",
				...counts,
			});
		});
	});

	describe("fail", () => {
		it("should mark import as failed with error message", async () => {
			const errorMessage = "File parsing failed";

			vi.mocked(mockRepository.updateStatus).mockResolvedValue({
				...mockImport,
				status: "FAILED",
				errorMessage,
			});

			const result = await service.fail(mockImport.id, errorMessage);

			expect(result.status).toBe("FAILED");
			expect(result.errorMessage).toBe(errorMessage);
			expect(mockRepository.updateStatus).toHaveBeenCalledWith(mockImport.id, {
				status: "FAILED",
				errorMessage,
			});
		});
	});

	describe("createRowResults", () => {
		it("should create row results in bulk", async () => {
			const input: ImportBulkRowCreateInput = {
				rows: [
					{ rowNumber: 1, rawData: JSON.stringify({ name: "Client 1" }) },
					{ rowNumber: 2, rawData: JSON.stringify({ name: "Client 2" }) },
				],
			};

			vi.mocked(mockRepository.createRowResults).mockResolvedValue(undefined);

			await service.createRowResults(mockImport.id, input);

			expect(mockRepository.createRowResults).toHaveBeenCalledWith(
				mockImport.id,
				input,
			);
		});
	});

	describe("updateRowResult", () => {
		it("should update row result with SUCCESS status", async () => {
			const mockRowResult: ImportRowResultEntity = {
				id: "row_123",
				importId: mockImport.id,
				rowNumber: 1,
				rawData: JSON.stringify({ name: "Client 1" }),
				status: "SUCCESS",
				entityId: "client_123",
				message: "Created successfully",
				errors: null,
				createdAt: "2024-01-01T00:00:00Z",
				updatedAt: "2024-01-01T00:00:00Z",
			};

			vi.mocked(mockRepository.updateRowResult).mockResolvedValue(
				mockRowResult,
			);
			vi.mocked(mockRepository.incrementCounts).mockResolvedValue(undefined);

			const result = await service.updateRowResult(mockImport.id, 1, {
				status: "SUCCESS",
				entityId: "client_123",
				message: "Created successfully",
			});

			expect(result).toEqual(mockRowResult);
			expect(mockRepository.incrementCounts).toHaveBeenCalledWith(
				mockImport.id,
				{
					processedRows: 1,
					successCount: 1,
				},
			);
		});

		it("should update row result with WARNING status", async () => {
			const mockRowResult: ImportRowResultEntity = {
				id: "row_123",
				importId: mockImport.id,
				rowNumber: 1,
				rawData: JSON.stringify({ name: "Client 1" }),
				status: "WARNING",
				entityId: "client_123",
				message: "Created with warnings",
				errors: null,
				createdAt: "2024-01-01T00:00:00Z",
				updatedAt: "2024-01-01T00:00:00Z",
			};

			vi.mocked(mockRepository.updateRowResult).mockResolvedValue(
				mockRowResult,
			);
			vi.mocked(mockRepository.incrementCounts).mockResolvedValue(undefined);

			await service.updateRowResult(mockImport.id, 1, {
				status: "WARNING",
				entityId: "client_123",
				message: "Created with warnings",
			});

			expect(mockRepository.incrementCounts).toHaveBeenCalledWith(
				mockImport.id,
				{
					processedRows: 1,
					warningCount: 1,
				},
			);
		});

		it("should update row result with ERROR status", async () => {
			const mockRowResult: ImportRowResultEntity = {
				id: "row_123",
				importId: mockImport.id,
				rowNumber: 1,
				rawData: JSON.stringify({ name: "Client 1" }),
				status: "ERROR",
				entityId: null,
				message: "Validation failed",
				errors: JSON.stringify(["Invalid email"]),
				createdAt: "2024-01-01T00:00:00Z",
				updatedAt: "2024-01-01T00:00:00Z",
			};

			vi.mocked(mockRepository.updateRowResult).mockResolvedValue(
				mockRowResult,
			);
			vi.mocked(mockRepository.incrementCounts).mockResolvedValue(undefined);

			await service.updateRowResult(mockImport.id, 1, {
				status: "ERROR",
				message: "Validation failed",
				errors: ["Invalid email"],
			});

			expect(mockRepository.incrementCounts).toHaveBeenCalledWith(
				mockImport.id,
				{
					processedRows: 1,
					errorCount: 1,
				},
			);
		});

		it("should update row result with SKIPPED status", async () => {
			const mockRowResult: ImportRowResultEntity = {
				id: "row_123",
				importId: mockImport.id,
				rowNumber: 1,
				rawData: JSON.stringify({ name: "Client 1" }),
				status: "SKIPPED",
				entityId: null,
				message: "Duplicate entry",
				errors: null,
				createdAt: "2024-01-01T00:00:00Z",
				updatedAt: "2024-01-01T00:00:00Z",
			};

			vi.mocked(mockRepository.updateRowResult).mockResolvedValue(
				mockRowResult,
			);
			vi.mocked(mockRepository.incrementCounts).mockResolvedValue(undefined);

			await service.updateRowResult(mockImport.id, 1, {
				status: "SKIPPED",
				message: "Duplicate entry",
			});

			expect(mockRepository.incrementCounts).toHaveBeenCalledWith(
				mockImport.id,
				{
					processedRows: 1,
					errorCount: 1,
				},
			);
		});

		it("should return null when row not found", async () => {
			vi.mocked(mockRepository.updateRowResult).mockResolvedValue(null);

			const result = await service.updateRowResult(mockImport.id, 999, {
				status: "SUCCESS",
			});

			expect(result).toBeNull();
			expect(mockRepository.incrementCounts).not.toHaveBeenCalled();
		});
	});

	describe("listRowResults", () => {
		it("should list row results", async () => {
			const filters: ImportRowFilters = {
				page: 1,
				limit: 10,
			};

			const expected: ListResult<ImportRowResultEntity> = {
				data: [],
				pagination: {
					page: 1,
					limit: 10,
					total: 0,
					totalPages: 0,
				},
			};

			vi.mocked(mockRepository.listRowResults).mockResolvedValue(expected);

			const result = await service.listRowResults(mockImport.id, filters);

			expect(result).toEqual(expected);
			expect(mockRepository.listRowResults).toHaveBeenCalledWith(
				mockImport.id,
				filters,
			);
		});
	});

	describe("getRecentRowUpdates", () => {
		it("should get recent row updates", async () => {
			const since = new Date("2024-01-01T00:00:00Z");
			const expected: ImportRowResultEntity[] = [];

			vi.mocked(mockRepository.getRecentRowUpdates).mockResolvedValue(expected);

			const result = await service.getRecentRowUpdates(mockImport.id, since);

			expect(result).toEqual(expected);
			expect(mockRepository.getRecentRowUpdates).toHaveBeenCalledWith(
				mockImport.id,
				since,
			);
		});
	});

	describe("delete", () => {
		it("should delete import", async () => {
			vi.mocked(mockRepository.delete).mockResolvedValue(undefined);

			await service.delete(organizationId, mockImport.id);

			expect(mockRepository.delete).toHaveBeenCalledWith(
				organizationId,
				mockImport.id,
			);
		});
	});
});
