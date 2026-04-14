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
});
