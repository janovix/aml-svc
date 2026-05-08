import { SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";

describe("Internal E2E API (integration)", () => {
	it("401 without api key", async () => {
		const res = await SELF.fetch(
			"http://local.test/api/v1/internal/e2e/alert-thresholds",
		);
		expect(res.status).toBe(401);
	});

	it("returns threshold payload with valid key", async () => {
		const res = await SELF.fetch(
			"http://local.test/api/v1/internal/e2e/alert-thresholds",
			{
				headers: { "x-e2e-api-key": "test-e2e-api-key" },
			},
		);
		expect(res.status).toBe(200);
		const body = (await res.json()) as {
			umaDailyValue: number;
			byActivity: Record<string, unknown>;
		};
		expect(typeof body.umaDailyValue).toBe("number");
		expect(Object.keys(body.byActivity).length).toBeGreaterThan(0);
	});

	it("purge validates body", async () => {
		const res = await SELF.fetch(
			"http://local.test/api/v1/internal/e2e/purge",
			{
				method: "POST",
				headers: {
					"x-e2e-api-key": "test-e2e-api-key",
					"Content-Type": "application/json",
				},
				body: JSON.stringify({}),
			},
		);
		expect(res.status).toBe(400);
	});
});
