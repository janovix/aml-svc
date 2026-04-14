import { describe, it, expect, beforeEach, vi } from "vitest";
import {
	UsageRightsClient,
	createUsageRightsClient,
	buildGateDenialBody,
	type GateResult,
} from "./usage-rights-client";
import type { Bindings } from "../types";
import type { AuthSvcRpc } from "../types";

// Mock Sentry
vi.mock("@sentry/cloudflare", () => ({
	captureException: vi.fn(),
	captureMessage: vi.fn(),
}));

describe("UsageRightsClient", () => {
	const mockGate = vi.fn();
	const mockMeter = vi.fn();
	const mockCheck = vi.fn();

	const mockAuthService: Partial<AuthSvcRpc> = {
		gateUsageRights: mockGate,
		meterUsageRights: mockMeter,
		checkUsageRights: mockCheck,
	};

	const mockEnv = {
		AUTH_SERVICE: mockAuthService,
	} as unknown as Bindings;

	const envNoService = {} as unknown as Bindings;

	let client: UsageRightsClient;

	beforeEach(() => {
		vi.clearAllMocks();
		client = new UsageRightsClient(mockEnv);
	});

	describe("gate()", () => {
		it("uses default count of 1 when count is not provided", async () => {
			mockGate.mockResolvedValue({ allowed: true });
			await client.gate("org-123", "notices");
			expect(mockGate).toHaveBeenCalledWith("org-123", "notices", 1);
		});

		it("returns allowed=true when AUTH_SERVICE binding returns allowed", async () => {
			const gateResult: GateResult = {
				allowed: true,
				metric: "notices",
				used: 5,
				limit: 100,
				remaining: 95,
			};
			mockGate.mockResolvedValue(gateResult);

			const result = await client.gate("org-123", "notices", 1);

			expect(result).toEqual(gateResult);
			expect(mockGate).toHaveBeenCalledWith("org-123", "notices", 1);
		});

		it("returns allowed=false when AUTH_SERVICE binding returns not allowed", async () => {
			const gateResult: GateResult = {
				allowed: false,
				metric: "notices",
				used: 100,
				limit: 100,
				remaining: 0,
				upgradeRequired: true,
			};
			mockGate.mockResolvedValue(gateResult);

			const result = await client.gate("org-123", "notices", 1);

			expect(result).toEqual(gateResult);
		});

		it("returns allowed=true (fail-open) when AUTH_SERVICE binding is not available (undefined)", async () => {
			const clientNoService = new UsageRightsClient(envNoService);
			const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

			const result = await clientNoService.gate("org-123", "notices", 1);

			expect(result).toEqual({ allowed: true });
			expect(mockGate).not.toHaveBeenCalled();
			expect(warnSpy).toHaveBeenCalledWith(
				"AUTH_SERVICE binding not available, allowing action (fail-open)",
			);
			warnSpy.mockRestore();
		});

		it("returns allowed=true (fail-open) when RPC throws an error", async () => {
			mockGate.mockRejectedValue(new Error("Network error"));

			const result = await client.gate("org-123", "notices", 1);

			expect(result).toEqual({ allowed: true });
		});

		it("calls gateUsageRights with correct arguments", async () => {
			mockGate.mockResolvedValue({ allowed: true });

			await client.gate("org-456", "reports", 3);

			expect(mockGate).toHaveBeenCalledTimes(1);
			expect(mockGate).toHaveBeenCalledWith("org-456", "reports", 3);
		});
	});

	describe("meter()", () => {
		it("uses default count of 1 when count is not provided", async () => {
			mockMeter.mockResolvedValue(undefined);
			await client.meter("org-123", "notices");
			expect(mockMeter).toHaveBeenCalledWith("org-123", "notices", 1);
		});

		it("calls meterUsageRights with correct arguments", async () => {
			mockMeter.mockResolvedValue(undefined);

			await client.meter("org-789", "alerts", 2);

			expect(mockMeter).toHaveBeenCalledTimes(1);
			expect(mockMeter).toHaveBeenCalledWith("org-789", "alerts", 2);
		});

		it("does nothing when AUTH_SERVICE binding is not available", async () => {
			const clientNoService = new UsageRightsClient(envNoService);

			await clientNoService.meter("org-123", "notices", 1);

			expect(mockMeter).not.toHaveBeenCalled();
		});

		it("logs error but does not throw when RPC fails", async () => {
			mockMeter.mockRejectedValue(new Error("Service unavailable"));

			await expect(
				client.meter("org-123", "notices", 1),
			).resolves.not.toThrow();
		});
	});

	describe("check()", () => {
		it("returns gate result when AUTH_SERVICE RPC returns allowed", async () => {
			const checkResult: GateResult = {
				allowed: true,
				metric: "notices",
				used: 10,
				limit: 100,
				remaining: 90,
			};
			mockCheck.mockResolvedValue(checkResult);

			const result = await client.check("org-123", "notices");

			expect(result).toEqual(checkResult);
			expect(mockCheck).toHaveBeenCalledWith("org-123", "notices");
		});

		it("returns allowed=false result when AUTH_SERVICE RPC returns not allowed", async () => {
			const checkResult: GateResult = {
				allowed: false,
				metric: "reports",
				used: 50,
				limit: 50,
				remaining: 0,
			};
			mockCheck.mockResolvedValue(checkResult);

			const result = await client.check("org-123", "reports");

			expect(result).toEqual(checkResult);
		});

		it("returns null when AUTH_SERVICE is not available", async () => {
			const clientNoService = new UsageRightsClient(envNoService);

			const result = await clientNoService.check("org-123", "notices");

			expect(result).toBeNull();
			expect(mockCheck).not.toHaveBeenCalled();
		});

		it("returns null when RPC throws", async () => {
			mockCheck.mockRejectedValue(new Error("Connection refused"));

			const result = await client.check("org-123", "notices");

			expect(result).toBeNull();
		});
	});

	describe("createUsageRightsClient", () => {
		it("should create a UsageRightsClient instance", () => {
			const created = createUsageRightsClient(mockEnv);

			expect(created).toBeInstanceOf(UsageRightsClient);
		});
	});
});

