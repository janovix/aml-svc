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
				// For date-only strings, set to start of day (00:00:00)
				dateRange.gte = new Date(startDate + "T00:00:00.000Z");
			}
			if (endDate) {
				// For date-only strings, set to end of day (23:59:59.999)
				dateRange.lte = new Date(endDate + "T23:59:59.999Z");
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
				include: { paymentMethods: true },
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
			include: { paymentMethods: true },
		});

		return record ? mapPrismaTransaction(record) : null;
	}

	async create(input: TransactionCreateInput): Promise<TransactionEntity> {
		const created = await this.prisma.transaction.create({
			data: mapCreateInputToPrisma(input),
			include: { paymentMethods: true },
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
			include: { paymentMethods: true },
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
