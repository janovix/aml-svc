/**
 * Integration tests for AmlSvcEntrypoint RPC methods.
 *
 * Uses the real test env (D1 DB) to exercise the entrypoint methods end-to-end.
 * The entrypoint methods delegate to AlertServiceBinding / internal HTTP handlers,
 * so tests verify the complete delegation chain.
 */
import { env } from "cloudflare:test";
import { describe, it, expect, beforeEach } from "vitest";
import { AmlSvcEntrypoint } from "../../src/entrypoint";
import { getPrismaClient } from "../../src/lib/prisma";

/** Creates an AmlSvcEntrypoint instance wired to the real test environment. */
function makeEntrypoint(): AmlSvcEntrypoint {
	const ep = Object.create(AmlSvcEntrypoint.prototype) as AmlSvcEntrypoint;
	(ep as unknown as Record<string, unknown>).env = env;
	(ep as unknown as Record<string, unknown>).ctx = {
		waitUntil: (p: Promise<unknown>) => p,
		passThroughOnException: () => {},
	};
	return ep;
}

describe("AmlSvcEntrypoint integration", () => {
	let prisma: ReturnType<typeof getPrismaClient>;

	beforeEach(async () => {
		prisma = getPrismaClient(env.DB);
		await prisma.alertRuleConfig.deleteMany({});
		await prisma.alertRule.deleteMany({});
		await prisma.umaValue.deleteMany({});
		await prisma.alert.deleteMany({});
		await prisma.client.deleteMany({});
		await prisma.organizationSettings.deleteMany({});
	});

	describe("fetch()", () => {
		it("delegates HTTP requests to the service binding router", async () => {
			const ep = makeEntrypoint();
			const req = new Request("https://aml-svc/alert-rules/active");
			const res = await ep.fetch(req);
			// The service binding router returns a valid response
			expect(res).toBeInstanceOf(Response);
			expect(res.status).toBeLessThan(500);
		});
	});

	describe("getActiveAlertRules()", () => {
		it("returns empty array when no rules exist", async () => {
			const ep = makeEntrypoint();
			const result = await ep.getActiveAlertRules();
			expect(Array.isArray(result)).toBe(true);
			expect(result).toHaveLength(0);
		});

		it("returns active alert rules", async () => {
			await prisma.alertRule.create({
				data: {
					id: "rule-ep-1",
					name: "EP Rule",
					description: "Test",
					active: true,
					severity: "HIGH",
					ruleType: "test",
					isManualOnly: false,
					activityCode: "VEH",
					metadata: "{}",
				},
			});
			const ep = makeEntrypoint();
			const result = await ep.getActiveAlertRules();
			expect(result.length).toBeGreaterThan(0);
		});
	});

	describe("getAllActiveAlertRules()", () => {
		it("returns all active alert rules", async () => {
			const ep = makeEntrypoint();
			const result = await ep.getAllActiveAlertRules();
			expect(Array.isArray(result)).toBe(true);
		});
	});

	describe("getAlertRuleConfig()", () => {
		it("returns null when no config exists", async () => {
			const ep = makeEntrypoint();
			const result = await ep.getAlertRuleConfig("nonexistent-rule", "key");
			expect(result).toBeNull();
		});
	});

	describe("getActiveUmaValue()", () => {
		it("returns null when no UMA value exists", async () => {
			const ep = makeEntrypoint();
			const result = await ep.getActiveUmaValue();
			expect(result).toBeNull();
		});
	});

	describe("createAlert()", () => {
		it("creates an alert when client and rule exist", async () => {
			// Create required fixtures
			await prisma.alertRule.create({
				data: {
					id: "ep-rule-1",
					name: "EP Test Rule",
					description: "Test",
					active: true,
					severity: "HIGH",
					ruleType: "test",
					isManualOnly: true,
					activityCode: "VEH",
					metadata: "{}",
				},
			});
			await prisma.client.create({
				data: {
					id: "ep-client-1",
					rfc: "ABCD123456EF7",
					organizationId: "ep-org",
					personType: "PHYSICAL",
					firstName: "Test",
					lastName: "Client",
					email: "test@ep.com",
					phone: "+521234567890",
					country: "MX",
					stateCode: "DIF",
					city: "CDMX",
					municipality: "CDMX",
					neighborhood: "Centro",
					street: "Calle 1",
					externalNumber: "10",
					postalCode: "06000",
				},
			});

			const ep = makeEntrypoint();
			const result = await ep.createAlert({
				alertRuleId: "ep-rule-1",
				clientId: "ep-client-1",
				severity: "HIGH",
				idempotencyKey: "ep-idem-1",
				contextHash: "abc123",
				metadata: {},
				isManual: true,
			});
			expect(result).toBeDefined();
			expect((result as { id: string }).id).toBeDefined();
		});
	});

	describe("getClient()", () => {
		it("throws when client does not exist", async () => {
			const ep = makeEntrypoint();
			await expect(ep.getClient("nonexistent-client")).rejects.toThrow(
				/not found/i,
			);
		});
	});

	describe("getClientOperations()", () => {
		it("throws when client does not exist", async () => {
			const ep = makeEntrypoint();
			await expect(
				ep.getClientOperations("nonexistent-client"),
			).rejects.toThrow(/not found/i);
		});
	});

	describe("getOrganizationSettings()", () => {
		it("returns settings for an organization (unconfigured by default)", async () => {
			const ep = makeEntrypoint();
			const result = await ep.getOrganizationSettings("org-ep-test");
			expect(result).toMatchObject({ configured: false });
		});
	});

	describe("updateOrganizationSettings()", () => {
		it("throws on validation error (exercises error path)", async () => {
			const ep = makeEntrypoint();
			await expect(
				ep.updateOrganizationSettings("org-ep-update", {}),
			).rejects.toThrow();
		});

		it("returns updated settings when valid data provided", async () => {
			const ep = makeEntrypoint();
			const result = await ep.updateOrganizationSettings(
				"org-ep-update-valid",
				{
					obligatedSubjectKey: "ABCD123456EF7",
					activityKey: "VEH",
				},
			);
			expect(result).toMatchObject({ configured: true });
		});
	});

	describe("patchOrganizationSettings()", () => {
		it("throws when org settings are not configured (exercises error path)", async () => {
			const ep = makeEntrypoint();
			await expect(
				ep.patchOrganizationSettings("unconfigured-org-p", {}),
			).rejects.toThrow();
		});

		it("returns patched settings after org settings are created", async () => {
			const ep = makeEntrypoint();
			// First create settings via update
			await ep.updateOrganizationSettings("org-ep-patch-valid", {
				obligatedSubjectKey: "ABCD123456EF7",
				activityKey: "VEH",
			});
			// Then patch them
			const result = await ep.patchOrganizationSettings("org-ep-patch-valid", {
				activityKey: "INM",
			});
			expect(result).toMatchObject({ configured: true });
		});
	});

	describe("patchSelfServiceSettings()", () => {
		it("throws when org settings are not configured (exercises error path)", async () => {
			const ep = makeEntrypoint();
			await expect(
				ep.patchSelfServiceSettings("unconfigured-org-ss", {}),
			).rejects.toThrow();
		});

		it("returns self-service settings after org settings exist", async () => {
			const ep = makeEntrypoint();
			// Create settings first
			await ep.updateOrganizationSettings("org-ep-ss-valid", {
				obligatedSubjectKey: "ABCD123456EF7",
				activityKey: "VEH",
			});
			// Now patch self-service settings
			const result = await ep.patchSelfServiceSettings("org-ep-ss-valid", {
				selfServiceMode: "disabled",
			});
			expect(result).toBeDefined();
		});
	});

	describe("generateAlertSatFile()", () => {
		it("throws when alert does not exist", async () => {
			const ep = makeEntrypoint();
			await expect(
				ep.generateAlertSatFile("nonexistent-alert-id"),
			).rejects.toThrow(/Failed to generate SAT file/);
		});
	});

	describe("patchClientWatchlistQuery()", () => {
		it("calls the internal screening handler without throwing on success", async () => {
			// Create a client with a watchlist query
			await prisma.client.upsert({
				where: { id: "ep-wq-client" },
				create: {
					id: "ep-wq-client",
					rfc: "WQTST12345AB6",
					organizationId: "ep-org",
					personType: "PHYSICAL",
					firstName: "WQ",
					lastName: "Test",
					email: "wq@ep.com",
					phone: "+521234567890",
					country: "MX",
					stateCode: "DIF",
					city: "CDMX",
					municipality: "CDMX",
					neighborhood: "Centro",
					street: "Calle 2",
					externalNumber: "20",
					postalCode: "06000",
					watchlistQueryId: "wq-123",
				},
				update: { watchlistQueryId: "wq-123" },
			});

			const ep = makeEntrypoint();
			// Should resolve without throwing (the route updates watchlist query fields)
			await expect(
				ep.patchClientWatchlistQuery("ep-wq-client", {
					watchlistQueryId: "wq-123",
					ofacSanctioned: false,
				}),
			).resolves.toBeUndefined();
		});
	});

	describe("getStaleScreeningClients()", () => {
		it("returns empty array when no stale clients exist", async () => {
			const ep = makeEntrypoint();
			const result = await ep.getStaleScreeningClients();
			expect(Array.isArray(result)).toBe(true);
		});

		it("accepts segment and limit parameters", async () => {
			const ep = makeEntrypoint();
			const result = await ep.getStaleScreeningClients(0, 5);
			expect(Array.isArray(result)).toBe(true);
		});
	});

	describe("processScreeningCallback()", () => {
		it("throws on unknown queryId (not found path)", async () => {
			const ep = makeEntrypoint();
			await expect(
				ep.processScreeningCallback({
					queryId: "nonexistent-query",
					type: "pep_official",
					status: "completed",
					matched: false,
				}),
			).rejects.toThrow();
		});
	});
});
