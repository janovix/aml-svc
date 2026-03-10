import { env } from "cloudflare:test";
import { describe, it, expect, beforeEach } from "vitest";
import { maintenanceRouter } from "../../src/routes/internal-maintenance";
import { getPrismaClient } from "../../src/lib/prisma";
import type { Bindings } from "../../src/types";

const SECRET = "test-maintenance-secret";

function authRequest(path: string, query = "") {
	return maintenanceRouter.request(
		`${path}${query}`,
		{
			method: "POST",
			headers: { Authorization: `Bearer ${SECRET}` },
		},
		{ ...env, INTERNAL_SERVICE_SECRET: SECRET } as unknown as Bindings,
	);
}

const BASE_CLIENT = {
	rfc: "ABCD123456EF7",
	personType: "PHYSICAL" as const,
	firstName: "Test",
	lastName: "Client",
	email: "test@example.com",
	phone: "+521234567890",
	country: "MX",
	stateCode: "DIF",
	city: "CDMX",
	municipality: "CDMX",
	neighborhood: "Centro",
	street: "Calle 1",
	externalNumber: "10",
	postalCode: "06000",
};

describe("POST /recalculate-kyc (integration)", () => {
	let prisma: ReturnType<typeof getPrismaClient>;

	beforeEach(async () => {
		prisma = getPrismaClient(env.DB);
		await prisma.client.deleteMany({
			where: { organizationId: { startsWith: "maint-" } },
		});
	});

	it("returns 200 with correct shape when no clients exist", async () => {
		const res = await authRequest("/recalculate-kyc");
		expect(res.status).toBe(200);

		const body = (await res.json()) as {
			success: boolean;
			data: Record<string, unknown>;
		};
		expect(body.success).toBe(true);
		expect(typeof body.data.total).toBe("number");
		expect(typeof body.data.processed).toBe("number");
		expect(typeof body.data.errors).toBe("number");
		expect("nextOffset" in body.data).toBe(true);
	});

	it("processes a batch and returns correct nextOffset", async () => {
		for (let i = 0; i < 3; i++) {
			await prisma.client.create({
				data: {
					...BASE_CLIENT,
					id: `maint-client-${i}`,
					rfc: `MAINT${i.toString().padStart(9, "0")}A`,
					organizationId: "maint-org",
				},
			});
		}

		const res = await authRequest(
			"/recalculate-kyc",
			"?organizationId=maint-org&limit=2&offset=0",
		);
		expect(res.status).toBe(200);

		const body = (await res.json()) as {
			success: boolean;
			data: Record<string, unknown>;
		};
		expect(body.data.total).toBe(3);
		expect(body.data.processed).toBe(2);
		expect(body.data.nextOffset).toBe(2);
	});

	it("returns nextOffset=null on the last page", async () => {
		await prisma.client.create({
			data: {
				...BASE_CLIENT,
				id: "maint-single",
				rfc: "SINGLE12345AB",
				organizationId: "maint-org",
			},
		});

		const res = await authRequest(
			"/recalculate-kyc",
			"?organizationId=maint-org&limit=10&offset=0",
		);
		const body = (await res.json()) as {
			success: boolean;
			data: Record<string, unknown>;
		};
		expect(body.data.nextOffset).toBeNull();
	});

	it("filters by organizationId when provided", async () => {
		await prisma.client.createMany({
			data: [
				{
					...BASE_CLIENT,
					id: "maint-org-a-1",
					rfc: "ORGA12345678A",
					organizationId: "maint-org-a",
				},
				{
					...BASE_CLIENT,
					id: "maint-org-b-1",
					rfc: "ORGB12345678B",
					organizationId: "maint-org-b",
				},
			],
		});

		const res = await authRequest(
			"/recalculate-kyc",
			"?organizationId=maint-org-a",
		);
		const body = (await res.json()) as {
			success: boolean;
			data: Record<string, unknown>;
		};
		expect(body.data.total).toBe(1);
	});

	it("clamps limit to max 50 and respects default", async () => {
		const res = await authRequest(
			"/recalculate-kyc",
			"?organizationId=maint-org&limit=999",
		);
		expect(res.status).toBe(200);
		const body = (await res.json()) as {
			success: boolean;
			data: Record<string, unknown>;
		};
		expect(body.data).toMatchObject({ limit: 50 });
	});
});
