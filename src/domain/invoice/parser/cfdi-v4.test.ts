/**
 * Tests for CFDI v4.0 Parser — Smart Metadata Extraction
 *
 * Tests the enhanced extractMetadataFromDescription method
 * which provides VA-specific data extraction from CFDI descriptions.
 */

import { describe, it, expect } from "vitest";
import { CfdiV4Parser } from "./cfdi-v4";

const parser = new CfdiV4Parser();

describe("CfdiV4Parser.extractMetadataFromDescription", () => {
	// ── VEH: Vehicle extraction ────────────────────────────────────

	describe("VEH: Vehicle metadata", () => {
		it("should extract VIN from description", () => {
			const desc = "TOYOTA RAV4 2024 VIN: JTDKN3DU5A0123456";
			const meta = parser.extractMetadataFromDescription(desc);
			expect(meta?.vin).toBe("JTDKN3DU5A0123456");
		});

		it("should extract VIN without label", () => {
			const desc = "BMW X5 WBAPH5C55BA123456 NEGRO";
			const meta = parser.extractMetadataFromDescription(desc);
			expect(meta?.vin).toBe("WBAPH5C55BA123456");
		});

		it("should extract license plates (Mexican format)", () => {
			const desc = "Vehículo NISSAN VERSA 2023 PLACAS ABC-1234";
			const meta = parser.extractMetadataFromDescription(desc);
			expect(meta?.plates).toBe("ABC-1234");
		});

		it("should extract year from description", () => {
			const desc = "HONDA CR-V MODELO 2024 GRIS PLATA";
			const meta = parser.extractMetadataFromDescription(desc);
			expect(meta?.year).toBe(2024);
		});

		it("should extract vehicle brand", () => {
			const desc = "VOLKSWAGEN JETTA 2023 BLANCO";
			const meta = parser.extractMetadataFromDescription(desc);
			expect(meta?.vehicleBrand).toBe("VOLKSWAGEN");
		});

		it("should extract multiple VEH fields at once", () => {
			const desc = "FORD EXPLORER 2024 VIN 1FMSK8DH0RGA12345 PLACAS MXA-123";
			const meta = parser.extractMetadataFromDescription(desc);
			expect(meta?.vin).toBe("1FMSK8DH0RGA12345");
			expect(meta?.year).toBe(2024);
			expect(meta?.vehicleBrand).toBe("FORD");
		});

		it("should extract engine number", () => {
			const desc = "Motor: ABC123DEF456 Chevrolet Aveo 2022";
			const meta = parser.extractMetadataFromDescription(desc);
			expect(meta?.engineNumber).toBe("ABC123DEF456");
		});
	});

	// ── INM: Real estate extraction ────────────────────────────────

	describe("INM: Real estate metadata", () => {
		it("should extract registry folio", () => {
			const desc = "Inmueble ubicado en Col. Roma, Folio Real N-12345-678";
			const meta = parser.extractMetadataFromDescription(desc);
			expect(meta?.registryFolio).toBe("N-12345-678");
		});

		it("should extract postal code", () => {
			const desc = "Terreno en Polanco C.P. 11560 CDMX";
			const meta = parser.extractMetadataFromDescription(desc);
			expect(meta?.postalCode).toBe("11560");
		});

		it("should extract area in m²", () => {
			const desc = "Departamento de 120.5 m2 en Condesa";
			const meta = parser.extractMetadataFromDescription(desc);
			expect(meta?.areaM2).toBeCloseTo(120.5);
		});
	});

	// ── MJR: Jewelry / precious metals ─────────────────────────────

	describe("MJR: Jewelry metadata", () => {
		it("should extract weight in grams", () => {
			const desc = "Collar de oro 14k, peso: 45.5 gramos";
			const meta = parser.extractMetadataFromDescription(desc);
			expect(meta?.weight).toBeCloseTo(45.5);
		});

		it("should extract purity in karats", () => {
			const desc = "Anillo de oro 18 kilates con diamante";
			const meta = parser.extractMetadataFromDescription(desc);
			expect(meta?.purity).toBe("18K");
		});

		it("should extract metal type", () => {
			const desc = "Lingote de PLATA pura 999, 1000g";
			const meta = parser.extractMetadataFromDescription(desc);
			expect(meta?.metalType).toBe("PLATA");
		});
	});

	// ── AVI: Virtual assets ────────────────────────────────────────

	describe("AVI: Virtual asset metadata", () => {
		it("should extract Bitcoin wallet address", () => {
			const desc = "Compra de Bitcoin desde 1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa";
			const meta = parser.extractMetadataFromDescription(desc);
			expect(meta?.walletAddress).toBe("1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa");
		});

		it("should extract Ethereum wallet address", () => {
			const desc = "Transfer to 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";
			const meta = parser.extractMetadataFromDescription(desc);
			expect(meta?.walletAddress).toBe(
				"0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
			);
		});

		it("should extract crypto asset name", () => {
			const desc = "Venta de 2.5 BITCOIN a precio spot";
			const meta = parser.extractMetadataFromDescription(desc);
			expect(meta?.cryptoAsset).toBe("BITCOIN");
		});
	});

	// ── ARI: Rental ────────────────────────────────────────────────

	describe("ARI: Rental metadata", () => {
		it("should extract rental period in months", () => {
			const desc = "Arrendamiento de oficina por 24 meses";
			const meta = parser.extractMetadataFromDescription(desc);
			expect(meta?.rentalPeriodMonths).toBe(24);
		});
	});

	// ── General ────────────────────────────────────────────────────

	describe("General metadata", () => {
		it("should extract reference/contract number", () => {
			const desc = "Servicio profesional Contrato: ABC-2024-001";
			const meta = parser.extractMetadataFromDescription(desc);
			expect(meta?.referenceNumber).toBe("ABC-2024-001");
		});

		it("should return undefined for empty description", () => {
			expect(parser.extractMetadataFromDescription("")).toBeUndefined();
		});

		it("should return undefined for description with no extractable data", () => {
			const meta = parser.extractMetadataFromDescription(
				"Servicio general de consultoría",
			);
			expect(meta).toBeUndefined();
		});
	});
});

