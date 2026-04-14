import { describe, expect, it, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { requireActiveOrganization } from "./organization-active";
import type { Bindings } from "../types";
import type { AuthVariables } from "./auth";

function createApp(
	getOrganization: (id: string) => Promise<{ status?: string } | null>,
) {
	const app = new Hono<{ Bindings: Bindings; Variables: AuthVariables }>();
	app.use("*", async (c, next) => {
		c.set("user", { id: "u1" } as AuthVariables["user"]);
		c.set("organization", {
			id: "org1",
			name: "O",
			slug: "o",
			role: "owner",
		} as AuthVariables["organization"]);
		c.env = {
			...c.env,
			AUTH_SERVICE: { getOrganization } as Bindings["AUTH_SERVICE"],
		} as Bindings;
		await next();
	});
	app.use("*", requireActiveOrganization());
	app.post("/mutate", (c) => c.json({ ok: true }));
	app.get("/read", (c) => c.json({ ok: true }));
	return app;
}

describe("requireActiveOrganization", () => {
	beforeEach(() => {
		vi.spyOn(console, "error").mockImplementation(() => {});
	});

	it("allows GET without calling auth", async () => {
		const getOrganization = vi.fn();
		const app = createApp(getOrganization);
		const res = await app.request("http://test/read", { method: "GET" });
		expect(res.status).toBe(200);
		expect(getOrganization).not.toHaveBeenCalled();
	});

	it("allows mutating request when org id missing", async () => {
		const app = new Hono<{ Bindings: Bindings; Variables: AuthVariables }>();
		app.use("*", async (c, next) => {
			c.set("user", { id: "u1" } as AuthVariables["user"]);
			c.env = {
				AUTH_SERVICE: { getOrganization: vi.fn() },
			} as unknown as Bindings;
			await next();
		});
		app.use("*", requireActiveOrganization());
		app.post("/m", (c) => c.json({ ok: true }));

		const res = await app.request("http://test/m", { method: "POST" });
		expect(res.status).toBe(200);
	});

	it("blocks POST when org status is not active", async () => {
		const getOrganization = vi.fn().mockResolvedValue({ status: "archived" });
		const app = createApp(getOrganization);
		const res = await app.request("http://test/mutate", { method: "POST" });
		expect(res.status).toBe(403);
		const body = (await res.json()) as { code: string };
		expect(body.code).toBe("ORGANIZATION_ARCHIVED");
	});

	it("allows POST when org is active", async () => {
		const getOrganization = vi.fn().mockResolvedValue({ status: "active" });
		const app = createApp(getOrganization);
		const res = await app.request("http://test/mutate", { method: "POST" });
		expect(res.status).toBe(200);
	});

	it("fail-open when getOrganization throws", async () => {
		const getOrganization = vi.fn().mockRejectedValue(new Error("network"));
		const app = createApp(getOrganization);
		const res = await app.request("http://test/mutate", { method: "POST" });
		expect(res.status).toBe(200);
	});

	it("fail-open when AUTH_SERVICE binding missing", async () => {
		const app = new Hono<{ Bindings: Bindings; Variables: AuthVariables }>();
		app.use("*", async (c, next) => {
			c.set("user", { id: "u1" } as AuthVariables["user"]);
			c.set("organization", {
				id: "org1",
				name: "O",
				slug: "o",
				role: "owner",
			} as AuthVariables["organization"]);
			c.env = {} as Bindings;
			await next();
		});
		app.use("*", requireActiveOrganization());
		app.post("/m", (c) => c.json({ ok: true }));

		const res = await app.request("http://test/m", { method: "POST" });
		expect(res.status).toBe(200);
	});
});
