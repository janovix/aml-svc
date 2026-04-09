import { describe, expect, it } from "vitest";
import { selfServicePersonalInfoPhysicalSchema } from "./self-service-schemas";

describe("selfServicePersonalInfoPhysicalSchema", () => {
	it("parses minimal valid physical profile", () => {
		const out = selfServicePersonalInfoPhysicalSchema.parse({
			firstName: "Juan",
			lastName: "Pérez",
			email: "Test@Example.com",
		});
		expect(out.firstName).toBe("Juan");
		expect(out.email).toBe("test@example.com");
	});

	it("uppercases CURP when provided", () => {
		const out = selfServicePersonalInfoPhysicalSchema.parse({
			firstName: "Ana",
			lastName: "López",
			curp: "pepj900101hdfrrn01",
		});
		expect(out.curp).toBe("PEPJ900101HDFRRN01");
	});
});
