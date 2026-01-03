import { env } from "cloudflare:test";
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { handleServiceBindingRequest } from "../../src/lib/alert-service-binding";
import { getPrismaClient } from "../../src/lib/prisma";
import type { Bindings } from "../../src/index";

describe("handleServiceBindingRequest", () => {
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

	describe("path normalization", () => {
		it("handles paths with /internal prefix", async () => {
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

			const request = new Request(
				"https://internal/internal/alert-rules/active",
				{
					method: "GET",
				},
			);

			const response = await handleServiceBindingRequest(
				request,
				env as unknown as Bindings,
			);
			const body = (await response.json()) as unknown[];

			expect(response.status).toBe(200);
			expect(body).toHaveLength(1);
		});

		it("handles paths without /internal prefix", async () => {
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

			const request = new Request("https://internal/alert-rules/active", {
				method: "GET",
			});

			const response = await handleServiceBindingRequest(
				request,
				env as unknown as Bindings,
			);
			const body = (await response.json()) as unknown[];

			expect(response.status).toBe(200);
			expect(body).toHaveLength(1);
		});
	});

	describe("GET /alert-rules/active", () => {
		it("returns active alert rules for seekers", async () => {
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

			const request = new Request("https://internal/alert-rules/active", {
				method: "GET",
			});

			const response = await handleServiceBindingRequest(
				request,
				env as unknown as Bindings,
			);
			const body = (await response.json()) as Array<{ id: string }>;

			expect(response.status).toBe(200);
			expect(response.headers.get("Content-Type")).toBe("application/json");
			expect(body).toHaveLength(2);
			expect(body.map((r) => r.id)).toContain("2501");
			expect(body.map((r) => r.id)).toContain("2502");
		});

		it("returns empty array when no active rules", async () => {
			const request = new Request("https://internal/alert-rules/active", {
				method: "GET",
			});

			const response = await handleServiceBindingRequest(
				request,
				env as unknown as Bindings,
			);
			const body = await response.json();

			expect(response.status).toBe(200);
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

			const request = new Request("https://internal/alert-rules/active", {
				method: "GET",
			});

			const response = await handleServiceBindingRequest(
				request,
				env as unknown as Bindings,
			);
			const body = (await response.json()) as Array<{ id: string }>;

			expect(response.status).toBe(200);
			expect(body).toHaveLength(1);
			expect(body[0].id).toBe("2501");
		});
	});

	describe("GET /alert-rules/all-active", () => {
		it("returns all active alert rules including manual-only", async () => {
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

			const request = new Request("https://internal/alert-rules/all-active", {
				method: "GET",
			});

			const response = await handleServiceBindingRequest(
				request,
				env as unknown as Bindings,
			);
			const body = (await response.json()) as Array<{ id: string }>;

			expect(response.status).toBe(200);
			expect(body).toHaveLength(2);
			expect(body.map((r) => r.id)).toContain("2501");
			expect(body.map((r) => r.id)).toContain("2502");
		});
	});

	describe("GET /alert-rules/{id}/config/{key}", () => {
		it("returns alert rule config when found", async () => {
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

			const request = new Request(
				"https://internal/alert-rules/2501/config/threshold",
				{ method: "GET" },
			);

			const response = await handleServiceBindingRequest(
				request,
				env as unknown as Bindings,
			);
			const body = (await response.json()) as {
				key: string;
				value: string;
			};

			expect(response.status).toBe(200);
			expect(body.key).toBe("threshold");
			expect(body.value).toBe("1000");
		});

		it("returns 404 when config not found", async () => {
			const request = new Request(
				"https://internal/alert-rules/2501/config/threshold",
				{ method: "GET" },
			);

			const response = await handleServiceBindingRequest(
				request,
				env as unknown as Bindings,
			);
			const body = await response.json();

			expect(response.status).toBe(404);
			expect(body).toEqual({ error: "Config not found" });
		});
	});

	describe("GET /uma-values/active", () => {
		it("returns active UMA value when found", async () => {
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

			const request = new Request("https://internal/uma-values/active", {
				method: "GET",
			});

			const response = await handleServiceBindingRequest(
				request,
				env as unknown as Bindings,
			);
			const body = (await response.json()) as {
				id: string;
				dailyValue: string | number;
				active: boolean;
			};

			expect(response.status).toBe(200);
			expect(body.id).toBe("uma1");
			// Prisma returns Decimal as string when serialized to JSON
			expect(Number(body.dailyValue)).toBe(113.14);
			expect(body.active).toBe(true);
		});

		it("returns 404 when no active UMA value", async () => {
			const request = new Request("https://internal/uma-values/active", {
				method: "GET",
			});

			const response = await handleServiceBindingRequest(
				request,
				env as unknown as Bindings,
			);
			const body = await response.json();

			expect(response.status).toBe(404);
			expect(body).toEqual({ error: "No active UMA value found" });
		});
	});

	describe("POST /alerts/{alertId}/generate-file", () => {
		it("returns 500 when R2_BUCKET not configured", async () => {
			const request = new Request(
				"https://internal/alerts/alert1/generate-file",
				{
					method: "POST",
				},
			);

			const response = await handleServiceBindingRequest(
				request,
				env as unknown as Bindings,
			);
			const body = (await response.json()) as {
				error: string;
				message: string;
			};

			expect(response.status).toBe(500);
			expect(body.error).toBe("Failed to generate SAT file");
			expect(body.message).toBe("R2_BUCKET not configured");
		});
	});

	describe("404 handling", () => {
		it("returns 404 for unknown routes", async () => {
			const request = new Request("https://internal/unknown/route", {
				method: "GET",
			});

			const response = await handleServiceBindingRequest(
				request,
				env as unknown as Bindings,
			);
			const body = (await response.json()) as {
				error: string;
				message: string;
				path: string;
				method: string;
			};

			expect(response.status).toBe(404);
			expect(body.error).toBe("Not Found");
			expect(body.message).toContain("unknown/route");
			expect(body.path).toBe("/unknown/route");
			expect(body.method).toBe("GET");
		});

		it("returns 404 for wrong HTTP method", async () => {
			const request = new Request("https://internal/alert-rules/active", {
				method: "POST",
			});

			const response = await handleServiceBindingRequest(
				request,
				env as unknown as Bindings,
			);
			const body = (await response.json()) as { error: string };

			expect(response.status).toBe(404);
			expect(body.error).toBe("Not Found");
		});
	});
});
