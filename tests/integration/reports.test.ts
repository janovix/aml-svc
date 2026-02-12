import { SELF, env } from "cloudflare:test";
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { getPrismaClient } from "../../src/lib/prisma";
import { SignJWT } from "jose";
import { clearJWKSCache } from "../../src/middleware/auth";
import { getTestKeyPair } from "../helpers/test-auth";

// Create a signed JWT for testing
async function createTestJWT(
	privateKey: Awaited<ReturnType<typeof getTestKeyPair>>["privateKey"],
	payload: Record<string, unknown>,
) {
	const builder = new SignJWT(payload)
		.setProtectedHeader({ alg: "ES256", kid: "test-key-id" })
		.setIssuedAt()
		.setExpirationTime("1h")
		.setSubject(payload.sub as string);

	return builder.sign(privateKey);
}

describe("Reports API", () => {
	let testToken: string;
	const testOrgId = "test-org-id";

	beforeEach(async () => {
		// Use shared test keypair for AUTH_SERVICE mock
		const testKeyPair = await getTestKeyPair();

		// Create a test JWT token
		testToken = await createTestJWT(testKeyPair.privateKey, {
			sub: "test-user-id",
			email: "test@example.com",
			organizationId: testOrgId,
		});

		// Clear JWKS cache before each test
		clearJWKSCache();

		// Clean up test data
		const prisma = getPrismaClient(env.DB);
		await prisma.alert.deleteMany({});
		await prisma.report.deleteMany({});
		await prisma.alertRule.deleteMany({});
		await prisma.operation.deleteMany({});
		await prisma.client.deleteMany({});
	});

	afterEach(() => {
		clearJWKSCache();
	});

	describe("POST /api/v1/reports/:id/generate", () => {
		it("generates PDF report and updates status to GENERATED", async () => {
			const prisma = getPrismaClient(env.DB);

			// Create a test client with all required fields
			await prisma.client.create({
				data: {
					id: "CLI001",
					organizationId: testOrgId,
					rfc: "TESP800101ABC",
					personType: "PHYSICAL",
					firstName: "Test",
					lastName: "Client",
					country: "MX",
					nationality: "MX",
					email: "test@example.com",
					phone: "5555555555",
					stateCode: "CMX",
					city: "CDMX",
					municipality: "Cuauhtemoc",
					neighborhood: "Centro",
					street: "Reforma 123",
					externalNumber: "100",
					postalCode: "06600",
				},
			});

			// Create an alert rule
			await prisma.alertRule.create({
				data: {
					id: "RULE001",
					name: "Test Rule",
					description: "Test rule description",
					active: true,
					severity: "HIGH",
					ruleType: "transaction_amount_uma",
					isManualOnly: false,
					activityCode: "VEH",
					metadata: "{}",
				},
			});

			// Create a report in DRAFT status
			const periodStart = new Date("2024-01-01T00:00:00Z");
			const periodEnd = new Date("2024-01-31T23:59:59Z");

			const report = await prisma.report.create({
				data: {
					id: "RPT001",
					organizationId: testOrgId,
					name: "Test Monthly Report",
					template: "CUSTOM",
					periodType: "MONTHLY",
					status: "DRAFT",
					periodStart,
					periodEnd,
				},
			});

			// Create an alert assigned to this report
			await prisma.alert.create({
				data: {
					id: "ALRT001",
					organizationId: testOrgId,
					alertRuleId: "RULE001",
					clientId: "CLI001",
					severity: "HIGH",
					status: "DETECTED",
					reportId: report.id,
					isManual: false,
					contextHash: "hash123",
					idempotencyKey: "key123",
					metadata: "{}",
				},
			});

			// Call the generate endpoint
			const res = await SELF.fetch(
				`http://local.test/api/v1/reports/${report.id}/generate`,
				{
					method: "POST",
					headers: {
						Authorization: `Bearer ${testToken}`,
						"x-organization-id": testOrgId,
						"Content-Type": "application/json",
					},
				},
			);

			expect(res.status).toBe(200);

			const body = (await res.json()) as {
				message: string;
				reportId: string;
				alertCount: number;
				types: string[];
			};

			expect(body.reportId).toBe(report.id);
			expect(body.alertCount).toBe(1);
			// Reports now only generate PDF (XML is for SAT Notices)
			expect(body.types).toEqual(["PDF"]);
			expect(body.message).toContain("PDF generation complete");

			// Verify the report status was updated to GENERATED
			const updatedReport = await prisma.report.findUnique({
				where: { id: report.id },
			});

			expect(updatedReport).not.toBeNull();
			expect(updatedReport!.status).toBe("GENERATED");
			expect(updatedReport!.generatedAt).not.toBeNull();
		});

		it("returns 400 if report has already been generated", async () => {
			const prisma = getPrismaClient(env.DB);

			// Create a report in GENERATED status
			const report = await prisma.report.create({
				data: {
					id: "RPT002",
					organizationId: testOrgId,
					name: "Already Generated Report",
					template: "CUSTOM",
					periodType: "MONTHLY",
					status: "GENERATED",
					periodStart: new Date("2024-02-01T00:00:00Z"),
					periodEnd: new Date("2024-02-29T23:59:59Z"),
					generatedAt: new Date(),
				},
			});

			const res = await SELF.fetch(
				`http://local.test/api/v1/reports/${report.id}/generate`,
				{
					method: "POST",
					headers: {
						Authorization: `Bearer ${testToken}`,
						"x-organization-id": testOrgId,
						"Content-Type": "application/json",
					},
				},
			);

			expect(res.status).toBe(400);

			const body = (await res.json()) as { error: string; message: string };
			expect(body.message).toBe("Report has already been generated");
		});

		it("returns 404 if report does not exist", async () => {
			const res = await SELF.fetch(
				"http://local.test/api/v1/reports/nonexistent/generate",
				{
					method: "POST",
					headers: {
						Authorization: `Bearer ${testToken}`,
						"x-organization-id": testOrgId,
						"Content-Type": "application/json",
					},
				},
			);

			expect(res.status).toBe(404);

			const body = (await res.json()) as { error: string; message: string };
			expect(body.message).toBe("Report not found");
		});

		it("generates PDF only for QUARTERLY report types", async () => {
			const prisma = getPrismaClient(env.DB);

			// Create a test client with all required fields
			await prisma.client.create({
				data: {
					id: "CLI002",
					organizationId: testOrgId,
					rfc: "TESP800102DEF",
					personType: "PHYSICAL",
					firstName: "Test",
					lastName: "Client",
					country: "MX",
					nationality: "MX",
					email: "test2@example.com",
					phone: "5555555556",
					stateCode: "CMX",
					city: "CDMX",
					municipality: "Cuauhtemoc",
					neighborhood: "Centro",
					street: "Reforma 456",
					externalNumber: "200",
					postalCode: "06600",
				},
			});

			// Create an alert rule
			await prisma.alertRule.create({
				data: {
					id: "RULE002",
					name: "Test Rule 2",
					description: "Test rule 2",
					active: true,
					severity: "MEDIUM",
					ruleType: "transaction_amount_uma",
					isManualOnly: false,
					activityCode: "VEH",
					metadata: "{}",
				},
			});

			// Create a QUARTERLY report
			const periodStart = new Date("2024-01-01T00:00:00Z");
			const periodEnd = new Date("2024-03-31T23:59:59Z");

			const report = await prisma.report.create({
				data: {
					id: "RPT004",
					organizationId: testOrgId,
					name: "Test Quarterly Report",
					template: "CUSTOM",
					periodType: "QUARTERLY",
					status: "DRAFT",
					periodStart,
					periodEnd,
				},
			});

			// Create an alert assigned to this report
			await prisma.alert.create({
				data: {
					id: "ALRT002",
					organizationId: testOrgId,
					alertRuleId: "RULE002",
					clientId: "CLI002",
					severity: "MEDIUM",
					status: "DETECTED",
					reportId: report.id,
					isManual: false,
					contextHash: "hash456",
					idempotencyKey: "key456",
					metadata: "{}",
				},
			});

			const res = await SELF.fetch(
				`http://local.test/api/v1/reports/${report.id}/generate`,
				{
					method: "POST",
					headers: {
						Authorization: `Bearer ${testToken}`,
						"x-organization-id": testOrgId,
						"Content-Type": "application/json",
					},
				},
			);

			expect(res.status).toBe(200);

			const body = (await res.json()) as {
				message: string;
				reportId: string;
				alertCount: number;
				types: string[];
			};

			expect(body.types).toEqual(["PDF"]);
			expect(body.types).not.toContain("XML");
			expect(body.message).toContain("PDF generation complete");

			// Verify the report status was updated
			const updatedReport = await prisma.report.findUnique({
				where: { id: report.id },
			});

			expect(updatedReport!.status).toBe("GENERATED");
		});
	});
});
