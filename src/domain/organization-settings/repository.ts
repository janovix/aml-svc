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
		},
	): Promise<OrganizationSettingsEntity> {
		const prisma = await this.prisma.organizationSettings.create({
			data: {
				id: generateId("ORGANIZATION_SETTINGS"),
				organizationId,
				obligatedSubjectKey: data.obligatedSubjectKey,
				activityKey: data.activityKey,
			},
		});

		return mapPrismaOrganizationSettings(prisma);
	}

	async update(
		organizationId: string,
		data: {
			obligatedSubjectKey?: string;
			activityKey?: string;
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
			},
		});

		return mapPrismaOrganizationSettings(prisma);
	}

	async upsert(
		organizationId: string,
		data: {
			obligatedSubjectKey: string;
			activityKey: string;
		},
	): Promise<OrganizationSettingsEntity> {
		const prisma = await this.prisma.organizationSettings.upsert({
			where: { organizationId },
			create: {
				id: generateId("ORGANIZATION_SETTINGS"),
				organizationId,
				obligatedSubjectKey: data.obligatedSubjectKey,
				activityKey: data.activityKey,
			},
			update: {
				obligatedSubjectKey: data.obligatedSubjectKey,
				activityKey: data.activityKey,
			},
		});

		return mapPrismaOrganizationSettings(prisma);
	}
}
