import type { PrismaClient } from "@prisma/client";

import { generateId } from "../../lib/id-generator";
import type { OrganizationSettingsEntity } from "./types";
import { mapPrismaOrganizationSettings } from "./mappers";

export class OrganizationSettingsRepository {
	constructor(private readonly prisma: PrismaClient) {}

	async findByOrganizationId(
		organizationId: string,
	): Promise<OrganizationSettingsEntity | null> {
		const prisma = await this.prisma.organizationSettings.findUnique({
			where: { organizationId },
		});

		if (!prisma) {
			return null;
		}

		return mapPrismaOrganizationSettings(prisma);
	}

	async create(
		organizationId: string,
		data: {
			obligatedSubjectKey: string;
			activityKey: string;
			selfServiceMode?: string;
			selfServiceExpiryHours?: number;
			selfServiceRequiredSections?: string[] | null;
		},
	): Promise<OrganizationSettingsEntity> {
		const prisma = await this.prisma.organizationSettings.create({
			data: {
				id: generateId("ORGANIZATION_SETTINGS"),
				organizationId,
				obligatedSubjectKey: data.obligatedSubjectKey,
				activityKey: data.activityKey,
				selfServiceMode: data.selfServiceMode ?? "automatic",
				selfServiceExpiryHours: data.selfServiceExpiryHours ?? 72,
				selfServiceRequiredSections:
					data.selfServiceRequiredSections != null
						? JSON.stringify(data.selfServiceRequiredSections)
						: null,
			},
		});

		return mapPrismaOrganizationSettings(prisma);
	}

	async update(
		organizationId: string,
		data: {
			obligatedSubjectKey?: string;
			activityKey?: string;
			selfServiceMode?: string;
			selfServiceExpiryHours?: number;
			selfServiceRequiredSections?: string[] | null;
		},
	): Promise<OrganizationSettingsEntity> {
		const prisma = await this.prisma.organizationSettings.update({
			where: { organizationId },
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
				...(data.selfServiceRequiredSections !== undefined && {
					selfServiceRequiredSections:
						data.selfServiceRequiredSections != null
							? JSON.stringify(data.selfServiceRequiredSections)
							: null,
				}),
			},
		});

		return mapPrismaOrganizationSettings(prisma);
	}

	async upsert(
		organizationId: string,
		data: {
			obligatedSubjectKey: string;
			activityKey: string;
			selfServiceMode?: string;
			selfServiceExpiryHours?: number;
			selfServiceRequiredSections?: string[] | null;
		},
	): Promise<OrganizationSettingsEntity> {
		const prisma = await this.prisma.organizationSettings.upsert({
			where: { organizationId },
			create: {
				id: generateId("ORGANIZATION_SETTINGS"),
				organizationId,
				obligatedSubjectKey: data.obligatedSubjectKey,
				activityKey: data.activityKey,
				selfServiceMode: data.selfServiceMode ?? "automatic",
				selfServiceExpiryHours: data.selfServiceExpiryHours ?? 72,
				selfServiceRequiredSections:
					data.selfServiceRequiredSections != null
						? JSON.stringify(data.selfServiceRequiredSections)
						: null,
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
				...(data.selfServiceRequiredSections !== undefined && {
					selfServiceRequiredSections:
						data.selfServiceRequiredSections != null
							? JSON.stringify(data.selfServiceRequiredSections)
							: null,
				}),
			},
		});

		return mapPrismaOrganizationSettings(prisma);
	}
}
