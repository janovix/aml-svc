import type { PrismaClient } from "@prisma/client";

import type { ComplianceOrganizationEntity } from "./types";
import { mapPrismaComplianceOrganization } from "./mappers";

export class ComplianceOrganizationRepository {
	constructor(private readonly prisma: PrismaClient) {}

	async findByUserId(
		userId: string,
	): Promise<ComplianceOrganizationEntity | null> {
		const prisma = await this.prisma.complianceOrganization.findUnique({
			where: { userId },
		});

		if (!prisma) {
			return null;
		}

		return mapPrismaComplianceOrganization(prisma);
	}

	async create(
		userId: string,
		data: {
			obligatedSubjectKey: string;
			activityKey: string;
		},
	): Promise<ComplianceOrganizationEntity> {
		const prisma = await this.prisma.complianceOrganization.create({
			data: {
				userId,
				obligatedSubjectKey: data.obligatedSubjectKey,
				activityKey: data.activityKey,
			},
		});

		return mapPrismaComplianceOrganization(prisma);
	}

	async update(
		userId: string,
		data: {
			obligatedSubjectKey?: string;
			activityKey?: string;
		},
	): Promise<ComplianceOrganizationEntity> {
		const prisma = await this.prisma.complianceOrganization.update({
			where: { userId },
			data: {
				...(data.obligatedSubjectKey !== undefined && {
					obligatedSubjectKey: data.obligatedSubjectKey,
				}),
				...(data.activityKey !== undefined && {
					activityKey: data.activityKey,
				}),
			},
		});

		return mapPrismaComplianceOrganization(prisma);
	}

	async upsert(
		userId: string,
		data: {
			obligatedSubjectKey: string;
			activityKey: string;
		},
	): Promise<ComplianceOrganizationEntity> {
		const prisma = await this.prisma.complianceOrganization.upsert({
			where: { userId },
			create: {
				userId,
				obligatedSubjectKey: data.obligatedSubjectKey,
				activityKey: data.activityKey,
			},
			update: {
				obligatedSubjectKey: data.obligatedSubjectKey,
				activityKey: data.activityKey,
			},
		});

		return mapPrismaComplianceOrganization(prisma);
	}
}
