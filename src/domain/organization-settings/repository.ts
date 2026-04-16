import type { PrismaClient } from "@prisma/client";

import { generateId } from "../../lib/id-generator";
import type { TenantContext } from "../../lib/tenant-context";
import type { OrganizationSettingsEntity } from "./types";
import { mapPrismaOrganizationSettings } from "./mappers";

export class OrganizationSettingsRepository {
	constructor(private readonly prisma: PrismaClient) {}

	async findByOrganizationId(
		tenant: TenantContext,
	): Promise<OrganizationSettingsEntity | null> {
		const { organizationId, environment } = tenant;
		const record = await this.prisma.organizationSettings.findFirst({
			where: { organizationId, environment },
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
		},
	): Promise<OrganizationSettingsEntity> {
		const { organizationId, environment } = tenant;
		const record = await this.prisma.organizationSettings.create({
			data: {
				id: generateId("ORGANIZATION_SETTINGS"),
				organizationId,
				environment,
				obligatedSubjectKey: data.obligatedSubjectKey,
				activityKey: data.activityKey,
				selfServiceMode: data.selfServiceMode ?? "automatic",
				selfServiceExpiryHours: data.selfServiceExpiryHours ?? 72,
				selfServiceSendEmail: data.selfServiceSendEmail ?? true,
				selfServiceRequiredSections:
					data.selfServiceRequiredSections != null
						? JSON.stringify(data.selfServiceRequiredSections)
						: null,
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
		},
	): Promise<OrganizationSettingsEntity> {
		const { organizationId, environment } = tenant;
		const existing = await this.prisma.organizationSettings.findFirst({
			where: { organizationId, environment },
			select: { id: true },
		});

		if (!existing) {
			throw new Error(
				`Organization settings not found for org ${organizationId} env ${environment}`,
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
		},
	): Promise<OrganizationSettingsEntity> {
		const { organizationId, environment } = tenant;
		const existing = await this.prisma.organizationSettings.findFirst({
			where: { organizationId, environment },
			select: { id: true },
		});

		if (existing) {
			const record = await this.prisma.organizationSettings.update({
				where: { id: existing.id },
				data: {
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
				},
			});
			return mapPrismaOrganizationSettings(record);
		}

		const record = await this.prisma.organizationSettings.create({
			data: {
				id: generateId("ORGANIZATION_SETTINGS"),
				organizationId,
				environment,
				obligatedSubjectKey: data.obligatedSubjectKey,
				activityKey: data.activityKey,
				selfServiceMode: data.selfServiceMode ?? "automatic",
				selfServiceExpiryHours: data.selfServiceExpiryHours ?? 72,
				selfServiceSendEmail: data.selfServiceSendEmail ?? true,
				selfServiceRequiredSections:
					data.selfServiceRequiredSections != null
						? JSON.stringify(data.selfServiceRequiredSections)
						: null,
			},
		});
		return mapPrismaOrganizationSettings(record);
	}
}
