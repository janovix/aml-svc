import { describe, it, expect, vi } from "vitest";
import { Hono } from "hono";

vi.mock("../lib/usage-rights-client", () => {
	const gate = vi.fn();
	return {
		UsageRightsClient: vi.fn().mockImplementation(() => ({ gate })),
		__gate: gate,
	};
});

import { UsageRightsClient } from "../lib/usage-rights-client";
import { requireUsageRight } from "./usage-rights";
import type { Bindings } from "../types";
import type { AuthVariables } from "./auth";

describe("requireUsageRight", () => {
	function freshGate() {
		const g = vi.fn();
		vi.mocked(UsageRightsClient).mockImplementation(
			() =>
				({
					gate: g,
				}) as unknown as InstanceType<typeof UsageRightsClient>,
		);
		return g;
	}

	it("returns 409 when organization is missing", async () => {
		const app = new Hono<{ Bindings: Bindings; Variables: AuthVariables }>();
		app.use("*", requireUsageRight("notices"));
		app.get("/x", (c) => c.json({ ok: true }));

		const res = await app.request("/x", {}, {} as Bindings);
		expect(res.status).toBe(409);
	});

	it("returns 403 when gate denies", async () => {
		const gate = freshGate();
		gate.mockResolvedValue({
			allowed: false,
			error: "limit",
			code: "USAGE_LIMIT_EXCEEDED",
			metric: "notices",
			used: 10,
			limit: 10,
			remaining: 0,
			upgradeRequired: true,
		});

		const app = new Hono<{ Bindings: Bindings; Variables: AuthVariables }>();
		app.use("*", async (c, next) => {
			c.set("organization", { id: "o1" });
			await next();
		});
		app.use("*", requireUsageRight("notices"));
		app.get("/x", (c) => c.json({ ok: true }));

		const res = await app.request("/x", {}, {} as Bindings);
		expect(res.status).toBe(403);
		const body = (await res.json()) as { code: string };
		expect(body.code).toBe("USAGE_LIMIT_EXCEEDED");
	});

	it("passes through and sets usage headers when allowed", async () => {
		const gate = freshGate();
		gate.mockResolvedValue({
			allowed: true,
			metric: "notices",
			used: 3,
			limit: 100,
			remaining: 97,
			entitlementType: "plan",
			overageWarning: true,
			overageUnits: 2,
		});

		const app = new Hono<{ Bindings: Bindings; Variables: AuthVariables }>();
		app.use("*", async (c, next) => {
			c.set("organization", { id: "o1" });
			await next();
		});
		app.use("*", requireUsageRight("notices", 2));
		app.get("/x", (c) => c.json({ ok: true }));

		const res = await app.request("/x", {}, {} as Bindings);
		expect(res.status).toBe(200);
		expect(gate).toHaveBeenCalledWith("o1", "notices", 2);
		expect(res.headers.get("X-Usage-Used")).toBe("3");
		expect(res.headers.get("X-Usage-Limit")).toBe("100");
		expect(res.headers.get("X-Usage-Remaining")).toBe("97");
		expect(res.headers.get("X-Entitlement-Type")).toBe("plan");
		expect(res.headers.get("X-Usage-Overage-Warning")).toBe("1");
		expect(res.headers.get("X-Usage-Overage-Units")).toBe("2");
	});

	it("renders unlimited usage headers", async () => {
		const gate = freshGate();
		gate.mockResolvedValue({
			allowed: true,
			used: 5,
			limit: 0,
			remaining: -1,
		});

		const app = new Hono<{ Bindings: Bindings; Variables: AuthVariables }>();
		app.use("*", async (c, next) => {
			c.set("organization", { id: "o1" });
			await next();
		});
		app.use("*", requireUsageRight("operations"));
		app.get("/x", (c) => c.json({ ok: true }));

		const res = await app.request("/x", {}, {} as Bindings);
		expect(res.headers.get("X-Usage-Limit")).toBe("unlimited");
		expect(res.headers.get("X-Usage-Remaining")).toBe("unlimited");
	});

	it("maps ORGANIZATION_ARCHIVED denial copy", async () => {
		const gate = freshGate();
		gate.mockResolvedValue({
			allowed: false,
			code: "ORGANIZATION_ARCHIVED",
			metric: "notices",
		});

		const app = new Hono<{ Bindings: Bindings; Variables: AuthVariables }>();
		app.use("*", async (c, next) => {
			c.set("organization", { id: "o1" });
			await next();
		});
		app.use("*", requireUsageRight("notices"));
		app.get("/x", (c) => c.json({ ok: true }));

		const res = await app.request("/x", {}, {} as Bindings);
		const body = (await res.json()) as {
			upgradeRequired: boolean;
			message: string;
		};
		expect(body.upgradeRequired).toBe(false);
		expect(body.message).toContain("archived");
	});
});
