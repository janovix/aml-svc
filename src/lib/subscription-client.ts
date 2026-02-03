/**
 * Subscription client via service binding
 *
 * This module provides helpers for checking subscription status,
 * reporting usage, and verifying features via auth-svc service binding.
 */

import type { Bindings } from "../types";

/**
 * Plan tiers
 */
export type PlanTier = "none" | "business" | "pro" | "enterprise";

/**
 * Usage metric types
 */
export type UsageMetric = "notices" | "alerts" | "transactions";

/**
 * Feature names
 */
export type Feature =
	| "data_capture"
	| "compliance_validation"
	| "report_generation"
	| "acknowledgment_tracking"
	| "advanced_roles"
	| "approval_flows"
	| "report_templates"
	| "priority_support"
	| "sso"
	| "custom_branding"
	| "audit_export"
	| "api_access"
	| "dedicated_support"
	| "custom_integrations";

/**
 * Usage check result
 */
export interface UsageCheckResult {
	allowed: boolean;
	used: number;
	included: number;
	remaining: number;
	overage: number;
	planTier: PlanTier;
}

/**
 * Feature check result
 */
export interface FeatureCheckResult {
	allowed: boolean;
	planTier: PlanTier;
	requiredTier?: PlanTier;
}

/**
 * Full subscription status
 */
export interface SubscriptionStatus {
	hasSubscription: boolean;
	isEnterprise: boolean;
	status:
		| "inactive"
		| "trialing"
		| "active"
		| "past_due"
		| "canceled"
		| "unpaid";
	planTier: PlanTier;
	planName: string | null;
	features: Feature[];
}

/**
 * Subscription client for auth-svc communication
 */
export class SubscriptionClient {
	private env: Bindings;

	constructor(env: Bindings) {
		this.env = env;
	}

	/**
	 * Get full subscription status for an organization
	 */
	async getSubscriptionStatus(
		organizationId: string,
	): Promise<SubscriptionStatus | null> {
		const authService = this.env.AUTH_SERVICE;
		if (!authService) {
			console.warn(
				"AUTH_SERVICE binding not available, skipping subscription check",
			);
			return null;
		}

		try {
			const response = await authService.fetch(
				new Request(
					`https://auth-svc.internal/internal/subscription/status?organizationId=${organizationId}`,
					{
						method: "GET",
						headers: {
							Accept: "application/json",
						},
					},
				),
			);

			if (!response.ok) {
				console.error(
					`Failed to get subscription status: ${response.status} ${response.statusText}`,
				);
				return null;
			}

			const result = (await response.json()) as {
				success: boolean;
				data: SubscriptionStatus;
				error?: string;
			};

			if (!result.success) {
				console.error("Subscription status check failed:", result.error);
				return null;
			}

			return result.data;
		} catch (error) {
			console.error("Error getting subscription status:", error);
			return null;
		}
	}

	/**
	 * Report usage increment (call after creating notices/alerts/transactions)
	 *
	 * @param organizationId - Organization ID
	 * @param metric - Usage metric type
	 * @param count - Number of items created (default 1)
	 * @returns Updated usage status or null if failed
	 *
	 * @example
	 * ```typescript
	 * const subscription = new SubscriptionClient(c.env);
	 *
	 * // Report a notice was created
	 * const result = await subscription.reportUsage(orgId, "notices", 1);
	 * if (result) {
	 *   console.log(`Used ${result.used}/${result.included} notices`);
	 * }
	 * ```
	 */
	async reportUsage(
		organizationId: string,
		metric: UsageMetric,
		count: number = 1,
	): Promise<UsageCheckResult | null> {
		const authService = this.env.AUTH_SERVICE;
		if (!authService) {
			console.warn("AUTH_SERVICE binding not available, skipping usage report");
			return null;
		}

		try {
			const response = await authService.fetch(
				new Request(
					"https://auth-svc.internal/internal/subscription/usage/report",
					{
						method: "POST",
						headers: {
							"Content-Type": "application/json",
							Accept: "application/json",
						},
						body: JSON.stringify({
							organizationId,
							metric,
							count,
						}),
					},
				),
			);

			if (!response.ok) {
				console.error(
					`Failed to report usage: ${response.status} ${response.statusText}`,
				);
				return null;
			}

			const result = (await response.json()) as {
				success: boolean;
				data: UsageCheckResult;
				error?: string;
			};

			if (!result.success) {
				console.error("Usage report failed:", result.error);
				return null;
			}

			return result.data;
		} catch (error) {
			console.error("Error reporting usage:", error);
			return null;
		}
	}

