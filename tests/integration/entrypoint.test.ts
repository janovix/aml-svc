/**
 * Integration tests for AmlSvcEntrypoint RPC methods.
 *
 * Uses the real test env (D1 DB) to exercise the entrypoint methods end-to-end.
 * The entrypoint methods delegate to internal HTTP handlers,
 * so tests verify the complete delegation chain.
 *
 * NOTE: Alert-worker and import-worker RPC methods have been removed — those
 * workers are now absorbed into aml-svc and use direct Prisma/service calls.
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
		await prisma.organizationSettings.deleteMany({});
		await prisma.client.deleteMany({});
	});

	describe("fetch()", () => {
		it("delegates HTTP requests to the service binding router", async () => {
			const ep = makeEntrypoint();
			const req = new Request("https://aml-svc/alert-rules/active");
			const res = await ep.fetch(req);
			expect(res).toBeInstanceOf(Response);
			expect(res.status).toBeLessThan(500);
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
			await ep.updateOrganizationSettings("org-ep-patch-valid", {
				obligatedSubjectKey: "ABCD123456EF7",
				activityKey: "VEH",
			});
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
			await ep.updateOrganizationSettings("org-ep-ss-valid", {
				obligatedSubjectKey: "ABCD123456EF7",
				activityKey: "VEH",
			});
			const result = await ep.patchSelfServiceSettings("org-ep-ss-valid", {
				selfServiceMode: "disabled",
			});
			expect(result).toBeDefined();
		});
	});

	describe("patchClientWatchlistQuery()", () => {
		it("calls the internal screening handler without throwing on success", async () => {
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
