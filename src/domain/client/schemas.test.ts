import { describe, expect, it } from "vitest";

import {
	ClientCreateSchema,
	ClientMoralSchema,
	ClientPhysicalSchema,
	ClientTrustSchema,
} from "./schemas";

describe("Client Schema Validation", () => {
	describe("RFC Validation", () => {
		describe("Physical Person RFC", () => {
			it("accepts valid 13-character RFC for physical persons", () => {
				const payload = {
					personType: "physical" as const,
					rfc: "ABCD123456EF1",
					firstName: "Juan",
					lastName: "Perez",
					birthDate: "1990-01-01",
					curp: "PEPJ900101HDFRRN01",
					nationality: "Mexican",
					email: "juan@example.com",
					phone: "+525512345678",
					country: "MX",
					stateCode: "CDMX",
					city: "Mexico City",
					municipality: "Benito Juarez",
					neighborhood: "Del Valle",
					street: "Insurgentes",
					externalNumber: "123",
					postalCode: "03100",
				};
				expect(() => ClientPhysicalSchema.parse(payload)).not.toThrow();
			});

			it("rejects RFC with wrong length for physical persons", () => {
				const payload = {
					personType: "physical" as const,
					rfc: "ABCD123456EF", // 12 characters instead of 13
					firstName: "Juan",
					lastName: "Perez",
					birthDate: "1990-01-01",
					curp: "PEPJ900101HDFRRN01",
					nationality: "Mexican",
					email: "juan@example.com",
					phone: "+525512345678",
					country: "MX",
					stateCode: "CDMX",
					city: "Mexico City",
					municipality: "Benito Juarez",
					neighborhood: "Del Valle",
					street: "Insurgentes",
					externalNumber: "123",
					postalCode: "03100",
				};
				expect(() => ClientPhysicalSchema.parse(payload)).toThrow(
					/RFC for physical persons must be exactly 13 characters/i,
				);
			});

			it("rejects RFC with wrong format for physical persons", () => {
				const payload = {
					personType: "physical" as const,
					rfc: "ABC123456EF12", // Wrong format (3 letters instead of 4)
					firstName: "Juan",
					lastName: "Perez",
					birthDate: "1990-01-01",
					curp: "PEPJ900101HDFRRN01",
					nationality: "Mexican",
					email: "juan@example.com",
					phone: "+525512345678",
					country: "MX",
					stateCode: "CDMX",
					city: "Mexico City",
					municipality: "Benito Juarez",
					neighborhood: "Del Valle",
					street: "Insurgentes",
					externalNumber: "123",
					postalCode: "03100",
				};
				expect(() => ClientPhysicalSchema.parse(payload)).toThrow(
					/RFC for physical persons must be exactly 13 characters/i,
				);
			});

			it("converts RFC to uppercase", () => {
				const payload = {
					personType: "physical" as const,
					rfc: "abcd123456ef1", // lowercase
					firstName: "Juan",
					lastName: "Perez",
					birthDate: "1990-01-01",
					curp: "PEPJ900101HDFRRN01",
					nationality: "Mexican",
					email: "juan@example.com",
					phone: "+525512345678",
					country: "MX",
					stateCode: "CDMX",
					city: "Mexico City",
					municipality: "Benito Juarez",
					neighborhood: "Del Valle",
					street: "Insurgentes",
					externalNumber: "123",
					postalCode: "03100",
				};
				const result = ClientPhysicalSchema.parse(payload);
				expect(result.rfc).toBe("ABCD123456EF1");
			});
		});

		describe("Moral Person RFC", () => {
			it("accepts valid 12-character RFC for moral persons", () => {
				const payload = {
					personType: "moral" as const,
					rfc: "ABC123456EF1",
					businessName: "Empresa Test S.A. de C.V.",
					incorporationDate: "2020-01-01T00:00:00.000Z",
					email: "contact@example.com",
					phone: "+525512345678",
					country: "MX",
					stateCode: "CDMX",
					city: "Mexico City",
					municipality: "Benito Juarez",
					neighborhood: "Del Valle",
					street: "Insurgentes",
					externalNumber: "123",
					postalCode: "03100",
				};
				expect(() => ClientMoralSchema.parse(payload)).not.toThrow();
			});

			it("rejects RFC with wrong length for moral persons", () => {
				const payload = {
					personType: "moral" as const,
					rfc: "ABC123456EF", // 11 characters instead of 12
					businessName: "Empresa Test S.A. de C.V.",
					incorporationDate: "2020-01-01T00:00:00.000Z",
					email: "contact@example.com",
					phone: "+525512345678",
					country: "MX",
					stateCode: "CDMX",
					city: "Mexico City",
					municipality: "Benito Juarez",
					neighborhood: "Del Valle",
					street: "Insurgentes",
					externalNumber: "123",
					postalCode: "03100",
				};
				expect(() => ClientMoralSchema.parse(payload)).toThrow(
					/RFC for legal entities must be exactly 12 characters/i,
				);
			});

			it("rejects RFC with wrong format for moral persons (4 letters instead of 3)", () => {
				const payload = {
					personType: "moral" as const,
					rfc: "LAGR730714VA", // 4 letters + 6 digits + 2 alphanumeric (wrong format)
					businessName: "Empresa Test S.A. de C.V.",
					incorporationDate: "2020-01-01T00:00:00.000Z",
					email: "contact@example.com",
					phone: "+525512345678",
					country: "MX",
					stateCode: "CDMX",
					city: "Mexico City",
					municipality: "Benito Juarez",
					neighborhood: "Del Valle",
					street: "Insurgentes",
					externalNumber: "123",
					postalCode: "03100",
				};
				expect(() => ClientMoralSchema.parse(payload)).toThrow(
					/RFC for legal entities must be exactly 12 characters/i,
				);
			});

			it("converts RFC to uppercase", () => {
				const payload = {
					personType: "moral" as const,
					rfc: "abc123456ef1", // lowercase
					businessName: "Empresa Test S.A. de C.V.",
					incorporationDate: "2020-01-01T00:00:00.000Z",
					email: "contact@example.com",
					phone: "+525512345678",
					country: "MX",
					stateCode: "CDMX",
					city: "Mexico City",
					municipality: "Benito Juarez",
					neighborhood: "Del Valle",
					street: "Insurgentes",
					externalNumber: "123",
					postalCode: "03100",
				};
				const result = ClientMoralSchema.parse(payload);
				expect(result.rfc).toBe("ABC123456EF1");
			});
		});

		describe("Trust Person RFC", () => {
			it("accepts valid 12-character RFC for trust entities", () => {
				const payload = {
					personType: "trust" as const,
					rfc: "ABC123456EF1",
					businessName: "Fideicomiso Test",
					incorporationDate: "2020-01-01T00:00:00.000Z",
					email: "contact@example.com",
					phone: "+525512345678",
					country: "MX",
					stateCode: "CDMX",
					city: "Mexico City",
					municipality: "Benito Juarez",
					neighborhood: "Del Valle",
					street: "Insurgentes",
					externalNumber: "123",
					postalCode: "03100",
				};
				expect(() => ClientTrustSchema.parse(payload)).not.toThrow();
			});
		});
	});

	describe("CURP Validation", () => {
		it("accepts valid CURP for physical persons", () => {
			const payload = {
				personType: "physical" as const,
				rfc: "ABCD123456EF1",
				firstName: "Juan",
				lastName: "Perez",
				birthDate: "1990-01-01",
				curp: "PEPJ900101HDFRRN01",
				nationality: "Mexican",
				email: "juan@example.com",
				phone: "+525512345678",
				country: "MX",
				stateCode: "CDMX",
				city: "Mexico City",
				municipality: "Benito Juarez",
				neighborhood: "Del Valle",
				street: "Insurgentes",
				externalNumber: "123",
				postalCode: "03100",
			};
			expect(() => ClientPhysicalSchema.parse(payload)).not.toThrow();
		});

		it("rejects invalid CURP format", () => {
			const payload = {
				personType: "physical" as const,
				rfc: "ABCD123456EF1",
				firstName: "Juan",
				lastName: "Perez",
				birthDate: "1990-01-01",
				curp: "INVALID", // Invalid CURP
				nationality: "Mexican",
				email: "juan@example.com",
				phone: "+525512345678",
				country: "MX",
				stateCode: "CDMX",
				city: "Mexico City",
				municipality: "Benito Juarez",
				neighborhood: "Del Valle",
				street: "Insurgentes",
				externalNumber: "123",
				postalCode: "03100",
			};
			expect(() => ClientPhysicalSchema.parse(payload)).toThrow(
				/Invalid CURP/i,
			);
		});

		it("converts CURP to uppercase", () => {
			const payload = {
				personType: "physical" as const,
				rfc: "ABCD123456EF1",
				firstName: "Juan",
				lastName: "Perez",
				birthDate: "1990-01-01",
				curp: "pepj900101hdfrrn01", // lowercase
				nationality: "Mexican",
				email: "juan@example.com",
				phone: "+525512345678",
				country: "MX",
				stateCode: "CDMX",
				city: "Mexico City",
				municipality: "Benito Juarez",
				neighborhood: "Del Valle",
				street: "Insurgentes",
				externalNumber: "123",
				postalCode: "03100",
			};
			const result = ClientPhysicalSchema.parse(payload);
			expect(result.curp).toBe("PEPJ900101HDFRRN01");
		});
	});

	describe("Discriminated Union", () => {
		it("correctly discriminates between person types in ClientCreateSchema", () => {
			const physicalPayload = {
				personType: "physical" as const,
				rfc: "ABCD123456EF1",
				firstName: "Juan",
				lastName: "Perez",
				birthDate: "1990-01-01",
				curp: "PEPJ900101HDFRRN01",
				nationality: "Mexican",
				email: "juan@example.com",
				phone: "+525512345678",
				country: "MX",
				stateCode: "CDMX",
				city: "Mexico City",
				municipality: "Benito Juarez",
				neighborhood: "Del Valle",
				street: "Insurgentes",
				externalNumber: "123",
				postalCode: "03100",
			};

			const moralPayload = {
				personType: "moral" as const,
				rfc: "ABC123456EF1",
				businessName: "Empresa Test S.A. de C.V.",
				incorporationDate: "2020-01-01T00:00:00.000Z",
				email: "contact@example.com",
				phone: "+525512345678",
				country: "MX",
				stateCode: "CDMX",
				city: "Mexico City",
				municipality: "Benito Juarez",
				neighborhood: "Del Valle",
				street: "Insurgentes",
				externalNumber: "123",
				postalCode: "03100",
			};

			expect(() => ClientCreateSchema.parse(physicalPayload)).not.toThrow();
			expect(() => ClientCreateSchema.parse(moralPayload)).not.toThrow();
		});
	});
});
