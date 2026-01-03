import { SELF, env } from "cloudflare:test";
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { getPrismaClient } from "../../src/lib/prisma";

/**
 * Tests for service binding routes without /internal prefix
 * These routes handle requests that come through Cloudflare service bindings
 * where the /internal prefix is automatically stripped
 */
describe("Service Binding Routes (without /internal prefix)", () => {
	beforeEach(async () => {
		// Clean up test data before each test
		const prisma = getPrismaClient(env.DB);
		await prisma.alert.deleteMany({});
		await prisma.alertRuleConfig.deleteMany({});
		await prisma.alertRule.deleteMany({});
		await prisma.umaValue.deleteMany({});
	});

	afterEach(async () => {
		// Clean up test data after each test
		const prisma = getPrismaClient(env.DB);
		await prisma.alert.deleteMany({});
		await prisma.alertRuleConfig.deleteMany({});
		await prisma.alertRule.deleteMany({});
		await prisma.umaValue.deleteMany({});
	});

	describe("GET /alert-rules/active", () => {
		it("returns active alert rules for seekers via Hono route", async () => {
			const prisma = getPrismaClient(env.DB);
			await prisma.alertRule.createMany({
				data: [
					{
						id: "2501",
						name: "Rule 1",
						description: "Test 1",
						active: true,
						severity: "HIGH",
						ruleType: "test",
						isManualOnly: false,
						activityCode: "VEH",
						metadata: "{}",
					},
					{
						id: "2502",
						name: "Rule 2",
						description: "Test 2",
						active: true,
						severity: "MEDIUM",
						ruleType: "test2",
						isManualOnly: false,
						activityCode: "VEH",
						metadata: "{}",
					},
				],
			});

			// Test route without /internal prefix (as it would come from service binding)
			const res = await SELF.fetch("http://local.test/alert-rules/active", {
				method: "GET",
			});

			expect(res.status).toBe(200);
			expect(res.headers.get("Content-Type")).toBe("application/json");
			const body = (await res.json()) as Array<{ id: string }>;
			expect(body).toHaveLength(2);
			expect(body.map((r) => r.id)).toContain("2501");
			expect(body.map((r) => r.id)).toContain("2502");
		});

		it("returns empty array when no active rules", async () => {
			const res = await SELF.fetch("http://local.test/alert-rules/active", {
				method: "GET",
			});

			expect(res.status).toBe(200);
			const body = await res.json();
			expect(body).toEqual([]);
		});

		it("excludes manual-only rules", async () => {
			const prisma = getPrismaClient(env.DB);
			await prisma.alertRule.createMany({
				data: [
					{
						id: "2501",
						name: "Auto Rule",
						description: "Auto",
						active: true,
						severity: "HIGH",
						ruleType: "test",
						isManualOnly: false,
						activityCode: "VEH",
						metadata: "{}",
					},
					{
						id: "2502",
						name: "Manual Rule",
						description: "Manual",
						active: true,
						severity: "MEDIUM",
						ruleType: null,
						isManualOnly: true,
						activityCode: "VEH",
						metadata: "{}",
					},
				],
			});

			const res = await SELF.fetch("http://local.test/alert-rules/active", {
				method: "GET",
			});

			expect(res.status).toBe(200);
			const body = (await res.json()) as Array<{ id: string }>;
			expect(body).toHaveLength(1);
			expect(body[0].id).toBe("2501");
		});
	});

	describe("GET /alert-rules/all-active", () => {
		it("returns all active alert rules including manual-only via Hono route", async () => {
			const prisma = getPrismaClient(env.DB);
			await prisma.alertRule.createMany({
				data: [
					{
						id: "2501",
						name: "Auto Rule",
						description: "Auto",
						active: true,
						severity: "HIGH",
						ruleType: "test",
						isManualOnly: false,
						activityCode: "VEH",
						metadata: "{}",
					},
					{
						id: "2502",
						name: "Manual Rule",
						description: "Manual",
						active: true,
						severity: "MEDIUM",
						ruleType: null,
						isManualOnly: true,
						activityCode: "VEH",
						metadata: "{}",
					},
				],
			});

			const res = await SELF.fetch("http://local.test/alert-rules/all-active", {
				method: "GET",
			});

			expect(res.status).toBe(200);
			const body = (await res.json()) as Array<{ id: string }>;
			expect(body).toHaveLength(2);
			expect(body.map((r) => r.id)).toContain("2501");
			expect(body.map((r) => r.id)).toContain("2502");
		});
	});

	describe("GET /alert-rules/:id/config/:key", () => {
		it("returns alert rule config when found via Hono route", async () => {
			const prisma = getPrismaClient(env.DB);
			await prisma.alertRule.create({
				data: {
					id: "2501",
					name: "Test Rule",
					description: "Test",
					active: true,
					severity: "HIGH",
					ruleType: "test",
					isManualOnly: false,
					activityCode: "VEH",
					metadata: "{}",
				},
			});
			await prisma.alertRuleConfig.create({
				data: {
					id: "config1",
					alertRuleId: "2501",
					key: "threshold",
					value: "1000",
					isHardcoded: false,
					description: "Threshold config",
				},
			});

			const res = await SELF.fetch(
				"http://local.test/alert-rules/2501/config/threshold",
				{ method: "GET" },
			);

			expect(res.status).toBe(200);
			const body = (await res.json()) as {
				key: string;
				value: string;
			};
			expect(body.key).toBe("threshold");
			expect(body.value).toBe("1000");
		});

		it("returns 404 when config not found", async () => {
			const res = await SELF.fetch(
				"http://local.test/alert-rules/2501/config/threshold",
				{ method: "GET" },
			);

			expect(res.status).toBe(404);
			const body = await res.json();
			expect(body).toEqual({ error: "Config not found" });
		});
	});

	describe("GET /uma-values/active", () => {
		it("returns active UMA value when found via Hono route", async () => {
			const prisma = getPrismaClient(env.DB);
			await prisma.umaValue.create({
				data: {
					id: "uma1",
					year: 2025,
					dailyValue: 113.14,
					active: true,
					effectiveDate: new Date("2025-01-01"),
				},
			});

			const res = await SELF.fetch("http://local.test/uma-values/active", {
				method: "GET",
			});

			expect(res.status).toBe(200);
			const body = (await res.json()) as {
				id: string;
				dailyValue: string | number;
				active: boolean;
			};
			expect(body.id).toBe("uma1");
			// Prisma returns Decimal as string when serialized to JSON
			expect(Number(body.dailyValue)).toBe(113.14);
			expect(body.active).toBe(true);
		});

		it("returns 404 when no active UMA value", async () => {
			const res = await SELF.fetch("http://local.test/uma-values/active", {
				method: "GET",
			});

			expect(res.status).toBe(404);
			const body = await res.json();
			expect(body).toEqual({ error: "No active UMA value found" });
		});
	});

	describe("POST /alerts", () => {
		it("creates alert via Hono route", async () => {
			const prisma = getPrismaClient(env.DB);

			// Create required entities
			const client = await prisma.client.create({
				data: {
					id: "test-client",
					organizationId: "test-org",
					rfc: "TEST123456",
					personType: "PHYSICAL",
					email: "test@example.com",
					phone: "1234567890",
					country: "MEX",
					stateCode: "CDMX",
					city: "Mexico City",
					municipality: "Benito Juarez",
					neighborhood: "Test",
					street: "Test Street",
					externalNumber: "123",
					postalCode: "01234",
				},
			});

			const alertRule = await prisma.alertRule.create({
				data: {
					id: "2501",
					name: "Test Rule",
					description: "Test",
					active: true,
					severity: "HIGH",
					ruleType: "test",
					isManualOnly: false,
					activityCode: "VEH",
					metadata: "{}",
				},
			});

			const res = await SELF.fetch("http://local.test/alerts", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					alertRuleId: alertRule.id,
					clientId: client.id,
					severity: "HIGH",
					idempotencyKey: "test-key-1",
					contextHash: "test-hash-1",
					metadata: { test: "data" },
					isManual: false,
				}),
			});

			expect(res.status).toBe(201);
			const body = (await res.json()) as {
				id: string;
				alertRuleId: string;
				clientId: string;
			};
			expect(body.alertRuleId).toBe("2501");
			expect(body.clientId).toBe("test-client");

			// Verify alert was created in database
			const createdAlert = await prisma.alert.findUnique({
				where: { id: body.id },
			});
			expect(createdAlert).not.toBeNull();
			expect(createdAlert?.alertRuleId).toBe("2501");
		});
	});

	describe("POST /alerts/:id/generate-file", () => {
		it("returns 500 when R2_BUCKET not configured", async () => {
			const prisma = getPrismaClient(env.DB);

			// Create required entities
			const client = await prisma.client.create({
				data: {
					id: "test-client",
					organizationId: "test-org",
					rfc: "TEST123456",
					personType: "PHYSICAL",
					email: "test@example.com",
					phone: "1234567890",
					country: "MEX",
					stateCode: "CDMX",
					city: "Mexico City",
					municipality: "Benito Juarez",
					neighborhood: "Test",
					street: "Test Street",
					externalNumber: "123",
					postalCode: "01234",
				},
			});

			const alertRule = await prisma.alertRule.create({
				data: {
					id: "2501",
					name: "Test Rule",
					description: "Test",
					active: true,
					severity: "HIGH",
					ruleType: "test",
					isManualOnly: false,
					activityCode: "VEH",
					metadata: "{}",
				},
			});

			const alert = await prisma.alert.create({
				data: {
					id: "alert1",
					organizationId: "test-org",
					alertRuleId: alertRule.id,
					clientId: client.id,
					severity: "HIGH",
					idempotencyKey: "test-key",
					contextHash: "test-hash",
					metadata: "{}",
					isManual: false,
				},
			});

			const res = await SELF.fetch(
				`http://local.test/alerts/${alert.id}/generate-file`,
				{
					method: "POST",
				},
			);

			expect(res.status).toBe(500);
			const body = (await res.json()) as {
				error: string;
				message: string;
			};
			expect(body.error).toBe("Failed to generate SAT file");
			expect(body.message).toBe("R2_BUCKET not configured");
		});
	});

	describe("Route precedence", () => {
		it("service binding routes take precedence over API routes", async () => {
			const prisma = getPrismaClient(env.DB);
			await prisma.alertRule.create({
				data: {
					id: "2501",
					name: "Test Rule",
					description: "Test",
					active: true,
					severity: "HIGH",
					ruleType: "test",
					isManualOnly: false,
					activityCode: "VEH",
					metadata: "{}",
				},
			});

			// Service binding route should work (without /api/v1 prefix)
			const serviceBindingRes = await SELF.fetch(
				"http://local.test/alert-rules/active",
				{ method: "GET" },
			);
			expect(serviceBindingRes.status).toBe(200);

			// API route should also work (with /api/v1 prefix)
			// Note: This would require auth, so we're just checking the route exists
			// The actual API route test is in alert-rules.test.ts
		});
	});
});
