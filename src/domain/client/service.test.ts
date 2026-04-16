import { describe, it, expect, beforeEach, vi } from "vitest";
import { ClientService } from "./service";
import type { ClientRepository } from "./repository";
import type { TenantContext } from "../../lib/tenant-context";
import type {
	ClientEntity,
	ClientDocumentEntity,
	ClientAddressEntity,
} from "./types";

describe("ClientService", () => {
	let service: ClientService;
	let mockRepository: ClientRepository;
	const organizationId = "org-123";
	const tenant: TenantContext = { organizationId, environment: "production" };

	const mockClient: ClientEntity = {
		id: "client-123",
		rfc: "ABCD123456EF7",
		organizationId,
		personType: "physical",
		firstName: "Juan",
		lastName: "Pérez",
		secondLastName: "García",
		birthDate: "1990-05-15",
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
		kycStatus: "INCOMPLETE",
		completenessStatus: "INCOMPLETE",
		missingFields: null,
		kycCompletionPct: 0,
		documentsComplete: 0,
		documentsCount: 0,
		documentsRequired: 3,
		shareholdersCount: 0,
		beneficialControllersCount: 0,
		identificationRequired: true,
		identificationTier: "ALWAYS",
		identificationThresholdMxn: null,
		noticeThresholdMxn: null,
		isPEP: false,
		watchlistQueryId: null,
		ofacSanctioned: false,
		unscSanctioned: false,
		sat69bListed: false,
		adverseMediaFlagged: false,
		screeningResult: "pending",
		screenedAt: null,
		createdAt: "2024-01-01T00:00:00Z",
		updatedAt: "2024-01-01T00:00:00Z",
	};

	beforeEach(() => {
		mockRepository = {
			list: vi.fn(),
			getById: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
			patch: vi.fn(),
			delete: vi.fn(),
			listDocuments: vi.fn(),
			createDocument: vi.fn(),
			updateDocument: vi.fn(),
			patchDocument: vi.fn(),
			deleteDocument: vi.fn(),
			listAddresses: vi.fn(),
			createAddress: vi.fn(),
			updateAddress: vi.fn(),
			patchAddress: vi.fn(),
			deleteAddress: vi.fn(),
			getStats: vi.fn(),
		} as unknown as ClientRepository;

		service = new ClientService(mockRepository);
	});

	describe("list", () => {
		it("should call repository list", async () => {
			const filters = { page: 1, limit: 10 };
			vi.mocked(mockRepository.list).mockResolvedValue({
				data: [mockClient],
				pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
				filterMeta: [],
			});

			const result = await service.list(tenant, filters);

			expect(mockRepository.list).toHaveBeenCalledWith(tenant, filters);
			expect(result.data).toHaveLength(1);
		});
	});

	describe("get", () => {
		it("should return client when found", async () => {
			vi.mocked(mockRepository.getById).mockResolvedValue(mockClient);

			const result = await service.get(tenant, "client-123");

			expect(mockRepository.getById).toHaveBeenCalledWith(tenant, "client-123");
			expect(result).toEqual(mockClient);
		});

		it("should throw error when client not found", async () => {
			vi.mocked(mockRepository.getById).mockResolvedValue(null);

			await expect(service.get(tenant, "non-existent")).rejects.toThrow(
				"CLIENT_NOT_FOUND",
			);
		});
	});

	describe("create", () => {
		it("should create client", async () => {
			const input = {
				rfc: "ABCD123456EF7",
				personType: "physical" as const,
				firstName: "Juan",
				lastName: "Pérez",
				birthDate: "1990-05-15",
				curp: "PEGJ900515HDFRZN01",
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

			vi.mocked(mockRepository.create).mockResolvedValue(mockClient);

			const result = await service.create(tenant, input);

			expect(mockRepository.create).toHaveBeenCalledWith(tenant, input);
			expect(result).toEqual(mockClient);
		});
	});

	describe("update", () => {
		it("should update client", async () => {
			const input = {
				personType: "physical" as const,
				firstName: "Juan Carlos",
				lastName: "Pérez",
				birthDate: "1990-05-15",
				curp: "PEGJ900515HDFRZN01",
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
			vi.mocked(mockRepository.update).mockResolvedValue({
				...mockClient,
				firstName: "Juan Carlos",
			});

			const result = await service.update(tenant, "client-123", input);

			expect(mockRepository.update).toHaveBeenCalledWith(
				tenant,
				"client-123",
				input,
			);
			expect(result.firstName).toBe("Juan Carlos");
		});
	});

	describe("patch", () => {
		it("should patch client", async () => {
			const input = { firstName: "Juan Carlos" };
			vi.mocked(mockRepository.patch).mockResolvedValue({
				...mockClient,
				firstName: "Juan Carlos",
			});

			const result = await service.patch(tenant, "client-123", input);

			expect(mockRepository.patch).toHaveBeenCalledWith(
				tenant,
				"client-123",
				input,
			);
			expect(result.firstName).toBe("Juan Carlos");
		});
	});

	describe("delete", () => {
		it("should delete client", async () => {
			vi.mocked(mockRepository.delete).mockResolvedValue(undefined);

			await service.delete(tenant, "client-123");

			expect(mockRepository.delete).toHaveBeenCalledWith(tenant, "client-123");
		});
	});

	describe("listDocuments", () => {
		it("should list client documents", async () => {
			const mockDocuments: ClientDocumentEntity[] = [
				{
					id: "doc-1",
					clientId: "client-123",
					documentType: "NATIONAL_ID",
					documentNumber: "12345678",
					status: "VERIFIED",
					createdAt: "2024-01-01T00:00:00Z",
					updatedAt: "2024-01-01T00:00:00Z",
				},
			];

			vi.mocked(mockRepository.listDocuments).mockResolvedValue(mockDocuments);

			const result = await service.listDocuments(tenant, "client-123");

			expect(mockRepository.listDocuments).toHaveBeenCalledWith(
				organizationId,
				"client-123",
			);
			expect(result).toEqual(mockDocuments);
		});
	});

	describe("createDocument", () => {
		it("should create document", async () => {
			const input = {
				clientId: "client-123",
				documentType: "NATIONAL_ID" as const,
				documentNumber: "12345678",
				status: "VERIFIED" as const,
			};

			const mockDocument: ClientDocumentEntity = {
				id: "doc-1",
				...input,
				createdAt: "2024-01-01T00:00:00Z",
				updatedAt: "2024-01-01T00:00:00Z",
			};

			vi.mocked(mockRepository.createDocument).mockResolvedValue(mockDocument);

			const result = await service.createDocument(tenant, input);

			expect(mockRepository.createDocument).toHaveBeenCalledWith(
				organizationId,
				input,
			);
			expect(result).toEqual(mockDocument);
		});
	});

	describe("updateDocument", () => {
		it("should update document", async () => {
			const input = {
				documentType: "NATIONAL_ID" as const,
				documentNumber: "87654321",
				status: "VERIFIED" as const,
			};
			const mockDocument: ClientDocumentEntity = {
				id: "doc-1",
				clientId: "client-123",
				documentType: "NATIONAL_ID",
				documentNumber: "87654321",
				status: "VERIFIED",
				createdAt: "2024-01-01T00:00:00Z",
				updatedAt: "2024-01-01T00:00:00Z",
			};

			vi.mocked(mockRepository.updateDocument).mockResolvedValue(mockDocument);

			const result = await service.updateDocument(
				tenant,
				"client-123",
				"doc-1",
				input,
			);

			expect(mockRepository.updateDocument).toHaveBeenCalledWith(
				organizationId,
				"client-123",
				"doc-1",
				input,
			);
			expect(result.documentNumber).toBe("87654321");
		});
	});

	describe("patchDocument", () => {
		it("should patch document", async () => {
			const input = { status: "PENDING" as const };
			const mockDocument: ClientDocumentEntity = {
				id: "doc-1",
				clientId: "client-123",
				documentType: "NATIONAL_ID",
				documentNumber: "12345678",
				status: "PENDING",
				createdAt: "2024-01-01T00:00:00Z",
				updatedAt: "2024-01-01T00:00:00Z",
			};

			vi.mocked(mockRepository.patchDocument).mockResolvedValue(mockDocument);

			const result = await service.patchDocument(
				tenant,
				"client-123",
				"doc-1",
				input,
			);

			expect(mockRepository.patchDocument).toHaveBeenCalledWith(
				organizationId,
				"client-123",
				"doc-1",
				input,
			);
			expect(result.status).toBe("PENDING");
		});
	});

	describe("deleteDocument", () => {
		it("should delete document", async () => {
			vi.mocked(mockRepository.deleteDocument).mockResolvedValue(undefined);

			await service.deleteDocument(tenant, "client-123", "doc-1");

			expect(mockRepository.deleteDocument).toHaveBeenCalledWith(
				organizationId,
				"client-123",
				"doc-1",
			);
		});
	});

	describe("listAddresses", () => {
		it("should list client addresses", async () => {
			const mockAddresses: ClientAddressEntity[] = [
				{
					id: "addr-1",
					clientId: "client-123",
					addressType: "RESIDENTIAL",
					street1: "Calle Principal",
					city: "Ciudad de México",
					state: "DIF",
					postalCode: "06000",
					country: "MX",
					isPrimary: true,
					createdAt: "2024-01-01T00:00:00Z",
					updatedAt: "2024-01-01T00:00:00Z",
				},
			];

			vi.mocked(mockRepository.listAddresses).mockResolvedValue(mockAddresses);

			const result = await service.listAddresses(tenant, "client-123");

			expect(mockRepository.listAddresses).toHaveBeenCalledWith(
				organizationId,
				"client-123",
			);
			expect(result).toEqual(mockAddresses);
		});
	});

	describe("createAddress", () => {
		it("should create address", async () => {
			const input = {
				clientId: "client-123",
				addressType: "RESIDENTIAL" as const,
				street1: "Calle Principal",
				city: "Ciudad de México",
				state: "DIF",
				postalCode: "06000",
				country: "MX",
				isPrimary: true,
			};

			const mockAddress: ClientAddressEntity = {
				id: "addr-1",
				...input,
				createdAt: "2024-01-01T00:00:00Z",
				updatedAt: "2024-01-01T00:00:00Z",
			};

			vi.mocked(mockRepository.createAddress).mockResolvedValue(mockAddress);

			const result = await service.createAddress(tenant, input);

			expect(mockRepository.createAddress).toHaveBeenCalledWith(
				organizationId,
				input,
			);
			expect(result).toEqual(mockAddress);
		});
	});

	describe("updateAddress", () => {
		it("should update address", async () => {
			const input = {
				addressType: "RESIDENTIAL" as const,
				street1: "Nueva Calle",
				city: "Ciudad de México",
				country: "MX",
				isPrimary: true,
			};
			const mockAddress: ClientAddressEntity = {
				id: "addr-1",
				clientId: "client-123",
				addressType: "RESIDENTIAL",
				street1: "Nueva Calle",
				city: "Ciudad de México",
				state: "DIF",
				postalCode: "06000",
				country: "MX",
				isPrimary: true,
				createdAt: "2024-01-01T00:00:00Z",
				updatedAt: "2024-01-01T00:00:00Z",
			};

			vi.mocked(mockRepository.updateAddress).mockResolvedValue(mockAddress);

			const result = await service.updateAddress(
				tenant,
				"client-123",
				"addr-1",
				input,
			);

			expect(mockRepository.updateAddress).toHaveBeenCalledWith(
				organizationId,
				"client-123",
				"addr-1",
				input,
			);
			expect(result.street1).toBe("Nueva Calle");
		});
	});

	describe("patchAddress", () => {
		it("should patch address", async () => {
			const input = { isPrimary: false };
			const mockAddress: ClientAddressEntity = {
				id: "addr-1",
				clientId: "client-123",
				addressType: "RESIDENTIAL",
				street1: "Calle Principal",
				city: "Ciudad de México",
				state: "DIF",
				postalCode: "06000",
				country: "MX",
				isPrimary: false,
				createdAt: "2024-01-01T00:00:00Z",
				updatedAt: "2024-01-01T00:00:00Z",
			};

			vi.mocked(mockRepository.patchAddress).mockResolvedValue(mockAddress);

			const result = await service.patchAddress(
				tenant,
				"client-123",
				"addr-1",
				input,
			);

			expect(mockRepository.patchAddress).toHaveBeenCalledWith(
				organizationId,
				"client-123",
				"addr-1",
				input,
			);
			expect(result.isPrimary).toBe(false);
		});
	});

	describe("deleteAddress", () => {
		it("should delete address", async () => {
			vi.mocked(mockRepository.deleteAddress).mockResolvedValue(undefined);

			await service.deleteAddress(tenant, "client-123", "addr-1");

			expect(mockRepository.deleteAddress).toHaveBeenCalledWith(
				organizationId,
				"client-123",
				"addr-1",
			);
		});
	});

	describe("getStats", () => {
		it("should get client stats", async () => {
			const stats = {
				totalClients: 100,
				physicalClients: 70,
				moralClients: 30,
				trustClients: 0,
			};

			vi.mocked(mockRepository.getStats).mockResolvedValue(stats);

			const result = await service.getStats(tenant);

			expect(mockRepository.getStats).toHaveBeenCalledWith(tenant);
			expect(result).toEqual(stats);
		});
	});
});
