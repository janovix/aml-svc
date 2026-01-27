import { describe, it, expect, beforeEach, vi } from "vitest";
import type {
	PrismaClient,
	Client,
	ClientDocument,
	ClientAddress,
} from "@prisma/client";
import { ClientRepository } from "./repository";
import type {
	ClientCreateInput,
	ClientUpdateInput,
	ClientPatchInput,
	ClientFilters,
	ClientDocumentCreateInput,
	ClientDocumentUpdateInput,
	ClientDocumentPatchInput,
	ClientAddressCreateInput,
	ClientAddressUpdateInput,
	ClientAddressPatchInput,
} from "./schemas";

describe("ClientRepository", () => {
	let repository: ClientRepository;
	let mockPrisma: PrismaClient;

	const mockClient: Client = {
		id: "CLT123456789",
		organizationId: "org-123",
		rfc: "ABCD123456EF7",
		personType: "PHYSICAL",
		firstName: "Juan",
		lastName: "Pérez",
		secondLastName: "García",
		businessName: null,
		birthDate: new Date("1990-05-15"),
		nationality: "MX",
		email: "juan@example.com",
		phone: "+521234567890",
		country: "MX",
		stateCode: "DIF",
		city: "Ciudad de México",
		municipality: "Ciudad de México",
		neighborhood: "Colonia Centro",
		street: "Calle Principal",
		externalNumber: "123",
		internalNumber: null,
		postalCode: "06000",
		kycStatus: "INCOMPLETE",
		kycCompletedAt: null,
		isPEP: false,
		pepStatus: "PENDING",
		pepDetails: null,
		pepMatchConfidence: null,
		pepCheckedAt: null,
		pepCheckSource: null,
		notes: null,
		gender: null,
		maritalStatus: null,
		occupation: null,
		curp: null,
		reference: null,
		countryCode: null,
		economicActivityCode: null,
		sourceOfFunds: null,
		sourceOfWealth: null,
		incorporationDate: null,
		createdAt: new Date("2024-01-01"),
		updatedAt: new Date("2024-01-01"),
		deletedAt: null,
	};

	const mockDocument: ClientDocument = {
		id: "DOC123456789",
		clientId: "CLT123456789",
		documentType: "NATIONAL_ID",
		documentNumber: "INE123456",
		issuingCountry: "MX",
		issueDate: new Date("2020-01-01"),
		expiryDate: new Date("2030-01-01"),
		status: "PENDING",
		fileUrl: "https://example.com/file.pdf",
		metadata: null,
		docSvcDocumentId: null,
		docSvcJobId: null,
		verificationStatus: null,
		verificationScore: null,
		extractedData: null,
		verifiedAt: null,
		createdAt: new Date("2024-01-01"),
		updatedAt: new Date("2024-01-01"),
	};

	const mockAddress: ClientAddress = {
		id: "ADDR123456789",
		clientId: "CLT123456789",
		addressType: "RESIDENTIAL",
		street1: "Calle Principal 123",
		street2: null,
		city: "Ciudad de México",
		state: "DIF",
		postalCode: "06000",
		country: "MX",
		isPrimary: true,
		verifiedAt: null,
		reference: null,
		createdAt: new Date("2024-01-01"),
		updatedAt: new Date("2024-01-01"),
	};

	beforeEach(() => {
		mockPrisma = {
			client: {
				findMany: vi.fn(),
				findFirst: vi.fn(),
				count: vi.fn(),
				create: vi.fn(),
				update: vi.fn(),
			},
			clientDocument: {
				findMany: vi.fn(),
				findFirst: vi.fn(),
				create: vi.fn(),
				update: vi.fn(),
				delete: vi.fn(),
			},
			clientAddress: {
				findMany: vi.fn(),
				findFirst: vi.fn(),
				create: vi.fn(),
				update: vi.fn(),
				delete: vi.fn(),
			},
		} as unknown as PrismaClient;

		repository = new ClientRepository(mockPrisma);
	});

	describe("list", () => {
		it("should list clients with pagination", async () => {
			const filters: ClientFilters = { page: 1, limit: 10 };

			vi.mocked(mockPrisma.client.count).mockResolvedValue(1);
			vi.mocked(mockPrisma.client.findMany).mockResolvedValue([mockClient]);

			const result = await repository.list("org-123", filters);

			expect(result.data).toHaveLength(1);
			expect(result.pagination).toEqual({
				page: 1,
				limit: 10,
				total: 1,
				totalPages: 1,
			});
		});

		it("should filter by person type", async () => {
			const filters: ClientFilters = {
				page: 1,
				limit: 10,
				personType: "physical",
			};

			vi.mocked(mockPrisma.client.count).mockResolvedValue(1);
			vi.mocked(mockPrisma.client.findMany).mockResolvedValue([mockClient]);

			await repository.list("org-123", filters);

			expect(mockPrisma.client.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: expect.objectContaining({
						personType: "PHYSICAL",
					}),
				}),
			);
		});

		it("should filter by RFC", async () => {
			const filters: ClientFilters = { page: 1, limit: 10, rfc: "abcd123" };

			vi.mocked(mockPrisma.client.count).mockResolvedValue(1);
			vi.mocked(mockPrisma.client.findMany).mockResolvedValue([mockClient]);

			await repository.list("org-123", filters);

			expect(mockPrisma.client.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: expect.objectContaining({
						rfc: { contains: "ABCD123" },
					}),
				}),
			);
		});

		it("should filter by search term", async () => {
			const filters: ClientFilters = { page: 1, limit: 10, search: "Juan" };

			vi.mocked(mockPrisma.client.count).mockResolvedValue(1);
			vi.mocked(mockPrisma.client.findMany).mockResolvedValue([mockClient]);

			await repository.list("org-123", filters);

			expect(mockPrisma.client.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: expect.objectContaining({
						OR: expect.arrayContaining([
							{ firstName: { contains: "Juan" } },
							{ lastName: { contains: "Juan" } },
							{ secondLastName: { contains: "Juan" } },
							{ businessName: { contains: "Juan" } },
						]),
					}),
				}),
			);
		});

		it("should calculate total pages correctly", async () => {
			const filters: ClientFilters = { page: 1, limit: 10 };

			vi.mocked(mockPrisma.client.count).mockResolvedValue(25);
			vi.mocked(mockPrisma.client.findMany).mockResolvedValue([mockClient]);

			const result = await repository.list("org-123", filters);

			expect(result.pagination.totalPages).toBe(3);
		});

		it("should return 0 total pages when no clients", async () => {
			const filters: ClientFilters = { page: 1, limit: 10 };

			vi.mocked(mockPrisma.client.count).mockResolvedValue(0);
			vi.mocked(mockPrisma.client.findMany).mockResolvedValue([]);

			const result = await repository.list("org-123", filters);

			expect(result.pagination.totalPages).toBe(0);
		});
	});

	describe("getById", () => {
		it("should return client when found", async () => {
			vi.mocked(mockPrisma.client.findFirst).mockResolvedValue(mockClient);

			const result = await repository.getById("org-123", "CLT123456789");

			expect(result).not.toBeNull();
			expect(result?.id).toBe("CLT123456789");
		});

		it("should return null when client not found", async () => {
			vi.mocked(mockPrisma.client.findFirst).mockResolvedValue(null);

			const result = await repository.getById("org-123", "CLT999999999");

			expect(result).toBeNull();
		});
	});

	describe("create", () => {
		it("should create a new client", async () => {
			const input: ClientCreateInput = {
				rfc: "ABCD123456EF7",
				personType: "physical",
				firstName: "Juan",
				lastName: "Pérez",
				birthDate: "1990-05-15",
				curp: "ABCD900515HDFLRN01",
				nationality: "MX",
				email: "juan@example.com",
				phone: "+521234567890",
				country: "MX",
				stateCode: "DIF",
				city: "Ciudad de México",
				municipality: "Ciudad de México",
				neighborhood: "Colonia Centro",
				street: "Calle Principal",
				externalNumber: "123",
				postalCode: "06000",
			};

			vi.mocked(mockPrisma.client.create).mockResolvedValue(mockClient);

			const result = await repository.create("org-123", input);

			expect(result.id).toBe("CLT123456789");
			expect(mockPrisma.client.create).toHaveBeenCalled();
		});
	});

	describe("update", () => {
		it("should update an existing client", async () => {
			const input: ClientUpdateInput = {
				personType: "physical",
				firstName: "Jane",
				lastName: "Doe",
				birthDate: "1990-05-15",
				curp: "ABCD900515HDFLRN01",
				nationality: "MX",
				email: "jane@example.com",
				phone: "+521234567890",
				country: "MX",
				stateCode: "DIF",
				city: "Ciudad de México",
				municipality: "Ciudad de México",
				neighborhood: "Colonia Centro",
				street: "Calle Principal",
				externalNumber: "123",
				postalCode: "06000",
			};

			vi.mocked(mockPrisma.client.findFirst).mockResolvedValue(mockClient);
			vi.mocked(mockPrisma.client.update).mockResolvedValue({
				...mockClient,
				firstName: "Jane",
			});

			const result = await repository.update("org-123", "CLT123456789", input);

			expect(result.firstName).toBe("Jane");
		});

		it("should throw error when client not found", async () => {
			const input: ClientUpdateInput = {
				personType: "physical",
				firstName: "Jane",
				lastName: "Doe",
				birthDate: "1990-05-15",
				curp: "ABCD900515HDFLRN01",
				nationality: "MX",
				email: "jane@example.com",
				phone: "+521234567890",
				country: "MX",
				stateCode: "DIF",
				city: "Ciudad de México",
				municipality: "Ciudad de México",
				neighborhood: "Colonia Centro",
				street: "Calle Principal",
				externalNumber: "123",
				postalCode: "06000",
			};

			vi.mocked(mockPrisma.client.findFirst).mockResolvedValue(null);

			await expect(
				repository.update("org-123", "CLT999999999", input),
			).rejects.toThrow("CLIENT_NOT_FOUND");
		});
	});

	describe("patch", () => {
		it("should partially update a client", async () => {
			const input: ClientPatchInput = {
				email: "newemail@example.com",
			};

			vi.mocked(mockPrisma.client.findFirst).mockResolvedValue(mockClient);
			vi.mocked(mockPrisma.client.update).mockResolvedValue({
				...mockClient,
				email: "newemail@example.com",
			});

			const result = await repository.patch("org-123", "CLT123456789", input);

			expect(result.email).toBe("newemail@example.com");
		});

		it("should throw error when client not found", async () => {
			const input: ClientPatchInput = {
				email: "newemail@example.com",
			};

			vi.mocked(mockPrisma.client.findFirst).mockResolvedValue(null);

			await expect(
				repository.patch("org-123", "CLT999999999", input),
			).rejects.toThrow("CLIENT_NOT_FOUND");
		});
	});

	describe("delete", () => {
		it("should soft delete a client", async () => {
			vi.mocked(mockPrisma.client.findFirst).mockResolvedValue(mockClient);
			vi.mocked(mockPrisma.client.update).mockResolvedValue({
				...mockClient,
				deletedAt: new Date(),
			});

			await repository.delete("org-123", "CLT123456789");

			expect(mockPrisma.client.update).toHaveBeenCalledWith({
				where: { id: "CLT123456789" },
				data: { deletedAt: expect.any(Date) },
			});
		});

		it("should throw error when client not found", async () => {
			vi.mocked(mockPrisma.client.findFirst).mockResolvedValue(null);

			await expect(
				repository.delete("org-123", "CLT999999999"),
			).rejects.toThrow("CLIENT_NOT_FOUND");
		});
	});

	describe("listDocuments", () => {
		it("should list documents for a client", async () => {
			vi.mocked(mockPrisma.client.findFirst).mockResolvedValue(mockClient);
			vi.mocked(mockPrisma.clientDocument.findMany).mockResolvedValue([
				mockDocument,
			]);

			const result = await repository.listDocuments("org-123", "CLT123456789");

			expect(result).toHaveLength(1);
			expect(result[0].id).toBe("DOC123456789");
		});

		it("should throw error when client not found", async () => {
			vi.mocked(mockPrisma.client.findFirst).mockResolvedValue(null);

			await expect(
				repository.listDocuments("org-123", "CLT999999999"),
			).rejects.toThrow("CLIENT_NOT_FOUND");
		});
	});

	describe("createDocument", () => {
		it("should create a document", async () => {
			const input: ClientDocumentCreateInput = {
				clientId: "CLT123456789",
				documentType: "NATIONAL_ID",
				documentNumber: "INE123456",
				status: "PENDING",
			};

			vi.mocked(mockPrisma.client.findFirst).mockResolvedValue(mockClient);
			vi.mocked(mockPrisma.clientDocument.create).mockResolvedValue(
				mockDocument,
			);

			const result = await repository.createDocument("org-123", input);

			expect(result.id).toBe("DOC123456789");
		});

		it("should throw error when client not found", async () => {
			const input: ClientDocumentCreateInput = {
				clientId: "CLT999999999",
				documentType: "NATIONAL_ID",
				documentNumber: "INE123456",
				status: "PENDING",
			};

			vi.mocked(mockPrisma.client.findFirst).mockResolvedValue(null);

			await expect(repository.createDocument("org-123", input)).rejects.toThrow(
				"CLIENT_NOT_FOUND",
			);
		});
	});

	describe("updateDocument", () => {
		it("should update a document", async () => {
			const input: ClientDocumentUpdateInput = {
				documentType: "PASSPORT",
				documentNumber: "ABC123",
				status: "VERIFIED",
			};

			vi.mocked(mockPrisma.client.findFirst).mockResolvedValue(mockClient);
			vi.mocked(mockPrisma.clientDocument.findFirst).mockResolvedValue(
				mockDocument,
			);
			vi.mocked(mockPrisma.clientDocument.update).mockResolvedValue({
				...mockDocument,
				documentType: "PASSPORT",
				documentNumber: "ABC123",
			});

			const result = await repository.updateDocument(
				"org-123",
				"CLT123456789",
				"DOC123456789",
				input,
			);

			expect(result.documentType).toBe("PASSPORT");
		});

		it("should throw error when document not found", async () => {
			const input: ClientDocumentUpdateInput = {
				documentType: "PASSPORT",
				documentNumber: "ABC123",
				status: "VERIFIED",
			};

			vi.mocked(mockPrisma.client.findFirst).mockResolvedValue(mockClient);
			vi.mocked(mockPrisma.clientDocument.findFirst).mockResolvedValue(null);

			await expect(
				repository.updateDocument(
					"org-123",
					"CLT123456789",
					"DOC999999999",
					input,
				),
			).rejects.toThrow("DOCUMENT_NOT_FOUND");
		});
	});

	describe("patchDocument", () => {
		it("should partially update a document", async () => {
			const input: ClientDocumentPatchInput = {
				status: "VERIFIED",
			};

			vi.mocked(mockPrisma.client.findFirst).mockResolvedValue(mockClient);
			vi.mocked(mockPrisma.clientDocument.findFirst).mockResolvedValue(
				mockDocument,
			);
			vi.mocked(mockPrisma.clientDocument.update).mockResolvedValue({
				...mockDocument,
				status: "VERIFIED",
			});

			const result = await repository.patchDocument(
				"org-123",
				"CLT123456789",
				"DOC123456789",
				input,
			);

			expect(result.status).toBe("VERIFIED");
		});
	});

	describe("deleteDocument", () => {
		it("should delete a document", async () => {
			vi.mocked(mockPrisma.client.findFirst).mockResolvedValue(mockClient);
			vi.mocked(mockPrisma.clientDocument.findFirst).mockResolvedValue(
				mockDocument,
			);
			vi.mocked(mockPrisma.clientDocument.delete).mockResolvedValue(
				mockDocument,
			);

			await repository.deleteDocument(
				"org-123",
				"CLT123456789",
				"DOC123456789",
			);

			expect(mockPrisma.clientDocument.delete).toHaveBeenCalledWith({
				where: { id: "DOC123456789" },
			});
		});
	});

	describe("listAddresses", () => {
		it("should list addresses for a client", async () => {
			vi.mocked(mockPrisma.client.findFirst).mockResolvedValue(mockClient);
			vi.mocked(mockPrisma.clientAddress.findMany).mockResolvedValue([
				mockAddress,
			]);

			const result = await repository.listAddresses("org-123", "CLT123456789");

			expect(result).toHaveLength(1);
			expect(result[0].id).toBe("ADDR123456789");
		});
	});

	describe("createAddress", () => {
		it("should create an address", async () => {
			const input: ClientAddressCreateInput = {
				clientId: "CLT123456789",
				addressType: "RESIDENTIAL",
				country: "MX",
				city: "Ciudad de México",
				street1: "Calle Principal 123",
				isPrimary: true,
			};

			vi.mocked(mockPrisma.client.findFirst).mockResolvedValue(mockClient);
			vi.mocked(mockPrisma.clientAddress.create).mockResolvedValue(mockAddress);

			const result = await repository.createAddress("org-123", input);

			expect(result.id).toBe("ADDR123456789");
		});
	});

	describe("updateAddress", () => {
		it("should update an address", async () => {
			const input: ClientAddressUpdateInput = {
				addressType: "RESIDENTIAL",
				country: "MX",
				city: "Ciudad de México",
				street1: "Nueva Calle",
				isPrimary: true,
			};

			vi.mocked(mockPrisma.client.findFirst).mockResolvedValue(mockClient);
			vi.mocked(mockPrisma.clientAddress.findFirst).mockResolvedValue(
				mockAddress,
			);
			vi.mocked(mockPrisma.clientAddress.update).mockResolvedValue({
				...mockAddress,
				street1: "Nueva Calle",
			});

			const result = await repository.updateAddress(
				"org-123",
				"CLT123456789",
				"ADDR123456789",
				input,
			);

			expect(result.street1).toBe("Nueva Calle");
		});
	});

	describe("patchAddress", () => {
		it("should partially update an address", async () => {
			const input: ClientAddressPatchInput = {
				isPrimary: false,
			};

			vi.mocked(mockPrisma.client.findFirst).mockResolvedValue(mockClient);
			vi.mocked(mockPrisma.clientAddress.findFirst).mockResolvedValue(
				mockAddress,
			);
			vi.mocked(mockPrisma.clientAddress.update).mockResolvedValue({
				...mockAddress,
				isPrimary: false,
			});

			const result = await repository.patchAddress(
				"org-123",
				"CLT123456789",
				"ADDR123456789",
				input,
			);

			expect(result.isPrimary).toBe(false);
		});
	});

	describe("deleteAddress", () => {
		it("should delete an address", async () => {
			vi.mocked(mockPrisma.client.findFirst).mockResolvedValue(mockClient);
			vi.mocked(mockPrisma.clientAddress.findFirst).mockResolvedValue(
				mockAddress,
			);
			vi.mocked(mockPrisma.clientAddress.delete).mockResolvedValue(mockAddress);

			await repository.deleteAddress(
				"org-123",
				"CLT123456789",
				"ADDR123456789",
			);

			expect(mockPrisma.clientAddress.delete).toHaveBeenCalledWith({
				where: { id: "ADDR123456789" },
			});
		});
	});

	describe("getStats", () => {
		it("should return client statistics", async () => {
			vi.mocked(mockPrisma.client.count)
				.mockResolvedValueOnce(100)
				.mockResolvedValueOnce(60)
				.mockResolvedValueOnce(40);

			const result = await repository.getStats("org-123");

			expect(result).toEqual({
				totalClients: 100,
				physicalClients: 60,
				moralClients: 40,
			});
		});
	});
});
