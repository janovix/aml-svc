import { describe, expect, it } from "vitest";
import type { BeneficialController as PrismaBC } from "@prisma/client";

import {
	mapPrismaBC,
	mapCreateInputToPrisma,
	mapUpdateInputToPrisma,
	mapPatchInputToPrisma,
} from "./mappers";

const baseRow = {
	id: "BC123456789",
	clientId: "CLT123456789",
	shareholderId: null,
	bcType: "SHAREHOLDER",
	identificationCriteria: "BENEFIT",
	controlMechanism: null,
	isLegalRepresentative: false,
	firstName: "A",
	lastName: "B",
	secondLastName: null,
	birthDate: null,
	birthCountry: null,
	nationality: null,
	occupation: null,
	curp: null,
	rfc: null,
	idDocumentType: null,
	idDocumentNumber: null,
	idDocumentAuthority: null,
	idCopyDocId: null,
	curpCopyDocId: null,
	cedulaFiscalDocId: null,
	addressProofDocId: null,
	constanciaBcDocId: null,
	powerOfAttorneyDocId: null,
	email: null,
	phone: null,
	country: null,
	stateCode: null,
	city: null,
	street: null,
	postalCode: null,
	isPEP: false,
	watchlistQueryId: null,
	ofacSanctioned: false,
	unscSanctioned: false,
	sat69bListed: false,
	adverseMediaFlagged: false,
	screeningResult: "pending",
	screenedAt: null,
	verifiedAt: null,
	verifiedBy: null,
	notes: null,
	createdAt: new Date("2024-01-01T00:00:00.000Z"),
	updatedAt: new Date("2024-01-02T00:00:00.000Z"),
};

describe("mapPrismaBC", () => {
	it("maps row to entity with ISO dates", () => {
		const entity = mapPrismaBC({
			...baseRow,
			birthDate: new Date("1990-05-01T00:00:00.000Z"),
			screenedAt: new Date("2024-06-01T00:00:00.000Z"),
		} as PrismaBC);
		expect(entity.birthDate).toBe("1990-05-01T00:00:00.000Z");
		expect(entity.screenedAt).toBe("2024-06-01T00:00:00.000Z");
	});
});

describe("mapCreateInputToPrisma", () => {
	it("sets screening defaults and nullables", () => {
		const out = mapCreateInputToPrisma({
			bcType: "DIRECTOR",
			identificationCriteria: "CONTROL",
			firstName: "X",
			lastName: "Y",
		});
		expect(out.screeningResult).toBe("pending");
		expect(out.isPEP).toBe(false);
		expect(out.shareholderId).toBeNull();
	});

	it("maps verifiedAt when provided", () => {
		const out = mapCreateInputToPrisma({
			bcType: "LEGAL_REP",
			identificationCriteria: "FALLBACK",
			firstName: "A",
			lastName: "B",
			verifiedAt: "2024-01-01T12:00:00.000Z",
		});
		expect(out.verifiedAt).toEqual(new Date("2024-01-01T12:00:00.000Z"));
	});
});

describe("mapUpdateInputToPrisma", () => {
	it("delegates to create mapper", () => {
		const out = mapUpdateInputToPrisma({
			bcType: "SHAREHOLDER",
			identificationCriteria: "BENEFIT",
			firstName: "A",
			lastName: "B",
		});
		expect(out.firstName).toBe("A");
	});
});

describe("mapCreateInputToPrisma", () => {
	it("maps birthDate when provided", () => {
		const out = mapCreateInputToPrisma({
			bcType: "SHAREHOLDER",
			identificationCriteria: "BENEFIT",
			firstName: "A",
			lastName: "B",
			birthDate: "1990-05-01",
		});
		expect(out.birthDate).toEqual(new Date("1990-05-01"));
	});

	it("maps birthDate to null when absent", () => {
		const out = mapCreateInputToPrisma({
			bcType: "SHAREHOLDER",
			identificationCriteria: "BENEFIT",
			firstName: "A",
			lastName: "B",
		});
		expect(out.birthDate).toBeNull();
	});

	it("maps verifiedAt to null when absent", () => {
		const out = mapCreateInputToPrisma({
			bcType: "DIRECTOR",
			identificationCriteria: "CONTROL",
			firstName: "A",
			lastName: "B",
		});
		expect(out.verifiedAt).toBeNull();
	});
});

