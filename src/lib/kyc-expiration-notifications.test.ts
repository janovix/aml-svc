import { describe, it, expect, vi, beforeEach } from "vitest";
import { processKycExpirationNotifications } from "./kyc-expiration-notifications";
import type { Bindings } from "../types";
import type { PrismaClient } from "@prisma/client";

vi.mock("./prisma", () => ({
	getPrismaClient: vi.fn(),
}));

const { getPrismaClient } = await import("./prisma");

function makeMockEnv(overrides: Partial<Bindings> = {}): Bindings {
	return {
		NOTIFICATIONS_SERVICE: {
			notify: vi.fn().mockResolvedValue({ notificationId: "n1" }),
			sendEmail: vi.fn().mockResolvedValue({ success: true }),
		},
		CACHE: {
			get: vi.fn().mockResolvedValue(null),
			put: vi.fn().mockResolvedValue(undefined),
			delete: vi.fn(),
			list: vi.fn(),
			getWithMetadata: vi.fn(),
		},
		KYC_SELF_SERVICE_URL: "https://kyc.test.com",
		...overrides,
	} as unknown as Bindings;
}

function makeMockPrisma(
	sessions: Array<{
		id: string;
		organizationId: string;
		clientId: string;
		expiresAt: Date;
		emailSentAt: Date | null;
		token: string;
	}> = [],
	client: {
		email: string | null;
		firstName: string | null;
		lastName: string | null;
		businessName: string | null;
	} | null = null,
): PrismaClient {
	return {
		kycSession: {
			findMany: vi.fn().mockResolvedValue(sessions),
			updateMany: vi.fn().mockResolvedValue({ count: 0 }),
		},
		client: {
			findUnique: vi.fn().mockResolvedValue(client),
		},
	} as unknown as PrismaClient;
}

