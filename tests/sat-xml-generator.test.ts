import { describe, it, expect } from "vitest";
import {
	generateSatVehicleNoticeXml,
	mapToSatVehicleNoticeData,
	generateAvisoXml,
	generateMonthlyReportXml,
	type SatVehicleNoticeData,
	type SatMonthlyReportData,
} from "../src/lib/sat-xml-generator";
import type { AlertEntity } from "../src/domain/alert/types";
import type { ClientEntity } from "../src/domain/client/types";
import type { TransactionEntity } from "../src/domain/transaction/types";

describe("sat-xml-generator", () => {
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

	const mockPhysicalClient: ClientEntity = {
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

	const mockMoralClient: ClientEntity = {
		id: "client-456",
		rfc: "ABC123456DEF",
		organizationId: "org-123",
		personType: "moral",
		businessName: "Empresa Test SA de CV",
		incorporationDate: "2010-01-01",
		nationality: null,
		email: "empresa@example.com",
		phone: "+521234567890",
		country: "MX",
		stateCode: "JAL",
		city: "Guadalajara",
		municipality: "Guadalajara",
		neighborhood: "Colonia Centro",
		street: "Avenida Principal",
		externalNumber: "456",
		postalCode: "44100",
		createdAt: "2024-01-01T00:00:00Z",
		updatedAt: "2024-01-01T00:00:00Z",
	};

	const mockLandTransaction: TransactionEntity = {
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

	const mockMarineTransaction: TransactionEntity = {
		...mockLandTransaction,
		id: "transaction-456",
		vehicleType: "marine",
		registrationNumber: "REG123456",
		flagCountryId: "MX",
		engineNumber: "ENG123456",
		plates: null,
	};

	const mockAirTransaction: TransactionEntity = {
		...mockLandTransaction,
		id: "transaction-789",
		vehicleType: "air",
		registrationNumber: "N12345",
		flagCountryId: "US",
		engineNumber: "ENG789",
		plates: null,
	};

	describe("generateSatVehicleNoticeXml", () => {
		it("should generate XML for physical person with land vehicle", () => {
			const data: SatVehicleNoticeData = {
				reportedMonth: "202401",
				obligatedSubjectKey: "RFC123456789",
				activityKey: "VEH",
				noticeReference: "alert-123",
				priority: "1",
				alertType: "803",
				noticePerson: {
					personType: "fisica",
					name: "Juan",
					paternalLastName: "Pérez",
					maternalLastName: "García",
					birthDate: "19900515",
					nationalityCountry: "MX",
					addressType: "nacional",
					neighborhood: "Colonia Centro",
					street: "Calle Principal",
					externalNumber: "123",
					postalCode: "06000",
				},
				operationDetails: {
					operationDate: "20240115",
					postalCode: "06000",
					operationType: "802",
					vehicles: [
						{
							type: "terrestre",
							manufacturerBrand: "Toyota",
							model: "Corolla",
							year: 2020,
							vin: "1HGBH41JXMN109186",
							plates: "ABC-1234",
						},
					],
					liquidationData: {
						paymentDate: "20240115",
						paymentForm: "1",
						monetaryInstrument: "1",
						currency: "3",
						operationAmount: "500000.00",
					},
				},
			};

			const xml = generateSatVehicleNoticeXml(data);

			expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
			expect(xml).toContain("<archivo");
			expect(xml).toContain("<mes_reportado>202401</mes_reportado>");
			expect(xml).toContain(
				"<clave_sujeto_obligado>RFC123456789</clave_sujeto_obligado>",
			);
			expect(xml).toContain("<clave_actividad>VEH</clave_actividad>");
			expect(xml).toContain("<referencia_aviso>alert-123</referencia_aviso>");
			expect(xml).toContain("<persona_fisica>");
			expect(xml).toContain("<nombre>Juan</nombre>");
			expect(xml).toContain("<apellido_paterno>Pérez</apellido_paterno>");
			expect(xml).toContain("<apellido_materno>García</apellido_materno>");
			expect(xml).toContain("<datos_vehiculo_terrestre>");
			expect(xml).toContain("<marca_fabricante>Toyota</marca_fabricante>");
			expect(xml).toContain("<modelo>Corolla</modelo>");
			expect(xml).toContain("<anio>2020</anio>");
		});

		it("should generate XML for moral person", () => {
			const data: SatVehicleNoticeData = {
				reportedMonth: "202401",
				obligatedSubjectKey: "RFC123456789",
				activityKey: "VEH",
				noticeReference: "alert-456",
				priority: "1",
				alertType: "803",
				noticePerson: {
					personType: "moral",
					businessName: "Empresa Test SA de CV",
					rfc: "ABC123456DEF",
					addressType: "nacional",
					postalCode: "44100",
				},
				operationDetails: {
					operationDate: "20240115",
					postalCode: "44100",
					operationType: "802",
					vehicles: [
						{
							type: "terrestre",
							manufacturerBrand: "Nissan",
							model: "Sentra",
							year: 2021,
						},
					],
					liquidationData: {
						paymentDate: "20240115",
						paymentForm: "1",
						monetaryInstrument: "1",
						currency: "3",
						operationAmount: "300000.00",
					},
				},
			};

			const xml = generateSatVehicleNoticeXml(data);

			expect(xml).toContain("<persona_moral>");
			expect(xml).toContain(
				"<denominacion_razon>Empresa Test SA de CV</denominacion_razon>",
			);
			expect(xml).toContain("<rfc>ABC123456DEF</rfc>");
		});

		it("should generate XML for marine vehicle", () => {
			const data: SatVehicleNoticeData = {
				reportedMonth: "202401",
				obligatedSubjectKey: "RFC123456789",
				activityKey: "VEH",
				noticeReference: "alert-789",
				priority: "1",
				alertType: "803",
				noticePerson: {
					personType: "fisica",
					name: "María",
					paternalLastName: "López",
					addressType: "nacional",
					postalCode: "06000",
				},
				operationDetails: {
					operationDate: "20240115",
					postalCode: "06000",
					operationType: "802",
					vehicles: [
						{
							type: "maritimo",
							manufacturerBrand: "Yamaha",
							model: "Model X",
							year: 2022,
							serialNumber: "SER123456",
							flag: "MX",
							registration: "REG123456",
						},
					],
					liquidationData: {
						paymentDate: "20240115",
						paymentForm: "1",
						monetaryInstrument: "1",
						currency: "3",
						operationAmount: "800000.00",
					},
				},
			};

			const xml = generateSatVehicleNoticeXml(data);

			expect(xml).toContain("<datos_vehiculo_maritimo>");
			expect(xml).toContain("<numero_serie>SER123456</numero_serie>");
			expect(xml).toContain("<bandera>MX</bandera>");
			expect(xml).toContain("<matricula>REG123456</matricula>");
		});

		it("should generate XML for air vehicle", () => {
			const data: SatVehicleNoticeData = {
				reportedMonth: "202401",
				obligatedSubjectKey: "RFC123456789",
				activityKey: "VEH",
				noticeReference: "alert-999",
				priority: "1",
				alertType: "803",
				noticePerson: {
					personType: "fisica",
					name: "Carlos",
					paternalLastName: "González",
					addressType: "nacional",
					postalCode: "06000",
				},
				operationDetails: {
					operationDate: "20240115",
					postalCode: "06000",
					operationType: "802",
					vehicles: [
						{
							type: "aereo",
							manufacturerBrand: "Cessna",
							model: "172",
							year: 2023,
							serialNumber: "SER789",
							flag: "US",
							registration: "N12345",
						},
					],
					liquidationData: {
						paymentDate: "20240115",
						paymentForm: "1",
						monetaryInstrument: "1",
						currency: "3",
						operationAmount: "2000000.00",
					},
				},
			};

			const xml = generateSatVehicleNoticeXml(data);

			expect(xml).toContain("<datos_vehiculo_aereo>");
			expect(xml).toContain("<numero_serie>SER789</numero_serie>");
			expect(xml).toContain("<bandera>US</bandera>");
			expect(xml).toContain("<matricula>N12345</matricula>");
		});

		it("should escape XML special characters", () => {
			const data: SatVehicleNoticeData = {
				reportedMonth: "202401",
				obligatedSubjectKey: "RFC123456789",
				activityKey: "VEH",
				noticeReference: "alert-123",
				priority: "1",
				alertType: "803",
				noticePerson: {
					personType: "fisica",
					name: "Test & Company <test>",
					paternalLastName: 'Pérez "García"',
					addressType: "nacional",
					postalCode: "06000",
				},
				operationDetails: {
					operationDate: "20240115",
					postalCode: "06000",
					operationType: "802",
					vehicles: [
						{
							type: "terrestre",
							manufacturerBrand: "Toyota",
							model: "Corolla",
							year: 2020,
						},
					],
					liquidationData: {
						paymentDate: "20240115",
						paymentForm: "1",
						monetaryInstrument: "1",
						currency: "3",
						operationAmount: "500000.00",
					},
				},
			};

			const xml = generateSatVehicleNoticeXml(data);

			expect(xml).toContain("&amp;");
			expect(xml).toContain("&lt;");
			expect(xml).toContain("&gt;");
			expect(xml).toContain("&quot;");
			expect(xml).not.toContain("<test>");
		});

		it("should include optional owner beneficiary", () => {
			const data: SatVehicleNoticeData = {
				reportedMonth: "202401",
				obligatedSubjectKey: "RFC123456789",
				activityKey: "VEH",
				noticeReference: "alert-123",
				priority: "1",
				alertType: "803",
				noticePerson: {
					personType: "fisica",
					name: "Juan",
					paternalLastName: "Pérez",
					addressType: "nacional",
					postalCode: "06000",
				},
				ownerBeneficiary: {
					personType: "fisica",
					name: "María",
					paternalLastName: "García",
					birthDate: "19920520",
					nationalityCountry: "MX",
				},
				operationDetails: {
					operationDate: "20240115",
					postalCode: "06000",
					operationType: "802",
					vehicles: [
						{
							type: "terrestre",
							manufacturerBrand: "Toyota",
							model: "Corolla",
							year: 2020,
						},
					],
					liquidationData: {
						paymentDate: "20240115",
						paymentForm: "1",
						monetaryInstrument: "1",
						currency: "3",
						operationAmount: "500000.00",
					},
				},
			};

			const xml = generateSatVehicleNoticeXml(data);

			expect(xml).toContain("<dueno_beneficiario>");
			expect(xml).toContain("<nombre>María</nombre>");
			expect(xml).toContain("<apellido_paterno>García</apellido_paterno>");
		});
	});

	describe("mapToSatVehicleNoticeData", () => {
		it("should map physical client with land transaction correctly", () => {
			const result = mapToSatVehicleNoticeData(
				mockAlert,
				mockPhysicalClient,
				mockLandTransaction,
				{
					obligatedSubjectKey: "RFC123456789",
					activityKey: "VEH",
					operationType: "802",
					currency: "3",
					vehicleType: "terrestre",
					brand: "Toyota",
					nationalityCountry: "MX",
					paymentForm: "1",
					monetaryInstrument: "1",
				},
			);

			expect(result.reportedMonth).toBe("202401");
			expect(result.obligatedSubjectKey).toBe("RFC123456789");
			expect(result.activityKey).toBe("VEH");
			expect(result.noticeReference).toBe("alert-123");
			expect(result.noticePerson.personType).toBe("fisica");
			expect(result.noticePerson.name).toBe("Juan");
			expect(result.noticePerson.paternalLastName).toBe("Pérez");
			expect(result.noticePerson.maternalLastName).toBe("García");
			expect(result.operationDetails.vehicles[0]?.type).toBe("terrestre");
			expect(result.operationDetails.vehicles[0]?.manufacturerBrand).toBe(
				"Toyota",
			);
			// vin prioritizes registrationNumber over engineNumber for terrestre
			expect(result.operationDetails.vehicles[0]?.vin).toBe("REPUVE123456");
			expect(result.operationDetails.vehicles[0]?.plates).toBe("ABC-1234");
		});

		it("should map moral client correctly", () => {
			const result = mapToSatVehicleNoticeData(
				mockAlert,
				mockMoralClient,
				mockLandTransaction,
				{
					obligatedSubjectKey: "RFC123456789",
					activityKey: "VEH",
					operationType: "802",
					currency: "3",
					vehicleType: "terrestre",
					brand: "Toyota",
					paymentForm: "1",
					monetaryInstrument: "1",
				},
			);

			expect(result.noticePerson.personType).toBe("moral");
			expect(result.noticePerson.businessName).toBe("Empresa Test SA de CV");
			expect(result.noticePerson.rfc).toBe("ABC123456DEF");
		});

		it("should map marine transaction correctly", () => {
			const result = mapToSatVehicleNoticeData(
				mockAlert,
				mockPhysicalClient,
				mockMarineTransaction,
				{
					obligatedSubjectKey: "RFC123456789",
					activityKey: "VEH",
					operationType: "802",
					currency: "3",
					vehicleType: "maritimo",
					brand: "Yamaha",
					nationalityCountry: "MX",
					paymentForm: "1",
					monetaryInstrument: "1",
				},
			);

			expect(result.operationDetails.vehicles[0]?.type).toBe("maritimo");
			expect(result.operationDetails.vehicles[0]?.serialNumber).toBe(
				"ENG123456",
			);
			expect(result.operationDetails.vehicles[0]?.flag).toBe("MX");
			expect(result.operationDetails.vehicles[0]?.registration).toBe(
				"REG123456",
			);
		});

		it("should map air transaction correctly", () => {
			const result = mapToSatVehicleNoticeData(
				mockAlert,
				mockPhysicalClient,
				mockAirTransaction,
				{
					obligatedSubjectKey: "RFC123456789",
					activityKey: "VEH",
					operationType: "802",
					currency: "3",
					vehicleType: "aereo",
					brand: "Cessna",
					nationalityCountry: "MX",
					paymentForm: "1",
					monetaryInstrument: "1",
				},
			);

			expect(result.operationDetails.vehicles[0]?.type).toBe("aereo");
			expect(result.operationDetails.vehicles[0]?.serialNumber).toBe("ENG789");
			expect(result.operationDetails.vehicles[0]?.flag).toBe("US");
			expect(result.operationDetails.vehicles[0]?.registration).toBe("N12345");
		});

		it("should use defaults for optional fields", () => {
			const result = mapToSatVehicleNoticeData(
				mockAlert,
				mockPhysicalClient,
				mockLandTransaction,
				{
					obligatedSubjectKey: "RFC123456789",
					activityKey: "VEH",
					operationType: "802",
					currency: "3",
					vehicleType: "terrestre",
					brand: "Toyota",
					nationalityCountry: "MX",
				},
			);

			expect(result.priority).toBe("1");
			expect(result.alertType).toBe("803");
			expect(result.operationDetails.liquidationData.paymentForm).toBe("1");
			expect(result.operationDetails.liquidationData.monetaryInstrument).toBe(
				"1",
			);
		});
	});

	describe("generateAvisoXml", () => {
		it("should generate aviso XML portion", () => {
			const data: SatVehicleNoticeData = {
				reportedMonth: "202401",
				obligatedSubjectKey: "RFC123456789",
				activityKey: "VEH",
				noticeReference: "alert-123",
				priority: "1",
				alertType: "803",
				noticePerson: {
					personType: "fisica",
					name: "Juan",
					paternalLastName: "Pérez",
					addressType: "nacional",
					postalCode: "06000",
				},
				operationDetails: {
					operationDate: "20240115",
					postalCode: "06000",
					operationType: "802",
					vehicles: [
						{
							type: "terrestre",
							manufacturerBrand: "Toyota",
							model: "Corolla",
							year: 2020,
						},
					],
					liquidationData: {
						paymentDate: "20240115",
						paymentForm: "1",
						monetaryInstrument: "1",
						currency: "3",
						operationAmount: "500000.00",
					},
				},
			};

			const xml = generateAvisoXml(data);

			expect(xml).toContain("<aviso>");
			expect(xml).toContain("<referencia_aviso>alert-123</referencia_aviso>");
			expect(xml).toContain("<persona_aviso>");
			expect(xml).toContain("<detalle_operaciones>");
			expect(xml).toContain("</aviso>");
			expect(xml).not.toContain("<archivo>");
			expect(xml).not.toContain("<informe>");
		});
	});

	describe("generateMonthlyReportXml", () => {
		it("should generate monthly report XML with multiple avisos", () => {
			const aviso1: SatVehicleNoticeData = {
				reportedMonth: "202401",
				obligatedSubjectKey: "RFC123456789",
				activityKey: "VEH",
				noticeReference: "alert-1",
				priority: "1",
				alertType: "803",
				noticePerson: {
					personType: "fisica",
					name: "Juan",
					paternalLastName: "Pérez",
					addressType: "nacional",
					postalCode: "06000",
				},
				operationDetails: {
					operationDate: "20240115",
					postalCode: "06000",
					operationType: "802",
					vehicles: [
						{
							type: "terrestre",
							manufacturerBrand: "Toyota",
							model: "Corolla",
							year: 2020,
						},
					],
					liquidationData: {
						paymentDate: "20240115",
						paymentForm: "1",
						monetaryInstrument: "1",
						currency: "3",
						operationAmount: "500000.00",
					},
				},
			};

			const aviso2: SatVehicleNoticeData = {
				...aviso1,
				noticeReference: "alert-2",
				noticePerson: {
					...aviso1.noticePerson,
					name: "María",
					paternalLastName: "García",
				},
			};

			const data: SatMonthlyReportData = {
				reportedMonth: "202401",
				obligatedSubjectKey: "RFC123456789",
				activityKey: "VEH",
				avisos: [aviso1, aviso2],
			};

			const xml = generateMonthlyReportXml(data);

			expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
			expect(xml).toContain("<archivo");
			expect(xml).toContain("<informe>");
			expect(xml).toContain("<mes_reportado>202401</mes_reportado>");
			expect(xml).toContain("<referencia_aviso>alert-1</referencia_aviso>");
			expect(xml).toContain("<referencia_aviso>alert-2</referencia_aviso>");
			expect(xml).toContain("<nombre>Juan</nombre>");
			expect(xml).toContain("<nombre>María</nombre>");
		});
	});
});
