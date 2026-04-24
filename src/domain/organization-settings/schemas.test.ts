import { describe, it, expect } from "vitest";
import { organizationSettingsUpdateSchema } from "./schemas";

describe("organizationSettingsUpdateSchema (watchlist rescan)", () => {
	it("accepts watchlist re-scan fields on PATCH", () => {
		const r = organizationSettingsUpdateSchema.safeParse({
			watchlistRescanEnabled: false,
			watchlistRescanIntervalDays: 14,
			watchlistRescanIncludeBcs: true,
			watchlistRescanNotifyOnStatusChange: false,
			watchlistRescanDailyCap: 200,
			watchlistRescanNotifyChannels: ["in_app"],
			watchlistRescanSources: ["ofac", "pep"],
		});
		expect(r.success).toBe(true);
	});

	it("rejects rescan interval out of range", () => {
		const r = organizationSettingsUpdateSchema.safeParse({
			watchlistRescanIntervalDays: 5,
		});
		expect(r.success).toBe(false);
	});
});
