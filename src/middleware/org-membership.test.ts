import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";

import { requireOrgOwnerOrAdmin } from "./org-membership";
import { errorHandler } from "./error";
import type { Bindings } from "../types";
import type { AuthVariables } from "./auth";

describe("requireOrgOwnerOrAdmin", () => {
	const getMemberRole = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
	});

	function mountApp(
		env: Partial<Bindings>,
		params: Record<string, string> = { organizationId: "org-1" },
	) {
		const app = new Hono<{ Bindings: Bindings; Variables: AuthVariables }>();
		app.onError((err, c) => errorHandler(err, c));
		app.use("*", async (c, next) => {
			c.set("user", { id: "user-1" });
			await next();
		});
		app.get("/orgs/:organizationId/x", requireOrgOwnerOrAdmin(), (c) =>
			c.json({ ok: true }),
		);
		return app.request(
			`http://local.test/orgs/${params.organizationId ?? "org-1"}/x`,
			{},
			{
				AUTH_SERVICE: { getMemberRole },
				...env,
			} as unknown as Bindings,
		);
	}

	it("400 when organizationId param missing", async () => {
		const app = new Hono<{ Bindings: Bindings; Variables: AuthVariables }>();
		app.onError((err, c) => errorHandler(err, c));
		app.use("*", async (c, next) => {
			c.set("user", { id: "user-1" });
			await next();
		});
		app.get("/nope", requireOrgOwnerOrAdmin(), (c) => c.json({ ok: true }));
		const res = await app.request("http://local.test/nope", {}, {
			AUTH_SERVICE: { getMemberRole },
		} as unknown as Bindings);
		expect(res.status).toBe(400);
	});

	it("503 when AUTH_SERVICE missing getMemberRole", async () => {
		const res = await mountApp({
			AUTH_SERVICE: {} as Bindings["AUTH_SERVICE"],
		});
		expect(res.status).toBe(503);
	});

	it("403 when role is member", async () => {
		getMemberRole.mockResolvedValue("member");
		const res = await mountApp({});
		expect(res.status).toBe(403);
	});

	it("allows owner (case insensitive)", async () => {
		getMemberRole.mockResolvedValue("OWNER");
		const res = await mountApp({});
		expect(res.status).toBe(200);
	});

	it("uses CACHE when present", async () => {
		const get = vi.fn().mockResolvedValueOnce(null);
		const put = vi.fn().mockResolvedValue(undefined);
		getMemberRole.mockResolvedValue("admin");
		const res = await mountApp({
			CACHE: { get, put } as unknown as KVNamespace,
		});
		expect(res.status).toBe(200);
		expect(getMemberRole).toHaveBeenCalled();
		expect(put).toHaveBeenCalled();
	});

	it("returns cached role without calling RPC again", async () => {
		const get = vi.fn().mockResolvedValue("admin");
		getMemberRole.mockResolvedValue("owner");
		await mountApp({
			CACHE: { get, put: vi.fn() } as unknown as KVNamespace,
		});
		expect(get).toHaveBeenCalled();
		expect(getMemberRole).not.toHaveBeenCalled();
	});
});
