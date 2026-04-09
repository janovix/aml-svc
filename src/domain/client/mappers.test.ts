import { describe, expect, it } from "vitest";
import {
	toPrismaPersonType,
	fromPrismaPersonType,
	mapPatchInputToPrisma,
	mapCreateInputToPrisma,
} from "./mappers";
import { ClientCreateSchema } from "./schemas";

describe("toPrismaPersonType / fromPrismaPersonType", () => {
	it("roundtrips all person types", () => {
		const types = ["physical", "moral", "trust"] as const;
		for (const t of types) {
			expect(fromPrismaPersonType(toPrismaPersonType(t))).toBe(t);
		}
	});
});

describe("mapCreateInputToPrisma", () => {
	it("generates id and uppercases rfc for physical client", () => {
		const input = ClientCreateSchema.parse({
			personType: "physical",
			rfc: "abcd123456ef1",
			firstName: "Test",
			lastName: "User",
			birthDate: "1990-01-01",
			curp: "PEPJ900101HDFRRN01",
			nationality: "Mexican",
			email: "a@b.co",
			phone: "+525512345678",
			country: "MX",
			stateCode: "CDMX",
			city: "Mexico City",
			municipality: "Benito Juarez",
			neighborhood: "Del Valle",
			street: "Insurgentes",
			externalNumber: "123",
			postalCode: "03100",
		});

		const out = mapCreateInputToPrisma(input);

		expect(out.rfc).toBe("ABCD123456EF1");
		expect(out.id).toMatch(/^CLT/);
		expect(out.personType).toBe("PHYSICAL");
	});
});

describe("mapPatchInputToPrisma", () => {
	it("maps personType to prisma enum", () => {
		const out = mapPatchInputToPrisma({ personType: "moral" });
		expect(out.personType).toBe("MORAL");
	});
});
