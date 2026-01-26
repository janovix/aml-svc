import { describe, it, expect } from "vitest";
import type { UltimateBeneficialOwner } from "@prisma/client";
import {
	mapPrismaUBO,
	mapCreateInputToPrisma,
	mapUpdateInputToPrisma,
	mapPatchInputToPrisma,
} from "./mappers";
import type { UBOCreateInput, UBOUpdateInput, UBOPatchInput } from "./schemas";

// Mock Decimal to avoid node:child_process import issues
const mockDecimal = (value: number) => ({
	toNumber: () => value,
	toString: () => value.toString(),
	toFixed: () => value.toFixed(2),
});

describe("UBO Mappers", () => {
	describe("mapPrismaUBO", () => {
		it("should map a complete Prisma UBO record to domain entity", () => {
			const prismaRecord: UltimateBeneficialOwner = {
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
				isPEP: true,
				pepStatus: "CONFIRMED" as const,
				pepDetails: "Government official",
				pepMatchConfidence: "high",
				pepCheckedAt: new Date("2024-01-01"),
				verifiedAt: new Date("2024-01-02"),
				verifiedBy: "admin-user",
				notes: "Important stakeholder",
				createdAt: new Date("2024-01-01"),
				updatedAt: new Date("2024-01-02"),
			};

			const result = mapPrismaUBO(prismaRecord);

			expect(result).toEqual({
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
				isPEP: true,
				pepStatus: "CONFIRMED" as const,
				pepDetails: "Government official",
				pepMatchConfidence: "high",
				pepCheckedAt: "2024-01-01T00:00:00.000Z",
				verifiedAt: "2024-01-02T00:00:00.000Z",
				verifiedBy: "admin-user",
				notes: "Important stakeholder",
				createdAt: "2024-01-01T00:00:00.000Z",
				updatedAt: "2024-01-02T00:00:00.000Z",
			});
		});

		it("should handle null optional fields", () => {
			const prismaRecord: UltimateBeneficialOwner = {
				id: "UBO123456789",
				clientId: "CLT123456789",
				firstName: "Jane",
				lastName: "Doe",
				secondLastName: null,
				birthDate: null,
				nationality: null,
				curp: null,
				rfc: null,
				ownershipPercentage: null,
				relationshipType: "DIRECTOR",
				position: null,
				email: null,
				phone: null,
				country: null,
				stateCode: null,
				city: null,
				street: null,
				postalCode: null,
				idDocumentId: null,
				addressProofId: null,
				isPEP: false,
				pepStatus: "PENDING",
				pepDetails: null,
				pepMatchConfidence: null,
				pepCheckedAt: null,
				verifiedAt: null,
				verifiedBy: null,
				notes: null,
				createdAt: new Date("2024-01-01"),
				updatedAt: new Date("2024-01-01"),
			};

			const result = mapPrismaUBO(prismaRecord);

			expect(result.secondLastName).toBeNull();
			expect(result.birthDate).toBeNull();
			expect(result.ownershipPercentage).toBeNull();
			expect(result.pepCheckedAt).toBeNull();
		});
	});

	describe("mapCreateInputToPrisma", () => {
		it("should map create input with all fields to Prisma format", () => {
			const input: UBOCreateInput = {
				clientId: "CLT123456789",
				firstName: "John",
				lastName: "Doe",
				secondLastName: "Smith",
				birthDate: "1980-01-15",
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
				notes: "Important stakeholder",
			};

			const result = mapCreateInputToPrisma(input);

			expect(result.id).toMatch(/^UBO[A-Za-z0-9]{9}$/);
			expect(result.client).toEqual({ connect: { id: "CLT123456789" } });
			expect(result.firstName).toBe("John");
			expect(result.lastName).toBe("Doe");
			expect(result.birthDate).toEqual(new Date("1980-01-15"));
			expect(result.ownershipPercentage).toBe(35.5);
			expect(result.idDocument).toEqual({ connect: { id: "DOC123456789" } });
			expect(result.addressProof).toEqual({ connect: { id: "DOC987654321" } });
			expect(result.isPEP).toBe(false);
			expect(result.pepStatus).toBe("PENDING");
		});

		it("should handle minimal required fields", () => {
			const input: UBOCreateInput = {
				clientId: "CLT123456789",
				firstName: "Jane",
				lastName: "Doe",
				relationshipType: "DIRECTOR",
			};

			const result = mapCreateInputToPrisma(input);

			expect(result.client).toEqual({ connect: { id: "CLT123456789" } });
			expect(result.firstName).toBe("Jane");
			expect(result.lastName).toBe("Doe");
			expect(result.secondLastName).toBeNull();
			expect(result.birthDate).toBeNull();
			expect(result.idDocument).toBeUndefined();
			expect(result.addressProof).toBeUndefined();
		});
	});

	describe("mapUpdateInputToPrisma", () => {
		it("should map update input to Prisma format", () => {
			const input: UBOUpdateInput = {
				firstName: "John",
				lastName: "Doe",
				secondLastName: "Smith",
				birthDate: "1980-01-15",
				nationality: "US",
				curp: "DOSJ800115HDFRHN01",
				rfc: "DOSJ800115ABC",
				ownershipPercentage: 40,
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
				notes: "Updated notes",
			};

			const result = mapUpdateInputToPrisma(input);

			expect(result.firstName).toBe("John");
			expect(result.ownershipPercentage).toBe(40);
			expect(result.birthDate).toEqual(new Date("1980-01-15"));
			expect(result.idDocument).toEqual({ connect: { id: "DOC123456789" } });
		});

		it("should disconnect documents when IDs are undefined", () => {
			const input: UBOUpdateInput = {
				firstName: "John",
				lastName: "Doe",
				relationshipType: "DIRECTOR",
			};

			const result = mapUpdateInputToPrisma(input);

			expect(result.idDocument).toEqual({ disconnect: true });
			expect(result.addressProof).toEqual({ disconnect: true });
		});
	});

	describe("mapPatchInputToPrisma", () => {
		it("should only include provided fields", () => {
			const input: UBOPatchInput = {
				firstName: "John",
				ownershipPercentage: 45,
			};

			const result = mapPatchInputToPrisma(input);

			expect(result.firstName).toBe("John");
			expect(result.ownershipPercentage).toBe(45);
			expect(result.lastName).toBeUndefined();
			expect(result.email).toBeUndefined();
		});

		it("should handle all possible fields", () => {
			const input: UBOPatchInput = {
				firstName: "John",
				lastName: "Doe",
				secondLastName: "Smith",
				birthDate: "1980-01-15",
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
				notes: "Updated",
				isPEP: true,
				pepStatus: "CONFIRMED" as const,
				pepDetails: "Official",
				pepMatchConfidence: "high",
				pepCheckedAt: "2024-01-01",
				verifiedAt: "2024-01-02",
				verifiedBy: "admin",
			};

			const result = mapPatchInputToPrisma(input);

			expect(result.firstName).toBe("John");
			expect(result.isPEP).toBe(true);
			expect(result.pepStatus).toBe("CONFIRMED");
			expect(result.pepCheckedAt).toEqual(new Date("2024-01-01"));
			expect(result.verifiedAt).toEqual(new Date("2024-01-02"));
		});

		it("should connect documents when IDs are provided", () => {
			const input: UBOPatchInput = {
				idDocumentId: "DOC123456789",
				addressProofId: "DOC987654321",
			};

			const result = mapPatchInputToPrisma(input);

			expect(result.idDocument).toEqual({ connect: { id: "DOC123456789" } });
			expect(result.addressProof).toEqual({ connect: { id: "DOC987654321" } });
		});

		it("should handle null values for dates", () => {
			const input: UBOPatchInput = {
				birthDate: null,
				pepCheckedAt: null,
				verifiedAt: null,
			};

			const result = mapPatchInputToPrisma(input);

			expect(result.birthDate).toBeNull();
			expect(result.pepCheckedAt).toBeNull();
			expect(result.verifiedAt).toBeNull();
		});
	});
});
