import { describe, expect, it } from "vitest";
import {
	TRANSACTION_ENRICHMENT_CONFIG,
	TRANSACTION_ENRICHMENT_FIELDS,
} from "./enrichment";

describe("TRANSACTION_ENRICHMENT_CONFIG", () => {
	it("has configuration for brand field with BY_ID strategy", () => {
		const brandConfig = TRANSACTION_ENRICHMENT_CONFIG.brand;
		expect(brandConfig).toBeDefined();
		expect(brandConfig.strategy).toBe("BY_ID");
		expect(brandConfig.catalogs).toEqual([
			"terrestrial-vehicle-brands",
			"maritime-vehicle-brands",
			"air-vehicle-brands",
		]);
		expect(brandConfig.outputField).toBe("brandCatalog");
	});

	it("has configuration for flagCountryId field with BY_ID strategy", () => {
		const countryConfig = TRANSACTION_ENRICHMENT_CONFIG.flagCountryId;
		expect(countryConfig).toBeDefined();
		expect(countryConfig.strategy).toBe("BY_ID");
		expect(countryConfig.catalogs).toEqual(["countries"]);
		expect(countryConfig.outputField).toBe("flagCountryCatalog");
	});

	it("has configuration for operationTypeCode field with BY_CODE strategy", () => {
		const opTypeConfig = TRANSACTION_ENRICHMENT_CONFIG.operationTypeCode;
		expect(opTypeConfig).toBeDefined();
		expect(opTypeConfig.strategy).toBe("BY_CODE");
		expect(opTypeConfig.catalogs).toEqual(["veh-operation-types"]);
		expect(opTypeConfig.outputField).toBe("operationTypeCatalog");
	});

	it("has configuration for currencyCode field with BY_CODE strategy", () => {
		const currencyConfig = TRANSACTION_ENRICHMENT_CONFIG.currencyCode;
		expect(currencyConfig).toBeDefined();
		expect(currencyConfig.strategy).toBe("BY_CODE");
		expect(currencyConfig.catalogs).toEqual(["currencies"]);
		expect(currencyConfig.outputField).toBe("currencyCatalog");
	});
});

describe("TRANSACTION_ENRICHMENT_FIELDS", () => {
	it("defines all expected output field names", () => {
		expect(TRANSACTION_ENRICHMENT_FIELDS).toEqual({
			brandCatalog: "brandCatalog",
			flagCountryCatalog: "flagCountryCatalog",
			operationTypeCatalog: "operationTypeCatalog",
			currencyCatalog: "currencyCatalog",
		});
	});

	it("matches output fields in TRANSACTION_ENRICHMENT_CONFIG", () => {
		const configOutputFields = Object.values(TRANSACTION_ENRICHMENT_CONFIG).map(
			(c) => c.outputField,
		);

		const definedFields = Object.values(TRANSACTION_ENRICHMENT_FIELDS);

		// Every config output field should be in the defined fields
		for (const field of configOutputFields) {
			expect(definedFields).toContain(field);
		}
	});
});
