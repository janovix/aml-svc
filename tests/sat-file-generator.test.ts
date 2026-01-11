import { describe, it, expect, beforeEach, vi } from "vitest";
import {
	generateAndUploadSatFile,
	type SatFileGeneratorConfig,
} from "../src/lib/sat-file-generator";
import type { AlertEntity } from "../src/domain/alert/types";
import type { ClientEntity } from "../src/domain/client/types";
import type { TransactionEntity } from "../src/domain/transaction/types";

describe("sat-file-generator", () => {
	let mockR2Bucket: R2Bucket;
	let mockGetCatalogValue: (
		catalogKey: string,
		itemName: string,
	) => Promise<string | null>;

	const mockAlert: AlertEntity = {
		id: "alert-123",
		alertRuleId: "2501",
		clientId: "client-123",
		status: "DETECTED",
		severity: "HIGH",
		idempotencyKey: "key-123",
		contextHash: "hash-123",
		metadata: {},
		transactionId: "transaction-123",
		isManual: false,
		isOverdue: false,
		createdAt: "2024-01-15T00:00:00Z",
		updatedAt: "2024-01-15T00:00:00Z",
	};

	const mockClient: ClientEntity = {
		id: "client-123",
		rfc: "ABCD123456EF7",
		organizationId: "org-123",
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
		createdAt: "2024-01-01T00:00:00Z",
		updatedAt: "2024-01-01T00:00:00Z",
	};

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

	beforeEach(() => {
		mockR2Bucket = {
			put: vi.fn().mockResolvedValue({
				key: "alerts/alert-123/2024-01-15T00-00-00-000Z-alert-123.xml",
				size: 2048,
				etag: "etag-123",
			}),
		} as unknown as R2Bucket;

		mockGetCatalogValue = vi
			.fn()
			.mockImplementation(async (catalogKey: string, itemName: string) => {
				if (catalogKey === "veh-operation-types" && itemName === "802") {
					return "802";
				}
				if (catalogKey === "currencies" && itemName === "3") {
					return "3";
				}
				if (catalogKey === "countries" && itemName === "MX") {
					return "MX";
				}
				if (catalogKey === "payment-forms" && itemName === "1") {
					return "1";
				}
				return null;
			});
	});

	describe("generateAndUploadSatFile", () => {
		it("should generate and upload SAT file for land vehicle", async () => {
			const config: SatFileGeneratorConfig = {
				r2Bucket: mockR2Bucket,
				obligatedSubjectKey: "RFC123456789",
				activityKey: "VEH",
				getCatalogValue: mockGetCatalogValue,
			};

			const result = await generateAndUploadSatFile(
				mockAlert,
				mockClient,
				mockTransaction,
				config,
			);

			expect(result.fileKey).toContain("alerts/alert-123/");
			expect(result.fileKey).toContain("-alert-123.xml");
			expect(result.fileSize).toBe(2048);
			expect(result.etag).toBe("etag-123");
			expect(result.fileUrl).toContain("r2://sat-xml-files/");

			expect(mockR2Bucket.put).toHaveBeenCalledTimes(1);
			const putCall = vi.mocked(mockR2Bucket.put).mock.calls[0];
			expect(putCall[0]).toContain("alerts/alert-123/");
			expect(putCall[1]).toBeInstanceOf(Uint8Array);
			expect(putCall[2]).toEqual({
				httpMetadata: {
					contentType: "application/xml",
				},
				customMetadata: {
					alertId: "alert-123",
					clientId: "client-123",
					transactionId: "transaction-123",
					generatedAt: expect.any(String),
				},
			});
		});

		it("should handle marine vehicle type", async () => {
			const marineTransaction: TransactionEntity = {
				...mockTransaction,
				vehicleType: "marine",
				registrationNumber: "REG123456",
				flagCountryId: "MX",
			};

			const config: SatFileGeneratorConfig = {
				r2Bucket: mockR2Bucket,
				obligatedSubjectKey: "RFC123456789",
				activityKey: "VEH",
				getCatalogValue: mockGetCatalogValue,
			};

			const result = await generateAndUploadSatFile(
				mockAlert,
				mockClient,
				marineTransaction,
				config,
			);

			expect(result.fileKey).toBeDefined();
			expect(mockR2Bucket.put).toHaveBeenCalledTimes(1);
		});

		it("should handle air vehicle type", async () => {
			const airTransaction: TransactionEntity = {
				...mockTransaction,
				vehicleType: "air",
				registrationNumber: "N12345",
				flagCountryId: "US",
			};

			const config: SatFileGeneratorConfig = {
				r2Bucket: mockR2Bucket,
				obligatedSubjectKey: "RFC123456789",
				activityKey: "VEH",
				getCatalogValue: mockGetCatalogValue,
			};

			const result = await generateAndUploadSatFile(
				mockAlert,
				mockClient,
				airTransaction,
				config,
			);

			expect(result.fileKey).toBeDefined();
			expect(mockR2Bucket.put).toHaveBeenCalledTimes(1);
		});

		it("should use catalog values when available", async () => {
			const config: SatFileGeneratorConfig = {
				r2Bucket: mockR2Bucket,
				obligatedSubjectKey: "RFC123456789",
				activityKey: "VEH",
				getCatalogValue: mockGetCatalogValue,
			};

			await generateAndUploadSatFile(
				mockAlert,
				mockClient,
				mockTransaction,
				config,
			);

			expect(mockGetCatalogValue).toHaveBeenCalledWith(
				"veh-operation-types",
				"802",
			);
			expect(mockGetCatalogValue).toHaveBeenCalledWith("currencies", "3");
			expect(mockGetCatalogValue).toHaveBeenCalledWith("countries", "MX");
			expect(mockGetCatalogValue).toHaveBeenCalledWith("payment-forms", "1");
		});

		it("should use defaults when catalog values are not found", async () => {
			const config: SatFileGeneratorConfig = {
				r2Bucket: mockR2Bucket,
				obligatedSubjectKey: "RFC123456789",
				activityKey: "VEH",
				getCatalogValue: vi.fn().mockResolvedValue(null),
			};

			const result = await generateAndUploadSatFile(
				mockAlert,
				mockClient,
				mockTransaction,
				config,
			);

			expect(result.fileKey).toBeDefined();
			expect(mockR2Bucket.put).toHaveBeenCalledTimes(1);
		});

		it("should handle moral client", async () => {
			const moralClient: ClientEntity = {
				...mockClient,
				personType: "moral",
				businessName: "Empresa Test SA de CV",
				rfc: "ABC123456DEF",
				firstName: undefined,
				lastName: undefined,
			};

			const config: SatFileGeneratorConfig = {
				r2Bucket: mockR2Bucket,
				obligatedSubjectKey: "RFC123456789",
				activityKey: "VEH",
				getCatalogValue: mockGetCatalogValue,
			};

			const result = await generateAndUploadSatFile(
				mockAlert,
				moralClient,
				mockTransaction,
				config,
			);

			expect(result.fileKey).toBeDefined();
			expect(mockR2Bucket.put).toHaveBeenCalledTimes(1);
		});

		it("should include collegiateEntityKey when provided", async () => {
			const config: SatFileGeneratorConfig = {
				r2Bucket: mockR2Bucket,
				obligatedSubjectKey: "RFC123456789",
				activityKey: "VEH",
				collegiateEntityKey: "COL123",
				getCatalogValue: mockGetCatalogValue,
			};

			const result = await generateAndUploadSatFile(
				mockAlert,
				mockClient,
				mockTransaction,
				config,
			);

			expect(result.fileKey).toBeDefined();
			expect(mockR2Bucket.put).toHaveBeenCalledTimes(1);
		});
	});
});
