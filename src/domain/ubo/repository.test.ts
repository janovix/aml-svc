import { describe, it, expect, beforeEach, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { UBORepository } from "./repository";
import type { UBOCreateInput, UBOUpdateInput, UBOPatchInput } from "./schemas";

// Mock Decimal to avoid node:child_process import issues
const mockDecimal = (value: number) => ({
	toNumber: () => value,
	toString: () => value.toString(),
	toFixed: () => value.toFixed(2),
});

describe("UBORepository", () => {
	let repository: UBORepository;
	let mockPrisma: PrismaClient;

	const mockUBORecord = {
		id: "UBO123456789",
		clientId: "CLT123456789",
		firstName: "John",
		lastName: "Doe",
		secondLastName: "Smith",
		birthDate: new Date("1980-01-15"),
		nationality: "US",
		curp: "DOSJ800115HDFRHN01",
		rfc: "DOSJ800115ABC",
		ownershipPercentage: mockDecimal(35.5) as never,
		relationshipType: "SHAREHOLDER" as const,
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
		pepStatus: "PENDING" as const,
		pepDetails: null,
		pepMatchConfidence: null,
		pepCheckedAt: null,
		verifiedAt: null,
		verifiedBy: null,
		notes: "Test UBO",
		createdAt: new Date("2024-01-01"),
		updatedAt: new Date("2024-01-01"),
	};

	beforeEach(() => {
		mockPrisma = {
			ultimateBeneficialOwner: {
				findMany: vi.fn(),
				findFirst: vi.fn(),
				count: vi.fn(),
				create: vi.fn(),
				update: vi.fn(),
				delete: vi.fn(),
			},
		} as unknown as PrismaClient;

		repository = new UBORepository(mockPrisma);
	});

	describe("list", () => {
		it("should list all UBOs for a client", async () => {
			vi.mocked(mockPrisma.ultimateBeneficialOwner.findMany).mockResolvedValue([
				mockUBORecord,
			]);
			vi.mocked(mockPrisma.ultimateBeneficialOwner.count).mockResolvedValue(1);

			const result = await repository.list("CLT123456789");

			expect(result.data).toHaveLength(1);
			expect(result.total).toBe(1);
			expect(result.data[0].id).toBe("UBO123456789");
			expect(mockPrisma.ultimateBeneficialOwner.findMany).toHaveBeenCalledWith({
				where: { clientId: "CLT123456789" },
				orderBy: [{ ownershipPercentage: "desc" }, { createdAt: "desc" }],
			});
		});

		it("should filter by relationship type", async () => {
			vi.mocked(mockPrisma.ultimateBeneficialOwner.findMany).mockResolvedValue([
				mockUBORecord,
			]);
			vi.mocked(mockPrisma.ultimateBeneficialOwner.count).mockResolvedValue(1);

			await repository.list("CLT123456789", "SHAREHOLDER");

			expect(mockPrisma.ultimateBeneficialOwner.findMany).toHaveBeenCalledWith({
				where: { clientId: "CLT123456789", relationshipType: "SHAREHOLDER" },
				orderBy: [{ ownershipPercentage: "desc" }, { createdAt: "desc" }],
			});
		});

		it("should return empty list when no UBOs found", async () => {
			vi.mocked(mockPrisma.ultimateBeneficialOwner.findMany).mockResolvedValue(
				[],
			);
			vi.mocked(mockPrisma.ultimateBeneficialOwner.count).mockResolvedValue(0);

			const result = await repository.list("CLT123456789");

			expect(result.data).toHaveLength(0);
			expect(result.total).toBe(0);
		});
	});

	describe("getById", () => {
		it("should return UBO when found", async () => {
			vi.mocked(mockPrisma.ultimateBeneficialOwner.findFirst).mockResolvedValue(
				mockUBORecord,
			);

			const result = await repository.getById("CLT123456789", "UBO123456789");

			expect(result).not.toBeNull();
			expect(result?.id).toBe("UBO123456789");
			expect(mockPrisma.ultimateBeneficialOwner.findFirst).toHaveBeenCalledWith(
				{
					where: { id: "UBO123456789", clientId: "CLT123456789" },
				},
			);
		});

		it("should return null when UBO not found", async () => {
			vi.mocked(mockPrisma.ultimateBeneficialOwner.findFirst).mockResolvedValue(
				null,
			);

			const result = await repository.getById("CLT123456789", "UBO999999999");

			expect(result).toBeNull();
		});
	});

	describe("create", () => {
		it("should create a new UBO", async () => {
			const input: UBOCreateInput = {
				clientId: "CLT123456789",
				firstName: "John",
				lastName: "Doe",
				relationshipType: "SHAREHOLDER",
				ownershipPercentage: 35.5,
			};

			vi.mocked(mockPrisma.ultimateBeneficialOwner.create).mockResolvedValue(
				mockUBORecord,
			);

			const result = await repository.create(input);

			expect(result.id).toBe("UBO123456789");
			expect(mockPrisma.ultimateBeneficialOwner.create).toHaveBeenCalled();
		});
	});

	describe("update", () => {
		it("should update an existing UBO", async () => {
			const input: UBOUpdateInput = {
				firstName: "Jane",
				lastName: "Doe",
				relationshipType: "DIRECTOR",
			};

			vi.mocked(mockPrisma.ultimateBeneficialOwner.findFirst).mockResolvedValue(
				mockUBORecord,
			);
			vi.mocked(mockPrisma.ultimateBeneficialOwner.update).mockResolvedValue({
				...mockUBORecord,
				firstName: "Jane",
			});

			const result = await repository.update(
				"CLT123456789",
				"UBO123456789",
				input,
			);

			expect(result.firstName).toBe("Jane");
			expect(mockPrisma.ultimateBeneficialOwner.update).toHaveBeenCalledWith({
				where: { id: "UBO123456789" },
				data: expect.objectContaining({
					firstName: "Jane",
					lastName: "Doe",
				}),
			});
		});

		it("should throw error when UBO not found", async () => {
			const input: UBOUpdateInput = {
				firstName: "Jane",
				lastName: "Doe",
				relationshipType: "DIRECTOR",
			};

			vi.mocked(mockPrisma.ultimateBeneficialOwner.findFirst).mockResolvedValue(
				null,
			);

			await expect(
				repository.update("CLT123456789", "UBO999999999", input),
			).rejects.toThrow("UBO_NOT_FOUND");
		});
	});

	describe("patch", () => {
		it("should partially update an existing UBO", async () => {
			const input: UBOPatchInput = {
				firstName: "Jane",
			};

			vi.mocked(mockPrisma.ultimateBeneficialOwner.findFirst).mockResolvedValue(
				mockUBORecord,
			);
			vi.mocked(mockPrisma.ultimateBeneficialOwner.update).mockResolvedValue({
				...mockUBORecord,
				firstName: "Jane",
			});

			const result = await repository.patch(
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

			vi.mocked(mockPrisma.ultimateBeneficialOwner.findFirst).mockResolvedValue(
				null,
			);

			await expect(
				repository.patch("CLT123456789", "UBO999999999", input),
			).rejects.toThrow("UBO_NOT_FOUND");
		});
	});

	describe("delete", () => {
		it("should delete an existing UBO", async () => {
			vi.mocked(mockPrisma.ultimateBeneficialOwner.findFirst).mockResolvedValue(
				mockUBORecord,
			);
			vi.mocked(mockPrisma.ultimateBeneficialOwner.delete).mockResolvedValue(
				mockUBORecord,
			);

			await repository.delete("CLT123456789", "UBO123456789");

			expect(mockPrisma.ultimateBeneficialOwner.delete).toHaveBeenCalledWith({
				where: { id: "UBO123456789" },
			});
		});

		it("should throw error when UBO not found", async () => {
			vi.mocked(mockPrisma.ultimateBeneficialOwner.findFirst).mockResolvedValue(
				null,
			);

			await expect(
				repository.delete("CLT123456789", "UBO999999999"),
			).rejects.toThrow("UBO_NOT_FOUND");
		});
	});

	describe("updatePEPStatus", () => {
		it("should update PEP status", async () => {
			const pepData = {
				isPEP: true,
				pepStatus: "CONFIRMED" as const,
				pepDetails: "Government official",
				pepMatchConfidence: "high",
				pepCheckedAt: new Date("2024-01-01"),
			};

			vi.mocked(mockPrisma.ultimateBeneficialOwner.update).mockResolvedValue({
				...mockUBORecord,
				...pepData,
			});

			const result = await repository.updatePEPStatus("UBO123456789", pepData);

			expect(result.isPEP).toBe(true);
			expect(result.pepStatus).toBe("CONFIRMED");
			expect(mockPrisma.ultimateBeneficialOwner.update).toHaveBeenCalledWith({
				where: { id: "UBO123456789" },
				data: expect.objectContaining({
					isPEP: true,
					pepStatus: "CONFIRMED",
				}),
			});
		});
	});

	describe("getStaleUBOs", () => {
		it("should return UBOs with stale PEP checks", async () => {
			const threshold = new Date("2024-01-01");
			const staleUBOs = [
				{
					id: "UBO123456789",
					clientId: "CLT123456789",
					firstName: "John",
					lastName: "Doe",
					secondLastName: "Smith",
				},
			] as Array<{
				id: string;
				clientId: string;
				firstName: string;
				lastName: string;
				secondLastName: string | null;
			}>;

			vi.mocked(mockPrisma.ultimateBeneficialOwner.findMany).mockResolvedValue(
				staleUBOs as never,
			);

			const result = await repository.getStaleUBOs(threshold, 100);

			expect(result).toHaveLength(1);
			expect(result[0]).toEqual({
				id: "UBO123456789",
				clientId: "CLT123456789",
				fullName: "John Doe Smith",
			});
			expect(mockPrisma.ultimateBeneficialOwner.findMany).toHaveBeenCalledWith({
				where: {
					OR: [{ pepCheckedAt: null }, { pepCheckedAt: { lt: threshold } }],
				},
				select: {
					id: true,
					clientId: true,
					firstName: true,
					lastName: true,
					secondLastName: true,
				},
				take: 100,
			});
		});

		it("should handle UBOs without second last name", async () => {
			const threshold = new Date("2024-01-01");
			const staleUBOs = [
				{
					id: "UBO123456789",
					clientId: "CLT123456789",
					firstName: "John",
					lastName: "Doe",
					secondLastName: null,
				},
			] as Array<{
				id: string;
				clientId: string;
				firstName: string;
				lastName: string;
				secondLastName: string | null;
			}>;

			vi.mocked(mockPrisma.ultimateBeneficialOwner.findMany).mockResolvedValue(
				staleUBOs as never,
			);

			const result = await repository.getStaleUBOs(threshold);

			expect(result[0].fullName).toBe("John Doe");
		});
	});
});
