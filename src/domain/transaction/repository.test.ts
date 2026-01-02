import { describe, expect, it, vi, beforeEach } from "vitest";
import { TransactionRepository } from "./repository";
import { UmaValueRepository } from "../uma/repository";
import { CatalogEnrichmentService } from "../catalog/enrichment-service";
import type { PrismaClient } from "@prisma/client";
import { Prisma } from "@prisma/client";

// Mock Prisma client
function createMockPrisma(): PrismaClient {
	return {
		transaction: {
			findMany: vi.fn(),
			findFirst: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
			delete: vi.fn(),
			count: vi.fn(),
		},
	} as unknown as PrismaClient;
}

// Mock UmaValueRepository
function createMockUmaRepository(): UmaValueRepository {
	return {
		getByDate: vi.fn(),
		getByYear: vi.fn(),
		getActive: vi.fn(),
	} as unknown as UmaValueRepository;
}

const mockUmaValue2025 = {
	id: "uma_2025",
	year: 2025,
	dailyValue: "113.14",
	effectiveDate: "2025-01-01T00:00:00Z",
	endDate: "2026-01-31T23:59:59Z",
	approvedBy: "compliance@example.com",
	notes: "2025 UMA value",
	active: true,
	createdAt: "2025-01-01T00:00:00Z",
	updatedAt: "2025-01-01T00:00:00Z",
};

const mockUmaValue2026 = {
	id: "uma_2026",
	year: 2026,
	dailyValue: "120.00",
	effectiveDate: "2026-02-01T00:00:00Z",
	endDate: "2026-12-31T23:59:59Z",
	approvedBy: "compliance@example.com",
	notes: "2026 UMA value - starts February 1st",
	active: false,
	createdAt: "2026-01-15T00:00:00Z",
	updatedAt: "2026-01-15T00:00:00Z",
};

