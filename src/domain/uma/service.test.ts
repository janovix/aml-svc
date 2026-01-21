import { describe, it, expect, beforeEach, vi } from "vitest";
import { UmaValueService } from "./service";
import type { UmaValueRepository } from "./repository";
import type { UmaValueEntity } from "./types";

describe("UmaValueService", () => {
	let service: UmaValueService;
	let mockRepository: UmaValueRepository;

	const mockUmaValue: UmaValueEntity = {
		id: "uma-123",
		year: 2024,
		dailyValue: "108.57",
		effectiveDate: "2024-01-01T00:00:00Z",
		endDate: null,
		approvedBy: null,
		notes: null,
		active: true,
		createdAt: "2024-01-01T00:00:00Z",
		updatedAt: "2024-01-01T00:00:00Z",
	};

	beforeEach(() => {
		mockRepository = {
			list: vi.fn(),
			getById: vi.fn(),
			getByYear: vi.fn(),
			getActive: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
			patch: vi.fn(),
			delete: vi.fn(),
			activate: vi.fn(),
		} as unknown as UmaValueRepository;

		service = new UmaValueService(mockRepository);
	});

	describe("list", () => {
		it("should call repository list", async () => {
			const filters = { page: 1, limit: 10 };
			vi.mocked(mockRepository.list).mockResolvedValue({
				data: [mockUmaValue],
				pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
			});

			const result = await service.list(filters);

			expect(mockRepository.list).toHaveBeenCalledWith(filters);
			expect(result.data).toHaveLength(1);
		});
	});

	describe("get", () => {
		it("should return UMA value when found", async () => {
			vi.mocked(mockRepository.getById).mockResolvedValue(mockUmaValue);

			const result = await service.get("uma-123");

			expect(mockRepository.getById).toHaveBeenCalledWith("uma-123");
			expect(result).toEqual(mockUmaValue);
		});

		it("should throw error when UMA value not found", async () => {
			vi.mocked(mockRepository.getById).mockResolvedValue(null);

			await expect(service.get("non-existent")).rejects.toThrow(
				"UMA_VALUE_NOT_FOUND",
			);
		});
	});

	describe("getByYear", () => {
		it("should return UMA value for year", async () => {
			vi.mocked(mockRepository.getByYear).mockResolvedValue(mockUmaValue);

			const result = await service.getByYear(2024);

			expect(mockRepository.getByYear).toHaveBeenCalledWith(2024);
			expect(result).toEqual(mockUmaValue);
		});

		it("should return null when not found", async () => {
			vi.mocked(mockRepository.getByYear).mockResolvedValue(null);

			const result = await service.getByYear(2025);

			expect(result).toBeNull();
		});
	});

	describe("getActive", () => {
		it("should return active UMA value", async () => {
			vi.mocked(mockRepository.getActive).mockResolvedValue(mockUmaValue);

			const result = await service.getActive();

			expect(mockRepository.getActive).toHaveBeenCalled();
			expect(result).toEqual(mockUmaValue);
		});

		it("should return null when no active UMA value", async () => {
			vi.mocked(mockRepository.getActive).mockResolvedValue(null);

			const result = await service.getActive();

			expect(result).toBeNull();
		});
	});

	describe("create", () => {
		it("should create UMA value", async () => {
			const input = {
				year: 2025,
				dailyValue: 110.0,
				effectiveDate: "2025-01-01T00:00:00Z",
				active: false,
			};

			vi.mocked(mockRepository.create).mockResolvedValue({
				...mockUmaValue,
				year: 2025,
				dailyValue: "110.00",
			});

			const result = await service.create(input);

			expect(mockRepository.create).toHaveBeenCalledWith(input);
			expect(result.year).toBe(2025);
		});
	});

	describe("update", () => {
		it("should update UMA value", async () => {
			const input = {
				year: 2024,
				dailyValue: 109.0,
				effectiveDate: "2024-01-01T00:00:00Z",
				active: true,
			};
			vi.mocked(mockRepository.update).mockResolvedValue({
				...mockUmaValue,
				dailyValue: "109.00",
			});

			const result = await service.update("uma-123", input);

			expect(mockRepository.update).toHaveBeenCalledWith("uma-123", input);
			expect(result.dailyValue).toBe("109.00");
		});
	});

	describe("patch", () => {
		it("should patch UMA value", async () => {
			const input = { dailyValue: 110.0 };
			vi.mocked(mockRepository.patch).mockResolvedValue({
				...mockUmaValue,
				dailyValue: "110.00",
			});

			const result = await service.patch("uma-123", input);

			expect(mockRepository.patch).toHaveBeenCalledWith("uma-123", input);
			expect(result.dailyValue).toBe("110.00");
		});
	});

	describe("delete", () => {
		it("should delete UMA value", async () => {
			vi.mocked(mockRepository.delete).mockResolvedValue(undefined);

			await service.delete("uma-123");

			expect(mockRepository.delete).toHaveBeenCalledWith("uma-123");
		});
	});

	describe("activate", () => {
		it("should activate UMA value", async () => {
			vi.mocked(mockRepository.activate).mockResolvedValue({
				...mockUmaValue,
				active: true,
			});

			const result = await service.activate("uma-123");

			expect(mockRepository.activate).toHaveBeenCalledWith("uma-123");
			expect(result.active).toBe(true);
		});
	});
});