	/**
	 * Check if usage is allowed before performing action
	 *
	 * @param organizationId - Organization ID
	 * @param metric - Usage metric to check
	 * @returns Usage check result or null if failed
	 */
	async checkUsage(
		organizationId: string,
		metric: UsageMetric | "users",
	): Promise<UsageCheckResult | null> {
		const authService = this.env.AUTH_SERVICE;
		if (!authService) {
			console.warn("AUTH_SERVICE binding not available, allowing action");
			return null;
		}

		try {
			const response = await authService.fetch(
				new Request(
					"https://auth-svc.internal/internal/subscription/usage/check",
					{
						method: "POST",
						headers: {
							"Content-Type": "application/json",
							Accept: "application/json",
						},
						body: JSON.stringify({
							organizationId,
							metric,
						}),
					},
				),
			);

			if (!response.ok) {
				console.error(
					`Failed to check usage: ${response.status} ${response.statusText}`,
				);
				return null;
			}

			const result = (await response.json()) as {
				success: boolean;
				data: UsageCheckResult;
				error?: string;
			};

			return result.success ? result.data : null;
		} catch (error) {
			console.error("Error checking usage:", error);
			return null;
		}
	}

	/**
	 * Check if organization has access to a feature
	 *
	 * @param organizationId - Organization ID
	 * @param feature - Feature to check
	 * @returns Feature check result or null if failed
	 */
	async hasFeature(
		organizationId: string,
		feature: Feature,
	): Promise<FeatureCheckResult | null> {
		const authService = this.env.AUTH_SERVICE;
		if (!authService) {
			console.warn("AUTH_SERVICE binding not available, allowing feature");
			return null;
		}

		try {
			const response = await authService.fetch(
				new Request(
					"https://auth-svc.internal/internal/subscription/feature/check",
					{
						method: "POST",
						headers: {
							"Content-Type": "application/json",
							Accept: "application/json",
						},
						body: JSON.stringify({
							organizationId,
							feature,
						}),
					},
				),
			);

			if (!response.ok) {
				console.error(
					`Failed to check feature: ${response.status} ${response.statusText}`,
				);
				return null;
			}

			const result = (await response.json()) as {
				success: boolean;
				data: FeatureCheckResult;
				error?: string;
			};

			return result.success ? result.data : null;
		} catch (error) {
			console.error("Error checking feature:", error);
			return null;
		}
	}

	/**
	 * Update user count for an organization
	 *
	 * @param organizationId - Organization ID
	 * @param count - Current user count
	 */
	async updateUsersCount(organizationId: string, count: number): Promise<void> {
		const authService = this.env.AUTH_SERVICE;
		if (!authService) {
			console.warn("AUTH_SERVICE binding not available");
			return;
		}

		try {
			const response = await authService.fetch(
				new Request(
					"https://auth-svc.internal/internal/subscription/users/update",
					{
						method: "POST",
						headers: {
							"Content-Type": "application/json",
							Accept: "application/json",
						},
						body: JSON.stringify({
							organizationId,
							count,
						}),
					},
				),
			);

			if (!response.ok) {
				console.error(
					`Failed to update user count: ${response.status} ${response.statusText}`,
				);
			}
		} catch (error) {
			console.error("Error updating user count:", error);
		}
	}
}

/**
 * Create a subscription client instance
 */
export function createSubscriptionClient(env: Bindings): SubscriptionClient {
	return new SubscriptionClient(env);
}
