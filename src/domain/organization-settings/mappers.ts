import type { OrganizationSettings } from "@prisma/client";

import type { OrganizationSettingsEntity, SelfServiceMode } from "./types";

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

	return {
		id: prisma.id,
		organizationId: prisma.organizationId,
		obligatedSubjectKey: prisma.obligatedSubjectKey,
		activityKey: prisma.activityKey,
		selfServiceMode: (prisma.selfServiceMode as SelfServiceMode) ?? "automatic",
		selfServiceExpiryHours: prisma.selfServiceExpiryHours ?? 72,
		selfServiceSendEmail: prisma.selfServiceSendEmail ?? true,
		selfServiceRequiredSections,
		createdAt: prisma.createdAt.toISOString(),
		updatedAt: prisma.updatedAt.toISOString(),
	};
}
