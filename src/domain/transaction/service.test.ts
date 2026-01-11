import { describe, it, expect, beforeEach, vi } from "vitest";
import { TransactionService } from "./service";
import type { TransactionRepository } from "./repository";
import type { ClientRepository } from "../client/repository";
import type { UmaValueRepository } from "../uma/repository";
import type { TransactionEntity } from "./types";
import type { ClientEntity } from "../client/types";

describe("TransactionService", () => {
	let service: TransactionService;
	let mockRepository: TransactionRepository;
	let mockClientRepository: ClientRepository;
	let mockUmaRepository: UmaValueRepository;
	const organizationId = "org-123";

	const mockTransaction: TransactionEntity = {
		id: "transaction-123",
		clientId: "client-123",
		operationDate: "2024-01-15",
		operationType: "purchase",
		branchPostalCode: "06000",
		vehicleType: "land",
		brand: "Toyota",
		model: "Corolla",
		year: 2020,
		armorLevel: null,
		engineNumber: "1HGBH41JXMN109186",
		plates: "ABC-1234",
		registrationNumber: "REPUVE123456",
		flagCountryId: null,
		amount: "500000",
		currency: "MXN",
		operationTypeCode: null,
		currencyCode: null,
		umaValue: null,
		paymentMethods: [],
		createdAt: "2024-01-15T00:00:00Z",
		updatedAt: "2024-01-15T00:00:00Z",
		deletedAt: null,
	};

	const mockClient: Partial<ClientEntity> = {
		id: "client-123",
		rfc: "ABCD123456EF7",
		organizationId,
	};

	beforeEach(() => {
		mockRepository = {
			list: vi.fn(),
			getById: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
			delete: vi.fn(),
			getStats: vi.fn(),
		} as unknown as TransactionRepository;

		mockClientRepository = {
			getById: vi.fn(),
		} as unknown as ClientRepository;

		mockUmaRepository = {} as unknown as UmaValueRepository;

		service = new TransactionService(
			mockRepository,
			mockClientRepository,
			mockUmaRepository,
		);
	});

	describe("list", () => {
		it("should call repository list", async () => {
			const filters = { page: 1, limit: 10 };
			vi.mocked(mockRepository.list).mockResolvedValue({
				data: [mockTransaction],
				pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
			});

			const result = await service.list(organizationId, filters);

			expect(mockRepository.list).toHaveBeenCalledWith(organizationId, filters);
			expect(result.data).toHaveLength(1);
		});
	});

	describe("get", () => {
		it("should return transaction when found", async () => {
			vi.mocked(mockRepository.getById).mockResolvedValue(mockTransaction);

			const result = await service.get(organizationId, "transaction-123");

			expect(mockRepository.getById).toHaveBeenCalledWith(
				organizationId,
				"transaction-123",
			);
			expect(result).toEqual(mockTransaction);
		});

		it("should throw error when transaction not found", async () => {
			vi.mocked(mockRepository.getById).mockResolvedValue(null);

			await expect(service.get(organizationId, "non-existent")).rejects.toThrow(
				"TRANSACTION_NOT_FOUND",
			);
		});
	});

	describe("create", () => {
		it("should create transaction when client exists", async () => {
			const input = {
				clientId: "client-123",
				operationDate: "2024-01-15",
				operationType: "purchase" as const,
				branchPostalCode: "06000",
				vehicleType: "land" as const,
				brand: "Toyota",
				model: "Corolla",
				year: 2020,
				amount: "500000",
				currency: "MXN",
				paymentMethods: [],
			};

			vi.mocked(mockClientRepository.getById).mockResolvedValue(
				mockClient as ClientEntity,
			);
			vi.mocked(mockRepository.create).mockResolvedValue(mockTransaction);

			const result = await service.create(input, organizationId);

			expect(mockClientRepository.getById).toHaveBeenCalledWith(
				organizationId,
				"client-123",
			);
			expect(mockRepository.create).toHaveBeenCalledWith(input, organizationId);
			expect(result).toEqual(mockTransaction);
		});

		it("should throw error when client does not exist", async () => {
			const input = {
				clientId: "non-existent",
				operationDate: "2024-01-15",
				operationType: "purchase" as const,
				branchPostalCode: "06000",
				vehicleType: "land" as const,
				brand: "Toyota",
				model: "Corolla",
				year: 2020,
				amount: "500000",
				currency: "MXN",
				paymentMethods: [],
			};

			vi.mocked(mockClientRepository.getById).mockResolvedValue(null);

			await expect(service.create(input, organizationId)).rejects.toThrow(
				"CLIENT_NOT_FOUND",
			);

			expect(mockRepository.create).not.toHaveBeenCalled();
		});
	});

	describe("update", () => {
		it("should update transaction", async () => {
			const input = {
				operationDate: "2024-01-15",
				operationType: "purchase" as const,
				branchPostalCode: "06000",
				vehicleType: "land" as const,
				brand: "Toyota",
				model: "Corolla",
				year: 2020,
				amount: "600000",
				currency: "MXN",
				paymentMethods: [{ method: "Cash", amount: "600000" }],
				plates: "ABC-1234",
			};
			vi.mocked(mockRepository.update).mockResolvedValue({
				...mockTransaction,
				amount: "600000",
			});

			const result = await service.update(
				organizationId,
				"transaction-123",
				input,
			);

			expect(mockRepository.update).toHaveBeenCalledWith(
				organizationId,
				"transaction-123",
				input,
			);
			expect(result.amount).toBe("600000");
		});
	});

	describe("delete", () => {
		it("should delete transaction", async () => {
			vi.mocked(mockRepository.delete).mockResolvedValue(undefined);

			await service.delete(organizationId, "transaction-123");

			expect(mockRepository.delete).toHaveBeenCalledWith(
				organizationId,
				"transaction-123",
			);
		});
	});

	describe("getStats", () => {
		it("should get transaction stats", async () => {
			const stats = {
				transactionsToday: 10,
				suspiciousTransactions: 2,
				totalVolume: "5000000",
				totalVehicles: 50,
			};

			vi.mocked(mockRepository.getStats).mockResolvedValue(stats);

			const result = await service.getStats(organizationId);

			expect(mockRepository.getStats).toHaveBeenCalledWith(organizationId);
			expect(result).toEqual(stats);
		});
	});
});