describe("mapPatchInputToPrisma", () => {
	it("maps only provided fields", () => {
		const out = mapPatchInputToPrisma({
			firstName: "New",
		});
		expect(out.firstName).toBe("New");
		expect(out.lastName).toBeUndefined();
	});

	it("maps postalCode to null when explicitly null", () => {
		const out = mapPatchInputToPrisma({
			postalCode: null,
		});
		expect(out.postalCode).toBeNull();
	});

	it("maps classification fields", () => {
		const out = mapPatchInputToPrisma({
			shareholderId: "SHR123456789",
			bcType: "DIRECTOR",
			identificationCriteria: "CONTROL",
			controlMechanism: "board",
			isLegalRepresentative: true,
		});
		expect(out.shareholderId).toBe("SHR123456789");
		expect(out.bcType).toBe("DIRECTOR");
		expect(out.identificationCriteria).toBe("CONTROL");
		expect(out.controlMechanism).toBe("board");
		expect(out.isLegalRepresentative).toBe(true);
	});

	it("maps nullable classification fields to null", () => {
		const out = mapPatchInputToPrisma({
			shareholderId: null,
			controlMechanism: null,
		});
		expect(out.shareholderId).toBeNull();
		expect(out.controlMechanism).toBeNull();
	});

	it("maps personal data fields", () => {
		const out = mapPatchInputToPrisma({
			lastName: "Z",
			secondLastName: "W",
			birthDate: "1990-01-01",
			birthCountry: "MX",
			nationality: "MX",
			occupation: "eng",
			curp: "PEPJ900101HDFRRN01",
			rfc: "ABCD123456EF7",
		});
		expect(out.lastName).toBe("Z");
		expect(out.secondLastName).toBe("W");
		expect(out.birthDate).toEqual(new Date("1990-01-01"));
		expect(out.birthCountry).toBe("MX");
		expect(out.nationality).toBe("MX");
		expect(out.occupation).toBe("eng");
		expect(out.curp).toBe("PEPJ900101HDFRRN01");
		expect(out.rfc).toBe("ABCD123456EF7");
	});

	it("maps nullable personal data to null", () => {
		const out = mapPatchInputToPrisma({
			secondLastName: null,
			birthDate: null,
			birthCountry: null,
			nationality: null,
			occupation: null,
			curp: null,
			rfc: null,
		});
		expect(out.secondLastName).toBeNull();
		expect(out.birthDate).toBeNull();
		expect(out.birthCountry).toBeNull();
		expect(out.nationality).toBeNull();
		expect(out.occupation).toBeNull();
		expect(out.curp).toBeNull();
		expect(out.rfc).toBeNull();
	});

	it("maps ID document fields", () => {
		const out = mapPatchInputToPrisma({
			idDocumentType: "INE",
			idDocumentNumber: "123",
			idDocumentAuthority: "GOV",
		});
		expect(out.idDocumentType).toBe("INE");
		expect(out.idDocumentNumber).toBe("123");
		expect(out.idDocumentAuthority).toBe("GOV");
	});

	it("maps nullable ID document fields to null", () => {
		const out = mapPatchInputToPrisma({
			idDocumentType: null,
			idDocumentNumber: null,
			idDocumentAuthority: null,
		});
		expect(out.idDocumentType).toBeNull();
		expect(out.idDocumentNumber).toBeNull();
		expect(out.idDocumentAuthority).toBeNull();
	});

	it("maps all document reference fields", () => {
		const out = mapPatchInputToPrisma({
			idCopyDocId: "d1",
			curpCopyDocId: "d2",
			cedulaFiscalDocId: "d3",
			addressProofDocId: "d4",
			constanciaBcDocId: "d5",
			powerOfAttorneyDocId: "d6",
		});
		expect(out.idCopyDocId).toBe("d1");
		expect(out.curpCopyDocId).toBe("d2");
		expect(out.cedulaFiscalDocId).toBe("d3");
		expect(out.addressProofDocId).toBe("d4");
		expect(out.constanciaBcDocId).toBe("d5");
		expect(out.powerOfAttorneyDocId).toBe("d6");
	});

	it("maps nullable document references to null", () => {
		const out = mapPatchInputToPrisma({
			idCopyDocId: null,
			curpCopyDocId: null,
			cedulaFiscalDocId: null,
			addressProofDocId: null,
			constanciaBcDocId: null,
			powerOfAttorneyDocId: null,
		});
		expect(out.idCopyDocId).toBeNull();
		expect(out.curpCopyDocId).toBeNull();
		expect(out.cedulaFiscalDocId).toBeNull();
		expect(out.addressProofDocId).toBeNull();
		expect(out.constanciaBcDocId).toBeNull();
		expect(out.powerOfAttorneyDocId).toBeNull();
	});

	it("maps contact and address fields", () => {
		const out = mapPatchInputToPrisma({
			email: "a@b.com",
			phone: "+521111",
			country: "MX",
			stateCode: "CMX",
			city: "CDMX",
			street: "Av 1",
		});
		expect(out.email).toBe("a@b.com");
		expect(out.phone).toBe("+521111");
		expect(out.country).toBe("MX");
		expect(out.stateCode).toBe("CMX");
		expect(out.city).toBe("CDMX");
		expect(out.street).toBe("Av 1");
	});

	it("maps nullable contact/address fields to null", () => {
		const out = mapPatchInputToPrisma({
			email: null,
			phone: null,
			country: null,
			stateCode: null,
			city: null,
			street: null,
		});
		expect(out.email).toBeNull();
		expect(out.phone).toBeNull();
		expect(out.country).toBeNull();
		expect(out.stateCode).toBeNull();
		expect(out.city).toBeNull();
		expect(out.street).toBeNull();
	});

	it("maps verification fields", () => {
		const out = mapPatchInputToPrisma({
			verifiedAt: "2024-01-01T00:00:00.000Z",
			verifiedBy: "admin",
			notes: "ok",
		});
		expect(out.verifiedAt).toEqual(new Date("2024-01-01T00:00:00.000Z"));
		expect(out.verifiedBy).toBe("admin");
		expect(out.notes).toBe("ok");
	});

	it("maps nullable verification fields to null", () => {
		const out = mapPatchInputToPrisma({
			verifiedAt: null,
			verifiedBy: null,
			notes: null,
		});
		expect(out.verifiedAt).toBeNull();
		expect(out.verifiedBy).toBeNull();
		expect(out.notes).toBeNull();
	});
});
