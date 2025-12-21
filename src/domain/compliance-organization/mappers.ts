import type { Prisma } from "@prisma/client";

import type { ComplianceOrganizationEntity } from "./types";

export function mapPrismaComplianceOrganization(
	prisma: Prisma.ComplianceOrganizationGetPayload<Record<string, never>>,
): ComplianceOrganizationEntity {
	return {
		id: prisma.id,
		userId: prisma.userId,
		claveSujetoObligado: prisma.claveSujetoObligado,
		claveActividad: prisma.claveActividad,
		createdAt: prisma.createdAt.toISOString(),
		updatedAt: prisma.updatedAt.toISOString(),
	};
}

export function mapComplianceOrganizationCreateInputToPrisma(input: {
	userId: string;
	claveSujetoObligado: string;
	claveActividad: string;
}): Prisma.ComplianceOrganizationCreateInput {
	return {
		userId: input.userId,
		claveSujetoObligado: input.claveSujetoObligado,
		claveActividad: input.claveActividad,
	};
}

export function mapComplianceOrganizationUpdateInputToPrisma(input: {
	claveSujetoObligado?: string;
	claveActividad?: string;
}): Prisma.ComplianceOrganizationUpdateInput {
	const update: Prisma.ComplianceOrganizationUpdateInput = {};

	if (input.claveSujetoObligado !== undefined) {
		update.claveSujetoObligado = input.claveSujetoObligado;
	}
	if (input.claveActividad !== undefined) {
		update.claveActividad = input.claveActividad;
	}

	return update;
}
