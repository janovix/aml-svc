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
			claveSujetoObligado: string;
			claveActividad: string;
		},
	): Promise<ComplianceOrganizationEntity> {
		const prisma = await this.prisma.complianceOrganization.create({
			data: {
				userId,
				claveSujetoObligado: data.claveSujetoObligado,
				claveActividad: data.claveActividad,
			},
		});

		return mapPrismaComplianceOrganization(prisma);
	}

	async update(
		userId: string,
		data: {
			claveSujetoObligado?: string;
			claveActividad?: string;
		},
	): Promise<ComplianceOrganizationEntity> {
		const prisma = await this.prisma.complianceOrganization.update({
			where: { userId },
			data: {
				...(data.claveSujetoObligado !== undefined && {
					claveSujetoObligado: data.claveSujetoObligado,
				}),
				...(data.claveActividad !== undefined && {
					claveActividad: data.claveActividad,
				}),
			},
		});

		return mapPrismaComplianceOrganization(prisma);
	}

	async upsert(
		userId: string,
		data: {
			claveSujetoObligado: string;
			claveActividad: string;
		},
	): Promise<ComplianceOrganizationEntity> {
		const prisma = await this.prisma.complianceOrganization.upsert({
			where: { userId },
			create: {
				userId,
				claveSujetoObligado: data.claveSujetoObligado,
				claveActividad: data.claveActividad,
			},
			update: {
				claveSujetoObligado: data.claveSujetoObligado,
				claveActividad: data.claveActividad,
			},
		});

		return mapPrismaComplianceOrganization(prisma);
	}
}
