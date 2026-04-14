import { describe, expect, it } from "vitest";

import {
	BeneficialControllerCreateSchema,
	BeneficialControllerPatchSchema,
	BeneficialControllerScreeningUpdateSchema,
	BeneficialControllerIdParamSchema,
} from "./schemas";

const minimalCreate = {
	bcType: "SHAREHOLDER" as const,
	identificationCriteria: "BENEFIT" as const,
	firstName: "Ana",
	lastName: "López",
};

describe("BeneficialControllerCreateSchema", () => {
	it("parses minimal valid payload", () => {
		const parsed = BeneficialControllerCreateSchema.parse(minimalCreate);
		expect(parsed.bcType).toBe("SHAREHOLDER");
		expect(parsed.firstName).toBe("Ana");
	});

	it("rejects empty first name", () => {
		expect(() =>
			BeneficialControllerCreateSchema.parse({
				...minimalCreate,
				firstName: "",
			}),
		).toThrow();
	});

	it("accepts optional shareholder id format", () => {
		const parsed = BeneficialControllerCreateSchema.parse({
			...minimalCreate,
			shareholderId: "SHR123456789",
		});
		expect(parsed.shareholderId).toBe("SHR123456789");
	});
});

describe("BeneficialControllerPatchSchema", () => {
	it("allows empty object with all optional fields", () => {
		const parsed = BeneficialControllerPatchSchema.parse({});
		expect(parsed).toEqual({});
	});

	it("allows partial updates", () => {
		const parsed = BeneficialControllerPatchSchema.parse({
			firstName: "Updated",
		});
		expect(parsed.firstName).toBe("Updated");
	});
});

describe("BeneficialControllerScreeningUpdateSchema", () => {
	it("requires watchlistQueryId", () => {
		const parsed = BeneficialControllerScreeningUpdateSchema.parse({
			watchlistQueryId: "q1",
			screeningResult: "flagged",
		});
		expect(parsed.watchlistQueryId).toBe("q1");
	});

	it("rejects missing watchlistQueryId", () => {
		expect(() =>
			BeneficialControllerScreeningUpdateSchema.parse({
				isPEP: true,
			}),
		).toThrow();
	});
});

describe("BeneficialControllerIdParamSchema", () => {
	it("accepts BC id format", () => {
		expect(
			BeneficialControllerIdParamSchema.parse({ bcId: "BC123456789" }),
		).toEqual({
			bcId: "BC123456789",
		});
	});
});
