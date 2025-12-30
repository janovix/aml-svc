import { describe, expect, it } from "vitest";

import { TransactionCreateSchema } from "./schemas";

function buildBasePayload(overrides: Record<string, unknown> = {}) {
	return {
		clientId: "client-123",
		operationDate: "2024-11-20",
		operationType: "purchase",
		branchPostalCode: "06140",
		brand: "Brand 001",
		model: "Armored SUV",
		year: 2023,
		armorLevel: null,
		vin: "1HGBH41JXMN109186",
		repuve: null,
		amount: "3500000.75",
		currency: "MXN",
		paymentMethods: [{ method: "wire", amount: "3500000.75" }],
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

	it("requires at least one of plates, VIN, or engineNumber for land vehicles", () => {
		// Should fail when all three are missing
		const payload = buildBasePayload({
			plates: undefined,
			engineNumber: undefined,
			vin: undefined,
		});
		expect(() => TransactionCreateSchema.parse(payload)).toThrow(
			/at least one of plates, VIN, or engineNumber/i,
		);
	});

	it("accepts land vehicle with only plates", () => {
		const payload = buildBasePayload({
			plates: "ABC1234",
			engineNumber: undefined,
			vin: undefined,
		});
		expect(() => TransactionCreateSchema.parse(payload)).not.toThrow();
	});

	it("accepts land vehicle with only VIN", () => {
		const payload = buildBasePayload({
			plates: undefined,
			engineNumber: undefined,
			vin: "1HGBH41JXMN109186",
		});
		expect(() => TransactionCreateSchema.parse(payload)).not.toThrow();
	});

	it("accepts land vehicle with only engineNumber", () => {
		const payload = buildBasePayload({
			plates: undefined,
			engineNumber: "ENG-ABC",
			vin: undefined,
		});
		expect(() => TransactionCreateSchema.parse(payload)).not.toThrow();
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

	it("requires at least one payment method", () => {
		const payload = buildBasePayload({ paymentMethods: [] });
		expect(() => TransactionCreateSchema.parse(payload)).toThrow(
			/paymentMethods/i,
		);
	});

	it("requires payment method amounts to sum to transaction amount", () => {
		const payload = buildBasePayload({
			amount: "3500000.75",
			paymentMethods: [
				{ method: "cash", amount: "2000000.00" },
				{ method: "transfer", amount: "1500000.00" },
			],
		});
		expect(() => TransactionCreateSchema.parse(payload)).toThrow(
			/sum of payment method amounts/i,
		);
	});

	it("accepts multiple payment methods that sum to transaction amount", () => {
		const payload = buildBasePayload({
			amount: "3500000.75",
			paymentMethods: [
				{ method: "cash", amount: "2000000.50" },
				{ method: "transfer", amount: "1500000.25" },
			],
		});
		expect(() => TransactionCreateSchema.parse(payload)).not.toThrow();
	});

	it("accepts a single payment method", () => {
		const payload = buildBasePayload({
			amount: "3500000.75",
			paymentMethods: [{ method: "cash", amount: "3500000.75" }],
		});
		expect(() => TransactionCreateSchema.parse(payload)).not.toThrow();
	});
});
