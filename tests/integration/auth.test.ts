import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Hono } from "hono";
import {
	generateKeyPair,
	exportJWK,
	SignJWT,
	type JSONWebKeySet,
	type CryptoKey,
} from "jose";

import {
	authMiddleware,
	clearJWKSCache,
	type AuthBindings,
	type AuthVariables,
} from "../../src/middleware/auth";

type KeyPairResult = Awaited<ReturnType<typeof generateKeyPair>>;

// Generate a test key pair for signing/verifying JWTs
async function generateTestKeyPair(): Promise<KeyPairResult> {
	const keyPair = await generateKeyPair("ES256", {
		extractable: true,
	});
	return keyPair;
}

// Convert public key to JWK for JWKS response
async function publicKeyToJWK(
	publicKey: CryptoKey | KeyPairResult["publicKey"],
) {
	const jwk = await exportJWK(publicKey);
	return {
		...jwk,
		kid: "test-key-id",
		use: "sig",
		alg: "ES256",
	};
}

// Create a signed JWT for testing
async function createTestJWT(
	privateKey: CryptoKey | KeyPairResult["privateKey"],
	payload: Record<string, unknown>,
	options?: { expiresIn?: string },
) {
	const builder = new SignJWT(payload)
		.setProtectedHeader({ alg: "ES256", kid: "test-key-id" })
		.setIssuedAt()
		.setSubject(payload.sub as string);

	if (options?.expiresIn) {
		builder.setExpirationTime(options.expiresIn);
	} else {
		builder.setExpirationTime("1h");
	}

	return builder.sign(privateKey);
}

