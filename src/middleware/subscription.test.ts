import { describe, it, expect, beforeEach, vi } from "vitest";
import { Hono, type Context } from "hono";
import type { Bindings } from "../index";
import {
	requireUsageQuota,
	requireFeature,
	requireSubscription,
	getUsageInfo,
	type SubscriptionVariables,
} from "./subscription";
import {
	SubscriptionClient,
	type UsageCheckResult,
	type FeatureCheckResult,
	type SubscriptionStatus,
} from "../lib/subscription-client";

// Mock the SubscriptionClient
vi.mock("../lib/subscription-client", () => {
	const SubscriptionClient = vi.fn();
	SubscriptionClient.prototype.checkUsage = vi.fn();
	SubscriptionClient.prototype.hasFeature = vi.fn();
	SubscriptionClient.prototype.getSubscriptionStatus = vi.fn();

	return {
		SubscriptionClient,
	};
});

describe("Subscription Middleware", () => {
	let app: Hono<{ Bindings: Bindings; Variables: SubscriptionVariables }>;
	let _mockEnv: Bindings;

	const mockOrganization = {
		id: "org-123",
		name: "Test Org",
	};

	const mockUsageCheckResult: UsageCheckResult = {
		allowed: true,
		used: 50,
		included: 100,
		remaining: 50,
		overage: 0,
		planTier: "pro",
	};

	const mockFeatureCheckResult: FeatureCheckResult = {
		allowed: true,
		planTier: "pro",
	};

	const mockSubscriptionStatus: SubscriptionStatus = {
		hasSubscription: true,
		isEnterprise: false,
		status: "active",
		planTier: "pro",
		planName: "Pro Plan",
		features: ["data_capture", "compliance_validation"],
	};

	beforeEach(() => {
		app = new Hono<{ Bindings: Bindings; Variables: SubscriptionVariables }>();
		_mockEnv = {
			AUTH_SERVICE: {} as Fetcher,
		} as unknown as Bindings;

		vi.clearAllMocks();
	});

	describe("requireUsageQuota", () => {
		it("should allow request when usage is within quota", async () => {
			vi.mocked(SubscriptionClient.prototype.checkUsage).mockResolvedValue(
				mockUsageCheckResult,
			);

			app.use("*", (c, next) => {
				c.set("organization", mockOrganization);
				return next();
			});
			app.post("/test", requireUsageQuota("notices"), (c) => {
				return c.json({ success: true });
			});

			const res = await app.request("/test", {
				method: "POST",
			});

			expect(res.status).toBe(200);
			expect(res.headers.get("X-Usage-Used")).toBe("50");
			expect(res.headers.get("X-Usage-Included")).toBe("100");
			expect(res.headers.get("X-Usage-Overage")).toBe("0");
			expect(res.headers.get("X-Plan-Tier")).toBe("pro");
		});

		it("should return 409 when organization is not set", async () => {
			app.post("/test", requireUsageQuota("notices"), (c) => {
				return c.json({ success: true });
			});

			const res = await app.request("/test", {
				method: "POST",
			});

			expect(res.status).toBe(409);
			const body = await res.json();
			expect(body).toEqual({
				success: false,
				error: "Organization Required",
				code: "ORGANIZATION_REQUIRED",
				message: "An active organization must be selected",
			});
		});

		it("should allow request when subscription service is unavailable", async () => {
			vi.mocked(SubscriptionClient.prototype.checkUsage).mockResolvedValue(
				null,
			);

			app.use("*", (c, next) => {
				c.set("organization", mockOrganization);
				return next();
			});
			app.post("/test", requireUsageQuota("notices"), (c) => {
				return c.json({ success: true });
			});

			const res = await app.request("/test", {
				method: "POST",
			});

			expect(res.status).toBe(200);
		});

		it("should set usageInfo in context", async () => {
			vi.mocked(SubscriptionClient.prototype.checkUsage).mockResolvedValue(
				mockUsageCheckResult,
			);

			let capturedUsageInfo: UsageCheckResult | undefined;

			app.use("*", (c, next) => {
				c.set("organization", mockOrganization);
				return next();
			});
			app.post("/test", requireUsageQuota("notices"), (c) => {
				capturedUsageInfo = c.get("usageInfo");
				return c.json({ success: true });
			});

			await app.request("/test", {
				method: "POST",
			});

			expect(capturedUsageInfo).toEqual(mockUsageCheckResult);
		});

		it("should handle unlimited usage", async () => {
			const unlimitedResult: UsageCheckResult = {
				...mockUsageCheckResult,
				included: -1,
			};

			vi.mocked(SubscriptionClient.prototype.checkUsage).mockResolvedValue(
				unlimitedResult,
			);

			app.use("*", (c, next) => {
				c.set("organization", mockOrganization);
				return next();
			});
			app.post("/test", requireUsageQuota("transactions"), (c) => {
				return c.json({ success: true });
			});

			const res = await app.request("/test", {
				method: "POST",
			});

			expect(res.status).toBe(200);
			expect(res.headers.get("X-Usage-Included")).toBe("unlimited");
		});

		it("should allow request even when over quota (graceful degradation)", async () => {
			const overQuotaResult: UsageCheckResult = {
				allowed: false,
				used: 110,
				included: 100,
				remaining: 0,
				overage: 10,
				planTier: "pro",
			};

			vi.mocked(SubscriptionClient.prototype.checkUsage).mockResolvedValue(
				overQuotaResult,
			);

			app.use("*", (c, next) => {
				c.set("organization", mockOrganization);
				return next();
			});
			app.post("/test", requireUsageQuota("alerts"), (c) => {
				return c.json({ success: true });
			});

			const res = await app.request("/test", {
				method: "POST",
			});

			expect(res.status).toBe(200);
			expect(res.headers.get("X-Usage-Overage")).toBe("10");
		});
	});

	describe("requireFeature", () => {
		it("should allow request when feature is available", async () => {
			vi.mocked(SubscriptionClient.prototype.hasFeature).mockResolvedValue(
				mockFeatureCheckResult,
			);

			app.use("*", (c, next) => {
				c.set("organization", mockOrganization);
				return next();
			});
			app.post("/test", requireFeature("data_capture"), (c) => {
				return c.json({ success: true });
			});

			const res = await app.request("/test", {
				method: "POST",
			});

			expect(res.status).toBe(200);
		});

		it("should return 409 when organization is not set", async () => {
			app.post("/test", requireFeature("data_capture"), (c) => {
				return c.json({ success: true });
			});

			const res = await app.request("/test", {
				method: "POST",
			});

			expect(res.status).toBe(409);
			const body = await res.json();
			expect(body).toEqual({
				success: false,
				error: "Organization Required",
				code: "ORGANIZATION_REQUIRED",
				message: "An active organization must be selected",
			});
		});

		it("should return 403 when feature is not available", async () => {
			const notAllowedResult: FeatureCheckResult = {
				allowed: false,
				planTier: "business",
				requiredTier: "pro",
			};

			vi.mocked(SubscriptionClient.prototype.hasFeature).mockResolvedValue(
				notAllowedResult,
			);

			app.use("*", (c, next) => {
				c.set("organization", mockOrganization);
				return next();
			});
			app.post("/test", requireFeature("sso"), (c) => {
				return c.json({ success: true });
			});

			const res = await app.request("/test", {
				method: "POST",
			});

			expect(res.status).toBe(403);
			const body = await res.json();
			expect(body).toEqual({
				success: false,
				error: "Feature Not Available",
				code: "FEATURE_REQUIRED",
				message: "This feature requires pro plan.",
				requiredTier: "pro",
				currentTier: "business",
			});
		});

		it("should allow request when subscription service is unavailable", async () => {
			vi.mocked(SubscriptionClient.prototype.hasFeature).mockResolvedValue(
				null,
			);

			app.use("*", (c, next) => {
				c.set("organization", mockOrganization);
				return next();
			});
			app.post("/test", requireFeature("data_capture"), (c) => {
				return c.json({ success: true });
			});

			const res = await app.request("/test", {
				method: "POST",
			});

			expect(res.status).toBe(200);
		});

		it("should handle feature check without required tier", async () => {
			const notAllowedResult: FeatureCheckResult = {
				allowed: false,
				planTier: "business",
			};

			vi.mocked(SubscriptionClient.prototype.hasFeature).mockResolvedValue(
				notAllowedResult,
			);

			app.use("*", (c, next) => {
				c.set("organization", mockOrganization);
				return next();
			});
			app.post("/test", requireFeature("custom_branding"), (c) => {
				return c.json({ success: true });
			});

			const res = await app.request("/test", {
				method: "POST",
			});

			expect(res.status).toBe(403);
			const body = (await res.json()) as { message: string };
			expect(body.message).toBe("This feature requires a higher plan.");
		});
	});

	describe("requireSubscription", () => {
		it("should allow request when subscription is active", async () => {
			vi.mocked(
				SubscriptionClient.prototype.getSubscriptionStatus,
			).mockResolvedValue(mockSubscriptionStatus);

			app.use("*", (c, next) => {
				c.set("organization", mockOrganization);
				return next();
			});
			app.post("/test", requireSubscription(), (c) => {
				return c.json({ success: true });
			});

			const res = await app.request("/test", {
				method: "POST",
			});

			expect(res.status).toBe(200);
		});

		it("should return 409 when organization is not set", async () => {
			app.post("/test", requireSubscription(), (c) => {
				return c.json({ success: true });
			});

			const res = await app.request("/test", {
				method: "POST",
			});

			expect(res.status).toBe(409);
			const body = await res.json();
			expect(body).toEqual({
				success: false,
				error: "Organization Required",
				code: "ORGANIZATION_REQUIRED",
				message: "An active organization must be selected",
			});
		});

		it("should return 402 when subscription is not active", async () => {
			const noSubscriptionStatus: SubscriptionStatus = {
				...mockSubscriptionStatus,
				hasSubscription: false,
			};

			vi.mocked(
				SubscriptionClient.prototype.getSubscriptionStatus,
			).mockResolvedValue(noSubscriptionStatus);

			app.use("*", (c, next) => {
				c.set("organization", mockOrganization);
				return next();
			});
			app.post("/test", requireSubscription(), (c) => {
				return c.json({ success: true });
			});

			const res = await app.request("/test", {
				method: "POST",
			});

			expect(res.status).toBe(402);
			const body = await res.json();
			expect(body).toEqual({
				success: false,
				error: "Subscription Required",
				code: "SUBSCRIPTION_REQUIRED",
				message:
					"An active subscription is required to use this feature. Please subscribe to continue.",
			});
		});

		it("should allow request when subscription service is unavailable", async () => {
			vi.mocked(
				SubscriptionClient.prototype.getSubscriptionStatus,
			).mockResolvedValue(null);

			app.use("*", (c, next) => {
				c.set("organization", mockOrganization);
				return next();
			});
			app.post("/test", requireSubscription(), (c) => {
				return c.json({ success: true });
			});

			const res = await app.request("/test", {
				method: "POST",
			});

			expect(res.status).toBe(200);
		});
	});

	describe("getUsageInfo", () => {
		it("should return usage info when set", () => {
			const mockContext = {
				get: vi.fn().mockReturnValue(mockUsageCheckResult),
			} as unknown as Context;

			const result = getUsageInfo(mockContext);

			expect(result).toEqual(mockUsageCheckResult);
			expect(mockContext.get).toHaveBeenCalledWith("usageInfo");
		});

		it("should return null when usage info is not set", () => {
			const mockContext = {
				get: vi.fn().mockReturnValue(undefined),
			} as unknown as Context;

			const result = getUsageInfo(mockContext);

			expect(result).toBeNull();
		});
	});
});
