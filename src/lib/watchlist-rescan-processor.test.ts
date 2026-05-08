import { describe, it, expect, vi, beforeEach } from "vitest";

import type { Bindings } from "../types";
import type { ScreeningRescanJob } from "./watchlist-rescan-types";

const triggerSearch = vi.fn();

vi.mock("./prisma", () => ({
	getPrismaClient: vi.fn(),
}));

vi.mock("./watchlist-search", () => ({
	createWatchlistSearchService: vi.fn(() => ({
		triggerSearch,
	})),
}));

vi.mock("./risk-queue", () => ({
	createRiskQueueService: vi.fn(() => ({
		queueScreeningRiskUpdate: vi.fn().mockResolvedValue(undefined),
	})),
}));

vi.mock("./screening-notifications", () => ({
	sendScreeningFlaggedNotification: vi.fn(),
	sendScreeningStatusChangedNotification: vi.fn(),
}));

import { getPrismaClient } from "./prisma";
import { processOneRescanJob } from "./watchlist-rescan-processor";

function baseOrgSettingsRow(overrides: Partial<Record<string, unknown>> = {}) {
	const now = new Date();
	return {
		id: "os-1",
		organizationId: "org-1",
		obligatedSubjectKey: "osk",
		activityKey: "act",
		selfServiceMode: "automatic",
		selfServiceExpiryHours: 72,
		selfServiceRequiredSections: null,
		selfServiceSendEmail: true,
		watchlistRescanEnabled: true,
		watchlistRescanIntervalDays: 30,
		watchlistRescanIncludeBcs: true,
		watchlistRescanNotifyOnStatusChange: true,
		watchlistRescanDailyCap: 500,
		watchlistRescanNotifyChannels: '["in_app"]',
		watchlistRescanSources: '["ofac","un","sat69b","pep","adverse_media"]',
		createdAt: now,
		updatedAt: now,
		...overrides,
	};
}

