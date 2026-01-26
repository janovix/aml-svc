import { describe, it, expect, beforeEach, vi } from "vitest";
import { UBOService } from "./service";
import type { UBORepository } from "./repository";
import type {
	UBOCreateInput,
	UBOUpdateInput,
	UBOPatchInput,
	PEPStatusUpdateInput,
} from "./schemas";
import type { UBOEntity } from "./types";

describe("UBOService", () => {
	let service: UBOService;
	let mockRepository: UBORepository;

	const mockUBO: UBOEntity = {
		id: "UBO123456789",
		clientId: "CLT123456789",
		firstName: "John",
		lastName: "Doe",
		secondLastName: "Smith",
		birthDate: "1980-01-15T00:00:00.000Z",
		nationality: "US",
		curp: "DOSJ800115HDFRHN01",
		rfc: "DOSJ800115ABC",
		ownershipPercentage: 35.5,
		relationshipType: "SHAREHOLDER",
		position: "CEO",
		email: "john@example.com",
		phone: "+1234567890",
		country: "US",
		stateCode: "CA",
		city: "Los Angeles",
		street: "Main St",
		postalCode: "90001",
		idDocumentId: "DOC123456789",
		addressProofId: "DOC987654321",
		isPEP: false,
		pepStatus: "PENDING",
		pepDetails: null,
		pepMatchConfidence: null,
		pepCheckedAt: null,
		verifiedAt: null,
		verifiedBy: null,
		notes: "Test UBO",
		createdAt: "2024-01-01T00:00:00.000Z",
		updatedAt: "2024-01-01T00:00:00.000Z",
	};

	beforeEach(() => {
		mockRepository = {
			list: vi.fn(),
			getById: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
			patch: vi.fn(),
			delete: vi.fn(),
			updatePEPStatus: vi.fn(),
			getStaleUBOs: vi.fn(),
		} as unknown as UBORepository;

		service = new UBOService(mockRepository);
	});

	describe("list", () => {
		it("should list UBOs for a client", async () => {
			vi.mocked(mockRepository.list).mockResolvedValue({
				data: [mockUBO],
				total: 1,
			});

			const result = await service.list("org-123", "CLT123456789");

			expect(result.data).toHaveLength(1);
			expect(result.total).toBe(1);
			expect(mockRepository.list).toHaveBeenCalledWith(
				"CLT123456789",
				undefined,
			);
		});

		it("should filter by relationship type", async () => {
			vi.mocked(mockRepository.list).mockResolvedValue({
				data: [mockUBO],
				total: 1,
			});

			await service.list("org-123", "CLT123456789", "SHAREHOLDER");

			expect(mockRepository.list).toHaveBeenCalledWith(
				"CLT123456789",
				"SHAREHOLDER",
			);
		});
	});

	describe("get", () => {
		it("should return UBO when found", async () => {
			vi.mocked(mockRepository.getById).mockResolvedValue(mockUBO);

			const result = await service.get(
				"org-123",
				"CLT123456789",
				"UBO123456789",
			);

			expect(result.id).toBe("UBO123456789");
		});

		it("should throw error when UBO not found", async () => {
			vi.mocked(mockRepository.getById).mockResolvedValue(null);

			await expect(
				service.get("org-123", "CLT123456789", "UBO999999999"),
			).rejects.toThrow("UBO_NOT_FOUND");
		});
	});

	describe("create", () => {
		it("should create a shareholder with valid ownership percentage", async () => {
			const input: UBOCreateInput = {
				clientId: "CLT123456789",
				firstName: "John",
				lastName: "Doe",
				relationshipType: "SHAREHOLDER",
				ownershipPercentage: 35.5,
			};

			vi.mocked(mockRepository.list).mockResolvedValue({
				data: [],
				total: 0,
			});
			vi.mocked(mockRepository.create).mockResolvedValue(mockUBO);

			const result = await service.create("org-123", input);

			expect(result.id).toBe("UBO123456789");
			expect(mockRepository.create).toHaveBeenCalledWith(input);
		});

		it("should throw error when shareholder missing ownership percentage", async () => {
			const input: UBOCreateInput = {
				clientId: "CLT123456789",
				firstName: "John",
				lastName: "Doe",
				relationshipType: "SHAREHOLDER",
			};

			await expect(service.create("org-123", input)).rejects.toThrow(
				"OWNERSHIP_PERCENTAGE_REQUIRED_FOR_SHAREHOLDER",
			);
		});

		it("should throw error when ownership percentage below 25%", async () => {
			const input: UBOCreateInput = {
				clientId: "CLT123456789",
				firstName: "John",
				lastName: "Doe",
				relationshipType: "SHAREHOLDER",
				ownershipPercentage: 20,
			};

			await expect(service.create("org-123", input)).rejects.toThrow(
				"MINIMUM_OWNERSHIP_PERCENTAGE_NOT_MET",
			);
		});

		it("should throw error when cap table exceeds 100%", async () => {
			const input: UBOCreateInput = {
				clientId: "CLT123456789",
				firstName: "John",
				lastName: "Doe",
				relationshipType: "SHAREHOLDER",
				ownershipPercentage: 60,
			};

			const existingShareholder: UBOEntity = {
				...mockUBO,
				ownershipPercentage: 50,
			};

			vi.mocked(mockRepository.list).mockResolvedValue({
				data: [existingShareholder],
				total: 1,
			});

			await expect(service.create("org-123", input)).rejects.toThrow(
				"CAP_TABLE_EXCEEDS_100_PERCENT",
			);
		});

		it("should allow creating director without ownership percentage", async () => {
			const input: UBOCreateInput = {
				clientId: "CLT123456789",
				firstName: "Jane",
				lastName: "Doe",
				relationshipType: "DIRECTOR",
			};

			vi.mocked(mockRepository.create).mockResolvedValue({
				...mockUBO,
				relationshipType: "DIRECTOR",
				ownershipPercentage: null,
			});

			const result = await service.create("org-123", input);

			expect(result.relationshipType).toBe("DIRECTOR");
			expect(mockRepository.create).toHaveBeenCalledWith(input);
		});
	});

	describe("update", () => {
		it("should update shareholder with valid ownership percentage", async () => {
			const input: UBOUpdateInput = {
				firstName: "John",
				lastName: "Doe",
				relationshipType: "SHAREHOLDER",
				ownershipPercentage: 40,
			};

			vi.mocked(mockRepository.list).mockResolvedValue({
				data: [],
				total: 0,
			});
			vi.mocked(mockRepository.update).mockResolvedValue({
				...mockUBO,
				ownershipPercentage: 40,
			});

			const result = await service.update(
				"org-123",
				"CLT123456789",
				"UBO123456789",
				input,
			);

			expect(result.ownershipPercentage).toBe(40);
		});

		it("should throw error when updating shareholder without ownership percentage", async () => {
			const input: UBOUpdateInput = {
				firstName: "John",
				lastName: "Doe",
				relationshipType: "SHAREHOLDER",
			};

			await expect(
				service.update("org-123", "CLT123456789", "UBO123456789", input),
			).rejects.toThrow("OWNERSHIP_PERCENTAGE_REQUIRED_FOR_SHAREHOLDER");
		});

		it("should throw error when ownership percentage below 25%", async () => {
			const input: UBOUpdateInput = {
				firstName: "John",
				lastName: "Doe",
				relationshipType: "SHAREHOLDER",
				ownershipPercentage: 20,
			};

			await expect(
				service.update("org-123", "CLT123456789", "UBO123456789", input),
			).rejects.toThrow("MINIMUM_OWNERSHIP_PERCENTAGE_NOT_MET");
		});

		it("should throw error when cap table exceeds 100%", async () => {
			const input: UBOUpdateInput = {
				firstName: "John",
				lastName: "Doe",
				relationshipType: "SHAREHOLDER",
				ownershipPercentage: 70,
			};

			const otherShareholder: UBOEntity = {
				...mockUBO,
				id: "UBO987654321",
				ownershipPercentage: 40,
			};

			vi.mocked(mockRepository.list).mockResolvedValue({
				data: [mockUBO, otherShareholder],
				total: 2,
			});

			await expect(
				service.update("org-123", "CLT123456789", "UBO123456789", input),
			).rejects.toThrow("CAP_TABLE_EXCEEDS_100_PERCENT");
		});

		it("should exclude current UBO from cap table calculation", async () => {
			const input: UBOUpdateInput = {
				firstName: "John",
				lastName: "Doe",
				relationshipType: "SHAREHOLDER",
				ownershipPercentage: 60,
			};

			const otherShareholder: UBOEntity = {
				...mockUBO,
				id: "UBO987654321",
				ownershipPercentage: 40,
			};

			vi.mocked(mockRepository.list).mockResolvedValue({
				data: [mockUBO, otherShareholder],
				total: 2,
			});
			vi.mocked(mockRepository.update).mockResolvedValue({
				...mockUBO,
				ownershipPercentage: 60,
			});

			const result = await service.update(
				"org-123",
				"CLT123456789",
				"UBO123456789",
				input,
			);

			expect(result.ownershipPercentage).toBe(60);
		});
	});

	describe("patch", () => {
		it("should partially update UBO", async () => {
			const input: UBOPatchInput = {
				firstName: "Jane",
			};

			vi.mocked(mockRepository.getById).mockResolvedValue(mockUBO);
			vi.mocked(mockRepository.patch).mockResolvedValue({
				...mockUBO,
				firstName: "Jane",
			});

			const result = await service.patch(
				"org-123",
				"CLT123456789",
				"UBO123456789",
				input,
			);

			expect(result.firstName).toBe("Jane");
		});

		it("should throw error when UBO not found", async () => {
			const input: UBOPatchInput = {
				firstName: "Jane",
			};

			vi.mocked(mockRepository.getById).mockResolvedValue(null);

			await expect(
				service.patch("org-123", "CLT123456789", "UBO999999999", input),
			).rejects.toThrow("UBO_NOT_FOUND");
		});

		it("should validate ownership percentage for shareholder", async () => {
			const input: UBOPatchInput = {
				ownershipPercentage: 20,
			};

			vi.mocked(mockRepository.getById).mockResolvedValue(mockUBO);

			await expect(
				service.patch("org-123", "CLT123456789", "UBO123456789", input),
			).rejects.toThrow("MINIMUM_OWNERSHIP_PERCENTAGE_NOT_MET");
		});

		it("should validate cap table when updating ownership percentage", async () => {
			const input: UBOPatchInput = {
				ownershipPercentage: 70,
			};

			const otherShareholder: UBOEntity = {
				...mockUBO,
				id: "UBO987654321",
				ownershipPercentage: 40,
			};

			vi.mocked(mockRepository.getById).mockResolvedValue(mockUBO);
			vi.mocked(mockRepository.list).mockResolvedValue({
				data: [mockUBO, otherShareholder],
				total: 2,
			});

			await expect(
				service.patch("org-123", "CLT123456789", "UBO123456789", input),
			).rejects.toThrow("CAP_TABLE_EXCEEDS_100_PERCENT");
		});

		it("should allow updating non-shareholder fields without validation", async () => {
			const input: UBOPatchInput = {
				email: "newemail@example.com",
			};

			vi.mocked(mockRepository.getById).mockResolvedValue(mockUBO);
			vi.mocked(mockRepository.patch).mockResolvedValue({
				...mockUBO,
				email: "newemail@example.com",
			});

			const result = await service.patch(
				"org-123",
				"CLT123456789",
				"UBO123456789",
				input,
			);

			expect(result.email).toBe("newemail@example.com");
		});
	});

	describe("delete", () => {
		it("should delete UBO", async () => {
			vi.mocked(mockRepository.delete).mockResolvedValue();

			await service.delete("org-123", "CLT123456789", "UBO123456789");

			expect(mockRepository.delete).toHaveBeenCalledWith(
				"CLT123456789",
				"UBO123456789",
			);
		});
	});

	describe("updatePEPStatus", () => {
		it("should update PEP status", async () => {
			const input: PEPStatusUpdateInput = {
				isPEP: true,
				pepStatus: "CONFIRMED",
				pepDetails: "Government official",
				pepMatchConfidence: "high",
				pepCheckedAt: "2024-01-01T00:00:00.000Z",
			};

			vi.mocked(mockRepository.updatePEPStatus).mockResolvedValue({
				...mockUBO,
				isPEP: true,
				pepStatus: "CONFIRMED",
			});

			const result = await service.updatePEPStatus("UBO123456789", input);

			expect(result.isPEP).toBe(true);
			expect(result.pepStatus).toBe("CONFIRMED");
			expect(mockRepository.updatePEPStatus).toHaveBeenCalledWith(
				"UBO123456789",
				expect.objectContaining({
					isPEP: true,
					pepStatus: "CONFIRMED",
				}),
			);
		});
	});

	describe("getStaleUBOs", () => {
		it("should get UBOs with stale PEP checks", async () => {
			const threshold = new Date("2024-01-01");
			const staleUBOs = [
				{
					id: "UBO123456789",
					clientId: "CLT123456789",
					fullName: "John Doe Smith",
				},
			];

			vi.mocked(mockRepository.getStaleUBOs).mockResolvedValue(staleUBOs);

			const result = await service.getStaleUBOs(threshold, 100);

			expect(result).toHaveLength(1);
			expect(result[0].fullName).toBe("John Doe Smith");
			expect(mockRepository.getStaleUBOs).toHaveBeenCalledWith(threshold, 100);
		});
	});

	describe("getUBOFullName", () => {
		it("should format full name with all parts", () => {
			const result = service.getUBOFullName(mockUBO);

			expect(result).toBe("John Doe Smith");
		});

		it("should format full name without second last name", () => {
			const uboWithoutSecondName: UBOEntity = {
				...mockUBO,
				secondLastName: null,
			};

			const result = service.getUBOFullName(uboWithoutSecondName);

			expect(result).toBe("John Doe");
		});
	});
});
