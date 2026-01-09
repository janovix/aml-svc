import { describe, expect, it, vi, beforeEach } from "vitest";
import { UmaValueRepository } from "./repository";
import type { PrismaClient } from "@prisma/client";
import { Prisma } from "@prisma/client";

// Mock Prisma client
function createMockPrisma(): PrismaClient {
	return {
		umaValue: {
			findMany: vi.fn(),
			findUnique: vi.fn(),
			findFirst: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
			updateMany: vi.fn(),
			delete: vi.fn(),
			count: vi.fn(),
		},
	} as unknown as PrismaClient;
}

const mockUmaValue2025 = {
	id: "uma_2025",
	year: 2025,
	dailyValue: new Prisma.Decimal("113.14"),
	effectiveDate: new Date("2025-01-01T00:00:00Z"),
	endDate: new Date("2026-01-31T23:59:59Z"),
	approvedBy: "compliance@example.com",
	notes: "2025 UMA value",
	active: true,
	createdAt: new Date("2025-01-01T00:00:00Z"),
	updatedAt: new Date("2025-01-01T00:00:00Z"),
};

const mockUmaValue2026 = {
	id: "uma_2026",
	year: 2026,
	dailyValue: new Prisma.Decimal("120.00"),
	effectiveDate: new Date("2026-02-01T00:00:00Z"),
	endDate: new Date("2026-12-31T23:59:59Z"),
	approvedBy: "compliance@example.com",
	notes: "2026 UMA value - starts February 1st",
	active: false,
	createdAt: new Date("2026-01-15T00:00:00Z"),
	updatedAt: new Date("2026-01-15T00:00:00Z"),
};

describe("UmaValueRepository", () => {
	let mockPrisma: PrismaClient;
	let repository: UmaValueRepository;

	beforeEach(() => {
		mockPrisma = createMockPrisma();
		repository = new UmaValueRepository(mockPrisma);
		vi.clearAllMocks();
	});

	describe("getByDate", () => {
		it("returns UMA value effective for a specific date", async () => {
			vi.mocked(mockPrisma.umaValue.findMany).mockResolvedValue([
				mockUmaValue2025,
			] as never);

			const date = new Date("2025-06-15T00:00:00Z");
			const result = await repository.getByDate(date);

			expect(result).not.toBeNull();
			expect(result?.year).toBe(2025);
			expect(result?.dailyValue).toBe("113.14");
			expect(mockPrisma.umaValue.findMany).toHaveBeenCalledWith({
				where: {
					AND: [
						{ effectiveDate: { lte: date } },
						{
							OR: [{ endDate: null }, { endDate: { gte: date } }],
						},
					],
				},
				orderBy: { effectiveDate: "desc" },
				take: 1,
			});
		});

		it("returns 2025 UMA for January 2nd, 2026 (before 2026 UMA starts)", async () => {
			vi.mocked(mockPrisma.umaValue.findMany).mockResolvedValue([
				mockUmaValue2025,
			] as never);

			const date = new Date("2026-01-02T00:00:00Z");
			const result = await repository.getByDate(date);

			expect(result).not.toBeNull();
			expect(result?.year).toBe(2025);
			expect(result?.dailyValue).toBe("113.14");
		});

		it("returns 2026 UMA for February 1st, 2026 (when 2026 UMA starts)", async () => {
			vi.mocked(mockPrisma.umaValue.findMany).mockResolvedValue([
				mockUmaValue2026,
			] as never);

			const date = new Date("2026-02-01T00:00:00Z");
			const result = await repository.getByDate(date);

			expect(result).not.toBeNull();
			expect(result?.year).toBe(2026);
			// Prisma.Decimal("120.00") converts to "120" when mapped, so check the numeric value
			expect(parseFloat(result?.dailyValue || "0")).toBe(120.0);
		});

		it("returns null when no UMA value is effective for the date", async () => {
			vi.mocked(mockPrisma.umaValue.findMany).mockResolvedValue([]);

			const date = new Date("2020-01-01T00:00:00Z");
			const result = await repository.getByDate(date);

			expect(result).toBeNull();
		});

		it("handles UMA values with null endDate (no expiration)", async () => {
			const umaValueNoEnd = {
				...mockUmaValue2025,
				endDate: null,
			};

			vi.mocked(mockPrisma.umaValue.findMany).mockResolvedValue([
				umaValueNoEnd,
			] as never);

			const date = new Date("2030-01-01T00:00:00Z");
			const result = await repository.getByDate(date);

			expect(result).not.toBeNull();
			expect(result?.year).toBe(2025);
		});

		it("returns most recent UMA when multiple values are effective", async () => {
			vi.mocked(mockPrisma.umaValue.findMany).mockResolvedValue([
				mockUmaValue2025, // Most recent (ordered by effectiveDate desc)
			] as never);

			const date = new Date("2025-06-15T00:00:00Z");
			const result = await repository.getByDate(date);

			expect(result).not.toBeNull();
			expect(result?.year).toBe(2025);
			// Verify it was ordered by effectiveDate desc
			expect(mockPrisma.umaValue.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					orderBy: { effectiveDate: "desc" },
					take: 1,
				}),
			);
		});
	});

	describe("getActive", () => {
		it("returns the active UMA value", async () => {
			vi.mocked(mockPrisma.umaValue.findFirst).mockResolvedValue(
				mockUmaValue2025 as never,
			);

			const result = await repository.getActive();

			expect(result).not.toBeNull();
			expect(result?.year).toBe(2025);
			expect(result?.active).toBe(true);
			expect(mockPrisma.umaValue.findFirst).toHaveBeenCalledWith({
				where: { active: true },
				orderBy: { year: "desc" },
			});
		});

		it("returns null when no active UMA value exists", async () => {
			vi.mocked(mockPrisma.umaValue.findFirst).mockResolvedValue(null);

			const result = await repository.getActive();

			expect(result).toBeNull();
		});
	});

	describe("getByYear", () => {
		it("returns UMA value for a specific year", async () => {
			vi.mocked(mockPrisma.umaValue.findUnique).mockResolvedValue(
				mockUmaValue2025 as never,
			);

			const result = await repository.getByYear(2025);

			expect(result).not.toBeNull();
			expect(result?.year).toBe(2025);
			expect(mockPrisma.umaValue.findUnique).toHaveBeenCalledWith({
				where: { year: 2025 },
			});
		});

		it("returns null when no UMA value exists for the year", async () => {
			vi.mocked(mockPrisma.umaValue.findUnique).mockResolvedValue(null);

			const result = await repository.getByYear(2020);

			expect(result).toBeNull();
		});
	});
});
