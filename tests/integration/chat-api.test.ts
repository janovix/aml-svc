import { SELF, env } from "cloudflare:test";
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { SignJWT } from "jose";
import { clearJWKSCache } from "../../src/middleware/auth";
import { getPrismaClient } from "../../src/lib/prisma";
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

describe("Chat API (integration)", () => {
	const orgId = "test-org-id";

	let token: string;

	beforeEach(async () => {
		const kp = await getTestKeyPair();
		token = await createTestJWT(kp.privateKey, {
			sub: "test-user-id",
			email: "test@example.com",
			organizationId: orgId,
		});
		clearJWKSCache();

		const prisma = getPrismaClient(env.DB);
		await prisma.chatAbuseEvent.deleteMany({
			where: { organizationId: orgId },
		});
		await prisma.chatThread.deleteMany({ where: { organizationId: orgId } });
	});

	afterEach(() => {
		clearJWKSCache();
	});

	it("401 without auth", async () => {
		const res = await SELF.fetch("http://local.test/api/v1/chat/threads", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: "{}",
		});
		expect(res.status).toBe(401);
	});

	it("creates and lists threads", async () => {
		const create = await SELF.fetch("http://local.test/api/v1/chat/threads", {
			method: "POST",
			headers: {
				Authorization: `Bearer ${token}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ title: "t1", model: "m1" }),
		});
		expect(create.status).toBe(201);
		const created = (await create.json()) as { id: string };

		const list = await SELF.fetch("http://local.test/api/v1/chat/threads", {
			method: "GET",
			headers: { Authorization: `Bearer ${token}` },
		});
		expect(list.status).toBe(200);
		const body = (await list.json()) as {
			threads: Array<{ id: string }>;
		};
		expect(body.threads.some((t) => t.id === created.id)).toBe(true);
	});

	it("posts abuse-event without thread", async () => {
		const res = await SELF.fetch("http://local.test/api/v1/chat/abuse-events", {
			method: "POST",
			headers: {
				Authorization: `Bearer ${token}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ kind: "test_guardrail" }),
		});
		expect(res.status).toBe(201);
	});
});
