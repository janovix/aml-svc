import { describe, it, expect } from "vitest";
import { generatePresignedToken, verifyPresignedToken } from "./presigned-url";

describe("Presigned URL", () => {
	const secret = "test-secret-key-for-signing";
	const fileKey = "client-documents/org_123/file.pdf";
	const organizationId = "org_123";

	describe("generatePresignedToken", () => {
		it("should generate a valid token", async () => {
			const result = await generatePresignedToken(
				fileKey,
				organizationId,
				secret,
				60,
			);

			expect(result.token).toBeDefined();
			expect(result.expires).toBeGreaterThan(Date.now() / 1000);
			expect(typeof result.token).toBe("string");
			expect(result.token).toContain(".");
		});

		it("should generate different tokens for different files", async () => {
			const token1 = await generatePresignedToken(
				fileKey,
				organizationId,
				secret,
				60,
			);
			const token2 = await generatePresignedToken(
				"different-file.pdf",
				organizationId,
				secret,
				60,
			);

			expect(token1.token).not.toBe(token2.token);
		});

		it("should generate different tokens for different organizations", async () => {
			const token1 = await generatePresignedToken(
				fileKey,
				"org_123",
				secret,
				60,
			);
			const token2 = await generatePresignedToken(
				fileKey,
				"org_456",
				secret,
				60,
			);

			expect(token1.token).not.toBe(token2.token);
		});

		it("should respect custom expiration time", async () => {
			const expiresInMinutes = 30;
			const result = await generatePresignedToken(
				fileKey,
				organizationId,
				secret,
				expiresInMinutes,
			);

			const expectedExpires =
				Math.floor(Date.now() / 1000) + expiresInMinutes * 60;
			// Allow 2 second tolerance for test execution time
			expect(result.expires).toBeGreaterThanOrEqual(expectedExpires - 2);
			expect(result.expires).toBeLessThanOrEqual(expectedExpires + 2);
		});
	});

	describe("verifyPresignedToken", () => {
		it("should verify a valid token", async () => {
			const { token } = await generatePresignedToken(
				fileKey,
				organizationId,
				secret,
				60,
			);

			const payload = await verifyPresignedToken(token, secret);

			expect(payload).toBeDefined();
			expect(payload?.key).toBe(fileKey);
			expect(payload?.org).toBe(organizationId);
			expect(payload?.exp).toBeGreaterThan(Date.now() / 1000);
		});

		it("should reject token with invalid signature", async () => {
			const { token } = await generatePresignedToken(
				fileKey,
				organizationId,
				secret,
				60,
			);

			// Tamper with the token
			const [payload, signature] = token.split(".");
			const tamperedToken = `${payload}.${signature}X`;

			const result = await verifyPresignedToken(tamperedToken, secret);

			expect(result).toBeNull();
		});

		it("should reject token signed with different secret", async () => {
			const { token } = await generatePresignedToken(
				fileKey,
				organizationId,
				secret,
				60,
			);

			const result = await verifyPresignedToken(token, "different-secret");

			expect(result).toBeNull();
		});

		it("should reject expired token", async () => {
			// Create a token that's already expired by manually crafting the payload
			const expiredPayload = JSON.stringify({
				key: fileKey,
				org: organizationId,
				exp: Math.floor(Date.now() / 1000) - 60, // Expired 60 seconds ago
			});

			// Sign the expired payload
			const encoder = new TextEncoder();
			const data = encoder.encode(expiredPayload);
			const keyData = encoder.encode(secret);

			const cryptoKey = await crypto.subtle.importKey(
				"raw",
				keyData,
				{ name: "HMAC", hash: "SHA-256" },
				false,
				["sign"],
			);

			const signature = await crypto.subtle.sign("HMAC", cryptoKey, data);
			const signatureArray = new Uint8Array(signature);
			const signatureBase64 = btoa(String.fromCharCode(...signatureArray))
				.replace(/\+/g, "-")
				.replace(/\//g, "_")
				.replace(/=/g, "");

			const payloadBase64 = btoa(expiredPayload)
				.replace(/\+/g, "-")
				.replace(/\//g, "_")
				.replace(/=/g, "");

			const expiredToken = `${payloadBase64}.${signatureBase64}`;

			const result = await verifyPresignedToken(expiredToken, secret);

			expect(result).toBeNull();
		});

		it("should reject malformed token", async () => {
			const result1 = await verifyPresignedToken("invalid", secret);
			expect(result1).toBeNull();

			const result2 = await verifyPresignedToken(
				"invalid.token.format",
				secret,
			);
			expect(result2).toBeNull();

			const result3 = await verifyPresignedToken("", secret);
			expect(result3).toBeNull();
		});

		it("should handle token with tampered payload", async () => {
			const { token } = await generatePresignedToken(
				fileKey,
				organizationId,
				secret,
				60,
			);

			// Tamper with payload
			const [, signature] = token.split(".");
			const tamperedPayload = btoa(
				JSON.stringify({
					key: "different-file.pdf",
					org: organizationId,
					exp: Math.floor(Date.now() / 1000) + 3600,
				}),
			)
				.replace(/\+/g, "-")
				.replace(/\//g, "_")
				.replace(/=/g, "");
			const tamperedToken = `${tamperedPayload}.${signature}`;

			const result = await verifyPresignedToken(tamperedToken, secret);

			expect(result).toBeNull();
		});
	});

	describe("Token format", () => {
		it("should generate URL-safe base64 tokens", async () => {
			const { token } = await generatePresignedToken(
				fileKey,
				organizationId,
				secret,
				60,
			);

			// URL-safe base64 should not contain +, /, or =
			expect(token).not.toContain("+");
			expect(token).not.toContain("/");
			expect(token).not.toContain("=");
		});

		it("should be decodable", async () => {
			const { token } = await generatePresignedToken(
				fileKey,
				organizationId,
				secret,
				60,
			);

			const [payloadBase64] = token.split(".");
			const payload = atob(payloadBase64.replace(/-/g, "+").replace(/_/g, "/"));
			const data = JSON.parse(payload);

			expect(data.key).toBe(fileKey);
			expect(data.org).toBe(organizationId);
			expect(data.exp).toBeGreaterThan(Date.now() / 1000);
		});
	});
});