describe("Auth Middleware", () => {
	let testKeyPair: KeyPairResult;
	let testJWKS: JSONWebKeySet;
	let fetchMock: ReturnType<typeof vi.fn>;

	beforeEach(async () => {
		// Generate fresh key pair for each test
		testKeyPair = await generateTestKeyPair();
		const publicJWK = await publicKeyToJWK(testKeyPair.publicKey);
		testJWKS = { keys: [publicJWK] };

		// Clear JWKS cache before each test
		clearJWKSCache();

		// Mock fetch for JWKS endpoint
		fetchMock = vi.fn().mockImplementation(async (url: string) => {
			if (url.includes("/api/auth/jwks")) {
				return new Response(JSON.stringify(testJWKS), {
					status: 200,
					headers: { "Content-Type": "application/json" },
				});
			}
			return new Response("Not Found", { status: 404 });
		});

		vi.stubGlobal("fetch", fetchMock);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		clearJWKSCache();
	});

	function createTestApp(options?: { optional?: boolean }) {
		const app = new Hono<{
			Bindings: AuthBindings;
			Variables: AuthVariables;
		}>();

		app.use("*", authMiddleware(options));

		app.get("/protected", (c) => {
			const user = c.get("user");
			return c.json({ user });
		});

		return app;
	}

	// Type for error responses
	interface ErrorResponse {
		success: boolean;
		error: string;
		message: string;
	}

	// Type for user response
	interface UserResponse {
		user: {
			id: string;
			email?: string;
			name?: string;
		};
		authenticated?: boolean;
	}

	describe("Token Extraction", () => {
		it("should return 401 when no Authorization header is provided", async () => {
			const app = createTestApp();

			const res = await app.request("/protected", {}, {
				AUTH_SERVICE_URL: "https://auth-svc.test",
			} as AuthBindings);

			expect(res.status).toBe(401);
			const body = (await res.json()) as ErrorResponse;
			expect(body.error).toBe("Unauthorized");
			expect(body.message).toContain("Missing or invalid Authorization header");
		});

		it("should return 401 for malformed Authorization header", async () => {
			const app = createTestApp();

			const res = await app.request(
				"/protected",
				{
					headers: { Authorization: "InvalidFormat" },
				},
				{ AUTH_SERVICE_URL: "https://auth-svc.test" } as AuthBindings,
			);

			expect(res.status).toBe(401);
		});

		it("should return 401 for non-Bearer token type", async () => {
			const app = createTestApp();

			const res = await app.request(
				"/protected",
				{
					headers: { Authorization: "Basic dXNlcjpwYXNz" },
				},
				{ AUTH_SERVICE_URL: "https://auth-svc.test" } as AuthBindings,
			);

			expect(res.status).toBe(401);
		});
	});

	describe("Token Verification", () => {
		it("should allow requests with valid JWT", async () => {
			const app = createTestApp();
			const token = await createTestJWT(testKeyPair.privateKey, {
				sub: "user-123",
				email: "test@example.com",
				name: "Test User",
			});

			const res = await app.request(
				"/protected",
				{
					headers: { Authorization: `Bearer ${token}` },
				},
				{ AUTH_SERVICE_URL: "https://auth-svc.test" } as AuthBindings,
			);

			expect(res.status).toBe(200);
			const body = (await res.json()) as UserResponse;
			expect(body.user).toEqual({
				id: "user-123",
				email: "test@example.com",
				name: "Test User",
			});
		});

		it("should return 401 for expired JWT", async () => {
			const app = createTestApp();
			const token = await createTestJWT(
				testKeyPair.privateKey,
				{ sub: "user-123" },
				{ expiresIn: "-1h" }, // Already expired
			);

			const res = await app.request(
				"/protected",
				{
					headers: { Authorization: `Bearer ${token}` },
				},
				{ AUTH_SERVICE_URL: "https://auth-svc.test" } as AuthBindings,
			);

			expect(res.status).toBe(401);
			const body = (await res.json()) as ErrorResponse;
			expect(body.error).toBe("Token Expired");
		});

		it("should return 401 for JWT signed with wrong key", async () => {
			const app = createTestApp();

			// Generate a different key pair
			const wrongKeyPair = await generateTestKeyPair();
			const token = await createTestJWT(wrongKeyPair.privateKey, {
				sub: "user-123",
			});

			const res = await app.request(
				"/protected",
				{
					headers: { Authorization: `Bearer ${token}` },
				},
				{ AUTH_SERVICE_URL: "https://auth-svc.test" } as AuthBindings,
			);

			expect(res.status).toBe(401);
			const body = (await res.json()) as ErrorResponse;
			expect(body.error).toBe("Invalid Signature");
		});

		it("should return 401 for malformed JWT", async () => {
			const app = createTestApp();

			const res = await app.request(
				"/protected",
				{
					headers: { Authorization: "Bearer not.a.valid.jwt" },
				},
				{ AUTH_SERVICE_URL: "https://auth-svc.test" } as AuthBindings,
			);

			expect(res.status).toBe(401);
		});
	});

	describe("Optional Authentication", () => {
		it("should allow unauthenticated requests when optional=true", async () => {
			const app = createTestApp({ optional: true });

			app.get("/optional", (c) => {
				const user = c.get("user");
				return c.json({ authenticated: !!user, user: user ?? null });
			});

			const res = await app.request("/optional", {}, {
				AUTH_SERVICE_URL: "https://auth-svc.test",
			} as AuthBindings);

			expect(res.status).toBe(200);
			const body = (await res.json()) as UserResponse & { user: unknown };
			expect(body.authenticated).toBe(false);
			expect(body.user).toBeNull();
		});

		it("should still validate token when optional=true and token provided", async () => {
			const app = createTestApp({ optional: true });
			const token = await createTestJWT(testKeyPair.privateKey, {
				sub: "user-123",
			});

			const res = await app.request(
				"/protected",
				{
					headers: { Authorization: `Bearer ${token}` },
				},
				{ AUTH_SERVICE_URL: "https://auth-svc.test" } as AuthBindings,
			);

			expect(res.status).toBe(200);
			const body = (await res.json()) as UserResponse;
			expect(body.user.id).toBe("user-123");
		});
	});

	describe("JWKS Fetching", () => {
		it("should fetch JWKS from auth service", async () => {
			const app = createTestApp();
			const token = await createTestJWT(testKeyPair.privateKey, {
				sub: "user-123",
			});

			await app.request(
				"/protected",
				{
					headers: { Authorization: `Bearer ${token}` },
				},
				{ AUTH_SERVICE_URL: "https://auth-svc.test" } as AuthBindings,
			);

			expect(fetchMock).toHaveBeenCalledWith(
				"https://auth-svc.test/api/auth/jwks",
				expect.objectContaining({
					headers: { Accept: "application/json" },
				}),
			);
		});

		it("should cache JWKS in memory", async () => {
			const app = createTestApp();
			const token = await createTestJWT(testKeyPair.privateKey, {
				sub: "user-123",
			});

			// First request - should fetch JWKS
			await app.request(
				"/protected",
				{
					headers: { Authorization: `Bearer ${token}` },
				},
				{ AUTH_SERVICE_URL: "https://auth-svc.test" } as AuthBindings,
			);

			// Second request - should use cached JWKS
			await app.request(
				"/protected",
				{
					headers: { Authorization: `Bearer ${token}` },
				},
				{ AUTH_SERVICE_URL: "https://auth-svc.test" } as AuthBindings,
			);

			// JWKS should only be fetched once due to caching
			expect(fetchMock).toHaveBeenCalledTimes(1);
		});

		it("should return 503 when JWKS fetch fails", async () => {
			fetchMock.mockImplementation(async () => {
				return new Response("Service Unavailable", { status: 503 });
			});

			const app = createTestApp();
			const token = await createTestJWT(testKeyPair.privateKey, {
				sub: "user-123",
			});

			const res = await app.request(
				"/protected",
				{
					headers: { Authorization: `Bearer ${token}` },
				},
				{ AUTH_SERVICE_URL: "https://auth-svc.test" } as AuthBindings,
			);

			expect(res.status).toBe(503);
			const body = (await res.json()) as ErrorResponse;
			expect(body.error).toBe("Service Unavailable");
		});
	});

	describe("Configuration", () => {
		it("should return 500 when AUTH_SERVICE_URL is not configured", async () => {
			const app = createTestApp();
			const token = await createTestJWT(testKeyPair.privateKey, {
				sub: "user-123",
			});

			const res = await app.request(
				"/protected",
				{
					headers: { Authorization: `Bearer ${token}` },
				},
				{} as AuthBindings, // No AUTH_SERVICE_URL
			);

			expect(res.status).toBe(500);
			const body = (await res.json()) as ErrorResponse;
			expect(body.error).toBe("Configuration Error");
		});
	});
});