describe("processKycExpirationNotifications", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("bulk-expires stale sessions and returns early when NOTIFICATIONS_SERVICE is not bound", async () => {
		const mockPrisma = makeMockPrisma();
		(
			mockPrisma.kycSession.updateMany as ReturnType<typeof vi.fn>
		).mockResolvedValue({ count: 3 });
		vi.mocked(getPrismaClient).mockReturnValue(mockPrisma);

		const env = makeMockEnv({ NOTIFICATIONS_SERVICE: undefined });
		const result = await processKycExpirationNotifications(env);

		expect(result.expiredCount).toBe(3);
		expect(result.notifiedCount).toBe(0);
	});

	it("returns 0 notified when no sessions are expiring soon", async () => {
		const mockPrisma = makeMockPrisma([]);
		vi.mocked(getPrismaClient).mockReturnValue(mockPrisma);
		const env = makeMockEnv();

		const result = await processKycExpirationNotifications(env);

		expect(result.notifiedCount).toBe(0);
	});

	it("sends org notification for a session expiring within 24h", async () => {
		const now = new Date("2025-06-10T12:00:00Z");
		const expiresAt = new Date("2025-06-11T06:00:00Z"); // 18h from now

		const mockPrisma = makeMockPrisma([
			{
				id: "kyc_sess_1",
				organizationId: "org_1",
				clientId: "cli_1",
				expiresAt,
				emailSentAt: null,
				token: "tok_abc",
			},
		]);
		vi.mocked(getPrismaClient).mockReturnValue(mockPrisma);
		const env = makeMockEnv();

		const result = await processKycExpirationNotifications(env, now);

		expect(result.notifiedCount).toBe(1);
		expect(env.NOTIFICATIONS_SERVICE!.notify).toHaveBeenCalledWith(
			expect.objectContaining({
				tenantId: "org_1",
				type: "aml.kyc.session_expiring",
				sourceService: "aml-svc",
			}),
		);
		// No email should be sent because emailSentAt is null (no email on file)
		expect(env.NOTIFICATIONS_SERVICE!.sendEmail).not.toHaveBeenCalled();
	});

	it("sends reminder email when session has emailSentAt and client has email", async () => {
		const now = new Date("2025-06-10T12:00:00Z");
		const expiresAt = new Date("2025-06-11T06:00:00Z");

		const mockPrisma = makeMockPrisma(
			[
				{
					id: "kyc_sess_2",
					organizationId: "org_2",
					clientId: "cli_2",
					expiresAt,
					emailSentAt: new Date("2025-06-08T10:00:00Z"),
					token: "tok_def",
				},
			],
			{
				email: "client@example.com",
				firstName: "Juan",
				lastName: "Pérez",
				businessName: null,
			},
		);
		vi.mocked(getPrismaClient).mockReturnValue(mockPrisma);
		const env = makeMockEnv();

		const result = await processKycExpirationNotifications(env, now);

		expect(result.notifiedCount).toBe(1);
		expect(env.NOTIFICATIONS_SERVICE!.sendEmail).toHaveBeenCalledWith(
			expect.objectContaining({
				to: { email: "client@example.com", name: "Juan Pérez" },
				tags: ["kyc_expiry_reminder"],
			}),
		);
	});

	it("skips sessions already deduplicated via KV", async () => {
		const now = new Date("2025-06-10T12:00:00Z");
		const expiresAt = new Date("2025-06-11T06:00:00Z");

		const mockPrisma = makeMockPrisma([
			{
				id: "kyc_sess_3",
				organizationId: "org_3",
				clientId: "cli_3",
				expiresAt,
				emailSentAt: null,
				token: "tok_ghi",
			},
		]);
		vi.mocked(getPrismaClient).mockReturnValue(mockPrisma);
		const env = makeMockEnv();
		(env.CACHE!.get as ReturnType<typeof vi.fn>).mockResolvedValue("1");

		const result = await processKycExpirationNotifications(env, now);

		expect(result.notifiedCount).toBe(0);
		expect(env.NOTIFICATIONS_SERVICE!.notify).not.toHaveBeenCalled();
	});

	it("stores dedup key in KV after successful notification", async () => {
		const now = new Date("2025-06-10T12:00:00Z");
		const expiresAt = new Date("2025-06-11T06:00:00Z");

		const mockPrisma = makeMockPrisma([
			{
				id: "kyc_sess_4",
				organizationId: "org_4",
				clientId: "cli_4",
				expiresAt,
				emailSentAt: null,
				token: "tok_jkl",
			},
		]);
		vi.mocked(getPrismaClient).mockReturnValue(mockPrisma);
		const env = makeMockEnv();

		await processKycExpirationNotifications(env, now);

		expect(env.CACHE!.put).toHaveBeenCalledWith(
			"kyc-expiry-notified:kyc_sess_4",
			"1",
			expect.objectContaining({ expirationTtl: 86_400 }),
		);
	});

	it("works without KV cache", async () => {
		const now = new Date("2025-06-10T12:00:00Z");
		const expiresAt = new Date("2025-06-11T06:00:00Z");

		const mockPrisma = makeMockPrisma([
			{
				id: "kyc_sess_5",
				organizationId: "org_5",
				clientId: "cli_5",
				expiresAt,
				emailSentAt: null,
				token: "tok_mno",
			},
		]);
		vi.mocked(getPrismaClient).mockReturnValue(mockPrisma);
		const env = makeMockEnv({ CACHE: undefined });

		const result = await processKycExpirationNotifications(env, now);

		expect(result.notifiedCount).toBe(1);
	});

	it("continues processing when one session fails", async () => {
		const now = new Date("2025-06-10T12:00:00Z");
		const expiresAt = new Date("2025-06-11T06:00:00Z");

		const mockPrisma = makeMockPrisma([
			{
				id: "kyc_sess_a",
				organizationId: "org_a",
				clientId: "cli_a",
				expiresAt,
				emailSentAt: null,
				token: "tok_a",
			},
			{
				id: "kyc_sess_b",
				organizationId: "org_b",
				clientId: "cli_b",
				expiresAt,
				emailSentAt: null,
				token: "tok_b",
			},
		]);
		vi.mocked(getPrismaClient).mockReturnValue(mockPrisma);
		const env = makeMockEnv();
		(env.NOTIFICATIONS_SERVICE!.notify as ReturnType<typeof vi.fn>)
			.mockRejectedValueOnce(new Error("boom"))
			.mockResolvedValueOnce({ notificationId: "n2" });

		const result = await processKycExpirationNotifications(env, now);

		expect(result.notifiedCount).toBe(1);
	});

	it("uses business name for email when available", async () => {
		const now = new Date("2025-06-10T12:00:00Z");
		const expiresAt = new Date("2025-06-11T06:00:00Z");

		const mockPrisma = makeMockPrisma(
			[
				{
					id: "kyc_sess_6",
					organizationId: "org_6",
					clientId: "cli_6",
					expiresAt,
					emailSentAt: new Date("2025-06-08T10:00:00Z"),
					token: "tok_pqr",
				},
			],
			{
				email: "corp@example.com",
				firstName: null,
				lastName: null,
				businessName: "ACME Corp",
			},
		);
		vi.mocked(getPrismaClient).mockReturnValue(mockPrisma);
		const env = makeMockEnv();

		await processKycExpirationNotifications(env, now);

		expect(env.NOTIFICATIONS_SERVICE!.sendEmail).toHaveBeenCalledWith(
			expect.objectContaining({
				to: { email: "corp@example.com", name: "ACME Corp" },
			}),
		);
	});

	it("sets severity to warning when less than 6h remain", async () => {
		const now = new Date("2025-06-10T12:00:00Z");
		const expiresAt = new Date("2025-06-10T16:00:00Z"); // 4h from now

		const mockPrisma = makeMockPrisma([
			{
				id: "kyc_sess_7",
				organizationId: "org_7",
				clientId: "cli_7",
				expiresAt,
				emailSentAt: null,
				token: "tok_stu",
			},
		]);
		vi.mocked(getPrismaClient).mockReturnValue(mockPrisma);
		const env = makeMockEnv();

		await processKycExpirationNotifications(env, now);

		expect(env.NOTIFICATIONS_SERVICE!.notify).toHaveBeenCalledWith(
			expect.objectContaining({
				severity: "warning",
			}),
		);
	});
});
