import { describe, expect, it, vi } from "vitest";

import type { Bindings } from "../types";
import { getOrganizationLanguageForTenant } from "./org-language";

describe("getOrganizationLanguageForTenant", () => {
	it("returns English when AUTH_SERVICE is missing", async () => {
		await expect(
			getOrganizationLanguageForTenant({} as Bindings, "org-1"),
		).resolves.toBe("en");
	});

	it("returns English when getOrganizationLanguage is not a function", async () => {
		await expect(
			getOrganizationLanguageForTenant(
				{ AUTH_SERVICE: {} as Bindings["AUTH_SERVICE"] } as Bindings,
				"org-1",
			),
		).resolves.toBe("en");
	});

	it("normalizes language from auth RPC", async () => {
		const getOrganizationLanguage = vi.fn().mockResolvedValue("es");
		await expect(
			getOrganizationLanguageForTenant(
				{ AUTH_SERVICE: { getOrganizationLanguage } } as unknown as Bindings,
				"org-1",
			),
		).resolves.toBe("es");
		expect(getOrganizationLanguage).toHaveBeenCalledWith("org-1");
	});

	it("returns English on RPC failure", async () => {
		const getOrganizationLanguage = vi.fn().mockRejectedValue(new Error("rpc"));
		await expect(
			getOrganizationLanguageForTenant(
				{ AUTH_SERVICE: { getOrganizationLanguage } } as unknown as Bindings,
				"org-1",
			),
		).resolves.toBe("en");
	});
});
