import type { PrismaClient } from "@prisma/client";

import { generateId } from "../../lib/id-generator";
import type { TenantContext } from "../../lib/tenant-context";
import type { OrganizationSettingsEntity } from "./types";
import { mapPrismaOrganizationSettings } from "./mappers";

const WATCHLIST_DEFAULTS = {
	watchlistRescanEnabled: true,
	watchlistRescanIntervalDays: 30,
	watchlistRescanIncludeBcs: true,
	watchlistRescanNotifyOnStatusChange: true,
	watchlistRescanDailyCap: 500,
	watchlistRescanNotifyChannels: '["in_app"]',
	watchlistRescanSources: '["ofac","un","sat69b","pep","adverse_media"]',
} as const;

export class OrganizationSettingsRepository {
	constructor(private readonly prisma: PrismaClient) {}

	async findByOrganizationId(
		tenant: TenantContext,
	): Promise<OrganizationSettingsEntity | null> {
		const { organizationId } = tenant;
		const record = await this.prisma.organizationSettings.findUnique({
			where: { organizationId },
		});

		if (!record) {
			return null;
		}

		return mapPrismaOrganizationSettings(record);
	}

	async create(
		tenant: TenantContext,
		data: {
			obligatedSubjectKey: string;
			activityKey: string;
			selfServiceMode?: string;
			selfServiceExpiryHours?: number;
			selfServiceRequiredSections?: string[] | null;
			selfServiceSendEmail?: boolean;
			watchlistRescanEnabled?: boolean;
			watchlistRescanIntervalDays?: number;
			watchlistRescanIncludeBcs?: boolean;
			watchlistRescanNotifyOnStatusChange?: boolean;
			watchlistRescanDailyCap?: number;
			watchlistRescanNotifyChannels?: string[] | null;
			watchlistRescanSources?: string[] | null;
		},
	): Promise<OrganizationSettingsEntity> {
		const { organizationId } = tenant;
		const record = await this.prisma.organizationSettings.create({
			data: {
				id: generateId("ORGANIZATION_SETTINGS"),
				organizationId,
				obligatedSubjectKey: data.obligatedSubjectKey,
				activityKey: data.activityKey,
				selfServiceMode: data.selfServiceMode ?? "automatic",
				selfServiceExpiryHours: data.selfServiceExpiryHours ?? 72,
				selfServiceSendEmail: data.selfServiceSendEmail ?? true,
				selfServiceRequiredSections:
					data.selfServiceRequiredSections != null
						? JSON.stringify(data.selfServiceRequiredSections)
						: null,
				...WATCHLIST_DEFAULTS,
				...(data.watchlistRescanEnabled !== undefined && {
					watchlistRescanEnabled: data.watchlistRescanEnabled,
				}),
				...(data.watchlistRescanIntervalDays !== undefined && {
					watchlistRescanIntervalDays: data.watchlistRescanIntervalDays,
				}),
				...(data.watchlistRescanIncludeBcs !== undefined && {
					watchlistRescanIncludeBcs: data.watchlistRescanIncludeBcs,
				}),
				...(data.watchlistRescanNotifyOnStatusChange !== undefined && {
					watchlistRescanNotifyOnStatusChange:
						data.watchlistRescanNotifyOnStatusChange,
				}),
				...(data.watchlistRescanDailyCap !== undefined && {
					watchlistRescanDailyCap: data.watchlistRescanDailyCap,
				}),
				...(data.watchlistRescanNotifyChannels != null && {
					watchlistRescanNotifyChannels: JSON.stringify(
						data.watchlistRescanNotifyChannels,
					),
				}),
				...(data.watchlistRescanSources != null && {
					watchlistRescanSources: JSON.stringify(data.watchlistRescanSources),
				}),
			},
		});

		return mapPrismaOrganizationSettings(record);
	}

