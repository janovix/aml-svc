/**
 * Usage Rights middleware for gating metered actions
 *
 * Replaces the old requireUsageQuota middleware with the new
 * unified usage rights system. Returns 403 Forbidden when limits
 * are exceeded, with upgradeRequired flag for frontend handling.
 */

import type { MiddlewareHandler } from "hono";
import type { Bindings } from "../types";
import type { AuthVariables } from "./auth";
import {
	UsageRightsClient,
	type UsageMetric,
	type GateResult,
} from "../lib/usage-rights-client";

/**
 * Extended variables with usage rights info
 */
export interface UsageRightsVariables extends AuthVariables {
	usageGateResult?: GateResult;
}

/**
 * Middleware that gates an action by checking usage limits via auth-svc.
 * If allowed, the meter is atomically incremented.
 * If blocked, returns 403 Forbidden with upgrade details.
 *
 * @param metric - The usage metric to gate (notices, alerts, operations, etc.)
 * @param count - Number of items being created (default 1)
 *
 * @example
 * ```typescript
 * router.post("/notices", authMiddleware(), requireUsageRight("notices"), async (c) => {
 *   // If we get here, the org has quota available and meter has been incremented
 * });
 * ```
 */
export function requireUsageRight(
	metric: UsageMetric,
	count: number = 1,
): MiddlewareHandler<{
	Bindings: Bindings;
	Variables: UsageRightsVariables;
}> {
	return async (c, next) => {
		const organization = c.get("organization");

		if (!organization) {
			return c.json(
				{
					success: false,
					error: "Organization Required",
					code: "ORGANIZATION_REQUIRED",
					message: "An active organization must be selected",
				},
				409,
			);
		}

		const client = new UsageRightsClient(c.env);
		const result = await client.gate(organization.id, metric, count);

		if (!result.allowed) {
			return c.json(
				{
					success: false,
					error: result.error ?? "usage_limit_exceeded",
					code: "USAGE_LIMIT_EXCEEDED",
					upgradeRequired: true,
					metric: result.metric,
					used: result.used,
					limit: result.limit,
					remaining: 0,
					entitlementType: result.entitlementType,
					message: `You have reached the limit for ${metric}. Please upgrade your plan or contact your administrator.`,
				},
				403,
			);
		}

		// Store result for downstream handlers
		c.set("usageGateResult", result);

		// Add usage info to response headers
		if (result.used !== undefined) {
			c.header("X-Usage-Used", result.used.toString());
		}
		if (result.limit !== undefined) {
			c.header(
				"X-Usage-Limit",
				result.limit === 0 ? "unlimited" : result.limit.toString(),
			);
		}
		if (result.remaining !== undefined) {
			c.header(
				"X-Usage-Remaining",
				result.remaining === -1 ? "unlimited" : result.remaining.toString(),
			);
		}
		if (result.entitlementType) {
			c.header("X-Entitlement-Type", result.entitlementType);
		}

		return next();
	};
}
