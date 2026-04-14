import { describe, expect, it } from "vitest";

import {
	ShareholderCreateSchema,
	ShareholderPatchSchema,
	ShareholderIdParamSchema,
	ClientIdParamSchema,
} from "./schemas";

const validCompanyCreate = {
	entityType: "COMPANY" as const,
	businessName: "Acme SA de CV",
	taxId: "TAX123456",
	ownershipPercentage: 25,
};

describe("ShareholderCreateSchema", () => {
	it("parses valid PERSON shareholder", () => {
		const parsed = ShareholderCreateSchema.parse({
			entityType: "PERSON",
			firstName: "Ana",
			lastName: "López",
			ownershipPercentage: 10,
		});
		expect(parsed.entityType).toBe("PERSON");
		if (parsed.entityType === "PERSON") {
			expect(parsed.firstName).toBe("Ana");
		}
	});

	it("parses valid COMPANY shareholder with Anexo 4 fields", () => {
		const parsed = ShareholderCreateSchema.parse({
			...validCompanyCreate,
			representativeCurp: "PEPJ900101HDFRRN01",
			representativeRfc: "ABCD123456EF7",
		});
		expect(parsed.entityType).toBe("COMPANY");
		if (parsed.entityType === "COMPANY") {
			expect(parsed.businessName).toBe("Acme SA de CV");
		}
	});

	it("rejects ownership below minimum", () => {
		expect(() =>
			ShareholderCreateSchema.parse({
				entityType: "PERSON",
				firstName: "A",
				lastName: "B",
				ownershipPercentage: 0,
			}),
		).toThrow();
	});

	it("rejects invalid parent shareholder id format", () => {
		expect(() =>
			ShareholderCreateSchema.parse({
				entityType: "PERSON",
				parentShareholderId: "bad",
				firstName: "A",
				lastName: "B",
				ownershipPercentage: 10,
			}),
		).toThrow();
	});
});

describe("ShareholderPatchSchema", () => {
	it("allows partial PERSON fields", () => {
		const parsed = ShareholderPatchSchema.parse({
			entityType: "PERSON",
			firstName: "Updated",
		});
		expect(parsed.entityType).toBe("PERSON");
	});

	it("allows partial COMPANY fields", () => {
		const parsed = ShareholderPatchSchema.parse({
			entityType: "COMPANY",
			businessName: "New Name",
		});
		if (parsed.entityType === "COMPANY") {
			expect(parsed.businessName).toBe("New Name");
		}
	});
});

describe("param schemas", () => {
	it("ShareholderIdParamSchema accepts SHR prefix", () => {
		expect(
			ShareholderIdParamSchema.parse({ shareholderId: "SHR123456789" }),
		).toEqual({ shareholderId: "SHR123456789" });
	});

	it("ClientIdParamSchema accepts CLT prefix", () => {
		expect(ClientIdParamSchema.parse({ clientId: "CLT123456789" })).toEqual({
			clientId: "CLT123456789",
		});
	});
});