describe("CfdiV4Parser.suggestActivityFromProductCode", () => {
	it("should suggest VEH for vehicle codes (25xxxxx)", () => {
		const comprobante = buildComprobante("25101501");
		const hints = parser.extractPldHints(comprobante);
		expect(hints.suggestedActivityCode).toBe("VEH");
	});

	it("should suggest INM for real estate codes", () => {
		const comprobante = buildComprobante("80141601");
		const hints = parser.extractPldHints(comprobante);
		expect(hints.suggestedActivityCode).toBe("INM");
	});

	it("should suggest MJR for jewelry codes", () => {
		const comprobante = buildComprobante("71151501");
		const hints = parser.extractPldHints(comprobante);
		expect(hints.suggestedActivityCode).toBe("MJR");
	});

	it("should return no suggestion for generic codes", () => {
		const comprobante = buildComprobante("01010101");
		const hints = parser.extractPldHints(comprobante);
		expect(hints.suggestedActivityCode).toBeUndefined();
	});
});

// Helper to build a minimal CfdiComprobante for testing
function buildComprobante(productCode: string) {
	return {
		Version: "4.0",
		Fecha: "2024-01-15T10:30:00",
		SubTotal: "100000",
		Total: "116000",
		Moneda: "MXN",
		TipoDeComprobante: "I",
		LugarExpedicion: "06600",
		Emisor: {
			Rfc: "AAA010101AAA",
			Nombre: "Test Emisor",
			RegimenFiscal: "601",
		},
		Receptor: { Rfc: "BBB020202BBB", Nombre: "Test Receptor" },
		Conceptos: [
			{
				ClaveProdServ: productCode,
				Cantidad: "1",
				ClaveUnidad: "H87",
				Descripcion: "Test product",
				ValorUnitario: "100000",
				Importe: "100000",
				ObjetoImp: "02",
			},
		],
	};
}
