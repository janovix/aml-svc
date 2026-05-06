import type { OrganizationSettings } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

import type { Bindings } from "../types";

const mockGetPrismaClient = vi.hoisted(() => vi.fn());

vi.mock("./prisma", () => ({
	getPrismaClient: mockGetPrismaClient,
}));

import { processWatchlistRescan } from "./watchlist-rescan";

function orgSettingsRow(
	id: string,
	orgId: string,
	overrides: Partial<OrganizationSettings> = {},
): OrganizationSettings {
	const base = {
		id,
		organizationId: orgId,
		obligatedSubjectKey: "os",
		activityKey: "OTR",
		selfServiceMode: "automatic",
		selfServiceExpiryHours: 72,
		selfServiceRequiredSections: null,
		selfServiceSendEmail: true,
		watchlistRescanEnabled: true,
		watchlistRescanIntervalDays: 30,
		watchlistRescanIncludeBcs: false,
		watchlistRescanNotifyOnStatusChange: true,
		watchlistRescanDailyCap: 5,
		watchlistRescanNotifyChannels: '["in_app"]',
		watchlistRescanSources: '["ofac","un","sat69b","pep","adverse_media"]',
		createdAt: new Date("2025-01-01"),
		updatedAt: new Date("2025-01-02"),
	};
	return { ...base, ...overrides } as OrganizationSettings;
}

describe("processWatchlistRescan (mocked prisma)", () => {
	it("enqueues client jobs when queue is bound", async () => {
		const send = vi.fn().mockResolvedValue(undefined);
		const prisma = {
			organizationSettings: {
				findMany: vi.fn().mockResolvedValue([orgSettingsRow("os1", "org-a")]),
			},
			client: {
				findMany: vi.fn().mockResolvedValue([{ id: "client-1" }]),
			},
			beneficialController: {
				findMany: vi.fn(),
			},
		};
		mockGetPrismaClient.mockReturnValue(prisma);

		const scheduled = new Date("2025-06-15T12:00:00Z");
		const result = await processWatchlistRescan(
			{ AML_SCREENING_REFRESH_QUEUE: { send } } as unknown as Bindings,
			scheduled,
		);

		expect(result.organizationsProcessed).toBe(1);
		expect(result.enqueued).toBe(1);
		expect(send).toHaveBeenCalledWith(
			expect.objectContaining({
				kind: "client",
				organizationId: "org-a",
				entityId: "client-1",
				triggeredBy: "scheduled",
			}),
		);
		expect(prisma.beneficialController.findMany).not.toHaveBeenCalled();
	});

	it("fills remaining cap with BC rows when enabled", async () => {
		const send = vi.fn().mockResolvedValue(undefined);
		const prisma = {
			organizationSettings: {
				findMany: vi.fn().mockResolvedValue([
					orgSettingsRow("os1", "org-b", {
						watchlistRescanIncludeBcs: true,
						watchlistRescanDailyCap: 4,
					}),
				]),
			},
			client: {
				findMany: vi.fn().mockResolvedValue([{ id: "c1" }]),
			},
			beneficialController: {
				findMany: vi.fn().mockResolvedValue([{ id: "bc1" }, { id: "bc2" }]),
			},
		};
		mockGetPrismaClient.mockReturnValue(prisma);

		const result = await processWatchlistRescan(
			{ AML_SCREENING_REFRESH_QUEUE: { send } } as unknown as Bindings,
			new Date("2025-06-15T12:00:00Z"),
		);

		expect(result.enqueued).toBe(3);
		expect(send.mock.calls.length).toBe(3);
		expect(prisma.beneficialController.findMany).toHaveBeenCalled();
	});

	it("logs and continues when send rejects", async () => {
		const send = vi.fn().mockRejectedValue(new Error("queue down"));
		const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
		mockGetPrismaClient.mockReturnValue({
			organizationSettings: {
				findMany: vi.fn().mockResolvedValue([orgSettingsRow("os1", "org-x")]),
			},
			client: {
				findMany: vi.fn().mockResolvedValue([{ id: "c1" }]),
			},
			beneficialController: { findMany: vi.fn() },
		});

		const result = await processWatchlistRescan(
			{ AML_SCREENING_REFRESH_QUEUE: { send } } as unknown as Bindings,
			new Date("2025-06-15T12:00:00Z"),
		);

		expect(result.enqueued).toBe(0);
		expect(errSpy).toHaveBeenCalled();
		errSpy.mockRestore();
	});
});
