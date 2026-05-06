import { describe, expect, it } from "vitest";

import type { Bindings } from "../types";
import { getAmlFrontendUrl } from "./frontend-url";

describe("getAmlFrontendUrl", () => {
	it("returns trimmed URL without trailing slash when set", () => {
		expect(
			getAmlFrontendUrl({
				AML_FRONTEND_URL: " https://app.example.com/ ",
			} as Bindings),
		).toBe("https://app.example.com");
	});

	it("falls back to workers.dev default when unset or blank", () => {
		expect(getAmlFrontendUrl({} as Bindings)).toBe(
			"https://aml.janovix.workers.dev",
		);
		expect(getAmlFrontendUrl({ AML_FRONTEND_URL: "   " } as Bindings)).toBe(
			"https://aml.janovix.workers.dev",
		);
	});
});
