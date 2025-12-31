import type { OrganizationSettings } from "@prisma/client";

import type { OrganizationSettingsEntity } from "./types";

export function mapPrismaOrganizationSettings(
	prisma: OrganizationSettings,
): OrganizationSettingsEntity {
	return {
		id: prisma.id,
		organizationId: prisma.organizationId,
		obligatedSubjectKey: prisma.obligatedSubjectKey,
		activityKey: prisma.activityKey,
		createdAt: prisma.createdAt.toISOString(),
		updatedAt: prisma.updatedAt.toISOString(),
	};
}
