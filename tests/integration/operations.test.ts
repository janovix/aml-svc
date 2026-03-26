import { SELF, env } from "cloudflare:test";
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { getPrismaClient } from "../../src/lib/prisma";
import { SignJWT } from "jose";
import { clearJWKSCache } from "../../src/middleware/auth";
import { getTestKeyPair } from "../helpers/test-auth";

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

describe("Operations API", () => {
	let testToken: string;
	// Must match auth middleware test bypass: c.set("organization", { id: "test-org-id" })
	const testOrgId = "test-org-id";

	beforeEach(async () => {
		const testKeyPair = await getTestKeyPair();
		testToken = await createTestJWT(testKeyPair.privateKey, {
			sub: "test-user-id",
			email: "test@example.com",
			organizationId: testOrgId,
		});
		clearJWKSCache();

		const prisma = getPrismaClient(env.DB);
		await prisma.alert.deleteMany({ where: { organizationId: testOrgId } });
		await prisma.operationVehicle.deleteMany({
			where: { operation: { organizationId: testOrgId } },
		});
		await prisma.operationPayment.deleteMany({
			where: { operation: { organizationId: testOrgId } },
		});
		await prisma.operation.deleteMany({
			where: { organizationId: testOrgId },
		});
		await prisma.client.deleteMany({
			where: { organizationId: testOrgId },
		});
	});

	afterEach(() => {
		clearJWKSCache();
	});

	describe("GET /api/v1/operations/stats", () => {
		it("returns 401 without Authorization", async () => {
			const res = await SELF.fetch(
				"http://local.test/api/v1/operations/stats",
				{ method: "GET" },
			);
			expect(res.status).toBe(401);
		});

		it("returns API contract shape with zero counts when no data", async () => {
			const res = await SELF.fetch(
				"http://local.test/api/v1/operations/stats",
				{
					method: "GET",
					headers: {
						Authorization: `Bearer ${testToken}`,
						"x-organization-id": testOrgId,
					},
				},
			);
			expect(res.status).toBe(200);

			const body = (await res.json()) as {
				operationsToday: number;
				suspiciousOperations: number;
				totalVolume: string;
				totalOperations: number;
				completeCount?: number;
				incompleteCount?: number;
			};

			expect(body).toHaveProperty("operationsToday");
			expect(body).toHaveProperty("suspiciousOperations");
			expect(body).toHaveProperty("totalVolume");
			expect(body).toHaveProperty("totalOperations");
			expect(typeof body.operationsToday).toBe("number");
			expect(typeof body.suspiciousOperations).toBe("number");
			expect(typeof body.totalVolume).toBe("string");
			expect(typeof body.totalOperations).toBe("number");

			expect(body.operationsToday).toBe(0);
			expect(body.suspiciousOperations).toBe(0);
			expect(body.totalVolume).toBe("0.00");
			expect(body.totalOperations).toBe(0);
			expect(body.completeCount).toBe(0);
			expect(body.incompleteCount).toBe(0);
		});

		it("returns non-zero stats after creating operations", async () => {
			const prisma = getPrismaClient(env.DB);

			await prisma.client.create({
				data: {
					id: "client-ops-1",
					organizationId: testOrgId,
					rfc: "XAXX010101000",
					personType: "PHYSICAL",
					firstName: "Test",
					lastName: "Client",
					country: "MX",
					nationality: "MX",
					email: "test@test.com",
					phone: "5555555555",
					stateCode: "CMX",
					city: "CDMX",
					municipality: "Cuauhtemoc",
					neighborhood: "Centro",
					street: "Reforma 1",
					externalNumber: "1",
					postalCode: "06600",
				},
			});

			await prisma.operation.create({
				data: {
					id: "op-1",
					organizationId: testOrgId,
					clientId: "client-ops-1",
					activityCode: "INM",
					operationTypeCode: "VENTA",
					operationDate: new Date(),
					branchPostalCode: "06600",
					amount: "1000000",
					currencyCode: "MXN",
					amountMxn: "1000000",
					dataSource: "MANUAL",
					completenessStatus: "COMPLETE",
				},
			});

			await prisma.operation.create({
				data: {
					id: "op-2",
					organizationId: testOrgId,
					clientId: "client-ops-1",
					activityCode: "INM",
					operationTypeCode: "VENTA",
					operationDate: new Date(),
					branchPostalCode: "06600",
					amount: "500000",
					currencyCode: "MXN",
					amountMxn: "500000",
					dataSource: "MANUAL",
					completenessStatus: "INCOMPLETE",
				},
			});

			const res = await SELF.fetch(
				"http://local.test/api/v1/operations/stats",
				{
					method: "GET",
					headers: {
						Authorization: `Bearer ${testToken}`,
						"x-organization-id": testOrgId,
					},
				},
			);
			expect(res.status).toBe(200);

			const body = (await res.json()) as {
				operationsToday: number;
				suspiciousOperations: number;
				totalVolume: string;
				totalOperations: number;
				completeCount?: number;
				incompleteCount?: number;
			};

			expect(body.operationsToday).toBeGreaterThanOrEqual(0);
			expect(typeof body.totalVolume).toBe("string");
			expect(body.totalOperations).toBe(2);
			expect(body.completeCount).toBe(1);
			expect(body.incompleteCount).toBe(1);
		});
	});
});
