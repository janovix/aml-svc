import type { Prisma, PrismaClient } from "@prisma/client";

import {
	mapCreateInputToPrisma,
	mapPrismaTransaction,
	mapUpdateInputToPrisma,
	toPrismaOperationType,
	toPrismaVehicleType,
} from "./mappers";
import type {
	TransactionCreateInput,
	TransactionFilters,
	TransactionUpdateInput,
} from "./schemas";
import type { TransactionEntity, TransactionListResult } from "./types";

export class TransactionRepository {
	constructor(private readonly prisma: PrismaClient) {}

	async list(filters: TransactionFilters): Promise<TransactionListResult> {
		const {
			page,
			limit,
			clientId,
			operationType,
			vehicleType,
			startDate,
			endDate,
			branchPostalCode,
		} = filters;

		const where: Prisma.TransactionWhereInput = {
			deletedAt: null,
		};

		if (clientId) {
			where.clientId = clientId;
		}

		if (operationType) {
			where.operationType = toPrismaOperationType(operationType);
		}

		if (vehicleType) {
			where.vehicleType = toPrismaVehicleType(vehicleType);
		}

		if (branchPostalCode) {
			where.branchPostalCode = branchPostalCode;
		}

		if (startDate || endDate) {
			const dateRange: Prisma.DateTimeFilter = {};
			if (startDate) {
				dateRange.gte = new Date(startDate);
			}
			if (endDate) {
				dateRange.lte = new Date(endDate);
			}
			where.operationDate = dateRange;
		}

		const [total, records] = await Promise.all([
			this.prisma.transaction.count({ where }),
			this.prisma.transaction.findMany({
				where,
				skip: (page - 1) * limit,
				take: limit,
				orderBy: { operationDate: "desc" },
			}),
		]);

		const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

		return {
			data: records.map(mapPrismaTransaction),
			pagination: {
				page,
				limit,
				total,
				totalPages,
			},
		};
	}

	async getById(id: string): Promise<TransactionEntity | null> {
		const record = await this.prisma.transaction.findFirst({
			where: { id, deletedAt: null },
		});

		return record ? mapPrismaTransaction(record) : null;
	}

	async create(input: TransactionCreateInput): Promise<TransactionEntity> {
		const created = await this.prisma.transaction.create({
			data: mapCreateInputToPrisma(input),
		});
		return mapPrismaTransaction(created);
	}

	async update(
		id: string,
		input: TransactionUpdateInput,
	): Promise<TransactionEntity> {
		await this.ensureExists(id);
		const updated = await this.prisma.transaction.update({
			where: { id },
			data: mapUpdateInputToPrisma(input),
		});
		return mapPrismaTransaction(updated);
	}

	async delete(id: string): Promise<void> {
		await this.ensureExists(id);
		await this.prisma.transaction.update({
			where: { id },
			data: { deletedAt: new Date() },
		});
	}

	private async ensureExists(id: string): Promise<void> {
		const exists = await this.prisma.transaction.findFirst({
			where: { id, deletedAt: null },
			select: { id: true },
		});

		if (!exists) {
			throw new Error("TRANSACTION_NOT_FOUND");
		}
	}
}
