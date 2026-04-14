import { describe, expect, it, vi } from "vitest";
import { Hono } from "hono";
import { APIError, errorHandler } from "./error";

vi.mock("@sentry/cloudflare", () => ({ captureException: vi.fn() }));

describe("APIError", () => {
	it("stores statusCode, message, and details", () => {
		const err = new APIError(404, "Not found", { id: "1" });
		expect(err.statusCode).toBe(404);
		expect(err.message).toBe("Not found");
		expect(err.details).toEqual({ id: "1" });
		expect(err.name).toBe("APIError");
	});
});

describe("errorHandler", () => {
	it("returns JSON for APIError with status", async () => {
		const app = new Hono();
		app.get("/t", () => {
			throw new APIError(400, "Bad", { field: "x" });
		});
		app.onError(errorHandler);

		const res = await app.request("http://test/t");
		expect(res.status).toBe(400);
		const body = (await res.json()) as Record<string, unknown>;
		expect(body.error).toBe("APIError");
		expect(body.message).toBe("Bad");
		expect(body.details).toEqual({ field: "x" });
	});

	it("returns 500 for unknown errors", async () => {
		const app = new Hono();
		app.get("/t", () => {
			throw new Error("boom");
		});
		app.onError(errorHandler);

		const res = await app.request("http://test/t");
		expect(res.status).toBe(500);
		const body = (await res.json()) as { success: boolean; errors: unknown[] };
		expect(body.success).toBe(false);
		expect(body.errors[0]).toMatchObject({ code: 7000 });
	});
});
