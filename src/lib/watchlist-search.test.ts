import { describe, it, expect, vi, beforeEach } from "vitest";
import {
	createWatchlistSearchService,
	WatchlistSearchService,
} from "./watchlist-search";

describe("WatchlistSearchService", () => {
	beforeEach(() => {
		vi.spyOn(console, "log").mockImplementation(() => {});
		vi.spyOn(console, "warn").mockImplementation(() => {});
		vi.spyOn(console, "error").mockImplementation(() => {});
	});

	it("returns null when binding is missing", async () => {
		const svc = new WatchlistSearchService(undefined);
		await expect(
			svc.triggerSearch({
				query: "Jane Doe",
				entityType: "person",
				organizationId: "o1",
				userId: "u1",
			}),
		).resolves.toBeNull();
	});

	it("maps params to RPC search and returns result", async () => {
		const search = vi.fn().mockResolvedValue({
			queryId: "q1",
			ofacCount: 1,
			unscCount: 0,
			sat69bCount: 2,
		});
		const svc = createWatchlistSearchService({ search });
		const out = await svc.triggerSearch({
			query: "Acme",
			entityType: "organization",
			organizationId: "o1",
			userId: "u1",
			source: "aml:client",
			birthDate: "1990-01-01",
			identifiers: ["RFC123"],
			countries: ["MX"],
			entityId: "c1",
			entityKind: "client",
			environment: "staging",
		});
		expect(out).toEqual({
			queryId: "q1",
			ofacCount: 1,
			unscCount: 0,
			sat69bCount: 2,
		});
		expect(search).toHaveBeenCalledWith(
			expect.objectContaining({
				q: "Acme",
				entityType: "organization",
				source: "aml:client",
				birthDate: "1990-01-01",
				identifiers: ["RFC123"],
				countries: ["MX"],
				topK: 50,
				threshold: 0.875,
				environment: "staging",
				entityId: "c1",
				entityKind: "client",
			}),
			"o1",
			"u1",
		);
	});

	it("returns null when RPC throws", async () => {
		const search = vi.fn().mockRejectedValue(new Error("rpc fail"));
		const svc = createWatchlistSearchService({ search });
		await expect(
			svc.triggerSearch({
				query: "x",
				entityType: "person",
				organizationId: "o1",
				userId: "u1",
			}),
		).resolves.toBeNull();
	});
});
