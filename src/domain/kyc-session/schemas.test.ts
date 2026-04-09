import { describe, expect, it } from "vitest";
import {
	kycSessionCreateSchema,
	kycSessionListFiltersSchema,
	kycSessionRejectSchema,
} from "./schemas";

describe("kycSessionCreateSchema", () => {
	it("applies default createdBy", () => {
		const out = kycSessionCreateSchema.parse({ clientId: "c1" });
		expect(out.clientId).toBe("c1");
		expect(out.createdBy).toBe("system");
	});
});

describe("kycSessionListFiltersSchema", () => {
	it("defaults pagination", () => {
		const out = kycSessionListFiltersSchema.parse({});
		expect(out.page).toBe(1);
		expect(out.limit).toBe(20);
	});
});

describe("kycSessionRejectSchema", () => {
	it("requires reason", () => {
		const out = kycSessionRejectSchema.parse({
			reason: "Incomplete documents",
		});
		expect(out.reason).toBe("Incomplete documents");
		expect(out.reopenForCorrections).toBe(false);
	});
});
