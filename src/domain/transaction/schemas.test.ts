import { describe, expect, it } from "vitest";

import { TransactionCreateSchema } from "./schemas";

function buildBasePayload(overrides: Record<string, unknown> = {}) {
	return {
		clientId: "client-123",
		operationDate: "2024-11-20T15:30:00.000Z",
		operationType: "purchase",
		branchPostalCode: "06140",
		brandId: "brand-001",
		model: "Armored SUV",
		year: 2023,
		serialNumber: "SERIAL-XYZ",
		armorLevel: null,
		amount: "3500000.75",
		currency: "MXN",
		paymentMethod: "wire",
		paymentDate: "2024-11-22T18:00:00.000Z",
		vehicleType: "land",
		engineNumber: "ENG-ABC",
		plates: "ABC1234",
		registrationNumber: null,
		flagCountryId: null,
		...overrides,
	};
}

describe("TransactionCreateSchema", () => {
	it("accepts a valid land transaction", () => {
		const payload = buildBasePayload();
		expect(() => TransactionCreateSchema.parse(payload)).not.toThrow();
	});

	it("requires plates for land vehicles", () => {
		const payload = buildBasePayload({ plates: undefined });
		expect(() => TransactionCreateSchema.parse(payload)).toThrow(/plates/i);
	});

	it("requires engineNumber for land vehicles", () => {
		const payload = buildBasePayload({ engineNumber: undefined });
		expect(() => TransactionCreateSchema.parse(payload)).toThrow(
			/engineNumber/i,
		);
	});

	it("requires registrationNumber and flagCountryId for marine vehicles", () => {
		const payload = buildBasePayload({
			vehicleType: "marine",
			plates: null,
			engineNumber: null,
			registrationNumber: undefined,
			flagCountryId: undefined,
		});
		expect(() => TransactionCreateSchema.parse(payload)).toThrow(
			/registrationNumber/i,
		);
	});

	it("requires flagCountryId for air vehicles", () => {
		const payload = buildBasePayload({
			vehicleType: "air",
			plates: null,
			engineNumber: null,
			registrationNumber: "AIR-001",
			flagCountryId: undefined,
		});
		expect(() => TransactionCreateSchema.parse(payload)).toThrow(
			/flagCountryId/i,
		);
	});
});
