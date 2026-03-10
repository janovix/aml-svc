import { describe, it, expect } from "vitest";
import { maintenanceRouter } from "./internal-maintenance";
import type { Bindings } from "../types";

function makeEnv(overrides: Partial<Bindings> = {}): Bindings {
	return {
		INTERNAL_SERVICE_SECRET: "test-secret",
		...overrides,
	} as unknown as Bindings;
}

describe("maintenanceRouter authentication middleware", () => {
	it("returns 503 when INTERNAL_SERVICE_SECRET is not configured", async () => {
		const env = makeEnv({ INTERNAL_SERVICE_SECRET: undefined });

		const res = await maintenanceRouter.request(
			"/recalculate-kyc",
			{ method: "POST" },
			env,
		);

		expect(res.status).toBe(503);
		const body = await res.json();
		expect(body).toMatchObject({
			success: false,
			error: "Service not configured",
		});
	});

	it("returns 401 when Authorization header is missing", async () => {
		const env = makeEnv();

		const res = await maintenanceRouter.request(
			"/recalculate-kyc",
			{ method: "POST" },
			env,
		);

		expect(res.status).toBe(401);
		const body = await res.json();
		expect(body).toMatchObject({ success: false, error: "Unauthorized" });
	});

	it("returns 401 when Authorization token is wrong", async () => {
		const env = makeEnv();

		const res = await maintenanceRouter.request(
			"/recalculate-kyc",
			{
				method: "POST",
				headers: { Authorization: "Bearer wrong-token" },
			},
			env,
		);

		expect(res.status).toBe(401);
		const body = await res.json();
		expect(body).toMatchObject({ success: false, error: "Unauthorized" });
	});
});
