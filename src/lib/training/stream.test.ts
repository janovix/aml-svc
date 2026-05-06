import { describe, expect, it, vi } from "vitest";

import type { Bindings } from "../../types";
import {
	createStreamDirectUpload,
	getSignedStreamPlaybackToken,
	streamIframePlayerUrl,
} from "./stream";

describe("streamIframePlayerUrl", () => {
	it("strips customer- prefix from customer code", () => {
		expect(streamIframePlayerUrl("customer-abc", "uid1", "tok%2F")).toBe(
			"https://customer-abc.cloudflarestream.com/uid1/iframe?token=tok%252F",
		);
	});

	it("passes through codes without prefix", () => {
		expect(streamIframePlayerUrl("xyz", "u", "t")).toBe(
			"https://customer-xyz.cloudflarestream.com/u/iframe?token=t",
		);
	});
});

describe("createStreamDirectUpload", () => {
	it("throws when Stream API credentials are missing", async () => {
		await expect(createStreamDirectUpload({} as Bindings)).rejects.toThrow(
			/CF_ACCOUNT_ID/,
		);
	});

	it("throws when Cloudflare returns an error body", async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: false,
			statusText: "Bad Request",
			json: async () => ({ success: false, errors: [{ message: "bad" }] }),
		});
		vi.stubGlobal("fetch", fetchMock);

		await expect(
			createStreamDirectUpload({
				CF_ACCOUNT_ID: "acct",
				CLOUDFLARE_STREAM_API_TOKEN: "tok",
			} as Bindings),
		).rejects.toThrow(/bad/);

		vi.unstubAllGlobals();
	});

	it("returns upload URL and uid on success", async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			statusText: "OK",
			json: async () => ({
				success: true,
				result: {
					uploadURL: "https://upload.example/upload",
					uid: "video-id",
				},
			}),
		});
		vi.stubGlobal("fetch", fetchMock);

		await expect(
			createStreamDirectUpload(
				{
					CF_ACCOUNT_ID: "acct",
					CLOUDFLARE_STREAM_API_TOKEN: "tok",
				} as Bindings,
				{ maxDurationSeconds: 120 },
			),
		).resolves.toEqual({
			uploadURL: "https://upload.example/upload",
			uid: "video-id",
		});

		expect(fetchMock).toHaveBeenCalled();
		const [, init] = fetchMock.mock.calls[0];
		expect(init?.method).toBe("POST");
		expect(JSON.parse(init?.body as string)).toMatchObject({
			maxDurationSeconds: 120,
			requireSignedURLs: true,
		});

		vi.unstubAllGlobals();
	});
});

describe("getSignedStreamPlaybackToken", () => {
	it("returns cached token when CACHE hits", async () => {
		const get = vi.fn().mockResolvedValue("cached-jwt");
		const env = {
			CACHE: { get, put: vi.fn() },
			STREAM_SIGNING_KEY_PRIVATE_PEM: "pem",
			STREAM_SIGNING_KEY_ID: "kid",
		} as unknown as Bindings;

		await expect(
			getSignedStreamPlaybackToken(env, "stream-uid", 3600),
		).resolves.toBe("cached-jwt");
		expect(get).toHaveBeenCalledWith("stream:playback:stream-uid");
	});

	it("throws when signing keys missing after cache miss", async () => {
		const get = vi.fn().mockResolvedValue(null);
		const env = {
			CACHE: { get, put: vi.fn() },
		} as unknown as Bindings;

		await expect(
			getSignedStreamPlaybackToken(env, "uid", 3600),
		).rejects.toThrow(/signing not configured/);
	});
});
