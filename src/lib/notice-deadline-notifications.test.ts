import { describe, it, expect, vi, beforeEach } from "vitest";
import { processNoticeDeadlineNotifications } from "./notice-deadline-notifications";
import type { Bindings } from "../types";
import type { PrismaClient } from "@prisma/client";

vi.mock("./prisma", () => ({
	getPrismaClient: vi.fn(),
}));

const { getPrismaClient } = await import("./prisma");

function makeMockEnv(overrides: Partial<Bindings> = {}): Bindings {
	return {
		AUTH_SERVICE: {
			getOrganizationLanguage: vi.fn().mockResolvedValue("en"),
		},
		NOTIFICATIONS_SERVICE: {
			notify: vi.fn().mockResolvedValue({ success: true }),
			sendEmail: vi.fn(),
			broadcast: vi.fn(),
		},
		CACHE: {
			get: vi.fn().mockResolvedValue(null),
			put: vi.fn().mockResolvedValue(undefined),
			delete: vi.fn(),
			list: vi.fn(),
			getWithMetadata: vi.fn(),
		},
		...overrides,
	} as unknown as Bindings;
}

function makeMockPrisma(
	alertGroups: { organizationId: string; _count: { id: number } }[] = [],
): PrismaClient {
	return {
		alert: {
			groupBy: vi.fn().mockResolvedValue(alertGroups),
		},
	} as unknown as PrismaClient;
}

