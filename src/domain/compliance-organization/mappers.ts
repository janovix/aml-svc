import type { Prisma } from "@prisma/client";

import type { ComplianceOrganizationEntity } from "./types";

export function mapPrismaComplianceOrganization(
	prisma: Prisma.ComplianceOrganizationGetPayload<Record<string, never>>,
): ComplianceOrganizationEntity {
	return {
		id: prisma.id,
		userId: prisma.userId,
		obligatedSubjectKey: prisma.obligatedSubjectKey,
		activityKey: prisma.activityKey,
		createdAt: prisma.createdAt.toISOString(),
		updatedAt: prisma.updatedAt.toISOString(),
	};
}

export function mapComplianceOrganizationCreateInputToPrisma(input: {
	userId: string;
	obligatedSubjectKey: string;
	activityKey: string;
}): Prisma.ComplianceOrganizationCreateInput {
	return {
		userId: input.userId,
		obligatedSubjectKey: input.obligatedSubjectKey,
		activityKey: input.activityKey,
	};
}

export function mapComplianceOrganizationUpdateInputToPrisma(input: {
	obligatedSubjectKey?: string;
	activityKey?: string;
}): Prisma.ComplianceOrganizationUpdateInput {
	const update: Prisma.ComplianceOrganizationUpdateInput = {};

	if (input.obligatedSubjectKey !== undefined) {
		update.obligatedSubjectKey = input.obligatedSubjectKey;
	}
	if (input.activityKey !== undefined) {
		update.activityKey = input.activityKey;
	}

	return update;
}
