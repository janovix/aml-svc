/**
 * Usage Rights client via auth-svc service binding
 *
 * Provides gate-and-meter, check, and meter operations via the
 * /internal/usage-rights/* endpoints on auth-svc.
 *
 * Uses Cloudflare service bindings -- no auth headers needed.
 */

import * as Sentry from "@sentry/cloudflare";
import type { Bindings } from "../types";

/**
 * Usage metrics that can be gated and metered
 */
export type UsageMetric =
	| "reports"
	| "notices"
	| "alerts"
	| "operations"
	| "clients"
	| "users"
	| "watchlistQueries"
	| "organizations";

/**
 * Entitlement types
 */
export type EntitlementType = "license" | "stripe" | "none";

/**
 * Result of a gate-and-meter or check operation
 */
export interface GateResult {
	allowed: boolean;
	metric?: UsageMetric;
	used?: number;
	limit?: number;
	remaining?: number;
	entitlementType?: EntitlementType;
	error?: string;
	upgradeRequired?: boolean;
	/** From auth-svc (e.g. ORGANIZATION_ARCHIVED, SPEND_LIMIT_EXCEEDED) */
	code?: string;
	overageWarning?: boolean;
	overageUnits?: number;
	overageEnabled?: boolean;
	spendLimitRemaining?: number | null;
}

function metricHumanLabel(metric: UsageMetric): string {
	const labels: Partial<Record<UsageMetric, string>> = {
		reports: "reports",
		notices: "notices",
		alerts: "alerts",
		operations: "operations",
		clients: "clients",
		users: "users",
		watchlistQueries: "watchlist queries",
		organizations: "organizations",
	};
	return labels[metric] ?? metric;
}

/**
 * JSON body for 403 when {@link UsageRightsClient.gate} returns allowed=false.
 */
export function buildGateDenialBody(
	metric: UsageMetric,
	result: GateResult,
): Record<string, unknown> {
	const code = result.code ?? "USAGE_LIMIT_EXCEEDED";
	const isArchived = code === "ORGANIZATION_ARCHIVED";
	const label = metricHumanLabel(metric);
	return {
		success: false,
		error: result.error ?? "usage_limit_exceeded",
		code,
		upgradeRequired: result.upgradeRequired ?? !isArchived,
		metric: result.metric ?? metric,
		used: result.used,
		limit: result.limit,
		remaining: result.remaining ?? 0,
		entitlementType: result.entitlementType,
		message: isArchived
			? "This organization is archived. Restore it from account settings to make changes."
			: `You have reached the limit for ${label}. Please upgrade your plan or contact your administrator.`,
	};
}

/**
 * Usage Rights client for auth-svc communication
 */
export class UsageRightsClient {
	constructor(private env: Bindings) {}

	/**
	 * Gate-and-meter: check if action is allowed + increment meter atomically.
	 * Returns allowed=true if permitted, allowed=false with 403 details if not.
	 *
	 * Fail-open: if the AUTH_SERVICE binding is unavailable, allows the action.
	 */
	async gate(
		orgId: string,
		metric: UsageMetric,
		count: number = 1,
	): Promise<GateResult> {
		const authService = this.env.AUTH_SERVICE;
		if (!authService) {
			console.warn(
				"AUTH_SERVICE binding not available, allowing action (fail-open)",
			);
			return { allowed: true };
		}

		try {
			return (await authService.gateUsageRights(
				orgId,
				metric,
				count,
			)) as GateResult;
		} catch (error) {
			Sentry.captureException(error, {
				tags: { context: "usage-rights-gate-error" },
				extra: { organizationId: orgId, metric },
			});
			return { allowed: true }; // Fail-open
		}
	}

	/**
	 * Meter-only: increment counter without gate check.
	 * Fire-and-forget style -- errors are logged but don't fail the request.
	 */
	async meter(
		orgId: string,
		metric: UsageMetric,
		count: number = 1,
	): Promise<void> {
		const authService = this.env.AUTH_SERVICE;
		if (!authService) return;

		try {
			await authService.meterUsageRights(orgId, metric, count);
		} catch (error) {
			Sentry.captureException(error, {
				tags: { context: "usage-rights-meter-error" },
				extra: { organizationId: orgId, metric, count },
			});
		}
	}

	/**
	 * Check-only: pre-flight check without incrementing meter.
	 */
	async check(orgId: string, metric: UsageMetric): Promise<GateResult | null> {
		const authService = this.env.AUTH_SERVICE;
		if (!authService) return null;

		try {
			return (await authService.checkUsageRights(orgId, metric)) as GateResult;
		} catch (error) {
			Sentry.captureException(error, {
				tags: { context: "usage-rights-check-error" },
				extra: { organizationId: orgId, metric },
			});
			return null;
		}
	}
}

/**
 * Create a UsageRightsClient instance
 */
export function createUsageRightsClient(env: Bindings): UsageRightsClient {
	return new UsageRightsClient(env);
}
