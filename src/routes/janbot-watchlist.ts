/**
 * Janbot-facing watchlist helpers (authenticated, org-scoped).
 * Proxies to watchlist-svc via the WATCHLIST_SERVICE RPC binding.
 */

import { Hono } from "hono";
import { z } from "zod";

import type { Bindings } from "../types";
import {
	type AuthVariables,
	getAuthUser,
	getOrganizationId,
} from "../middleware/auth";
import { APIError } from "../middleware/error";

export const janbotWatchlistRouter = new Hono<{
	Bindings: Bindings;
	Variables: AuthVariables;
}>();

const screenBody = z.object({
	q: z.string().min(1).max(500),
	entityType: z.enum(["person", "organization"]).optional(),
	birthDate: z.string().max(40).optional(),
	countries: z.array(z.string().max(8)).max(20).optional(),
	identifiers: z.array(z.string().max(64)).max(20).optional(),
});

/** POST /api/v1/janbot/watchlist/search — full hybrid screen (persisted query + quota) */
janbotWatchlistRouter.post("/search", async (c) => {
	const orgId = getOrganizationId(c);
	const user = getAuthUser(c);
	const body = screenBody.parse(await c.req.json());
	const rpc = c.env.WATCHLIST_SERVICE;
	if (!rpc) {
		throw new APIError(503, "Watchlist service not configured");
	}

	const result = await rpc.search(
		{
			q: body.q,
			entityType: body.entityType ?? "person",
			source: "janbot",
			birthDate: body.birthDate,
			countries: body.countries,
			identifiers: body.identifiers,
		},
		orgId,
		user.id,
	);

	return c.json({
		kind: "janbot.watchlist.screen" as const,
		queryId: result.queryId,
		ofacCount: result.ofacCount,
		unscCount: result.unscCount,
		sat69bCount: result.sat69bCount,
	});
});