describe("buildGateDenialBody", () => {
	it("returns defaults when result has no optional fields", () => {
		const body = buildGateDenialBody("clients", { allowed: false });
		expect(body.code).toBe("USAGE_LIMIT_EXCEEDED");
		expect(body.error).toBe("usage_limit_exceeded");
		expect(body.upgradeRequired).toBe(true);
		expect(body.metric).toBe("clients");
		expect(body.remaining).toBe(0);
		expect(body.message).toContain("clients");
		expect(body.success).toBe(false);
	});

	it("uses provided code, error, metric, remaining, upgradeRequired", () => {
		const body = buildGateDenialBody("reports", {
			allowed: false,
			code: "SPEND_LIMIT_EXCEEDED",
			error: "spend_limit",
			metric: "reports",
			remaining: 5,
			upgradeRequired: false,
			used: 95,
			limit: 100,
			entitlementType: "stripe",
		});
		expect(body.code).toBe("SPEND_LIMIT_EXCEEDED");
		expect(body.error).toBe("spend_limit");
		expect(body.upgradeRequired).toBe(false);
		expect(body.metric).toBe("reports");
		expect(body.remaining).toBe(5);
		expect(body.used).toBe(95);
		expect(body.limit).toBe(100);
		expect(body.entitlementType).toBe("stripe");
	});

	it("returns archived message when code is ORGANIZATION_ARCHIVED", () => {
		const body = buildGateDenialBody("notices", {
			allowed: false,
			code: "ORGANIZATION_ARCHIVED",
		});
		expect(body.code).toBe("ORGANIZATION_ARCHIVED");
		expect(body.upgradeRequired).toBe(false);
		expect(body.message).toContain("archived");
		expect(body.message).toContain("Restore");
	});

	it("returns upgrade message for non-archived denial", () => {
		const body = buildGateDenialBody("watchlistQueries", {
			allowed: false,
		});
		expect(body.message).toContain("watchlist queries");
		expect(body.message).toContain("upgrade");
	});

	it("handles all known metric labels", () => {
		const metrics = [
			"reports",
			"notices",
			"alerts",
			"operations",
			"clients",
			"users",
			"watchlistQueries",
			"organizations",
		] as const;
		for (const m of metrics) {
			const body = buildGateDenialBody(m, { allowed: false });
			expect(body.metric).toBe(m);
			expect(typeof body.message).toBe("string");
		}
	});
});