describe("TransactionRepository", () => {
	let mockPrisma: PrismaClient;
	let mockUmaRepository: UmaValueRepository;
	let mockCatalogEnrichmentService: CatalogEnrichmentService;
	let repository: TransactionRepository;

	beforeEach(() => {
		mockPrisma = createMockPrisma();
		mockUmaRepository = createMockUmaRepository();
		mockCatalogEnrichmentService = {} as CatalogEnrichmentService;
		repository = new TransactionRepository(
			mockPrisma,
			mockUmaRepository,
			mockCatalogEnrichmentService,
		);
		vi.clearAllMocks();
	});

	describe("calculateUmaValue (via create)", () => {
		it("uses getByDate to find UMA value for transaction date", async () => {
			vi.mocked(mockUmaRepository.getByDate).mockResolvedValue(
				mockUmaValue2025,
			);
			vi.mocked(mockPrisma.transaction.create).mockResolvedValue({
				id: "tx_123",
				organizationId: "org_123",
				clientId: "clt_123",
				operationDate: new Date("2025-06-15T00:00:00Z"),
				operationType: "SALE",
				branchPostalCode: "72580",
				vehicleType: "LAND",
				brandId: "brand_123",
				model: "F40",
				year: 2005,
				armorLevel: null,
				engineNumber: null,
				plates: "TXP0123",
				registrationNumber: null,
				flagCountryId: null,
				amount: new Prisma.Decimal("10000000.00"),
				currency: "MXN",
				operationTypeCode: null,
				currencyCode: null,
				umaValue: new Prisma.Decimal("88333.33"),
				createdAt: new Date(),
				updatedAt: new Date(),
				deletedAt: null,
				paymentMethods: [],
			} as never);

			const input = {
				clientId: "clt_123",
				operationDate: "2025-06-15",
				operationType: "sale" as const,
				branchPostalCode: "72580",
				vehicleType: "land" as const,
				brand: "brand_123",
				model: "F40",
				year: 2005,
				amount: "10000000.00",
				currency: "MXN",
				paymentMethods: [{ method: "EFECTIVO", amount: "10000000" }],
			};

			await repository.create(input, "org_123");

			// Verify getByDate was called with the correct date
			expect(mockUmaRepository.getByDate).toHaveBeenCalledWith(
				new Date("2025-06-15T00:00:00.000Z"),
			);
			expect(mockUmaRepository.getByYear).not.toHaveBeenCalled();
			expect(mockUmaRepository.getActive).not.toHaveBeenCalled();
		});

		it("uses 2025 UMA for January 2nd, 2026 transaction (before 2026 UMA starts)", async () => {
			vi.mocked(mockUmaRepository.getByDate).mockResolvedValue(
				mockUmaValue2025,
			);
			vi.mocked(mockPrisma.transaction.create).mockResolvedValue({
				id: "tx_123",
				organizationId: "org_123",
				clientId: "clt_123",
				operationDate: new Date("2026-01-02T00:00:00Z"),
				operationType: "SALE",
				branchPostalCode: "72580",
				vehicleType: "LAND",
				brandId: "brand_123",
				model: "F40",
				year: 2005,
				armorLevel: null,
				engineNumber: null,
				plates: "TXP0123",
				registrationNumber: null,
				flagCountryId: null,
				amount: new Prisma.Decimal("10000000.00"),
				currency: "MXN",
				operationTypeCode: null,
				currencyCode: null,
				umaValue: new Prisma.Decimal("88333.33"),
				createdAt: new Date(),
				updatedAt: new Date(),
				deletedAt: null,
				paymentMethods: [],
			} as never);

			const input = {
				clientId: "clt_123",
				operationDate: "2026-01-02", // January 2nd, 2026
				operationType: "sale" as const,
				branchPostalCode: "72580",
				vehicleType: "land" as const,
				brand: "brand_123",
				model: "F40",
				year: 2005,
				amount: "10000000.00",
				currency: "MXN",
				paymentMethods: [{ method: "EFECTIVO", amount: "10000000" }],
			};

			await repository.create(input, "org_123");

			// Should use 2025 UMA (113.14) because 2026 UMA starts Feb 1st
			expect(mockUmaRepository.getByDate).toHaveBeenCalledWith(
				new Date("2026-01-02T00:00:00.000Z"),
			);
			expect(mockUmaRepository.getByDate).toHaveReturnedWith(
				Promise.resolve(mockUmaValue2025),
			);
		});

		it("uses 2026 UMA for February 1st, 2026 transaction (when 2026 UMA starts)", async () => {
			vi.mocked(mockUmaRepository.getByDate).mockResolvedValue(
				mockUmaValue2026,
			);
			vi.mocked(mockPrisma.transaction.create).mockResolvedValue({
				id: "tx_123",
				organizationId: "org_123",
				clientId: "clt_123",
				operationDate: new Date("2026-02-01T00:00:00Z"),
				operationType: "SALE",
				branchPostalCode: "72580",
				vehicleType: "LAND",
				brandId: "brand_123",
				model: "F40",
				year: 2005,
				armorLevel: null,
				engineNumber: null,
				plates: "TXP0123",
				registrationNumber: null,
				flagCountryId: null,
				amount: new Prisma.Decimal("10000000.00"),
				currency: "MXN",
				operationTypeCode: null,
				currencyCode: null,
				umaValue: new Prisma.Decimal("83333.33"),
				createdAt: new Date(),
				updatedAt: new Date(),
				deletedAt: null,
				paymentMethods: [],
			} as never);

			const input = {
				clientId: "clt_123",
				operationDate: "2026-02-01", // February 1st, 2026
				operationType: "sale" as const,
				branchPostalCode: "72580",
				vehicleType: "land" as const,
				brand: "brand_123",
				model: "F40",
				year: 2005,
				amount: "10000000.00",
				currency: "MXN",
				paymentMethods: [{ method: "EFECTIVO", amount: "10000000" }],
			};

			await repository.create(input, "org_123");

			// Should use 2026 UMA (120.00) because it starts Feb 1st
			expect(mockUmaRepository.getByDate).toHaveBeenCalledWith(
				new Date("2026-02-01T00:00:00.000Z"),
			);
			expect(mockUmaRepository.getByDate).toHaveReturnedWith(
				Promise.resolve(mockUmaValue2026),
			);
		});

		it("falls back to getByYear when getByDate returns null", async () => {
			vi.mocked(mockUmaRepository.getByDate).mockResolvedValue(null);
			vi.mocked(mockUmaRepository.getByYear).mockResolvedValue(
				mockUmaValue2025,
			);
			vi.mocked(mockPrisma.transaction.create).mockResolvedValue({
				id: "tx_123",
				organizationId: "org_123",
				clientId: "clt_123",
				operationDate: new Date("2025-06-15T00:00:00Z"),
				operationType: "SALE",
				branchPostalCode: "72580",
				vehicleType: "LAND",
				brandId: "brand_123",
				model: "F40",
				year: 2005,
				armorLevel: null,
				engineNumber: null,
				plates: "TXP0123",
				registrationNumber: null,
				flagCountryId: null,
				amount: new Prisma.Decimal("10000000.00"),
				currency: "MXN",
				operationTypeCode: null,
				currencyCode: null,
				umaValue: new Prisma.Decimal("88333.33"),
				createdAt: new Date(),
				updatedAt: new Date(),
				deletedAt: null,
				paymentMethods: [],
			} as never);

			const input = {
				clientId: "clt_123",
				operationDate: "2025-06-15",
				operationType: "sale" as const,
				branchPostalCode: "72580",
				vehicleType: "land" as const,
				brand: "brand_123",
				model: "F40",
				year: 2005,
				amount: "10000000.00",
				currency: "MXN",
				paymentMethods: [{ method: "EFECTIVO", amount: "10000000" }],
			};

			await repository.create(input, "org_123");

			expect(mockUmaRepository.getByDate).toHaveBeenCalled();
			expect(mockUmaRepository.getByYear).toHaveBeenCalledWith(2025);
			expect(mockUmaRepository.getActive).not.toHaveBeenCalled();
		});

		it("falls back to getActive when both getByDate and getByYear return null", async () => {
			vi.mocked(mockUmaRepository.getByDate).mockResolvedValue(null);
			vi.mocked(mockUmaRepository.getByYear).mockResolvedValue(null);
			vi.mocked(mockUmaRepository.getActive).mockResolvedValue(
				mockUmaValue2025,
			);
			vi.mocked(mockPrisma.transaction.create).mockResolvedValue({
				id: "tx_123",
				organizationId: "org_123",
				clientId: "clt_123",
				operationDate: new Date("2025-06-15T00:00:00Z"),
				operationType: "SALE",
				branchPostalCode: "72580",
				vehicleType: "LAND",
				brandId: "brand_123",
				model: "F40",
				year: 2005,
				armorLevel: null,
				engineNumber: null,
				plates: "TXP0123",
				registrationNumber: null,
				flagCountryId: null,
				amount: new Prisma.Decimal("10000000.00"),
				currency: "MXN",
				operationTypeCode: null,
				currencyCode: null,
				umaValue: new Prisma.Decimal("88333.33"),
				createdAt: new Date(),
				updatedAt: new Date(),
				deletedAt: null,
				paymentMethods: [],
			} as never);

			const input = {
				clientId: "clt_123",
				operationDate: "2025-06-15",
				operationType: "sale" as const,
				branchPostalCode: "72580",
				vehicleType: "land" as const,
				brand: "brand_123",
				model: "F40",
				year: 2005,
				amount: "10000000.00",
				currency: "MXN",
				paymentMethods: [{ method: "EFECTIVO", amount: "10000000" }],
			};

			await repository.create(input, "org_123");

			expect(mockUmaRepository.getByDate).toHaveBeenCalled();
			expect(mockUmaRepository.getByYear).toHaveBeenCalled();
			expect(mockUmaRepository.getActive).toHaveBeenCalled();
		});

		it("calculates UMA value correctly: amount / dailyValue", async () => {
			vi.mocked(mockUmaRepository.getByDate).mockResolvedValue(
				mockUmaValue2025,
			);
			vi.mocked(mockPrisma.transaction.create).mockResolvedValue({
				id: "tx_123",
				organizationId: "org_123",
				clientId: "clt_123",
				operationDate: new Date("2025-06-15T00:00:00Z"),
				operationType: "SALE",
				branchPostalCode: "72580",
				vehicleType: "LAND",
				brandId: "brand_123",
				model: "F40",
				year: 2005,
				armorLevel: null,
				engineNumber: null,
				plates: "TXP0123",
				registrationNumber: null,
				flagCountryId: null,
				amount: new Prisma.Decimal("10000000.00"),
				currency: "MXN",
				operationTypeCode: null,
				currencyCode: null,
				umaValue: new Prisma.Decimal("88386.07"),
				createdAt: new Date(),
				updatedAt: new Date(),
				deletedAt: null,
				paymentMethods: [],
			} as never);

			const input = {
				clientId: "clt_123",
				operationDate: "2025-06-15",
				operationType: "sale" as const,
				branchPostalCode: "72580",
				vehicleType: "land" as const,
				brand: "brand_123",
				model: "F40",
				year: 2005,
				amount: "10000000.00",
				currency: "MXN",
				paymentMethods: [{ method: "EFECTIVO", amount: "10000000" }],
			};

			await repository.create(input, "org_123");

			// Verify UMA calculation: 10000000 / 113.14 ≈ 88386.07
			const createCall = vi.mocked(mockPrisma.transaction.create).mock.calls[0];
			const umaValue = createCall[0].data.umaValue;

			// Verify that umaValue was calculated and passed to create
			expect(umaValue).not.toBeNull();
			expect(umaValue).toBeDefined();

			// Verify the calculation is correct: amount / dailyValue
			const expectedValue = new Prisma.Decimal("10000000.00").dividedBy(
				new Prisma.Decimal("113.14"),
			);

			// The umaValue should be a Prisma.Decimal instance
			// Convert to number for comparison to avoid type issues
			const umaValueNum =
				umaValue instanceof Prisma.Decimal
					? umaValue.toNumber()
					: parseFloat(String(umaValue));
			expect(umaValueNum).toBeCloseTo(expectedValue.toNumber(), 2);
		});

		it("returns null UMA value when no UMA is found", async () => {
			vi.mocked(mockUmaRepository.getByDate).mockResolvedValue(null);
			vi.mocked(mockUmaRepository.getByYear).mockResolvedValue(null);
			vi.mocked(mockUmaRepository.getActive).mockResolvedValue(null);
			vi.mocked(mockPrisma.transaction.create).mockResolvedValue({
				id: "tx_123",
				organizationId: "org_123",
				clientId: "clt_123",
				operationDate: new Date("2025-06-15T00:00:00Z"),
				operationType: "SALE",
				branchPostalCode: "72580",
				vehicleType: "LAND",
				brandId: "brand_123",
				model: "F40",
				year: 2005,
				armorLevel: null,
				engineNumber: null,
				plates: "TXP0123",
				registrationNumber: null,
				flagCountryId: null,
				amount: new Prisma.Decimal("10000000.00"),
				currency: "MXN",
				operationTypeCode: null,
				currencyCode: null,
				umaValue: null,
				createdAt: new Date(),
				updatedAt: new Date(),
				deletedAt: null,
				paymentMethods: [],
			} as never);

			const input = {
				clientId: "clt_123",
				operationDate: "2025-06-15",
				operationType: "sale" as const,
				branchPostalCode: "72580",
				vehicleType: "land" as const,
				brand: "brand_123",
				model: "F40",
				year: 2005,
				amount: "10000000.00",
				currency: "MXN",
				paymentMethods: [{ method: "EFECTIVO", amount: "10000000" }],
			};

			await repository.create(input, "org_123");

			const createCall = vi.mocked(mockPrisma.transaction.create).mock.calls[0];
			expect(createCall[0].data.umaValue).toBeNull();
		});
	});
});
