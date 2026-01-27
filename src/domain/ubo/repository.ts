import type { PrismaClient, Prisma } from "@prisma/client";
import {
	mapPrismaUBO,
	mapCreateInputToPrisma,
	mapUpdateInputToPrisma,
	mapPatchInputToPrisma,
} from "./mappers";
import type { UBOCreateInput, UBOUpdateInput, UBOPatchInput } from "./schemas";
import type { UBOEntity, UBORelationshipType, UBOListResult } from "./types";

export class UBORepository {
	constructor(private readonly prisma: PrismaClient) {}

	/**
	 * List UBOs for a client
	 */
	async list(
		clientId: string,
		relationshipType?: UBORelationshipType,
	): Promise<UBOListResult> {
		const where: Prisma.UltimateBeneficialOwnerWhereInput = {
			clientId,
		};

		if (relationshipType) {
			where.relationshipType = relationshipType;
		}

		const [records, total] = await Promise.all([
			this.prisma.ultimateBeneficialOwner.findMany({
				where,
				orderBy: [{ ownershipPercentage: "desc" }, { createdAt: "desc" }],
			}),
			this.prisma.ultimateBeneficialOwner.count({ where }),
		]);

		return {
			data: records.map(mapPrismaUBO),
			total,
		};
	}

	/**
	 * Get a single UBO by ID
	 */
	async getById(clientId: string, uboId: string): Promise<UBOEntity | null> {
		const record = await this.prisma.ultimateBeneficialOwner.findFirst({
			where: { id: uboId, clientId },
		});
		return record ? mapPrismaUBO(record) : null;
	}

	/**
	 * Create a new UBO
	 */
	async create(input: UBOCreateInput): Promise<UBOEntity> {
		const data = mapCreateInputToPrisma(input);
		const created = await this.prisma.ultimateBeneficialOwner.create({
			data,
		});
		return mapPrismaUBO(created);
	}

	/**
	 * Update a UBO (full update)
	 */
	async update(
		clientId: string,
		uboId: string,
		input: UBOUpdateInput,
	): Promise<UBOEntity> {
		await this.ensureExists(clientId, uboId);

		const updated = await this.prisma.ultimateBeneficialOwner.update({
			where: { id: uboId },
			data: mapUpdateInputToPrisma(input),
		});

		return mapPrismaUBO(updated);
	}

	/**
	 * Patch a UBO (partial update)
	 */
	async patch(
		clientId: string,
		uboId: string,
		input: UBOPatchInput,
	): Promise<UBOEntity> {
		await this.ensureExists(clientId, uboId);

		const updated = await this.prisma.ultimateBeneficialOwner.update({
			where: { id: uboId },
			data: mapPatchInputToPrisma(input),
		});

		return mapPrismaUBO(updated);
	}

	/**
	 * Delete a UBO
	 */
	async delete(clientId: string, uboId: string): Promise<void> {
		await this.ensureExists(clientId, uboId);
		await this.prisma.ultimateBeneficialOwner.delete({
			where: { id: uboId },
		});
	}

	/**
	 * Update PEP status for a UBO (used by internal API)
	 */
	async updatePEPStatus(
		uboId: string,
		data: {
			isPEP: boolean;
			pepStatus: "PENDING" | "CONFIRMED" | "NOT_PEP" | "ERROR";
			pepDetails?: string | null;
			pepMatchConfidence?: string | null;
			pepCheckedAt: Date;
		},
	): Promise<UBOEntity> {
		const updated = await this.prisma.ultimateBeneficialOwner.update({
			where: { id: uboId },
			data: {
				isPEP: data.isPEP,
				pepStatus: data.pepStatus,
				pepDetails: data.pepDetails ?? null,
				pepMatchConfidence: data.pepMatchConfidence ?? null,
				pepCheckedAt: data.pepCheckedAt,
			},
		});
		return mapPrismaUBO(updated);
	}

	/**
	 * Get UBOs with stale PEP checks (for cron refresh)
	 */
	async getStaleUBOs(
		threshold: Date,
		limit: number = 100,
	): Promise<Array<{ id: string; clientId: string; fullName: string }>> {
		const records = await this.prisma.ultimateBeneficialOwner.findMany({
			where: {
				OR: [{ pepCheckedAt: null }, { pepCheckedAt: { lt: threshold } }],
			},
			select: {
				id: true,
				clientId: true,
				firstName: true,
				lastName: true,
				secondLastName: true,
			},
			take: limit,
		});

		return records.map((r) => ({
			id: r.id,
			clientId: r.clientId,
			fullName: `${r.firstName} ${r.lastName} ${r.secondLastName || ""}`.trim(),
		}));
	}

	/**
	 * Ensure UBO exists and belongs to the client
	 */
	private async ensureExists(clientId: string, uboId: string): Promise<void> {
		const exists = await this.prisma.ultimateBeneficialOwner.findFirst({
			where: { id: uboId, clientId },
			select: { id: true },
		});

		if (!exists) {
			throw new Error("UBO_NOT_FOUND");
		}
	}
}
