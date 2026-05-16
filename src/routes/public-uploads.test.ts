import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";

import type { Bindings } from "../types";
import { publicUploadsRouter } from "./public-uploads";
import { APIError } from "../middleware/error";

describe("publicUploadsRouter", () => {
	function buildApp() {
		const app = new Hono<{ Bindings: Bindings }>();
		app.onError((err, c) => {
			if (err instanceof APIError) {
				return c.json(
					{ message: err.message },
					err.statusCode as ContentfulStatusCode,
				);
			}
			throw err;
		});
		app.route("/", publicUploadsRouter);
		return app;
	}

	let cache: Map<string, string>;
	let kv: KVNamespace;

	beforeEach(() => {
		vi.clearAllMocks();
		cache = new Map();
		kv = {
			get: async (key: string) => cache.get(key) ?? null,
			put: async (key: string, value: string) => {
				cache.set(key, value);
			},
			delete: async (key: string) => {
				cache.delete(key);
			},
		} as unknown as KVNamespace;
	});

	function bindings(overrides: Partial<Bindings> = {}): Bindings {
		return {
			CACHE: kv,
			R2_BUCKET: {} as R2Bucket,
			...overrides,
		} as Bindings;
	}

	it("400 when token missing in KV", async () => {
		const app = buildApp();
		const res = await app.request(
			"http://t/asset/nope",
			{
				method: "PUT",
				body: "x",
			},
			bindings(),
		);
		expect(res.status).toBe(400);
	});

	it("400 when token expired", async () => {
		await kv.put(
			"training:upload:tok1",
			JSON.stringify({
				key: "k1",
				contentType: "text/plain",
				exp: Date.now() - 1000,
			}),
		);
		const app = buildApp();
		const res = await app.request(
			"http://t/asset/tok1",
			{
				method: "PUT",
				body: "hi",
			},
			bindings(),
		);
		expect(res.status).toBe(400);
	});

	it("PUT uploads then deletes token", async () => {
		await kv.put(
			"training:upload:tok2",
			JSON.stringify({
				key: "files/x.bin",
				contentType: "application/octet-stream",
				exp: Date.now() + 60_000,
			}),
		);
		const bucket = {
			put: vi
				.fn()
				.mockResolvedValue({ key: "files/x.bin", size: 3, etag: "e" }),
		} as unknown as R2Bucket;
		const app = buildApp();
		const res = await app.request(
			"http://t/asset/tok2",
			{
				method: "PUT",
				body: new Uint8Array([1, 2, 3]),
			},
			bindings({ R2_BUCKET: bucket }),
		);
		expect(res.status).toBe(200);
		const payload = (await res.json()) as { key: string };
		expect(payload.key).toBe("files/x.bin");
		expect(bucket.put).toHaveBeenCalled();
		expect(await kv.get("training:upload:tok2")).toBeNull();
	});
});
