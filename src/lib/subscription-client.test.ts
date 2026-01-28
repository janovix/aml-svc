import { describe, it, expect, beforeEach, vi } from "vitest";
import {
	SubscriptionClient,
	createSubscriptionClient,
	type SubscriptionStatus,
	type UsageCheckResult,
	type FeatureCheckResult,
} from "./subscription-client";
import type { Bindings } from "../types";

describe("SubscriptionClient", () => {
	let client: SubscriptionClient;
	let mockAuthService: Fetcher;
	let mockEnv: Bindings;

	const mockSubscriptionStatus: SubscriptionStatus = {
		hasSubscription: true,
		isEnterprise: false,
		status: "active",
		planTier: "pro",
		planName: "Pro Plan",
		features: ["data_capture", "compliance_validation", "report_generation"],
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

	beforeEach(() => {
		mockAuthService = {
			fetch: vi.fn(),
		} as unknown as Fetcher;

		mockEnv = {
			AUTH_SERVICE: mockAuthService,
		} as unknown as Bindings;

		client = new SubscriptionClient(mockEnv);
	});

	describe("getSubscriptionStatus", () => {
		it("should get subscription status successfully", async () => {
			vi.mocked(mockAuthService.fetch).mockResolvedValue(
				new Response(
					JSON.stringify({
						success: true,
						data: mockSubscriptionStatus,
					}),
					{
						status: 200,
						headers: { "Content-Type": "application/json" },
					},
				),
			);

			const result = await client.getSubscriptionStatus("org-123");

			expect(result).toEqual(mockSubscriptionStatus);
			expect(mockAuthService.fetch).toHaveBeenCalledWith(
				expect.objectContaining({
					url: "https://auth-svc.internal/internal/subscription/status?organizationId=org-123",
					method: "GET",
				}),
			);
		});

		it("should return null when AUTH_SERVICE binding not available", async () => {
			const clientWithoutBinding = new SubscriptionClient({
				AUTH_SERVICE: undefined,
			} as unknown as Bindings);

			const result =
				await clientWithoutBinding.getSubscriptionStatus("org-123");

			expect(result).toBeNull();
			expect(mockAuthService.fetch).not.toHaveBeenCalled();
		});

		it("should return null when response is not ok", async () => {
			vi.mocked(mockAuthService.fetch).mockResolvedValue(
				new Response("Not Found", { status: 404 }),
			);

			const result = await client.getSubscriptionStatus("org-123");

			expect(result).toBeNull();
		});

		it("should return null when response success is false", async () => {
			vi.mocked(mockAuthService.fetch).mockResolvedValue(
				new Response(
					JSON.stringify({
						success: false,
						error: "Organization not found",
					}),
					{
						status: 200,
						headers: { "Content-Type": "application/json" },
					},
				),
			);

			const result = await client.getSubscriptionStatus("org-123");

			expect(result).toBeNull();
		});

		it("should return null when fetch throws error", async () => {
			vi.mocked(mockAuthService.fetch).mockRejectedValue(
				new Error("Network error"),
			);

			const result = await client.getSubscriptionStatus("org-123");

			expect(result).toBeNull();
		});

		it("should handle enterprise subscription", async () => {
			const enterpriseStatus: SubscriptionStatus = {
				...mockSubscriptionStatus,
				isEnterprise: true,
				planTier: "enterprise",
				planName: "Enterprise Plan",
			};

			vi.mocked(mockAuthService.fetch).mockResolvedValue(
				new Response(
					JSON.stringify({
						success: true,
						data: enterpriseStatus,
					}),
					{
						status: 200,
						headers: { "Content-Type": "application/json" },
					},
				),
			);

			const result = await client.getSubscriptionStatus("org-123");

			expect(result?.isEnterprise).toBe(true);
			expect(result?.planTier).toBe("enterprise");
		});
	});

	describe("reportUsage", () => {
		it("should report usage successfully", async () => {
			vi.mocked(mockAuthService.fetch).mockResolvedValue(
				new Response(
					JSON.stringify({
						success: true,
						data: mockUsageCheckResult,
					}),
					{
						status: 200,
						headers: { "Content-Type": "application/json" },
					},
				),
			);

			const result = await client.reportUsage("org-123", "notices", 1);

			expect(result).toEqual(mockUsageCheckResult);
			expect(mockAuthService.fetch).toHaveBeenCalledWith(
				expect.objectContaining({
					url: "https://auth-svc.internal/internal/subscription/usage/report",
					method: "POST",
				}),
			);

			const request = vi.mocked(mockAuthService.fetch).mock
				.calls[0][0] as Request;
			const body = (await request.json()) as {
				organizationId: string;
				metric: string;
				count: number;
			};
			expect(body).toEqual({
				organizationId: "org-123",
				metric: "notices",
				count: 1,
			});
		});

		it("should report usage with custom count", async () => {
			vi.mocked(mockAuthService.fetch).mockResolvedValue(
				new Response(
					JSON.stringify({
						success: true,
						data: mockUsageCheckResult,
					}),
					{
						status: 200,
						headers: { "Content-Type": "application/json" },
					},
				),
			);

			await client.reportUsage("org-123", "transactions", 5);

			const request = vi.mocked(mockAuthService.fetch).mock
				.calls[0][0] as Request;
			const body = (await request.json()) as { count: number; metric: string };
			expect(body.count).toBe(5);
			expect(body.metric).toBe("transactions");
		});

		it("should return null when AUTH_SERVICE binding not available", async () => {
			const clientWithoutBinding = new SubscriptionClient({
				AUTH_SERVICE: undefined,
			} as unknown as Bindings);

			const result = await clientWithoutBinding.reportUsage(
				"org-123",
				"notices",
			);

			expect(result).toBeNull();
		});

		it("should return null when response is not ok", async () => {
			vi.mocked(mockAuthService.fetch).mockResolvedValue(
				new Response("Bad Request", { status: 400 }),
			);

			const result = await client.reportUsage("org-123", "notices");

			expect(result).toBeNull();
		});

		it("should return null when response success is false", async () => {
			vi.mocked(mockAuthService.fetch).mockResolvedValue(
				new Response(
					JSON.stringify({
						success: false,
						error: "Usage limit exceeded",
					}),
					{
						status: 200,
						headers: { "Content-Type": "application/json" },
					},
				),
			);

			const result = await client.reportUsage("org-123", "notices");

			expect(result).toBeNull();
		});

		it("should return null when fetch throws error", async () => {
			vi.mocked(mockAuthService.fetch).mockRejectedValue(
				new Error("Network error"),
			);

			const result = await client.reportUsage("org-123", "notices");

			expect(result).toBeNull();
		});

		it("should handle different usage metrics", async () => {
			vi.mocked(mockAuthService.fetch).mockResolvedValue(
				new Response(
					JSON.stringify({
						success: true,
						data: mockUsageCheckResult,
					}),
					{
						status: 200,
						headers: { "Content-Type": "application/json" },
					},
				),
			);

			await client.reportUsage("org-123", "alerts", 3);

			const request = vi.mocked(mockAuthService.fetch).mock
				.calls[0][0] as Request;
			const body = (await request.json()) as { metric: string };
			expect(body.metric).toBe("alerts");
		});
	});

	describe("checkUsage", () => {
		it("should check usage successfully", async () => {
			vi.mocked(mockAuthService.fetch).mockResolvedValue(
				new Response(
					JSON.stringify({
						success: true,
						data: mockUsageCheckResult,
					}),
					{
						status: 200,
						headers: { "Content-Type": "application/json" },
					},
				),
			);

			const result = await client.checkUsage("org-123", "notices");

			expect(result).toEqual(mockUsageCheckResult);
			expect(mockAuthService.fetch).toHaveBeenCalledWith(
				expect.objectContaining({
					url: "https://auth-svc.internal/internal/subscription/usage/check",
					method: "POST",
				}),
			);
		});

		it("should check user usage", async () => {
			vi.mocked(mockAuthService.fetch).mockResolvedValue(
				new Response(
					JSON.stringify({
						success: true,
						data: mockUsageCheckResult,
					}),
					{
						status: 200,
						headers: { "Content-Type": "application/json" },
					},
				),
			);

			await client.checkUsage("org-123", "users");

			const request = vi.mocked(mockAuthService.fetch).mock
				.calls[0][0] as Request;
			const body = (await request.json()) as { metric: string };
			expect(body.metric).toBe("users");
		});

		it("should return null when AUTH_SERVICE binding not available", async () => {
			const clientWithoutBinding = new SubscriptionClient({
				AUTH_SERVICE: undefined,
			} as unknown as Bindings);

			const result = await clientWithoutBinding.checkUsage(
				"org-123",
				"notices",
			);

			expect(result).toBeNull();
		});

		it("should return null when response is not ok", async () => {
			vi.mocked(mockAuthService.fetch).mockResolvedValue(
				new Response("Internal Server Error", { status: 500 }),
			);

			const result = await client.checkUsage("org-123", "notices");

			expect(result).toBeNull();
		});

		it("should return null when response success is false", async () => {
			vi.mocked(mockAuthService.fetch).mockResolvedValue(
				new Response(
					JSON.stringify({
						success: false,
						error: "Failed to check usage",
					}),
					{
						status: 200,
						headers: { "Content-Type": "application/json" },
					},
				),
			);

			const result = await client.checkUsage("org-123", "notices");

			expect(result).toBeNull();
		});

		it("should return null when fetch throws error", async () => {
			vi.mocked(mockAuthService.fetch).mockRejectedValue(
				new Error("Network error"),
			);

			const result = await client.checkUsage("org-123", "notices");

			expect(result).toBeNull();
		});

		it("should handle usage at limit", async () => {
			const atLimitResult: UsageCheckResult = {
				allowed: false,
				used: 100,
				included: 100,
				remaining: 0,
				overage: 0,
				planTier: "pro",
			};

			vi.mocked(mockAuthService.fetch).mockResolvedValue(
				new Response(
					JSON.stringify({
						success: true,
						data: atLimitResult,
					}),
					{
						status: 200,
						headers: { "Content-Type": "application/json" },
					},
				),
			);

			const result = await client.checkUsage("org-123", "notices");

			expect(result?.allowed).toBe(false);
			expect(result?.remaining).toBe(0);
		});
	});

	describe("hasFeature", () => {
		it("should check feature access successfully", async () => {
			vi.mocked(mockAuthService.fetch).mockResolvedValue(
				new Response(
					JSON.stringify({
						success: true,
						data: mockFeatureCheckResult,
					}),
					{
						status: 200,
						headers: { "Content-Type": "application/json" },
					},
				),
			);

			const result = await client.hasFeature("org-123", "data_capture");

			expect(result).toEqual(mockFeatureCheckResult);
			expect(mockAuthService.fetch).toHaveBeenCalledWith(
				expect.objectContaining({
					url: "https://auth-svc.internal/internal/subscription/feature/check",
					method: "POST",
				}),
			);
		});

		it("should check different features", async () => {
			vi.mocked(mockAuthService.fetch).mockResolvedValue(
				new Response(
					JSON.stringify({
						success: true,
						data: mockFeatureCheckResult,
					}),
					{
						status: 200,
						headers: { "Content-Type": "application/json" },
					},
				),
			);

			await client.hasFeature("org-123", "sso");

			const request = vi.mocked(mockAuthService.fetch).mock
				.calls[0][0] as Request;
			const body = (await request.json()) as { feature: string };
			expect(body.feature).toBe("sso");
		});

		it("should return null when AUTH_SERVICE binding not available", async () => {
			const clientWithoutBinding = new SubscriptionClient({
				AUTH_SERVICE: undefined,
			} as unknown as Bindings);

			const result = await clientWithoutBinding.hasFeature(
				"org-123",
				"data_capture",
			);

			expect(result).toBeNull();
		});

		it("should return null when response is not ok", async () => {
			vi.mocked(mockAuthService.fetch).mockResolvedValue(
				new Response("Forbidden", { status: 403 }),
			);

			const result = await client.hasFeature("org-123", "data_capture");

			expect(result).toBeNull();
		});

		it("should return null when response success is false", async () => {
			vi.mocked(mockAuthService.fetch).mockResolvedValue(
				new Response(
					JSON.stringify({
						success: false,
						error: "Feature check failed",
					}),
					{
						status: 200,
						headers: { "Content-Type": "application/json" },
					},
				),
			);

			const result = await client.hasFeature("org-123", "data_capture");

			expect(result).toBeNull();
		});

		it("should return null when fetch throws error", async () => {
			vi.mocked(mockAuthService.fetch).mockRejectedValue(
				new Error("Network error"),
			);

			const result = await client.hasFeature("org-123", "data_capture");

			expect(result).toBeNull();
		});

		it("should handle feature not allowed", async () => {
			const notAllowedResult: FeatureCheckResult = {
				allowed: false,
				planTier: "business",
				requiredTier: "pro",
			};

			vi.mocked(mockAuthService.fetch).mockResolvedValue(
				new Response(
					JSON.stringify({
						success: true,
						data: notAllowedResult,
					}),
					{
						status: 200,
						headers: { "Content-Type": "application/json" },
					},
				),
			);

			const result = await client.hasFeature("org-123", "sso");

			expect(result?.allowed).toBe(false);
			expect(result?.requiredTier).toBe("pro");
		});
	});

	describe("updateUsersCount", () => {
		it("should update user count successfully", async () => {
			vi.mocked(mockAuthService.fetch).mockResolvedValue(
				new Response(
					JSON.stringify({
						success: true,
					}),
					{
						status: 200,
						headers: { "Content-Type": "application/json" },
					},
				),
			);

			await client.updateUsersCount("org-123", 15);

			expect(mockAuthService.fetch).toHaveBeenCalledWith(
				expect.objectContaining({
					url: "https://auth-svc.internal/internal/subscription/users/update",
					method: "POST",
				}),
			);

			const request = vi.mocked(mockAuthService.fetch).mock
				.calls[0][0] as Request;
			const body = (await request.json()) as {
				organizationId: string;
				count: number;
			};
			expect(body).toEqual({
				organizationId: "org-123",
				count: 15,
			});
		});

		it("should not throw when AUTH_SERVICE binding not available", async () => {
			const clientWithoutBinding = new SubscriptionClient({
				AUTH_SERVICE: undefined,
			} as unknown as Bindings);

			await expect(
				clientWithoutBinding.updateUsersCount("org-123", 10),
			).resolves.not.toThrow();
		});

		it("should not throw when response is not ok", async () => {
			vi.mocked(mockAuthService.fetch).mockResolvedValue(
				new Response("Bad Request", { status: 400 }),
			);

			await expect(
				client.updateUsersCount("org-123", 10),
			).resolves.not.toThrow();
		});

		it("should not throw when fetch throws error", async () => {
			vi.mocked(mockAuthService.fetch).mockRejectedValue(
				new Error("Network error"),
			);

			await expect(
				client.updateUsersCount("org-123", 10),
			).resolves.not.toThrow();
		});

		it("should handle zero user count", async () => {
			vi.mocked(mockAuthService.fetch).mockResolvedValue(
				new Response(
					JSON.stringify({
						success: true,
					}),
					{
						status: 200,
						headers: { "Content-Type": "application/json" },
					},
				),
			);

			await client.updateUsersCount("org-123", 0);

			const request = vi.mocked(mockAuthService.fetch).mock
				.calls[0][0] as Request;
			const body = (await request.json()) as { count: number };
			expect(body.count).toBe(0);
		});
	});

	describe("createSubscriptionClient", () => {
		it("should create a subscription client instance", () => {
			const client = createSubscriptionClient(mockEnv);

			expect(client).toBeInstanceOf(SubscriptionClient);
		});
	});
});