	async update(
		tenant: TenantContext,
		data: {
			obligatedSubjectKey?: string;
			activityKey?: string;
			selfServiceMode?: string;
			selfServiceExpiryHours?: number;
			selfServiceRequiredSections?: string[] | null;
			selfServiceSendEmail?: boolean;
			watchlistRescanEnabled?: boolean;
			watchlistRescanIntervalDays?: number;
			watchlistRescanIncludeBcs?: boolean;
			watchlistRescanNotifyOnStatusChange?: boolean;
			watchlistRescanDailyCap?: number;
			watchlistRescanNotifyChannels?: string[] | null;
			watchlistRescanSources?: string[] | null;
		},
	): Promise<OrganizationSettingsEntity> {
		const { organizationId } = tenant;
		const existing = await this.prisma.organizationSettings.findUnique({
			where: { organizationId },
			select: { id: true },
		});

		if (!existing) {
			throw new Error(
				`Organization settings not found for org ${organizationId}`,
			);
		}

		const record = await this.prisma.organizationSettings.update({
			where: { id: existing.id },
			data: {
				...(data.obligatedSubjectKey !== undefined && {
					obligatedSubjectKey: data.obligatedSubjectKey,
				}),
				...(data.activityKey !== undefined && {
					activityKey: data.activityKey,
				}),
				...(data.selfServiceMode !== undefined && {
					selfServiceMode: data.selfServiceMode,
				}),
				...(data.selfServiceExpiryHours !== undefined && {
					selfServiceExpiryHours: data.selfServiceExpiryHours,
				}),
				...(data.selfServiceSendEmail !== undefined && {
					selfServiceSendEmail: data.selfServiceSendEmail,
				}),
				...(data.selfServiceRequiredSections !== undefined && {
					selfServiceRequiredSections:
						data.selfServiceRequiredSections != null
							? JSON.stringify(data.selfServiceRequiredSections)
							: null,
				}),
				...(data.watchlistRescanEnabled !== undefined && {
					watchlistRescanEnabled: data.watchlistRescanEnabled,
				}),
				...(data.watchlistRescanIntervalDays !== undefined && {
					watchlistRescanIntervalDays: data.watchlistRescanIntervalDays,
				}),
				...(data.watchlistRescanIncludeBcs !== undefined && {
					watchlistRescanIncludeBcs: data.watchlistRescanIncludeBcs,
				}),
				...(data.watchlistRescanNotifyOnStatusChange !== undefined && {
					watchlistRescanNotifyOnStatusChange:
						data.watchlistRescanNotifyOnStatusChange,
				}),
				...(data.watchlistRescanDailyCap !== undefined && {
					watchlistRescanDailyCap: data.watchlistRescanDailyCap,
				}),
				...(data.watchlistRescanNotifyChannels !== undefined && {
					watchlistRescanNotifyChannels:
						data.watchlistRescanNotifyChannels != null
							? JSON.stringify(data.watchlistRescanNotifyChannels)
							: WATCHLIST_DEFAULTS.watchlistRescanNotifyChannels,
				}),
				...(data.watchlistRescanSources !== undefined && {
					watchlistRescanSources:
						data.watchlistRescanSources != null
							? JSON.stringify(data.watchlistRescanSources)
							: WATCHLIST_DEFAULTS.watchlistRescanSources,
				}),
			},
		});

		return mapPrismaOrganizationSettings(record);
	}

