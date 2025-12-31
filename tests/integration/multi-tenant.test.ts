import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Hono } from "hono";
import { generateKeyPair, exportJWK, SignJWT, type JSONWebKeySet } from "jose";
import {
	authMiddleware,
	clearJWKSCache,
	type AuthBindings,
	type AuthVariables,
} from "../../src/middleware/auth";

type KeyPairResult = Awaited<ReturnType<typeof generateKeyPair>>;

async function generateTestKeyPair(): Promise<KeyPairResult> {
	const keyPair = await generateKeyPair("ES256", {
		extractable: true,
	});
	return keyPair;
}

async function publicKeyToJWK(publicKey: KeyPairResult["publicKey"]) {
	const jwk = await exportJWK(publicKey);
	return {
		...jwk,
		kid: "test-key-id",
		use: "sig",
		alg: "ES256",
	};
}

async function createTestJWT(
	privateKey: KeyPairResult["privateKey"],
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

describe("Multi-Tenant Security", () => {
	let keyPair: KeyPairResult;
	let jwks: JSONWebKeySet;
	let fetchMock: ReturnType<typeof vi.fn>;

	beforeEach(async () => {
		clearJWKSCache();

		keyPair = await generateTestKeyPair();
		const publicJWK = await publicKeyToJWK(keyPair.publicKey);
		jwks = { keys: [publicJWK] };

		// Mock fetch for JWKS endpoint
		fetchMock = vi.fn().mockImplementation(async (url: string) => {
			if (url.includes("/api/auth/jwks")) {
				return new Response(JSON.stringify(jwks), {
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

	function createTestApp(options?: {
		optional?: boolean;
		requireOrganization?: boolean;
	}) {
		const app = new Hono<{
			Bindings: AuthBindings;
			Variables: AuthVariables;
		}>();

		app.use("*", authMiddleware(options));

		app.get("/protected", (c) => {
			const user = c.get("user");
			const org = c.get("organization");
			return c.json({ user, organization: org });
		});

		return app;
	}

	// Type for error response
	interface ErrorResponse {
		success: boolean;
		error: string;
		message: string;
	}

	// Type for success response
	interface SuccessResponse {
		user: {
			id: string;
			email?: string;
			name?: string;
		};
		organization: {
			id: string;
		} | null;
	}

	describe("Organization Requirement", () => {
		it("should reject requests without organizationId in JWT", async () => {
			const app = createTestApp({ requireOrganization: true });

			const token = await createTestJWT(keyPair.privateKey, {
				sub: "user-123",
				email: "test@example.com",
				name: "Test User",
				// No organizationId
			});

			const res = await app.request(
				"/protected",
				{
					headers: { Authorization: `Bearer ${token}` },
				},
				{ AUTH_SERVICE_URL: "https://auth-svc.test" } as AuthBindings,
			);

			expect(res.status).toBe(403);
			const body = (await res.json()) as ErrorResponse;
			expect(body.error).toBe("Organization Required");
		});

		it("should accept requests with organizationId in JWT", async () => {
			const app = createTestApp({ requireOrganization: true });

			const token = await createTestJWT(keyPair.privateKey, {
				sub: "user-123",
				email: "test@example.com",
				name: "Test User",
				organizationId: "org-456",
			});

			const res = await app.request(
				"/protected",
				{
					headers: { Authorization: `Bearer ${token}` },
				},
				{ AUTH_SERVICE_URL: "https://auth-svc.test" } as AuthBindings,
			);

			expect(res.status).toBe(200);
			const body = (await res.json()) as SuccessResponse;
			expect(body.organization?.id).toBe("org-456");
		});

		it("should allow requests without organization when requireOrganization is false", async () => {
			const app = createTestApp({ requireOrganization: false });

			const token = await createTestJWT(keyPair.privateKey, {
				sub: "user-123",
				email: "test@example.com",
				name: "Test User",
				// No organizationId
			});

			const res = await app.request(
				"/protected",
				{
					headers: { Authorization: `Bearer ${token}` },
				},
				{ AUTH_SERVICE_URL: "https://auth-svc.test" } as AuthBindings,
			);

			expect(res.status).toBe(200);
			const body = (await res.json()) as SuccessResponse;
			expect(body.organization).toBeNull();
		});
	});

	describe("OrganizationId Extraction", () => {
		it("should extract organizationId from JWT payload", async () => {
			const orgId = "org-test-789";
			const app = createTestApp({ requireOrganization: true });

			const token = await createTestJWT(keyPair.privateKey, {
				sub: "user-123",
				email: "test@example.com",
				name: "Test User",
				organizationId: orgId,
			});

			const res = await app.request(
				"/protected",
				{
					headers: { Authorization: `Bearer ${token}` },
				},
				{ AUTH_SERVICE_URL: "https://auth-svc.test" } as AuthBindings,
			);

			expect(res.status).toBe(200);
			const body = (await res.json()) as SuccessResponse;
			expect(body.organization?.id).toBe(orgId);
		});

		it("should handle null organizationId as missing", async () => {
			const app = createTestApp({ requireOrganization: true });

			const token = await createTestJWT(keyPair.privateKey, {
				sub: "user-123",
				email: "test@example.com",
				name: "Test User",
				organizationId: null, // explicitly null
			});

			const res = await app.request(
				"/protected",
				{
					headers: { Authorization: `Bearer ${token}` },
				},
				{ AUTH_SERVICE_URL: "https://auth-svc.test" } as AuthBindings,
			);

			expect(res.status).toBe(403);
			const body = (await res.json()) as ErrorResponse;
			expect(body.error).toBe("Organization Required");
		});

		it("should handle undefined organizationId as missing", async () => {
			const app = createTestApp({ requireOrganization: true });

			const token = await createTestJWT(keyPair.privateKey, {
				sub: "user-123",
				email: "test@example.com",
				name: "Test User",
				// organizationId not present at all
			});

			const res = await app.request(
				"/protected",
				{
					headers: { Authorization: `Bearer ${token}` },
				},
				{ AUTH_SERVICE_URL: "https://auth-svc.test" } as AuthBindings,
			);

			expect(res.status).toBe(403);
			const body = (await res.json()) as ErrorResponse;
			expect(body.error).toBe("Organization Required");
		});
	});

	describe("Cross-Organization Isolation", () => {
		it("should extract correct organization for each user", async () => {
			const app = createTestApp({ requireOrganization: true });

			// User from organization A
			const tokenOrgA = await createTestJWT(keyPair.privateKey, {
				sub: "user-123",
				email: "test@example.com",
				name: "Test User",
				organizationId: "org-A",
			});

			// User from organization B
			const tokenOrgB = await createTestJWT(keyPair.privateKey, {
				sub: "user-456",
				email: "other@example.com",
				name: "Other User",
				organizationId: "org-B",
			});

			const responseA = await app.request(
				"/protected",
				{
					headers: { Authorization: `Bearer ${tokenOrgA}` },
				},
				{ AUTH_SERVICE_URL: "https://auth-svc.test" } as AuthBindings,
			);

			const responseB = await app.request(
				"/protected",
				{
					headers: { Authorization: `Bearer ${tokenOrgB}` },
				},
				{ AUTH_SERVICE_URL: "https://auth-svc.test" } as AuthBindings,
			);

			expect(responseA.status).toBe(200);
			expect(responseB.status).toBe(200);

			const bodyA = (await responseA.json()) as SuccessResponse;
			const bodyB = (await responseB.json()) as SuccessResponse;

			// Verify each user sees only their organization
			expect(bodyA.organization?.id).toBe("org-A");
			expect(bodyB.organization?.id).toBe("org-B");
			expect(bodyA.organization?.id).not.toBe(bodyB.organization?.id);
		});

		it("should include user info along with organization", async () => {
			const app = createTestApp({ requireOrganization: true });

			const token = await createTestJWT(keyPair.privateKey, {
				sub: "user-test-123",
				email: "test@example.com",
				name: "Test User",
				organizationId: "org-test",
			});

			const res = await app.request(
				"/protected",
				{
					headers: { Authorization: `Bearer ${token}` },
				},
				{ AUTH_SERVICE_URL: "https://auth-svc.test" } as AuthBindings,
			);

			expect(res.status).toBe(200);
			const body = (await res.json()) as SuccessResponse;

			expect(body.user.id).toBe("user-test-123");
			expect(body.user.email).toBe("test@example.com");
			expect(body.user.name).toBe("Test User");
			expect(body.organization?.id).toBe("org-test");
		});
	});
});
