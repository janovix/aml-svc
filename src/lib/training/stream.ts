/**
 * Cloudflare Stream: direct creator upload + signed playback tokens (cached in KV).
 */

import * as jose from "jose";

import type { Bindings } from "../../types";

export interface StreamDirectUploadResult {
	uploadURL: string;
	uid: string;
}

export async function createStreamDirectUpload(
	env: Bindings,
	options?: { maxDurationSeconds?: number },
): Promise<StreamDirectUploadResult> {
	const accountId = env.CF_ACCOUNT_ID;
	const token = env.CLOUDFLARE_STREAM_API_TOKEN;
	if (!accountId || !token) {
		throw new Error(
			"Stream is not configured (CF_ACCOUNT_ID / CLOUDFLARE_STREAM_API_TOKEN)",
		);
	}

	const res = await fetch(
		`https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/direct_upload`,
		{
			method: "POST",
			headers: {
				Authorization: `Bearer ${token}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				maxDurationSeconds: options?.maxDurationSeconds ?? 3600,
				requireSignedURLs: true,
			}),
		},
	);

	const json = (await res.json()) as {
		success?: boolean;
		result?: { uploadURL: string; uid: string };
		errors?: { message: string }[];
	};

	if (
		!res.ok ||
		!json.success ||
		!json.result?.uploadURL ||
		!json.result?.uid
	) {
		const msg =
			json.errors?.map((e) => e.message).join("; ") ||
			res.statusText ||
			"Stream direct_upload failed";
		throw new Error(msg);
	}

	return { uploadURL: json.result.uploadURL, uid: json.result.uid };
}

/**
 * Sign a Stream playback token (RS256) using the base64 JWK returned by
 * Cloudflare's `POST /stream/keys` endpoint. Cached in KV for ~half TTL.
 *
 * @see https://developers.cloudflare.com/stream/viewing-videos/securing-your-stream/#option-2-using-a-signing-key-to-create-signed-tokens
 */
export async function getSignedStreamPlaybackToken(
	env: Bindings,
	uid: string,
	ttlSeconds: number = 3600,
): Promise<string> {
	const cacheKey = `stream:playback:${uid}`;
	const halfTtl = Math.max(60, Math.floor(ttlSeconds / 2));

	if (env.CACHE) {
		const cached = await env.CACHE.get(cacheKey);
		if (cached) return cached;
	}

	const jwkRaw = env.STREAM_SIGNING_KEY_JWK;
	if (!jwkRaw) {
		throw new Error("Stream signing not configured (STREAM_SIGNING_KEY_JWK)");
	}

	let jwk: jose.JWK & { kid?: string };
	try {
		jwk = JSON.parse(atob(jwkRaw)) as jose.JWK & { kid?: string };
	} catch (err) {
		throw new Error(
			`STREAM_SIGNING_KEY_JWK is not a base64-encoded JSON JWK: ${(err as Error).message}`,
		);
	}

	const kid = jwk.kid;
	if (!kid) {
		throw new Error("STREAM_SIGNING_KEY_JWK is missing `kid`");
	}

	const privateKey = await jose.importJWK(jwk, "RS256");

	const now = Math.floor(Date.now() / 1000);
	const token = await new jose.SignJWT({ sub: uid, kid, exp: now + ttlSeconds })
		.setProtectedHeader({ alg: "RS256", kid })
		.sign(privateKey);

	if (env.CACHE) {
		await env.CACHE.put(cacheKey, token, { expirationTtl: halfTtl });
	}

	return token;
}

export function streamIframePlayerUrl(
	customerCode: string,
	token: string,
): string {
	const code = customerCode.replace(/^customer-/, "");
	return `https://customer-${code}.cloudflarestream.com/${token}/iframe`;
}
