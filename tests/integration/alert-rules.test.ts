import { SELF, env } from "cloudflare:test";
import { describe, expect, it, beforeEach, vi, afterEach } from "vitest";
import { getPrismaClient } from "../../src/lib/prisma";
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

describe("Alert Rules API", () => {
	let testKeyPair: Awaited<ReturnType<typeof generateTestKeyPair>>;
	let testJWKS: JSONWebKeySet;
	let testToken: string;
	let fetchMock: ReturnType<typeof vi.fn>;

	beforeEach(async () => {
		// Generate fresh key pair for each test
		testKeyPair = await generateTestKeyPair();
		const publicJWK = await publicKeyToJWK(testKeyPair.publicKey);
		testJWKS = { keys: [publicJWK] };

		// Create a test JWT token
		testToken = await createTestJWT(testKeyPair.privateKey, {
			sub: "test-user-id",
			email: "test@example.com",
			organizationId: "test-org",
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

		// Clean up test data
		const prisma = getPrismaClient(env.DB);
		await prisma.alertRule.deleteMany({});
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		clearJWKSCache();
	});

	describe("GET /api/v1/alert-rules/active", () => {
		it("returns active alert rules for seekers (non-manual-only)", async () => {
			const prisma = getPrismaClient(env.DB);

			// Create test alert rules
			await prisma.alertRule.createMany({
				data: [
					{
						id: "2501",
						name: "Active Rule 1",
						description: "Test rule 1",
						active: true,
						severity: "HIGH",
						ruleType: "transaction_amount_uma",
						isManualOnly: false,
						activityCode: "VEH",
						metadata: '{"category": "test"}',
					},
					{
						id: "2502",
						name: "Active Rule 2",
						description: "Test rule 2",
						active: true,
						severity: "MEDIUM",
						ruleType: "frequent_transactions",
						isManualOnly: false,
						activityCode: "VEH",
						metadata: '{"category": "test"}',
					},
					{
						id: "2503",
						name: "Manual Only Rule",
						description: "Manual rule",
						active: true,
						severity: "LOW",
						ruleType: null,
						isManualOnly: true,
						activityCode: "VEH",
						metadata: '{"category": "manual"}',
					},
					{
						id: "2504",
						name: "Inactive Rule",
						description: "Inactive rule",
						active: false,
						severity: "MEDIUM",
						ruleType: "test",
						isManualOnly: false,
						activityCode: "VEH",
						metadata: '{"category": "test"}',
					},
				],
			});

			const res = await SELF.fetch(
				"http://local.test/api/v1/alert-rules/active",
				{
					method: "GET",
					headers: {
						Authorization: `Bearer ${testToken}`,
						"x-organization-id": "test-org",
					},
				},
			);

			expect(res.status).toBe(200);
			const body = (await res.json()) as Array<{
				id: string;
				name: string;
				active: boolean;
				isManualOnly: boolean;
			}>;
			expect(Array.isArray(body)).toBe(true);
			expect(body.length).toBe(2); // Only active, non-manual-only rules

			// Verify the rules returned
			const ruleIds = body.map((r) => r.id);
			expect(ruleIds).toContain("2501");
			expect(ruleIds).toContain("2502");
			expect(ruleIds).not.toContain("2503"); // Manual-only excluded
			expect(ruleIds).not.toContain("2504"); // Inactive excluded

			// Verify structure
			body.forEach((rule) => {
				expect(rule).toHaveProperty("id");
				expect(rule).toHaveProperty("name");
				expect(rule).toHaveProperty("active");
				expect(rule).toHaveProperty("isManualOnly");
				expect(rule.active).toBe(true);
				expect(rule.isManualOnly).toBe(false);
			});
		});

		it("returns empty array when no active rules exist", async () => {
			const res = await SELF.fetch(
				"http://local.test/api/v1/alert-rules/active",
				{
					method: "GET",
					headers: {
						Authorization: `Bearer ${testToken}`,
						"x-organization-id": "test-org",
					},
				},
			);

			expect(res.status).toBe(200);
			const body = (await res.json()) as unknown[];
			expect(Array.isArray(body)).toBe(true);
			expect(body.length).toBe(0);
		});

		it("only returns rules with active=true and isManualOnly=false", async () => {
			const prisma = getPrismaClient(env.DB);

			// Create rules with various combinations
			await prisma.alertRule.createMany({
				data: [
					{
						id: "AUTO_UMA",
						name: "Auto UMA Rule",
						description: "Auto rule",
						active: true,
						severity: "HIGH",
						ruleType: "transaction_amount_uma",
						isManualOnly: false,
						activityCode: "VEH",
						metadata: '{"category": "auto"}',
					},
					{
						id: "MANUAL_1",
						name: "Manual Rule",
						description: "Manual",
						active: true,
						severity: "MEDIUM",
						ruleType: null,
						isManualOnly: true,
						activityCode: "VEH",
						metadata: '{"category": "manual"}',
					},
				],
			});

			const res = await SELF.fetch(
				"http://local.test/api/v1/alert-rules/active",
				{
					method: "GET",
					headers: {
						Authorization: `Bearer ${testToken}`,
						"x-organization-id": "test-org",
					},
				},
			);

			expect(res.status).toBe(200);
			const body = (await res.json()) as Array<{
				id: string;
				isManualOnly: boolean;
			}>;
			expect(body.length).toBe(1);
			expect(body[0].id).toBe("AUTO_UMA");
			expect(body[0].isManualOnly).toBe(false);
		});
	});
});
