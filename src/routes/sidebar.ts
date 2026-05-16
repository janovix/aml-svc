import { Hono } from "hono";

import type { Bindings } from "../types";
import { getTenantContext, type AuthVariables } from "../middleware/auth";
import { APIError } from "../middleware/error";
import { getPrismaClient } from "../lib/prisma";
import {
	createSidebarBadgeCounters,
	getSidebarBadges,
} from "../domain/sidebar";

export const sidebarRouter = new Hono<{
	Bindings: Bindings;
	Variables: AuthVariables;
}>();

sidebarRouter.get("/badges", async (c) => {
	const org = c.get("organization");
	const user = c.get("user");
	if (!org?.id) {
		throw new APIError(400, "Active organization required");
	}

	const prisma = getPrismaClient(c.env.DB);
	const counters = createSidebarBadgeCounters(prisma, c.env);
	const data = await getSidebarBadges(getTenantContext(c), user.id, counters);

	return c.json({ data });
});