	async upsert(
		tenant: TenantContext,
		data: {
			obligatedSubjectKey: string;
			activityKey: string;
			selfServiceMode?: string;
			selfServiceExpiryHours?: number;
			selfServiceRequiredSections?: string[] | null;
			selfServiceSendEmail?: boolean;
			watchlistRescanEnabled?: boolean;
			watchlistRescanIntervalDays?: number;
			watchlistRescanIncludeBcs?: boolean;
			watchlistRescanNotifyOnStatusChange?: boolean;
			watchlistRescanDailyCap?: number;
			watchlistRescanNotifyChannels?: string[] | null;
			watchlistRescanSources?: string[] | null;
		},
	): Promise<OrganizationSettingsEntity> {
		const { organizationId } = tenant;
		const record = await this.prisma.organizationSettings.upsert({
			where: { organizationId },
			create: {
				id: generateId("ORGANIZATION_SETTINGS"),
				organizationId,
				obligatedSubjectKey: data.obligatedSubjectKey,
				activityKey: data.activityKey,
				selfServiceMode: data.selfServiceMode ?? "automatic",
				selfServiceExpiryHours: data.selfServiceExpiryHours ?? 72,
				selfServiceSendEmail: data.selfServiceSendEmail ?? true,
				selfServiceRequiredSections:
					data.selfServiceRequiredSections != null
						? JSON.stringify(data.selfServiceRequiredSections)
						: null,
				...WATCHLIST_DEFAULTS,
				...(data.watchlistRescanEnabled !== undefined && {
					watchlistRescanEnabled: data.watchlistRescanEnabled,
				}),
				...(data.watchlistRescanIntervalDays !== undefined && {
					watchlistRescanIntervalDays: data.watchlistRescanIntervalDays,
				}),
				...(data.watchlistRescanIncludeBcs !== undefined && {
					watchlistRescanIncludeBcs: data.watchlistRescanIncludeBcs,
				}),
				...(data.watchlistRescanNotifyOnStatusChange !== undefined && {
					watchlistRescanNotifyOnStatusChange:
						data.watchlistRescanNotifyOnStatusChange,
				}),
				...(data.watchlistRescanDailyCap !== undefined && {
					watchlistRescanDailyCap: data.watchlistRescanDailyCap,
				}),
				...(data.watchlistRescanNotifyChannels != null && {
					watchlistRescanNotifyChannels: JSON.stringify(
						data.watchlistRescanNotifyChannels,
					),
				}),
				...(data.watchlistRescanSources != null && {
					watchlistRescanSources: JSON.stringify(data.watchlistRescanSources),
				}),
			},
			update: {
				obligatedSubjectKey: data.obligatedSubjectKey,
				activityKey: data.activityKey,
				...(data.selfServiceMode !== undefined && {
					selfServiceMode: data.selfServiceMode,
				}),
				...(data.selfServiceExpiryHours !== undefined && {
					selfServiceExpiryHours: data.selfServiceExpiryHours,
				}),
				...(data.selfServiceSendEmail !== undefined && {
					selfServiceSendEmail: data.selfServiceSendEmail,
				}),
				...(data.selfServiceRequiredSections !== undefined && {
					selfServiceRequiredSections:
						data.selfServiceRequiredSections != null
							? JSON.stringify(data.selfServiceRequiredSections)
							: null,
				}),
				...(data.watchlistRescanEnabled !== undefined && {
					watchlistRescanEnabled: data.watchlistRescanEnabled,
				}),
				...(data.watchlistRescanIntervalDays !== undefined && {
					watchlistRescanIntervalDays: data.watchlistRescanIntervalDays,
				}),
				...(data.watchlistRescanIncludeBcs !== undefined && {
					watchlistRescanIncludeBcs: data.watchlistRescanIncludeBcs,
				}),
				...(data.watchlistRescanNotifyOnStatusChange !== undefined && {
					watchlistRescanNotifyOnStatusChange:
						data.watchlistRescanNotifyOnStatusChange,
				}),
				...(data.watchlistRescanDailyCap !== undefined && {
					watchlistRescanDailyCap: data.watchlistRescanDailyCap,
				}),
				...(data.watchlistRescanNotifyChannels !== undefined && {
					watchlistRescanNotifyChannels:
						data.watchlistRescanNotifyChannels != null
							? JSON.stringify(data.watchlistRescanNotifyChannels)
							: WATCHLIST_DEFAULTS.watchlistRescanNotifyChannels,
				}),
				...(data.watchlistRescanSources !== undefined && {
					watchlistRescanSources:
						data.watchlistRescanSources != null
							? JSON.stringify(data.watchlistRescanSources)
							: WATCHLIST_DEFAULTS.watchlistRescanSources,
				}),
			},
		});
		return mapPrismaOrganizationSettings(record);
	}
}