describe("processOneRescanJob", () => {
	const env = {
		DB: {} as D1Database,
		WATCHLIST_SERVICE: {} as Bindings["WATCHLIST_SERVICE"],
		RISK_ASSESSMENT_QUEUE: undefined,
	} as unknown as Bindings;

	const clientJob: ScreeningRescanJob = {
		kind: "client",
		organizationId: "org-1",
		entityId: "cli-1",
		triggeredBy: "scheduled",
	};

	beforeEach(() => {
		vi.clearAllMocks();
		triggerSearch.mockResolvedValue({
			queryId: "q-1",
			ofacCount: 0,
			unscCount: 0,
			sat69bCount: 0,
		});
	});

	it("returns early when organization settings are missing", async () => {
		vi.mocked(getPrismaClient).mockReturnValue({
			organizationSettings: {
				findUnique: vi.fn().mockResolvedValue(null),
			},
		} as never);

		await processOneRescanJob(env, clientJob);

		expect(triggerSearch).not.toHaveBeenCalled();
	});

	it("returns early when watchlist rescan is disabled", async () => {
		vi.mocked(getPrismaClient).mockReturnValue({
			organizationSettings: {
				findUnique: vi
					.fn()
					.mockResolvedValue(
						baseOrgSettingsRow({ watchlistRescanEnabled: false }),
					),
			},
		} as never);

		await processOneRescanJob(env, clientJob);

		expect(triggerSearch).not.toHaveBeenCalled();
	});

	it("throws when WATCHLIST_SERVICE binding is missing", async () => {
		vi.mocked(getPrismaClient).mockReturnValue({
			organizationSettings: {
				findUnique: vi.fn().mockResolvedValue(baseOrgSettingsRow()),
			},
		} as never);

		const envNoWl = { ...env, WATCHLIST_SERVICE: undefined } as Bindings;

		await expect(processOneRescanJob(envNoWl, clientJob)).rejects.toThrow(
			/WATCHLIST_SERVICE not configured/,
		);
	});

	it("returns early when client row is missing", async () => {
		vi.mocked(getPrismaClient).mockReturnValue({
			organizationSettings: {
				findUnique: vi.fn().mockResolvedValue(baseOrgSettingsRow()),
			},
			client: { findFirst: vi.fn().mockResolvedValue(null) },
			clientWatchlistScreening: {
				findFirst: vi.fn().mockResolvedValue(null),
			},
		} as never);

		await processOneRescanJob(env, clientJob);

		expect(triggerSearch).not.toHaveBeenCalled();
	});

	it("returns early when client has no searchable name", async () => {
		vi.mocked(getPrismaClient).mockReturnValue({
			organizationSettings: {
				findUnique: vi.fn().mockResolvedValue(baseOrgSettingsRow()),
			},
			client: {
				findFirst: vi.fn().mockResolvedValue({
					id: "cli-1",
					organizationId: "org-1",
					personType: "PHYSICAL",
					firstName: "",
					lastName: "",
					secondLastName: null,
					businessName: null,
					rfc: null,
					nationality: null,
					birthDate: null,
					isPEP: false,
					adverseMediaFlagged: false,
					screeningResult: "pending",
				}),
			},
			clientWatchlistScreening: {
				findFirst: vi.fn().mockResolvedValue(null),
			},
		} as never);

		await processOneRescanJob(env, clientJob);

		expect(triggerSearch).not.toHaveBeenCalled();
	});

	it("persists snapshot and updates client when search succeeds", async () => {
		const tx = {
			clientWatchlistScreening: {
				create: vi.fn().mockResolvedValue({}),
			},
			client: {
				update: vi.fn().mockResolvedValue({}),
			},
		};
		vi.mocked(getPrismaClient).mockReturnValue({
			organizationSettings: {
				findUnique: vi.fn().mockResolvedValue(baseOrgSettingsRow()),
			},
			client: {
				findFirst: vi.fn().mockResolvedValue({
					id: "cli-1",
					organizationId: "org-1",
					personType: "PHYSICAL",
					firstName: "Jane",
					lastName: "Doe",
					secondLastName: null,
					businessName: null,
					rfc: "RFC123",
					nationality: "MX",
					birthDate: new Date("1990-01-01"),
					isPEP: false,
					adverseMediaFlagged: false,
					screeningResult: "pending",
					ofacSanctioned: false,
					unscSanctioned: false,
					sat69bListed: false,
				}),
			},
			clientWatchlistScreening: {
				findFirst: vi.fn().mockResolvedValue(null),
			},
			$transaction: vi.fn(async (fn: (t: typeof tx) => Promise<void>) => {
				await fn(tx);
			}),
		} as never);

		await processOneRescanJob(env, clientJob);

		expect(triggerSearch).toHaveBeenCalledWith(
			expect.objectContaining({
				query: "Jane Doe",
				entityType: "person",
				entityId: "cli-1",
			}),
		);
		expect(tx.clientWatchlistScreening.create).toHaveBeenCalled();
		expect(tx.client.update).toHaveBeenCalled();
	});

	it("throws when watchlist returns null (after error snapshot)", async () => {
		triggerSearch.mockResolvedValue(null);
		const createSnapshot = vi.fn().mockResolvedValue({});
		vi.mocked(getPrismaClient).mockReturnValue({
			organizationSettings: {
				findUnique: vi.fn().mockResolvedValue(baseOrgSettingsRow()),
			},
			client: {
				findFirst: vi.fn().mockResolvedValue({
					id: "cli-1",
					organizationId: "org-1",
					personType: "LEGAL",
					firstName: null,
					lastName: null,
					secondLastName: null,
					businessName: "Acme SA",
					rfc: null,
					nationality: null,
					birthDate: null,
					isPEP: false,
					adverseMediaFlagged: false,
					screeningResult: "pending",
					ofacSanctioned: false,
					unscSanctioned: false,
					sat69bListed: false,
				}),
			},
			clientWatchlistScreening: {
				findFirst: vi.fn().mockResolvedValue(null),
				create: createSnapshot,
			},
		} as never);

		await expect(processOneRescanJob(env, clientJob)).rejects.toThrow(
			/Watchlist search returned null/,
		);
		expect(createSnapshot).toHaveBeenCalled();
	});

	it("returns early for BC when row missing", async () => {
		const bcJob: ScreeningRescanJob = {
			kind: "bc",
			organizationId: "org-1",
			entityId: "bc-1",
			triggeredBy: "scheduled",
		};
		vi.mocked(getPrismaClient).mockReturnValue({
			organizationSettings: {
				findUnique: vi.fn().mockResolvedValue(baseOrgSettingsRow()),
			},
			beneficialController: {
				findFirst: vi.fn().mockResolvedValue(null),
			},
			clientWatchlistScreening: {
				findFirst: vi.fn().mockResolvedValue(null),
			},
		} as never);

		await processOneRescanJob(env, bcJob);

		expect(triggerSearch).not.toHaveBeenCalled();
	});
});
