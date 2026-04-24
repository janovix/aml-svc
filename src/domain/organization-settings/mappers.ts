import type { OrganizationSettings } from "@prisma/client";

import type {
	OrganizationSettingsEntity,
	SelfServiceMode,
	WatchlistRescanChannel,
	WatchlistRescanSource,
} from "./types";

const DEFAULT_CHANNELS: WatchlistRescanChannel[] = ["in_app"];
const DEFAULT_SOURCES: WatchlistRescanSource[] = [
	"ofac",
	"un",
	"sat69b",
	"pep",
	"adverse_media",
];

function parseJsonArray<T>(raw: string | null | undefined, fallback: T[]): T[] {
	if (!raw) return fallback;
	try {
		const p = JSON.parse(raw) as unknown;
		if (!Array.isArray(p)) return fallback;
		return p as T[];
	} catch {
		return fallback;
	}
}

export function mapPrismaOrganizationSettings(
	prisma: OrganizationSettings,
): OrganizationSettingsEntity {
	let selfServiceRequiredSections: string[] | null = null;
	if (prisma.selfServiceRequiredSections) {
		try {
			selfServiceRequiredSections = JSON.parse(
				prisma.selfServiceRequiredSections,
			) as string[];
		} catch {
			selfServiceRequiredSections = null;
		}
	}

	const watchlistRescanNotifyChannels = parseJsonArray<WatchlistRescanChannel>(
		prisma.watchlistRescanNotifyChannels,
		DEFAULT_CHANNELS,
	);
	const watchlistRescanSources = parseJsonArray<WatchlistRescanSource>(
		prisma.watchlistRescanSources,
		DEFAULT_SOURCES,
	);

	return {
		id: prisma.id,
		organizationId: prisma.organizationId,
		obligatedSubjectKey: prisma.obligatedSubjectKey,
		activityKey: prisma.activityKey,
		selfServiceMode: (prisma.selfServiceMode as SelfServiceMode) ?? "automatic",
		selfServiceExpiryHours: prisma.selfServiceExpiryHours ?? 72,
		selfServiceSendEmail: prisma.selfServiceSendEmail ?? true,
		selfServiceRequiredSections,
		watchlistRescanEnabled: prisma.watchlistRescanEnabled ?? true,
		watchlistRescanIntervalDays: prisma.watchlistRescanIntervalDays ?? 30,
		watchlistRescanIncludeBcs: prisma.watchlistRescanIncludeBcs ?? true,
		watchlistRescanNotifyOnStatusChange:
			prisma.watchlistRescanNotifyOnStatusChange ?? true,
		watchlistRescanDailyCap: prisma.watchlistRescanDailyCap ?? 500,
		watchlistRescanNotifyChannels:
			watchlistRescanNotifyChannels.length > 0
				? watchlistRescanNotifyChannels
				: DEFAULT_CHANNELS,
		watchlistRescanSources:
			watchlistRescanSources.length > 0
				? watchlistRescanSources
				: DEFAULT_SOURCES,
		createdAt: prisma.createdAt.toISOString(),
		updatedAt: prisma.updatedAt.toISOString(),
	};
}
