/**
 * Reject mutating requests when the active organization is archived or suspended.
 * Reads org lifecycle from auth-svc via service binding (authoritative source).
 */

import type { MiddlewareHandler } from "hono";
import type { Bindings } from "../types";
import type { AuthVariables } from "./auth";
import { getOrganizationIdOrNull } from "./auth";

const READ_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * After {@link authMiddleware}, blocks POST/PATCH/PUT/DELETE when the JWT org
 * is not `active` in auth-svc.
 */
export function requireActiveOrganization(): MiddlewareHandler<{
	Bindings: Bindings;
	Variables: AuthVariables;
}> {
	return async (c, next) => {
		if (READ_METHODS.has(c.req.method)) {
			return next();
		}

		const orgId = getOrganizationIdOrNull(c);
		if (!orgId) {
			return next();
		}

		const auth = c.env.AUTH_SERVICE;
		if (!auth || typeof auth.getOrganization !== "function") {
			return next();
		}

		try {
			const org = await auth.getOrganization(orgId);
			const status = org?.status ?? "active";
			if (status !== "active") {
				return c.json(
					{
						success: false,
						error: "organization_archived",
						code: "ORGANIZATION_ARCHIVED",
						message:
							"This organization is archived or suspended. Restore it from account settings to make changes.",
					},
					403,
				);
			}
		} catch (err) {
			console.error("[requireActiveOrganization] getOrganization failed:", err);
			// Fail-open: do not block product if auth binding is flaky
		}

		return next();
	};
}
