import { env } from "cloudflare:test";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Hono } from "hono";
import { generateKeyPair, exportJWK, SignJWT, type JSONWebKeySet } from "jose";
import { adminRouter } from "../../src/routes/admin";
import {
	clearJWKSCache,
	type AdminAuthBindings,
	type AdminAuthVariables,
} from "../../src/middleware/admin-auth";
import { getPrismaClient } from "../../src/lib/prisma";

type KeyPairResult = Awaited<ReturnType<typeof generateKeyPair>>;

// Generate a test key pair for signing/verifying JWTs
async function generateTestKeyPair(): Promise<KeyPairResult> {
	const keyPair = await generateKeyPair("ES256", {
		extractable: true,
	});
	return keyPair;
}

// Convert public key to JWK for JWKS response
async function publicKeyToJWK(publicKey: KeyPairResult["publicKey"]) {
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

describe("Admin Routes", () => {
	let testKeyPair: KeyPairResult;
	let testJWKS: JSONWebKeySet;
	let fetchMock: ReturnType<typeof vi.fn>;
	let app: Hono<{
		Bindings: AdminAuthBindings & { DB: D1Database };
		Variables: AdminAuthVariables;
	}>;

	beforeEach(async () => {
		// Clear JWKS cache before each test to ensure fresh authentication
		clearJWKSCache();

		// Generate fresh key pair for each test
		testKeyPair = await generateTestKeyPair();
		const publicJWK = await publicKeyToJWK(testKeyPair.publicKey);
		testJWKS = { keys: [publicJWK] };

		// Mock fetch for JWKS and session endpoints
		fetchMock = vi.fn().mockImplementation(async (url: string | Request) => {
			let urlStr: string;
			if (typeof url === "string") {
				urlStr = url;
			} else if (url instanceof Request) {
				urlStr = url.url;
			} else {
				urlStr = String(url);
			}

			if (urlStr.includes("/api/auth/jwks")) {
				return new Response(JSON.stringify(testJWKS), {
					status: 200,
					headers: { "Content-Type": "application/json" },
				});
			}
			if (urlStr.includes("/api/auth/get-session")) {
				return new Response(
					JSON.stringify({
						user: { id: "admin-123", email: "admin@test.com", role: "admin" },
					}),
					{
						status: 200,
						headers: { "Content-Type": "application/json" },
					},
				);
			}
			return new Response("Not Found", { status: 404 });
		});

		vi.stubGlobal("fetch", fetchMock);

		// Create test app
		app = new Hono<{
			Bindings: AdminAuthBindings & { DB: D1Database };
			Variables: AdminAuthVariables;
		}>();
		// Type assertion needed because adminRouter uses Bindings but we need AdminAuthBindings
		// This is safe because AdminAuthBindings extends Bindings
		app.route("/admin", adminRouter as any);

		// Clean up test data and set up test data using real database
		const prisma = getPrismaClient(env.DB);
		await prisma.alert.deleteMany({});
		await prisma.notice.deleteMany({});
		await prisma.transaction.deleteMany({});
		await prisma.client.deleteMany({});
		await prisma.organizationSettings.deleteMany({});

		// Create test data
		const testOrg1 = "test-org-1";
		const testOrg2 = "test-org-2";

		// Create clients with all required fields
		await prisma.client.createMany({
			data: [
				{
					id: "client-1",
					organizationId: testOrg1,
					rfc: "TEST123456ABC",
					personType: "PHYSICAL",
					firstName: "John",
					lastName: "Doe",
					email: "john.doe@test.com",
					phone: "5551234567",
					country: "Mexico",
					stateCode: "CDMX",
					city: "Mexico City",
					municipality: "Benito Juarez",
					neighborhood: "Del Valle",
					street: "Av. Insurgentes Sur",
					externalNumber: "123",
					postalCode: "03100",
				},
				{
					id: "client-2",
					organizationId: testOrg2,
					rfc: "TEST789012DEF",
					personType: "PHYSICAL",
					firstName: "Jane",
					lastName: "Smith",
					email: "jane.smith@test.com",
					phone: "5559876543",
					country: "Mexico",
					stateCode: "JAL",
					city: "Guadalajara",
					municipality: "Guadalajara",
					neighborhood: "Centro",
					street: "Av. Juarez",
					externalNumber: "456",
					postalCode: "44100",
				},
			],
		});

		// Create alert rule with all required fields
		const alertRule = await prisma.alertRule.create({
			data: {
				id: "rule-1",
				name: "High Value Transaction",
				description: "Test alert rule",
				severity: "HIGH",
				active: true,
				isManualOnly: false,
				activityCode: "VEH",
			},
		});

		// Create alerts with all required fields
		await prisma.alert.createMany({
			data: [
				{
					id: "alert-1",
					organizationId: testOrg1,
					clientId: "client-1",
					alertRuleId: alertRule.id,
					status: "DETECTED",
					severity: "HIGH",
					isManual: false,
					submissionDeadline: new Date("2024-04-01"),
					idempotencyKey: "alert-1-key",
					contextHash: "alert-1-context",
					metadata: JSON.stringify({ test: "data" }),
				},
				{
					id: "alert-2",
					organizationId: testOrg1,
					clientId: "client-1",
					alertRuleId: alertRule.id,
					status: "SUBMITTED",
					severity: "HIGH",
					isManual: false,
					submissionDeadline: new Date("2024-04-01"),
					submittedAt: new Date("2024-03-20"),
					idempotencyKey: "alert-2-key",
					contextHash: "alert-2-context",
					metadata: JSON.stringify({ test: "data" }),
				},
			],
		});

		// Create notices
		await prisma.notice.createMany({
			data: [
				{
					id: "notice-1",
					organizationId: testOrg1,
					name: "March 2024 Notice",
					status: "DRAFT",
					periodStart: new Date("2024-03-01"),
					periodEnd: new Date("2024-03-31"),
					reportedMonth: "2024-03",
					recordCount: 10,
				},
				{
					id: "notice-2",
					organizationId: testOrg1,
					name: "Q1 2024 Notice",
					status: "GENERATED",
					periodStart: new Date("2024-01-01"),
					periodEnd: new Date("2024-03-31"),
					reportedMonth: "2024-03",
					recordCount: 15,
					generatedAt: new Date("2024-04-01"),
				},
			],
		});

		// Create organization settings
		await prisma.organizationSettings.create({
			data: {
				id: `settings-${testOrg1}`,
				organizationId: testOrg1,
				obligatedSubjectKey: "AUTOMOTIVE",
				activityKey: "VEHICLE_SALES",
			},
		});
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	interface ErrorResponse {
		success: boolean;
		error: string;
		message: string;
	}

	interface StatsResponse {
		success: boolean;
		data: {
			totals: {
				clients: number;
				transactions: number;
				alerts: number;
				notices: number;
			};
			alerts: {
				byStatus: Record<string, number>;
			};
			notices: {
				byStatus: Record<string, number>;
			};
			recentAlerts: unknown[];
		};
	}

	interface AlertsResponse {
		success: boolean;
		data: unknown[];
		pagination: {
			page: number;
			limit: number;
			total: number;
			totalPages: number;
		};
	}

	interface NoticesResponse {
		success: boolean;
		data: unknown[];
		pagination: {
			page: number;
			limit: number;
			total: number;
			totalPages: number;
		};
	}

	interface OrgsResponse {
		success: boolean;
		data: unknown[];
		pagination: {
			page: number;
			limit: number;
			total: number;
			totalPages: number;
		};
	}

	describe("Authentication", () => {
		it("should return 401 when no Authorization header is provided", async () => {
			const res = await app.request("/admin/stats", {}, {
				AUTH_SERVICE_URL: "https://auth-svc.test",
				DB: env.DB,
			} as AdminAuthBindings & { DB: D1Database });

			expect(res.status).toBe(401);
			const body = (await res.json()) as ErrorResponse;
			expect(body.error).toBe("Unauthorized");
		});

		it("should return 403 when user is not admin", async () => {
			// Clear cache to ensure fresh fetch
			clearJWKSCache();

			// Mock non-admin session response
			fetchMock.mockImplementation(async (url: string | Request) => {
				let urlStr: string;
				if (typeof url === "string") {
					urlStr = url;
				} else if (url instanceof Request) {
					urlStr = url.url;
				} else {
					urlStr = String(url);
				}

				if (urlStr.includes("/api/auth/jwks")) {
					return new Response(JSON.stringify(testJWKS), {
						status: 200,
						headers: { "Content-Type": "application/json" },
					});
				}
				if (urlStr.includes("/api/auth/get-session")) {
					return new Response(
						JSON.stringify({
							user: { id: "user-123", email: "user@test.com", role: "user" },
						}),
						{
							status: 200,
							headers: { "Content-Type": "application/json" },
						},
					);
				}
				return new Response("Not Found", { status: 404 });
			});

			const token = await createTestJWT(testKeyPair.privateKey, {
				sub: "user-123",
				email: "user@test.com",
			});

			const res = await app.request(
				"/admin/stats",
				{
					headers: { Authorization: `Bearer ${token}` },
				},
				{
					AUTH_SERVICE_URL: "https://auth-svc.test",
					DB: env.DB,
				} as AdminAuthBindings & { DB: D1Database },
			);

			expect(res.status).toBe(403);
			const body = (await res.json()) as ErrorResponse;
			expect(body.error).toBe("Forbidden");
		});
	});

	describe("GET /admin/stats", () => {
		it("should return platform-wide statistics", async () => {
			const token = await createTestJWT(testKeyPair.privateKey, {
				sub: "admin-123",
				email: "admin@test.com",
			});

			const res = await app.request(
				"/admin/stats",
				{
					headers: { Authorization: `Bearer ${token}` },
				},
				{
					AUTH_SERVICE_URL: "https://auth-svc.test",
					DB: env.DB,
				} as AdminAuthBindings & { DB: D1Database },
			);

			expect(res.status).toBe(200);
			const body = (await res.json()) as StatsResponse;
			expect(body.success).toBe(true);
			expect(body.data.totals).toBeDefined();
			expect(body.data.totals.clients).toBe(2); // We created 2 clients
			expect(body.data.totals.transactions).toBe(0); // No transactions created
			expect(body.data.totals.alerts).toBe(2); // We created 2 alerts
			expect(body.data.totals.notices).toBe(2); // We created 2 notices
		});

		it("should return alerts grouped by status", async () => {
			const token = await createTestJWT(testKeyPair.privateKey, {
				sub: "admin-123",
			});

			const res = await app.request(
				"/admin/stats",
				{
					headers: { Authorization: `Bearer ${token}` },
				},
				{
					AUTH_SERVICE_URL: "https://auth-svc.test",
					DB: env.DB,
				} as AdminAuthBindings & { DB: D1Database },
			);

			expect(res.status).toBe(200);
			const body = (await res.json()) as StatsResponse;
			expect(body.data.alerts.byStatus).toBeDefined();
			expect(body.data.alerts.byStatus["DETECTED"]).toBe(1); // We created 1 DETECTED alert
			expect(body.data.alerts.byStatus["SUBMITTED"]).toBe(1); // We created 1 SUBMITTED alert
		});
	});

	describe("GET /admin/alerts", () => {
		it("should return paginated alerts", async () => {
			const token = await createTestJWT(testKeyPair.privateKey, {
				sub: "admin-123",
			});

			const res = await app.request(
				"/admin/alerts",
				{
					headers: { Authorization: `Bearer ${token}` },
				},
				{
					AUTH_SERVICE_URL: "https://auth-svc.test",
					DB: env.DB,
				} as AdminAuthBindings & { DB: D1Database },
			);

			expect(res.status).toBe(200);
			const body = (await res.json()) as AlertsResponse;
			expect(body.success).toBe(true);
			expect(body.data).toBeInstanceOf(Array);
			expect(body.pagination).toBeDefined();
			expect(body.pagination.page).toBe(1);
		});

		it("should respect pagination parameters", async () => {
			const token = await createTestJWT(testKeyPair.privateKey, {
				sub: "admin-123",
			});

			const res = await app.request(
				"/admin/alerts?page=2&limit=10",
				{
					headers: { Authorization: `Bearer ${token}` },
				},
				{
					AUTH_SERVICE_URL: "https://auth-svc.test",
					DB: env.DB,
				} as AdminAuthBindings & { DB: D1Database },
			);

			expect(res.status).toBe(200);
			const body = (await res.json()) as AlertsResponse;
			expect(body.pagination.page).toBe(2);
			expect(body.pagination.limit).toBe(10);
		});

		it("should filter by status", async () => {
			const token = await createTestJWT(testKeyPair.privateKey, {
				sub: "admin-123",
			});

			const res = await app.request(
				"/admin/alerts?status=DETECTED",
				{
					headers: { Authorization: `Bearer ${token}` },
				},
				{
					AUTH_SERVICE_URL: "https://auth-svc.test",
					DB: env.DB,
				} as AdminAuthBindings & { DB: D1Database },
			);

			expect(res.status).toBe(200);
			const body = (await res.json()) as AlertsResponse;
			expect(body.success).toBe(true);
			// All returned alerts should have status DETECTED
			if (body.data.length > 0) {
				body.data.forEach((alert: any) => {
					expect(alert.status).toBe("DETECTED");
				});
			}
		});

		it("should filter by organizationId", async () => {
			const token = await createTestJWT(testKeyPair.privateKey, {
				sub: "admin-123",
			});

			const res = await app.request(
				"/admin/alerts?organizationId=test-org-1",
				{
					headers: { Authorization: `Bearer ${token}` },
				},
				{
					AUTH_SERVICE_URL: "https://auth-svc.test",
					DB: env.DB,
				} as AdminAuthBindings & { DB: D1Database },
			);

			expect(res.status).toBe(200);
			const body = (await res.json()) as AlertsResponse;
			expect(body.success).toBe(true);
			// All returned alerts should belong to test-org-1
			if (body.data.length > 0) {
				body.data.forEach((alert: any) => {
					expect(alert.organizationId).toBe("test-org-1");
				});
			}
		});
	});

	describe("GET /admin/notices", () => {
		it("should return paginated notices", async () => {
			const token = await createTestJWT(testKeyPair.privateKey, {
				sub: "admin-123",
			});

			const res = await app.request(
				"/admin/notices",
				{
					headers: { Authorization: `Bearer ${token}` },
				},
				{
					AUTH_SERVICE_URL: "https://auth-svc.test",
					DB: env.DB,
				} as AdminAuthBindings & { DB: D1Database },
			);

			expect(res.status).toBe(200);
			const body = (await res.json()) as NoticesResponse;
			expect(body.success).toBe(true);
			expect(body.data).toBeInstanceOf(Array);
			expect(body.pagination).toBeDefined();
		});

		it("should filter notices by status", async () => {
			const token = await createTestJWT(testKeyPair.privateKey, {
				sub: "admin-123",
			});

			const res = await app.request(
				"/admin/notices?status=DRAFT",
				{
					headers: { Authorization: `Bearer ${token}` },
				},
				{
					AUTH_SERVICE_URL: "https://auth-svc.test",
					DB: env.DB,
				} as AdminAuthBindings & { DB: D1Database },
			);

			expect(res.status).toBe(200);
			const body = (await res.json()) as NoticesResponse;
			expect(body.success).toBe(true);
			// All returned notices should have status DRAFT
			if (body.data.length > 0) {
				body.data.forEach((notice: any) => {
					expect(notice.status).toBe("DRAFT");
				});
			}
		});
	});

	describe("GET /admin/organizations", () => {
		it("should return organizations with AML stats", async () => {
			const token = await createTestJWT(testKeyPair.privateKey, {
				sub: "admin-123",
			});

			const res = await app.request(
				"/admin/organizations",
				{
					headers: { Authorization: `Bearer ${token}` },
				},
				{
					AUTH_SERVICE_URL: "https://auth-svc.test",
					DB: env.DB,
				} as AdminAuthBindings & { DB: D1Database },
			);

			expect(res.status).toBe(200);
			const body = (await res.json()) as OrgsResponse;
			expect(body.success).toBe(true);
			expect(body.data).toBeInstanceOf(Array);
			expect(body.pagination).toBeDefined();
		});
	});

	describe("GET /admin/organizations/:id", () => {
		it("should return detailed stats for specific organization", async () => {
			const token = await createTestJWT(testKeyPair.privateKey, {
				sub: "admin-123",
			});

			const res = await app.request(
				"/admin/organizations/test-org-1",
				{
					headers: { Authorization: `Bearer ${token}` },
				},
				{
					AUTH_SERVICE_URL: "https://auth-svc.test",
					DB: env.DB,
				} as AdminAuthBindings & { DB: D1Database },
			);

			expect(res.status).toBe(200);
			const body = (await res.json()) as {
				success: boolean;
				data: {
					organizationId: string;
					stats: unknown;
				};
			};
			expect(body.success).toBe(true);
			expect(body.data.organizationId).toBe("test-org-1");
			expect(body.data.stats).toBeDefined();
		});
	});
});
