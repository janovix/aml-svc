import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";

import type { Bindings } from "../types";
import type { AuthVariables } from "../middleware/auth";
import { janbotWatchlistRouter } from "./janbot-watchlist";
import { APIError } from "../middleware/error";

describe("janbotWatchlistRouter", () => {
	function buildApp() {
		const app = new Hono<{ Bindings: Bindings; Variables: AuthVariables }>();
		app.onError((err, c) => {
			if (err instanceof APIError) {
				return c.json(
					{ message: err.message },
					err.statusCode as ContentfulStatusCode,
				);
			}
			throw err;
		});
		app.use("*", async (c, next) => {
			c.set("user", { id: "user-1" });
			c.set("organization", { id: "org-1" });
			await next();
		});
		app.route("/", janbotWatchlistRouter);
		return app;
	}

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("503 when WATCHLIST_SERVICE missing", async () => {
		const app = buildApp();
		const res = await app.request(
			"http://t/search",
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ q: "Acme" }),
			},
			{} as Bindings,
		);
		expect(res.status).toBe(503);
	});

	it("proxies search RPC", async () => {
		const search = vi.fn().mockResolvedValue({
			queryId: "q1",
			ofacCount: 0,
			unscCount: 1,
			sat69bCount: 0,
		});
		const app = buildApp();
		const res = await app.request(
			"http://t/search",
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					q: "Jane",
					entityType: "organization",
					countries: ["MX"],
				}),
			},
			{ WATCHLIST_SERVICE: { search } } as unknown as Bindings,
		);
		expect(res.status).toBe(200);
		const body = (await res.json()) as { queryId: string; kind: string };
		expect(body.kind).toBe("janbot.watchlist.screen");
		expect(body.queryId).toBe("q1");
		expect(search).toHaveBeenCalledWith(
			expect.objectContaining({ q: "Jane", source: "janbot" }),
			"org-1",
			"user-1",
		);
	});
});
