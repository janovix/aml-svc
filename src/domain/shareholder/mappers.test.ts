import { describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import type { Shareholder as PrismaShareholder } from "@prisma/client";

import {
	mapPrismaShareholder,
	mapCreateInputToPrisma,
	mapUpdateInputToPrisma,
	mapPatchInputToPrisma,
} from "./mappers";

const basePrismaRow = {
	id: "SHR123456789",
	clientId: "CLT123456789",
	parentShareholderId: null,
	entityType: "PERSON" as const,
	firstName: "Ana",
	lastName: "López",
	secondLastName: null,
	rfc: "ABCD123456EF7",
	businessName: null,
	taxId: null,
	incorporationDate: null,
	nationality: null,
	representativeName: null,
	representativeCurp: null,
	representativeRfc: null,
	actaConstitutivaDocId: null,
	cedulaFiscalDocId: null,
	addressProofDocId: null,
	powerOfAttorneyDocId: null,
	ownershipPercentage: new Prisma.Decimal("33.5"),
	email: null,
	phone: null,
	createdAt: new Date("2024-01-01T00:00:00.000Z"),
	updatedAt: new Date("2024-06-01T12:00:00.000Z"),
};

describe("mapPrismaShareholder", () => {
	it("maps PERSON row to entity", () => {
		const entity = mapPrismaShareholder(basePrismaRow as PrismaShareholder);
		expect(entity.id).toBe("SHR123456789");
		expect(entity.ownershipPercentage).toBe(33.5);
		expect(entity.createdAt).toBe("2024-01-01T00:00:00.000Z");
	});

	it("maps COMPANY row with incorporation date", () => {
		const row = {
			...basePrismaRow,
			entityType: "COMPANY" as const,
			firstName: null,
			lastName: null,
			businessName: "Corp",
			taxId: "TAX1",
			incorporationDate: new Date("2020-03-15T00:00:00.000Z"),
		};
		const entity = mapPrismaShareholder(row as PrismaShareholder);
		expect(entity.entityType).toBe("COMPANY");
		expect(entity.incorporationDate).toBe("2020-03-15T00:00:00.000Z");
	});
});

describe("mapCreateInputToPrisma", () => {
	it("maps PERSON create input", () => {
		const out = mapCreateInputToPrisma({
			entityType: "PERSON",
			firstName: "X",
			lastName: "Y",
			ownershipPercentage: 10,
		});
		expect(out.firstName).toBe("X");
		expect(out.ownershipPercentage).toEqual(new Prisma.Decimal(10));
		expect(out.businessName).toBeNull();
	});

	it("maps COMPANY create input with optional dates", () => {
		const out = mapCreateInputToPrisma({
			entityType: "COMPANY",
			businessName: "Acme",
			taxId: "TAX",
			incorporationDate: "2019-01-01",
			ownershipPercentage: 5,
		});
		expect(out.businessName).toBe("Acme");
		expect(out.incorporationDate).toEqual(new Date("2019-01-01"));
	});
});

describe("mapUpdateInputToPrisma", () => {
	it("delegates to create mapper", () => {
		const out = mapUpdateInputToPrisma({
			entityType: "PERSON",
			firstName: "A",
			lastName: "B",
			ownershipPercentage: 1,
		});
		expect(out.lastName).toBe("B");
	});
});

describe("mapCreateInputToPrisma", () => {
	it("maps COMPANY without incorporationDate to null", () => {
		const out = mapCreateInputToPrisma({
			entityType: "COMPANY",
			businessName: "Corp",
			taxId: "TAX",
			ownershipPercentage: 5,
		});
		expect(out.incorporationDate).toBeNull();
	});
});

describe("mapPatchInputToPrisma", () => {
	it("maps partial PERSON patch", () => {
		const out = mapPatchInputToPrisma({
			entityType: "PERSON",
			firstName: "New",
		});
		expect(out.entityType).toBe("PERSON");
		expect(out.firstName).toBe("New");
	});

	it("maps partial COMPANY patch with ownership", () => {
		const out = mapPatchInputToPrisma({
			entityType: "COMPANY",
			ownershipPercentage: 42,
		});
		expect(out.ownershipPercentage).toEqual(new Prisma.Decimal(42));
	});

	it("maps PERSON patch with all optional fields", () => {
		const out = mapPatchInputToPrisma({
			entityType: "PERSON",
			parentShareholderId: "SHR111111111",
			firstName: "A",
			lastName: "B",
			secondLastName: "C",
			rfc: "ABCD123456EF7",
			ownershipPercentage: 50,
			email: "a@b.com",
			phone: "+5211111111",
		});
		expect(out.parentShareholderId).toBe("SHR111111111");
		expect(out.firstName).toBe("A");
		expect(out.lastName).toBe("B");
		expect(out.secondLastName).toBe("C");
		expect(out.rfc).toBe("ABCD123456EF7");
		expect(out.email).toBe("a@b.com");
		expect(out.phone).toBe("+5211111111");
	});

	it("maps PERSON nullable fields to null", () => {
		const out = mapPatchInputToPrisma({
			entityType: "PERSON",
			parentShareholderId: null,
			secondLastName: null,
			rfc: null,
			email: null,
			phone: null,
		});
		expect(out.parentShareholderId).toBeNull();
		expect(out.secondLastName).toBeNull();
		expect(out.rfc).toBeNull();
		expect(out.email).toBeNull();
		expect(out.phone).toBeNull();
	});

	it("maps COMPANY patch with all fields", () => {
		const out = mapPatchInputToPrisma({
			entityType: "COMPANY",
			parentShareholderId: "SHR222222222",
			businessName: "NewCo",
			taxId: "TAX999",
			incorporationDate: "2020-06-15",
			nationality: "MX",
			representativeName: "Rep",
			representativeCurp: "PEPJ900101HDFRRN01",
			representativeRfc: "ABCD123456EF7",
			actaConstitutivaDocId: "doc1",
			cedulaFiscalDocId: "doc2",
			addressProofDocId: "doc3",
			powerOfAttorneyDocId: "doc4",
			ownershipPercentage: 75,
			email: "co@x.com",
			phone: "+5222222222",
		});
		expect(out.businessName).toBe("NewCo");
		expect(out.taxId).toBe("TAX999");
		expect(out.incorporationDate).toEqual(new Date("2020-06-15"));
		expect(out.nationality).toBe("MX");
		expect(out.representativeName).toBe("Rep");
		expect(out.representativeCurp).toBe("PEPJ900101HDFRRN01");
		expect(out.representativeRfc).toBe("ABCD123456EF7");
		expect(out.actaConstitutivaDocId).toBe("doc1");
		expect(out.cedulaFiscalDocId).toBe("doc2");
		expect(out.addressProofDocId).toBe("doc3");
		expect(out.powerOfAttorneyDocId).toBe("doc4");
	});

	it("maps COMPANY nullable fields to null", () => {
		const out = mapPatchInputToPrisma({
			entityType: "COMPANY",
			incorporationDate: null,
			nationality: null,
			representativeName: null,
			representativeCurp: null,
			representativeRfc: null,
			actaConstitutivaDocId: null,
			cedulaFiscalDocId: null,
			addressProofDocId: null,
			powerOfAttorneyDocId: null,
		});
		expect(out.incorporationDate).toBeNull();
		expect(out.nationality).toBeNull();
		expect(out.representativeName).toBeNull();
		expect(out.representativeCurp).toBeNull();
		expect(out.representativeRfc).toBeNull();
		expect(out.actaConstitutivaDocId).toBeNull();
		expect(out.cedulaFiscalDocId).toBeNull();
		expect(out.addressProofDocId).toBeNull();
		expect(out.powerOfAttorneyDocId).toBeNull();
	});
});
