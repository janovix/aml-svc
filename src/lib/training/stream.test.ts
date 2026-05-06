import { describe, expect, it, vi } from "vitest";

import * as jose from "jose";

import type { Bindings } from "../../types";
import {
	createStreamDirectUpload,
	getSignedStreamPlaybackToken,
	streamIframePlayerUrl,
} from "./stream";

describe("streamIframePlayerUrl", () => {
	it("puts token in the path", () => {
		expect(streamIframePlayerUrl("customer-abc", "eyJhbGc...")).toBe(
			"https://customer-abc.cloudflarestream.com/eyJhbGc.../iframe",
		);
	});

	it("strips customer- prefix from customer code", () => {
		expect(streamIframePlayerUrl("customer-xyz", "token123")).toBe(
			"https://customer-xyz.cloudflarestream.com/token123/iframe",
		);
	});

	it("passes through codes without prefix", () => {
		expect(streamIframePlayerUrl("xyz", "token456")).toBe(
			"https://customer-xyz.cloudflarestream.com/token456/iframe",
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
			STREAM_SIGNING_KEY_JWK: btoa(
				JSON.stringify({ kid: "test-kid", kty: "RSA", use: "sig" }),
			),
		} as unknown as Bindings;

		await expect(
			getSignedStreamPlaybackToken(env, "stream-uid", 3600),
		).resolves.toBe("cached-jwt");
		expect(get).toHaveBeenCalledWith("stream:playback:stream-uid");
	});

	it("throws when JWK is missing", async () => {
		const get = vi.fn().mockResolvedValue(null);
		const env = {
			CACHE: { get, put: vi.fn() },
		} as unknown as Bindings;

		await expect(
			getSignedStreamPlaybackToken(env, "uid", 3600),
		).rejects.toThrow(/STREAM_SIGNING_KEY_JWK/);
	});

	it("throws when JWK is not base64-encoded JSON", async () => {
		const get = vi.fn().mockResolvedValue(null);
		const env = {
			CACHE: { get, put: vi.fn() },
			STREAM_SIGNING_KEY_JWK: "not-base64!!!!!",
		} as unknown as Bindings;

		await expect(
			getSignedStreamPlaybackToken(env, "uid", 3600),
		).rejects.toThrow(/base64-encoded JSON JWK/);
	});

	it("throws when JWK is missing kid", async () => {
		const get = vi.fn().mockResolvedValue(null);
		const env = {
			CACHE: { get, put: vi.fn() },
			STREAM_SIGNING_KEY_JWK: btoa(JSON.stringify({ kty: "RSA", use: "sig" })),
		} as unknown as Bindings;

		await expect(
			getSignedStreamPlaybackToken(env, "uid", 3600),
		).rejects.toThrow(/missing `kid`/);
	});

	it("signs a token with JWK and caches it", async () => {
		const { privateKey, publicKey } = await jose.generateKeyPair("RS256", {
			extractable: true,
		});
		const jwkWithKid = {
			...(await jose.exportJWK(privateKey)),
			kid: "test-key-id",
		};
		const jwkBase64 = btoa(JSON.stringify(jwkWithKid));

		const put = vi.fn();
		const get = vi.fn().mockResolvedValue(null);
		const env = {
			CACHE: { get, put },
			STREAM_SIGNING_KEY_JWK: jwkBase64,
		} as unknown as Bindings;

		const token = await getSignedStreamPlaybackToken(env, "video-123", 3600);

		const decoded = await jose.jwtVerify(token, publicKey);

		expect(decoded.payload.sub).toBe("video-123");
		expect(decoded.payload.kid).toBe("test-key-id");
		expect(decoded.payload.exp).toBeDefined();
		expect(decoded.protectedHeader.alg).toBe("RS256");
		expect(decoded.protectedHeader.kid).toBe("test-key-id");

		expect(put).toHaveBeenCalled();
		const [, tokenStored] = put.mock.calls[0];
		expect(tokenStored).toBe(token);
	});
});
