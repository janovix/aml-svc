import { describe, expect, it } from "vitest";

import {
	isWatchlistRescanCron,
	WATCHLIST_RESCAN_CRON,
} from "./watchlist-rescan-schedule";

describe("watchlist rescan schedule", () => {
	it("uses Sunday 03:00 UTC weekly cron", () => {
		expect(WATCHLIST_RESCAN_CRON).toBe("0 3 * * 0");
	});

	it("identifies only the rescan cron", () => {
		expect(isWatchlistRescanCron("0 3 * * 0")).toBe(true);
		expect(isWatchlistRescanCron("0 2 * * *")).toBe(false);
		expect(isWatchlistRescanCron("0 14 * * *")).toBe(false);
	});
});
