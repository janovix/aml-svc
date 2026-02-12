import { describe, it, expect, beforeEach, vi } from "vitest";
import {
	UsageRightsClient,
	createUsageRightsClient,
	type UsageMetric,
} from "./usage-rights-client";
import type { Bindings } from "../types";

describe("UsageRightsClient", () => {
	const mockFetch = vi.fn();
	const mockEnv = {
		AUTH_SERVICE: { fetch: mockFetch },
	} as unknown as Bindings;
	const envNoService = {} as unknown as Bindings;

	let client: UsageRightsClient;

	beforeEach(() => {
		vi.clearAllMocks();
		client = new UsageRightsClient(mockEnv);
	});

	describe("gate()", () => {
		it("returns allowed=true when AUTH_SERVICE binding returns 200", async () => {
			mockFetch.mockResolvedValue(
				new Response(
					JSON.stringify({
						allowed: true,
						metric: "notices",
						used: 5,
						limit: 100,
						remaining: 95,
					}),
					{
						status: 200,
						headers: { "Content-Type": "application/json" },
					},
				),
			);

			const result = await client.gate("org-123", "notices", 1);

			expect(result).toEqual({
				allowed: true,
				metric: "notices",
				used: 5,
				limit: 100,
				remaining: 95,
			});
		});

		it("returns allowed=false when AUTH_SERVICE binding returns 403", async () => {
			mockFetch.mockResolvedValue(
				new Response(
					JSON.stringify({
						allowed: false,
						metric: "notices",
						used: 100,
						limit: 100,
						remaining: 0,
						upgradeRequired: true,
					}),
					{
						status: 403,
						headers: { "Content-Type": "application/json" },
					},
				),
			);

			const result = await client.gate("org-123", "notices", 1);

			expect(result).toEqual({
				allowed: false,
				metric: "notices",
				used: 100,
				limit: 100,
				remaining: 0,
				upgradeRequired: true,
			});
		});

		it("returns allowed=true (fail-open) when AUTH_SERVICE binding is not available (undefined)", async () => {
			const clientNoService = new UsageRightsClient(envNoService);
			const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

			const result = await clientNoService.gate("org-123", "notices", 1);

			expect(result).toEqual({ allowed: true });
			expect(mockFetch).not.toHaveBeenCalled();
			expect(warnSpy).toHaveBeenCalledWith(
				"AUTH_SERVICE binding not available, allowing action (fail-open)",
			);
			warnSpy.mockRestore();
		});

		it("returns allowed=true (fail-open) when fetch throws an error", async () => {
			mockFetch.mockRejectedValue(new Error("Network error"));
			const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

			const result = await client.gate("org-123", "notices", 1);

			expect(result).toEqual({ allowed: true });
			expect(errorSpy).toHaveBeenCalledWith(
				"[UsageRights] Error calling gate:",
				expect.any(Error),
			);
			errorSpy.mockRestore();
		});

		it("sends correct request body with organizationId, metric, count", async () => {
			mockFetch.mockResolvedValue(
				new Response(JSON.stringify({ allowed: true }), {
					status: 200,
					headers: { "Content-Type": "application/json" },
				}),
			);

			await client.gate("org-456", "reports", 3);

			expect(mockFetch).toHaveBeenCalledTimes(1);
			const request = mockFetch.mock.calls[0][0] as Request;
			expect(request.url).toBe(
				"https://auth-svc.internal/internal/usage-rights/gate",
			);
			expect(request.method).toBe("POST");
			expect(request.headers.get("Content-Type")).toBe("application/json");
			expect(request.headers.get("Accept")).toBe("application/json");
			const body = (await request.json()) as {
				organizationId: string;
				metric: UsageMetric;
				count: number;
			};
			expect(body).toEqual({
				organizationId: "org-456",
				metric: "reports",
				count: 3,
			});
		});
	});

	describe("meter()", () => {
		it("sends POST request with correct body", async () => {
			mockFetch.mockResolvedValue(new Response(null, { status: 200 }));

			await client.meter("org-789", "alerts", 2);

			expect(mockFetch).toHaveBeenCalledTimes(1);
			const request = mockFetch.mock.calls[0][0] as Request;
			expect(request.url).toBe(
				"https://auth-svc.internal/internal/usage-rights/meter",
			);
			expect(request.method).toBe("POST");
			expect(request.headers.get("Content-Type")).toBe("application/json");
			const body = (await request.json()) as {
				organizationId: string;
				metric: UsageMetric;
				count: number;
			};
			expect(body).toEqual({
				organizationId: "org-789",
				metric: "alerts",
				count: 2,
			});
		});

		it("does nothing when AUTH_SERVICE binding is not available", async () => {
			const clientNoService = new UsageRightsClient(envNoService);

			await clientNoService.meter("org-123", "notices", 1);

			expect(mockFetch).not.toHaveBeenCalled();
		});

		it("logs error but does not throw when fetch fails", async () => {
			mockFetch.mockRejectedValue(new Error("Service unavailable"));
			const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

			await expect(
				client.meter("org-123", "notices", 1),
			).resolves.not.toThrow();
			expect(errorSpy).toHaveBeenCalledWith(
				"[UsageRights] Error calling meter:",
				expect.any(Error),
			);
			errorSpy.mockRestore();
		});
	});

	describe("check()", () => {
		it("returns gate result when AUTH_SERVICE returns 200", async () => {
			mockFetch.mockResolvedValue(
				new Response(
					JSON.stringify({
						allowed: true,
						metric: "notices",
						used: 10,
						limit: 100,
						remaining: 90,
					}),
					{
						status: 200,
						headers: { "Content-Type": "application/json" },
					},
				),
			);

			const result = await client.check("org-123", "notices");

			expect(result).toEqual({
				allowed: true,
				metric: "notices",
				used: 10,
				limit: 100,
				remaining: 90,
			});
		});

		it("returns allowed=false when AUTH_SERVICE returns 403", async () => {
			mockFetch.mockResolvedValue(
				new Response(
					JSON.stringify({
						allowed: false,
						metric: "reports",
						used: 50,
						limit: 50,
						remaining: 0,
					}),
					{
						status: 403,
						headers: { "Content-Type": "application/json" },
					},
				),
			);

			const result = await client.check("org-123", "reports");

			expect(result).toEqual({
				allowed: false,
				metric: "reports",
				used: 50,
				limit: 50,
				remaining: 0,
			});
		});

		it("returns null when AUTH_SERVICE is not available", async () => {
			const clientNoService = new UsageRightsClient(envNoService);

			const result = await clientNoService.check("org-123", "notices");

			expect(result).toBeNull();
			expect(mockFetch).not.toHaveBeenCalled();
		});

		it("returns null when fetch throws", async () => {
			mockFetch.mockRejectedValue(new Error("Connection refused"));
			const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

			const result = await client.check("org-123", "notices");

			expect(result).toBeNull();
			expect(errorSpy).toHaveBeenCalledWith(
				"[UsageRights] Error calling check:",
				expect.any(Error),
			);
			errorSpy.mockRestore();
		});
	});

	describe("createUsageRightsClient", () => {
		it("should create a UsageRightsClient instance", () => {
			const created = createUsageRightsClient(mockEnv);

			expect(created).toBeInstanceOf(UsageRightsClient);
		});
	});
});
