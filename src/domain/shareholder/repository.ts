/**
 * Shareholder Domain Repository
 * Data access layer for shareholders
 */

import type { PrismaClient } from "@prisma/client";
import type {
	ShareholderEntity,
	ShareholderFilters,
	ShareholderListResult,
} from "./types.js";
import type {
	ShareholderCreateInput,
	ShareholderUpdateInput,
	ShareholderPatchInput,
} from "./schemas.js";
import {
	mapPrismaShareholder,
	mapCreateInputToPrisma,
	mapUpdateInputToPrisma,
	mapPatchInputToPrisma,
} from "./mappers.js";
import { generateId } from "../../lib/id-generator.js";
import { recalculateKycProgress } from "../client/kyc-progress.js";

export class ShareholderRepository {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	constructor(private readonly prisma: PrismaClient | any) {}

	async list(filters: ShareholderFilters): Promise<ShareholderListResult> {
		const where: {
			clientId: string;
			parentShareholderId?: string | null;
			entityType?: "PERSON" | "COMPANY";
		} = {
			clientId: filters.clientId,
		};

		if (filters.parentShareholderId !== undefined) {
			where.parentShareholderId = filters.parentShareholderId;
		}

		if (filters.entityType) {
			where.entityType = filters.entityType as "PERSON" | "COMPANY";
		}

		const [shareholders, total] = await Promise.all([
			(this.prisma as PrismaClient).shareholder.findMany({
				where,
				orderBy: { createdAt: "desc" },
			}),
			(this.prisma as PrismaClient).shareholder.count({ where }),
		]);

		return {
			data: shareholders.map(mapPrismaShareholder),
			total,
		};
	}

	async getById(
		clientId: string,
		shareholderId: string,
	): Promise<ShareholderEntity | null> {
		const shareholder = await (
			this.prisma as PrismaClient
		).shareholder.findFirst({
			where: {
				id: shareholderId,
				clientId,
			},
		});

		return shareholder ? mapPrismaShareholder(shareholder) : null;
	}

	async getByIdOnly(shareholderId: string): Promise<ShareholderEntity | null> {
		const shareholder = await (
			this.prisma as PrismaClient
		).shareholder.findUnique({
			where: { id: shareholderId },
		});

		return shareholder ? mapPrismaShareholder(shareholder) : null;
	}

	async create(
		clientId: string,
		input: ShareholderCreateInput,
	): Promise<ShareholderEntity> {
		const id = generateId("SHAREHOLDER");
		const data = mapCreateInputToPrisma(input);

		const shareholder = await (this.prisma as PrismaClient).shareholder.create({
			data: {
				id,
				...data,
				clientId,
			},
		});

		// Recalculate KYC progress after shareholder creation
		await recalculateKycProgress(this.prisma as PrismaClient, clientId);

		return mapPrismaShareholder(shareholder);
	}

	async update(
		clientId: string,
		shareholderId: string,
		input: ShareholderUpdateInput,
	): Promise<ShareholderEntity> {
		const data = mapUpdateInputToPrisma(input);

		const shareholder = await (this.prisma as PrismaClient).shareholder.update({
			where: { id: shareholderId, clientId },
			data,
		});

		return mapPrismaShareholder(shareholder);
	}

	async patch(
		clientId: string,
		shareholderId: string,
		input: ShareholderPatchInput,
	): Promise<ShareholderEntity> {
		const data = mapPatchInputToPrisma(input);

		const shareholder = await (this.prisma as PrismaClient).shareholder.update({
			where: { id: shareholderId, clientId },
			data,
		});

		return mapPrismaShareholder(shareholder);
	}

	async delete(clientId: string, shareholderId: string): Promise<void> {
		await (this.prisma as PrismaClient).shareholder.delete({
			where: { id: shareholderId, clientId },
		});

		// Recalculate KYC progress after shareholder deletion
		await recalculateKycProgress(this.prisma as PrismaClient, clientId);
	}

	async listByParent(
		parentShareholderId: string,
	): Promise<ShareholderListResult> {
		const shareholders = await (
			this.prisma as PrismaClient
		).shareholder.findMany({
			where: { parentShareholderId },
			orderBy: { createdAt: "desc" },
		});

		return {
			data: shareholders.map(mapPrismaShareholder),
			total: shareholders.length,
		};
	}

	async getSumOfOwnershipByParent(
		clientId: string,
		parentShareholderId: string | null,
	): Promise<number> {
		const result = await (this.prisma as PrismaClient).shareholder.aggregate({
			where: {
				clientId,
				parentShareholderId,
			},
			_sum: {
				ownershipPercentage: true,
			},
		});

		return Number(result._sum.ownershipPercentage ?? 0);
	}
}
