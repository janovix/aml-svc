import { describe, expect, it, vi } from "vitest";

import type { Bindings } from "../types";
import { processWatchlistRescan } from "./watchlist-rescan";

describe("processWatchlistRescan", () => {
	it("returns zeros when AML_SCREENING_REFRESH_QUEUE is not bound", async () => {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
		await expect(
			processWatchlistRescan({} as Bindings, new Date("2025-01-01")),
		).resolves.toEqual({ enqueued: 0, organizationsProcessed: 0 });
		expect(warn).toHaveBeenCalled();
		warn.mockRestore();
	});
});
