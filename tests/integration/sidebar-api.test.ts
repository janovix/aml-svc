import { SELF } from "cloudflare:test";
import { describe, expect, it, beforeEach, afterEach } from "vitest";
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

describe("Sidebar API (integration)", () => {
	let token: string;

	beforeEach(async () => {
		const kp = await getTestKeyPair();
		token = await createTestJWT(kp.privateKey, {
			sub: "test-user-id",
			email: "test@example.com",
			organizationId: "test-org-id",
		});
		clearJWKSCache();
	});

	afterEach(() => {
		clearJWKSCache();
	});

	it("returns badges shape", async () => {
		const res = await SELF.fetch("http://local.test/api/v1/sidebar/badges", {
			method: "GET",
			headers: { Authorization: `Bearer ${token}` },
		});
		expect(res.status).toBe(200);
		const body = (await res.json()) as {
			data: Record<string, number>;
		};
		expect(body.data).toMatchObject({
			alerts: expect.any(Number),
			notices: expect.any(Number),
			reports: expect.any(Number),
			riskModels: expect.any(Number),
			imports: expect.any(Number),
			training: expect.any(Number),
		});
	});
});
