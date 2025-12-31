import { Prisma } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";

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
import type { UmaValueRepository } from "../uma/repository";
import type { CatalogEnrichmentService } from "../catalog/enrichment-service";
import { TRANSACTION_ENRICHMENT_CONFIG } from "./enrichment";

export class TransactionRepository {
	constructor(
		private readonly prisma: PrismaClient,
		private readonly umaRepository: UmaValueRepository,
		private readonly catalogEnrichmentService?: CatalogEnrichmentService,
	) {}

	async list(
		organizationId: string,
		filters: TransactionFilters,
	): Promise<TransactionListResult> {
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
			organizationId,
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

		// Map to entity objects
		let data: TransactionEntity[] = records.map(mapPrismaTransaction);

		// Enrich with catalog items if enrichment service is available
		if (this.catalogEnrichmentService && data.length > 0) {
			data = (await this.catalogEnrichmentService.enrichEntities(
				data as unknown as Record<string, unknown>[],
				TRANSACTION_ENRICHMENT_CONFIG,
			)) as unknown as TransactionEntity[];
		}

		return {
			data,
			pagination: {
				page,
				limit,
				total,
				totalPages,
			},
		};
	}

	async getById(
		organizationId: string,
		id: string,
	): Promise<TransactionEntity | null> {
		const record = await this.prisma.transaction.findFirst({
			where: { id, organizationId, deletedAt: null },
			include: { paymentMethods: true },
		});

		if (!record) {
			return null;
		}

		let entity: TransactionEntity = mapPrismaTransaction(record);

		// Enrich with catalog items if enrichment service is available
		if (this.catalogEnrichmentService) {
			entity = (await this.catalogEnrichmentService.enrichEntity(
				entity as unknown as Record<string, unknown>,
				TRANSACTION_ENRICHMENT_CONFIG,
			)) as unknown as TransactionEntity;
		}

		return entity;
	}

	async create(
		input: TransactionCreateInput,
		organizationId: string,
	): Promise<TransactionEntity> {
		// Calculate UMA value for the transaction date
		const umaValue = await this.calculateUmaValue(
			input.operationDate,
			input.amount,
		);

		const created = await this.prisma.transaction.create({
			data: mapCreateInputToPrisma(input, organizationId, umaValue),
			include: { paymentMethods: true },
		});
		return mapPrismaTransaction(created);
	}

	async update(
		organizationId: string,
		id: string,
		input: TransactionUpdateInput,
	): Promise<TransactionEntity> {
		await this.ensureExists(organizationId, id);

		// Calculate UMA value for the transaction date
		const umaValue = await this.calculateUmaValue(
			input.operationDate,
			input.amount,
		);

		const updated = await this.prisma.transaction.update({
			where: { id },
			data: mapUpdateInputToPrisma(input, umaValue),
			include: { paymentMethods: true },
		});
		return mapPrismaTransaction(updated);
	}

	/**
	 * Calculates UMA value for a transaction: amount / umaDailyValue
	 * Uses the active UMA value for the transaction date's year
	 */
	private async calculateUmaValue(
		operationDate: string,
		amount: string,
	): Promise<Prisma.Decimal | null> {
		try {
			// Get the year from the operation date
			const date = new Date(operationDate + "T00:00:00.000Z");
			const year = date.getFullYear();

			// Get UMA value for the transaction year (prefer active, fallback to year-specific)
			let umaValue = await this.umaRepository.getActive();
			if (!umaValue || umaValue.year !== year) {
				umaValue = await this.umaRepository.getByYear(year);
			}

			if (!umaValue) {
				console.warn(
					`No UMA value found for year ${year}, skipping UMA calculation`,
				);
				return null;
			}

			// Calculate: amount / umaDailyValue
			const amountDecimal = new Prisma.Decimal(amount);
			const umaDailyValue = new Prisma.Decimal(umaValue.dailyValue);
			const calculatedUma = amountDecimal.dividedBy(umaDailyValue);

			return calculatedUma;
		} catch (error) {
			console.error("Error calculating UMA value:", error);
			return null;
		}
	}

	async delete(organizationId: string, id: string): Promise<void> {
		await this.ensureExists(organizationId, id);
		await this.prisma.transaction.update({
			where: { id },
			data: { deletedAt: new Date() },
		});
	}

	private async ensureExists(
		organizationId: string,
		id: string,
	): Promise<void> {
		const exists = await this.prisma.transaction.findFirst({
			where: { id, organizationId, deletedAt: null },
			select: { id: true },
		});

		if (!exists) {
			throw new Error("TRANSACTION_NOT_FOUND");
		}
	}

	async getStats(organizationId: string): Promise<{
		transactionsToday: number;
		suspiciousTransactions: number;
		totalVolume: string;
		totalVehicles: number;
	}> {
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const tomorrow = new Date(today);
		tomorrow.setDate(tomorrow.getDate() + 1);

		const [
			transactionsToday,
			suspiciousTransactions,
			totalVolumeResult,
			allTransactions,
		] = await Promise.all([
			this.prisma.transaction.count({
				where: {
					organizationId,
					deletedAt: null,
					operationDate: {
						gte: today,
						lt: tomorrow,
					},
				},
			}),
			this.prisma.alert.count({
				where: {
					organizationId,
					status: { in: ["DETECTED", "FILE_GENERATED"] },
				},
			}),
			this.prisma.transaction.aggregate({
				where: {
					organizationId,
					deletedAt: null,
				},
				_sum: {
					amount: true,
				},
			}),
			this.prisma.transaction.findMany({
				where: {
					organizationId,
					deletedAt: null,
				},
				select: {
					brandId: true,
					model: true,
					year: true,
				},
			}),
		]);

		// Count unique vehicles (brand + model + year combination)
		const uniqueVehicles = new Set(
			allTransactions.map(
				(t: { brandId: string; model: string; year: number }) =>
					`${t.brandId}|${t.model}|${t.year}`,
			),
		).size;

		const totalVolume = totalVolumeResult._sum.amount
			? totalVolumeResult._sum.amount.toString()
			: "0";

		return {
			transactionsToday,
			suspiciousTransactions,
			totalVolume,
			totalVehicles: uniqueVehicles,
		};
	}
}
