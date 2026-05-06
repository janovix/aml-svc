/**
 * Require Better Auth org role `owner` or `admin` for training org-level routes.
 */

import type { MiddlewareHandler } from "hono";

import type { Bindings } from "../types";
import type { AuthVariables } from "./auth";
import { APIError } from "./error";

export function requireOrgOwnerOrAdmin(): MiddlewareHandler<{
	Bindings: Bindings;
	Variables: AuthVariables;
}> {
	return async (c, next) => {
		const userId = c.get("user").id;
		const organizationId = c.req.param("organizationId");
		const auth = c.env.AUTH_SERVICE;

		if (!organizationId) {
			throw new APIError(400, "Missing organization id");
		}

		if (!auth?.getMemberRole) {
			throw new APIError(503, "Auth service RPC unavailable");
		}

		const cacheKey = `training:org-role:${userId}:${organizationId}`;
		let role: string | null | undefined;

		if (c.env.CACHE) {
			const cached = await c.env.CACHE.get(cacheKey);
			if (cached) {
				role = cached;
			}
		}

		if (role === undefined) {
			role = await auth.getMemberRole(userId, organizationId);
			if (c.env.CACHE && role != null) {
				await c.env.CACHE.put(cacheKey, role, { expirationTtl: 60 });
			}
		}

		const r = (role ?? "").toLowerCase();
		if (r !== "owner" && r !== "admin") {
			throw new APIError(403, "Forbidden", { code: "TRAINING_ORG_FORBIDDEN" });
		}

		await next();
	};
}
