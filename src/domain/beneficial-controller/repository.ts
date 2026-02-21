/**
 * Beneficial Controller Domain Repository
 * Data access layer for beneficial controllers
 */

import type { PrismaClient } from "@prisma/client";
import type {
	BeneficialControllerEntity,
	BeneficialControllerFilters,
	BeneficialControllerListResult,
} from "./types.js";
import type {
	BeneficialControllerCreateInput,
	BeneficialControllerUpdateInput,
	BeneficialControllerPatchInput,
} from "./schemas.js";
import {
	mapPrismaBC,
	mapCreateInputToPrisma,
	mapUpdateInputToPrisma,
	mapPatchInputToPrisma,
} from "./mappers.js";
import { generateId } from "../../lib/id-generator.js";
import { recalculateKycProgress } from "../client/kyc-progress.js";

export class BeneficialControllerRepository {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	constructor(private readonly prisma: PrismaClient | any) {}

	async list(
		filters: BeneficialControllerFilters,
	): Promise<BeneficialControllerListResult> {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const where: any = {
			clientId: filters.clientId,
		};

		if (filters.bcType) {
			where.bcType = filters.bcType;
		}

		if (filters.identificationCriteria) {
			where.identificationCriteria = filters.identificationCriteria;
		}

		if (filters.shareholderId) {
			where.shareholderId = filters.shareholderId;
		}

		const [bcs, total] = await Promise.all([
			(this.prisma as PrismaClient).beneficialController.findMany({
				where,
				orderBy: { createdAt: "desc" },
			}),
			(this.prisma as PrismaClient).beneficialController.count({ where }),
		]);

		return {
			data: bcs.map(mapPrismaBC),
			total,
		};
	}

	async getById(
		clientId: string,
		bcId: string,
	): Promise<BeneficialControllerEntity | null> {
		const bc = await (
			this.prisma as PrismaClient
		).beneficialController.findFirst({
			where: {
				id: bcId,
				clientId,
			},
		});

		return bc ? mapPrismaBC(bc) : null;
	}

	async getByIdOnly(bcId: string): Promise<BeneficialControllerEntity | null> {
		const bc = await (
			this.prisma as PrismaClient
		).beneficialController.findUnique({
			where: { id: bcId },
		});

		return bc ? mapPrismaBC(bc) : null;
	}

	async create(
		clientId: string,
		input: BeneficialControllerCreateInput,
	): Promise<BeneficialControllerEntity> {
		const id = generateId("BENEFICIAL_CONTROLLER");
		const data = mapCreateInputToPrisma(input);

		const bc = await (this.prisma as PrismaClient).beneficialController.create({
			data: {
				id,
				...data,
				clientId,
			},
		});

		// Recalculate KYC progress after BC creation
		await recalculateKycProgress(this.prisma as PrismaClient, clientId);

		return mapPrismaBC(bc);
	}

	async update(
		clientId: string,
		bcId: string,
		input: BeneficialControllerUpdateInput,
	): Promise<BeneficialControllerEntity> {
		const data = mapUpdateInputToPrisma(input);

		const bc = await (this.prisma as PrismaClient).beneficialController.update({
			where: { id: bcId, clientId },
			data,
		});

		// Recalculate KYC progress after BC update
		await recalculateKycProgress(this.prisma as PrismaClient, clientId);

		return mapPrismaBC(bc);
	}

	async patch(
		clientId: string,
		bcId: string,
		input: BeneficialControllerPatchInput,
	): Promise<BeneficialControllerEntity> {
		const data = mapPatchInputToPrisma(input);

		const bc = await (this.prisma as PrismaClient).beneficialController.update({
			where: { id: bcId, clientId },
			data,
		});

		// Recalculate KYC progress after BC patch
		await recalculateKycProgress(this.prisma as PrismaClient, clientId);

		return mapPrismaBC(bc);
	}

	async delete(clientId: string, bcId: string): Promise<void> {
		await (this.prisma as PrismaClient).beneficialController.delete({
			where: { id: bcId, clientId },
		});

		// Recalculate KYC progress after BC deletion
		await recalculateKycProgress(this.prisma as PrismaClient, clientId);
	}

	async findByShareholderId(
		shareholderId: string,
	): Promise<BeneficialControllerListResult> {
		const bcs = await (
			this.prisma as PrismaClient
		).beneficialController.findMany({
			where: { shareholderId },
			orderBy: { createdAt: "desc" },
		});

		return {
			data: bcs.map(mapPrismaBC),
			total: bcs.length,
		};
	}

	async updateScreening(
		bcId: string,
		data: {
			watchlistQueryId?: string;
			ofacSanctioned?: boolean;
			unscSanctioned?: boolean;
			sat69bListed?: boolean;
			adverseMediaFlagged?: boolean;
			isPEP?: boolean;
			screeningResult?: string;
			screenedAt?: Date;
		},
	): Promise<BeneficialControllerEntity> {
		const bc = await (this.prisma as PrismaClient).beneficialController.update({
			where: { id: bcId },
			data,
		});

		return mapPrismaBC(bc);
	}
}
