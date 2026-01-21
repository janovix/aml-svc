import { SELF } from "cloudflare:test";
import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { generateKeyPair, exportJWK, SignJWT, type JSONWebKeySet } from "jose";
import { clearJWKSCache } from "../../src/middleware/auth";

// Generate a test key pair for signing/verifying JWTs
async function generateTestKeyPair() {
	return await generateKeyPair("ES256", { extractable: true });
}

// Convert public key to JWK for JWKS response
async function publicKeyToJWK(
	publicKey: Awaited<ReturnType<typeof generateKeyPair>>["publicKey"],
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
	privateKey: Awaited<ReturnType<typeof generateKeyPair>>["privateKey"],
	payload: Record<string, unknown>,
) {
	const builder = new SignJWT(payload)
		.setProtectedHeader({ alg: "ES256", kid: "test-key-id" })
		.setIssuedAt()
		.setExpirationTime("1h")
		.setSubject(payload.sub as string);

	return builder.sign(privateKey);
}

describe("Imports API", () => {
	let testKeyPair: Awaited<ReturnType<typeof generateTestKeyPair>>;
	let testJWKS: JSONWebKeySet;
	let testToken: string;
	let fetchMock: ReturnType<typeof vi.fn>;
	const testOrgId = "imports-test-org";

	beforeEach(async () => {
		// Generate fresh key pair for each test
		testKeyPair = await generateTestKeyPair();
		const publicJWK = await publicKeyToJWK(testKeyPair.publicKey);
		testJWKS = { keys: [publicJWK] };

		// Create a test JWT token
		testToken = await createTestJWT(testKeyPair.privateKey, {
			sub: "test-user-id",
			email: "test@example.com",
			organizationId: testOrgId,
		});

		// Clear JWKS cache before each test
		clearJWKSCache();

		// Mock fetch for JWKS endpoint
		fetchMock = vi.fn().mockImplementation(async (url: string | Request) => {
			const urlString = typeof url === "string" ? url : url.url;
			if (urlString.includes("/api/auth/jwks")) {
				return new Response(JSON.stringify(testJWKS), {
					status: 200,
					headers: { "Content-Type": "application/json" },
				});
			}
			// Fallback to original fetch for other requests
			return fetch(url);
		});

		vi.stubGlobal("fetch", fetchMock);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		clearJWKSCache();
	});

	describe("GET /api/v1/imports/templates/:entityType (Public)", () => {
		it("downloads CLIENT template without authentication", async () => {
			const res = await SELF.fetch(
				"http://local.test/api/v1/imports/templates/CLIENT",
			);

			expect(res.status).toBe(200);
			expect(res.headers.get("Content-Type")).toBe("text/csv; charset=utf-8");
			expect(res.headers.get("Content-Disposition")).toBe(
				'attachment; filename="clients_template.csv"',
			);

			const body = await res.text();
			expect(body).toContain("person_type");
			expect(body).toContain("rfc");
			expect(body).toContain("first_name");
			expect(body).toContain("last_name");
		});

		it("downloads TRANSACTION template without authentication", async () => {
			const res = await SELF.fetch(
				"http://local.test/api/v1/imports/templates/TRANSACTION",
			);

			expect(res.status).toBe(200);
			expect(res.headers.get("Content-Type")).toBe("text/csv; charset=utf-8");
			expect(res.headers.get("Content-Disposition")).toBe(
				'attachment; filename="transactions_template.csv"',
			);

			const body = await res.text();
			expect(body).toContain("client_rfc");
			expect(body).toContain("operation_date");
			expect(body).toContain("operation_type");
			expect(body).toContain("amount");
		});

		it("is case-insensitive for entity type", async () => {
			const lowercase = await SELF.fetch(
				"http://local.test/api/v1/imports/templates/client",
			);
			const uppercase = await SELF.fetch(
				"http://local.test/api/v1/imports/templates/CLIENT",
			);
			const mixed = await SELF.fetch(
				"http://local.test/api/v1/imports/templates/Client",
			);

			expect(lowercase.status).toBe(200);
			expect(uppercase.status).toBe(200);
			expect(mixed.status).toBe(200);
		});

		it("returns 400 for invalid entity type", async () => {
			const res = await SELF.fetch(
				"http://local.test/api/v1/imports/templates/INVALID",
			);

			expect(res.status).toBe(400);
		});
	});

	describe("GET /api/v1/imports (Authenticated)", () => {
		it("returns 401 without authentication", async () => {
			const res = await SELF.fetch("http://local.test/api/v1/imports");

			expect(res.status).toBe(401);
		});

		it("returns 200 with valid authentication", async () => {
			const res = await SELF.fetch("http://local.test/api/v1/imports", {
				headers: {
					Authorization: `Bearer ${testToken}`,
				},
			});

			expect(res.status).toBe(200);
			const body = (await res.json()) as {
				data: unknown[];
				pagination: { page: number; limit: number; total: number };
			};
			expect(body).toHaveProperty("data");
			expect(body).toHaveProperty("pagination");
			expect(body.pagination).toHaveProperty("total");
			expect(Array.isArray(body.data)).toBe(true);
		});
	});

	describe("POST /api/v1/imports (Authenticated - File Upload)", () => {
		it("returns 401 without authentication", async () => {
			const formData = new FormData();
			formData.append(
				"file",
				new Blob(["test content"], { type: "text/csv" }),
				"test.csv",
			);
			formData.append("entityType", "CLIENT");

			const res = await SELF.fetch("http://local.test/api/v1/imports", {
				method: "POST",
				body: formData,
			});

			expect(res.status).toBe(401);
		});

		it("returns 400 when file is missing", async () => {
			const formData = new FormData();
			formData.append("entityType", "CLIENT");

			const res = await SELF.fetch("http://local.test/api/v1/imports", {
				method: "POST",
				headers: {
					Authorization: `Bearer ${testToken}`,
				},
				body: formData,
			});

			expect(res.status).toBe(400);
		});

		it("returns 400 when entityType is missing", async () => {
			const formData = new FormData();
			formData.append(
				"file",
				new Blob(["test content"], { type: "text/csv" }),
				"test.csv",
			);

			const res = await SELF.fetch("http://local.test/api/v1/imports", {
				method: "POST",
				headers: {
					Authorization: `Bearer ${testToken}`,
				},
				body: formData,
			});

			expect(res.status).toBe(400);
		});

		it("returns 400 when entityType is invalid", async () => {
			const formData = new FormData();
			formData.append(
				"file",
				new Blob(["test content"], { type: "text/csv" }),
				"test.csv",
			);
			formData.append("entityType", "INVALID");

			const res = await SELF.fetch("http://local.test/api/v1/imports", {
				method: "POST",
				headers: {
					Authorization: `Bearer ${testToken}`,
				},
				body: formData,
			});

			expect(res.status).toBe(400);
		});
	});

	describe("GET /api/v1/imports/:id (Authenticated)", () => {
		it("returns 401 without authentication", async () => {
			const res = await SELF.fetch(
				"http://local.test/api/v1/imports/IMP123456789",
			);

			expect(res.status).toBe(401);
		});

		it("returns 404 for non-existent import", async () => {
			const res = await SELF.fetch(
				"http://local.test/api/v1/imports/IMP123456789",
				{
					headers: {
						Authorization: `Bearer ${testToken}`,
					},
				},
			);

			expect(res.status).toBe(404);
		});
	});
});