describe("processNoticeDeadlineNotifications", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns early when NOTIFICATIONS_SERVICE is not bound", async () => {
		const env = makeMockEnv({ NOTIFICATIONS_SERVICE: undefined });
		vi.mocked(getPrismaClient).mockReturnValue(makeMockPrisma());

		const result = await processNoticeDeadlineNotifications(env);

		expect(result).toEqual({ checked: 0, notified: 0 });
	});

	it("returns early when deadline is more than 3 days away", async () => {
		// Use a date where deadline is far away (Jan 1 — deadline is Jan 17, 16 days away)
		const now = new Date("2025-01-01T12:00:00Z");
		const env = makeMockEnv();
		const mockPrisma = makeMockPrisma();
		vi.mocked(getPrismaClient).mockReturnValue(mockPrisma);

		const result = await processNoticeDeadlineNotifications(env, now);

		expect(result).toEqual({ checked: 0, notified: 0 });
		expect(mockPrisma.alert.groupBy).not.toHaveBeenCalled();
	});

	it("returns early when deadline is past (daysLeft < 0)", async () => {
		// Use a date after the 17th but not yet producing a future deadline within range
		// Jan 20 — next period is Feb, deadline is Feb 17 = 28 days away
		const now = new Date("2025-01-20T12:00:00Z");
		const env = makeMockEnv();
		const mockPrisma = makeMockPrisma();
		vi.mocked(getPrismaClient).mockReturnValue(mockPrisma);

		const result = await processNoticeDeadlineNotifications(env, now);

		expect(result).toEqual({ checked: 0, notified: 0 });
	});

	it("returns 0 notified when no orgs have pending alerts", async () => {
		// Jan 14 — deadline is Jan 17, 3 days away
		const now = new Date("2025-01-14T12:00:00Z");
		const env = makeMockEnv();
		const mockPrisma = makeMockPrisma([]); // empty
		vi.mocked(getPrismaClient).mockReturnValue(mockPrisma);

		const result = await processNoticeDeadlineNotifications(env, now);

		expect(result).toEqual({ checked: 0, notified: 0 });
	});

	it("sends notification for orgs with pending alerts on deadline day", async () => {
		// Jan 17 at noon — deadline is today at 23:59:59 UTC, ~0 or 1 day left
		const now = new Date("2025-01-17T12:00:00Z");
		const env = makeMockEnv();
		const mockPrisma = makeMockPrisma([
			{ organizationId: "org-123", _count: { id: 3 } },
		]);
		vi.mocked(getPrismaClient).mockReturnValue(mockPrisma);

		const result = await processNoticeDeadlineNotifications(env, now);

		expect(result.checked).toBe(1);
		expect(result.notified).toBe(1);
		expect(env.NOTIFICATIONS_SERVICE!.notify).toHaveBeenCalledTimes(1);
		expect(env.NOTIFICATIONS_SERVICE!.notify).toHaveBeenCalledWith(
			expect.objectContaining({
				tenantId: "org-123",
				type: "aml.notice.deadline_reminder",
				sourceService: "aml-svc",
			}),
		);
	});

	it("sends notifications for multiple orgs", async () => {
		const now = new Date("2025-01-16T12:00:00Z"); // 1 day before deadline Jan 17
		const env = makeMockEnv();
		const mockPrisma = makeMockPrisma([
			{ organizationId: "org-a", _count: { id: 5 } },
			{ organizationId: "org-b", _count: { id: 2 } },
		]);
		vi.mocked(getPrismaClient).mockReturnValue(mockPrisma);

		const result = await processNoticeDeadlineNotifications(env, now);

		expect(result.checked).toBe(2);
		expect(result.notified).toBe(2);
		expect(env.NOTIFICATIONS_SERVICE!.notify).toHaveBeenCalledTimes(2);
	});

	it("skips orgs that have already been notified (KV dedup)", async () => {
		const now = new Date("2025-01-16T12:00:00Z");
		const env = makeMockEnv();
		(env.CACHE!.get as ReturnType<typeof vi.fn>).mockResolvedValue("1"); // already notified
		const mockPrisma = makeMockPrisma([
			{ organizationId: "org-123", _count: { id: 1 } },
		]);
		vi.mocked(getPrismaClient).mockReturnValue(mockPrisma);

		const result = await processNoticeDeadlineNotifications(env, now);

		expect(result.checked).toBe(1);
		expect(result.notified).toBe(0);
		expect(env.NOTIFICATIONS_SERVICE!.notify).not.toHaveBeenCalled();
	});

	it("stores dedup key in KV after successful notification", async () => {
		const now = new Date("2025-01-16T12:00:00Z");
		const env = makeMockEnv();
		const mockPrisma = makeMockPrisma([
			{ organizationId: "org-xyz", _count: { id: 1 } },
		]);
		vi.mocked(getPrismaClient).mockReturnValue(mockPrisma);

		await processNoticeDeadlineNotifications(env, now);

		expect(env.CACHE!.put).toHaveBeenCalledWith(
			expect.stringContaining("org-xyz"),
			"1",
			expect.objectContaining({ expirationTtl: expect.any(Number) }),
		);
	});

	it("continues processing other orgs when one notification fails", async () => {
		const now = new Date("2025-01-16T12:00:00Z");
		const env = makeMockEnv();
		(env.NOTIFICATIONS_SERVICE!.notify as ReturnType<typeof vi.fn>)
			.mockRejectedValueOnce(new Error("Service error"))
			.mockResolvedValueOnce({ success: true });
		const mockPrisma = makeMockPrisma([
			{ organizationId: "org-a", _count: { id: 1 } },
			{ organizationId: "org-b", _count: { id: 1 } },
		]);
		vi.mocked(getPrismaClient).mockReturnValue(mockPrisma);

		const result = await processNoticeDeadlineNotifications(env, now);

		expect(result.checked).toBe(2);
		expect(result.notified).toBe(1); // only org-b succeeded
	});

	it("works correctly without KV cache (CACHE not bound)", async () => {
		const now = new Date("2025-01-16T12:00:00Z");
		const env = makeMockEnv({ CACHE: undefined });
		const mockPrisma = makeMockPrisma([
			{ organizationId: "org-123", _count: { id: 2 } },
		]);
		vi.mocked(getPrismaClient).mockReturnValue(mockPrisma);

		const result = await processNoticeDeadlineNotifications(env, now);

		expect(result.checked).toBe(1);
		expect(result.notified).toBe(1);
	});

	it("handles December → January month rollover in getReportableMonth", async () => {
		// Dec 18 → next period is January of next year; deadline is Jan 17 = ~30 days away, skipped
		const now = new Date("2025-12-18T12:00:00Z");
		const env = makeMockEnv();
		const mockPrisma = makeMockPrisma();
		vi.mocked(getPrismaClient).mockReturnValue(mockPrisma);

		const result = await processNoticeDeadlineNotifications(env, now);

		// More than 3 days away, should return early
		expect(result).toEqual({ checked: 0, notified: 0 });
	});

	it("uses current month when day <= 17", async () => {
		// Jan 15 → current period is January, deadline is Jan 17 = 2 days away
		const now = new Date("2025-01-15T12:00:00Z");
		const env = makeMockEnv();
		const mockPrisma = makeMockPrisma([
			{ organizationId: "org-123", _count: { id: 1 } },
		]);
		vi.mocked(getPrismaClient).mockReturnValue(mockPrisma);

		const result = await processNoticeDeadlineNotifications(env, now);

		expect(result.notified).toBe(1);
		expect(env.NOTIFICATIONS_SERVICE!.notify).toHaveBeenCalledWith(
			expect.objectContaining({
				payload: expect.objectContaining({ month: 1 }), // January
			}),
		);
	});
});
