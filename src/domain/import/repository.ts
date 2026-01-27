/**
 * Import Domain Repository
 * Database operations for imports and import row results
 */

import type { Prisma, PrismaClient } from "@prisma/client";
import { generateId } from "../../lib/id-generator";
import {
	mapPrismaImport,
	mapPrismaImportRowResult,
	toPrismaEntityType,
	toPrismaImportStatus,
	toPrismaRowStatus,
} from "./mappers";
import type {
	ImportFilters,
	ImportRowFilters,
	ImportCreateInput,
	ImportStatusUpdateInput,
	ImportBulkRowCreateInput,
} from "./schemas";
import type {
	ImportEntity,
	ImportRowResultEntity,
	ImportWithResults,
	ListResult,
	ImportRowStatus,
} from "./types";

export class ImportRepository {
	constructor(private readonly prisma: PrismaClient) {}

	/**
	 * List imports for an organization with pagination and filters
	 */
	async list(
		organizationId: string,
		filters: ImportFilters,
	): Promise<ListResult<ImportEntity>> {
		const { page, limit, status, entityType } = filters;

		const where: Prisma.ImportWhereInput = {
			organizationId,
		};

		if (status) {
			where.status = toPrismaImportStatus(status);
		}

		if (entityType) {
			where.entityType = toPrismaEntityType(entityType);
		}

		const [total, records] = await Promise.all([
			this.prisma.import.count({ where }),
			this.prisma.import.findMany({
				where,
				skip: (page - 1) * limit,
				take: limit,
				orderBy: { createdAt: "desc" },
			}),
		]);

		const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

		return {
			data: records.map(mapPrismaImport),
			pagination: {
				page,
				limit,
				total,
				totalPages,
			},
		};
	}

	/**
	 * Get a single import by ID
	 */
	async getById(
		organizationId: string,
		id: string,
	): Promise<ImportEntity | null> {
		const record = await this.prisma.import.findFirst({
			where: { organizationId, id },
		});
		return record ? mapPrismaImport(record) : null;
	}

	/**
	 * Get import with all row results
	 */
	async getWithResults(
		organizationId: string,
		id: string,
		rowFilters?: ImportRowFilters,
	): Promise<ImportWithResults | null> {
		const importRecord = await this.prisma.import.findFirst({
			where: { organizationId, id },
		});

		if (!importRecord) {
			return null;
		}

		const rowWhere: Prisma.ImportRowResultWhereInput = {
			importId: id,
		};

		if (rowFilters?.status) {
			rowWhere.status = toPrismaRowStatus(rowFilters.status);
		}

		const rowResults = await this.prisma.importRowResult.findMany({
			where: rowWhere,
			skip: rowFilters ? (rowFilters.page - 1) * rowFilters.limit : 0,
			take: rowFilters?.limit ?? 100,
			orderBy: { rowNumber: "asc" },
		});

		return {
			...mapPrismaImport(importRecord),
			rowResults: rowResults.map(mapPrismaImportRowResult),
		};
	}

	/**
	 * Create a new import record
	 */
	async create(
		organizationId: string,
		createdBy: string,
		input: ImportCreateInput,
		fileUrl: string,
	): Promise<ImportEntity> {
		const id = generateId("IMPORT");

		const created = await this.prisma.import.create({
			data: {
				id,
				organizationId,
				entityType: toPrismaEntityType(input.entityType),
				fileName: input.fileName,
				fileUrl,
				fileSize: input.fileSize,
				createdBy,
				status: "PENDING",
			},
		});

		return mapPrismaImport(created);
	}

	/**
	 * Update import status and counts
	 */
	async updateStatus(
		id: string,
		update: ImportStatusUpdateInput,
	): Promise<ImportEntity> {
		const data: Prisma.ImportUpdateInput = {};

		if (update.status) {
			data.status = toPrismaImportStatus(update.status);

			// Set timestamps based on status transitions
			if (update.status === "VALIDATING" || update.status === "PROCESSING") {
				data.startedAt = new Date();
			}
			if (update.status === "COMPLETED" || update.status === "FAILED") {
				data.completedAt = new Date();
			}
		}

		if (update.totalRows !== undefined) {
			data.totalRows = update.totalRows;
		}
		if (update.processedRows !== undefined) {
			data.processedRows = update.processedRows;
		}
		if (update.successCount !== undefined) {
			data.successCount = update.successCount;
		}
		if (update.warningCount !== undefined) {
			data.warningCount = update.warningCount;
		}
		if (update.errorCount !== undefined) {
			data.errorCount = update.errorCount;
		}
		if (update.errorMessage !== undefined) {
			data.errorMessage = update.errorMessage;
		}

		const updated = await this.prisma.import.update({
			where: { id },
			data,
		});

		return mapPrismaImport(updated);
	}

	/**
	 * Increment counts atomically
	 */
	async incrementCounts(
		id: string,
		counts: {
			processedRows?: number;
			successCount?: number;
			warningCount?: number;
			errorCount?: number;
		},
	): Promise<void> {
		const data: Prisma.ImportUpdateInput = {};

		if (counts.processedRows) {
			data.processedRows = { increment: counts.processedRows };
		}
		if (counts.successCount) {
			data.successCount = { increment: counts.successCount };
		}
		if (counts.warningCount) {
			data.warningCount = { increment: counts.warningCount };
		}
		if (counts.errorCount) {
			data.errorCount = { increment: counts.errorCount };
		}

		await this.prisma.import.update({
			where: { id },
			data,
		});
	}

	/**
	 * Create multiple row result records in bulk
	 */
	async createRowResults(
		importId: string,
		input: ImportBulkRowCreateInput,
	): Promise<void> {
		const data = input.rows.map((row) => ({
			id: generateId("IMPORT_ROW_RESULT"),
			importId,
			rowNumber: row.rowNumber,
			rawData: row.rawData, // Already a JSON string from schema validation
			status: "PENDING" as const,
		}));

		await this.prisma.importRowResult.createMany({
			data,
		});
	}

	/**
	 * Update a single row result
	 */
	async updateRowResult(
		importId: string,
		rowNumber: number,
		update: {
			status: ImportRowStatus;
			entityId?: string;
			message?: string;
			errors?: string[];
		},
	): Promise<ImportRowResultEntity | null> {
		// Find the row by import ID and row number
		const existing = await this.prisma.importRowResult.findFirst({
			where: { importId, rowNumber },
		});

		if (!existing) {
			return null;
		}

		const updated = await this.prisma.importRowResult.update({
			where: { id: existing.id },
			data: {
				status: toPrismaRowStatus(update.status),
				entityId: update.entityId ?? null,
				message: update.message ?? null,
				errors: update.errors ? JSON.stringify(update.errors) : null,
			},
		});

		return mapPrismaImportRowResult(updated);
	}

	/**
	 * Get row results for an import with pagination
	 */
	async listRowResults(
		importId: string,
		filters: ImportRowFilters,
	): Promise<ListResult<ImportRowResultEntity>> {
		const { page, limit, status } = filters;

		const where: Prisma.ImportRowResultWhereInput = {
			importId,
		};

		if (status) {
			where.status = toPrismaRowStatus(status);
		}

		const [total, records] = await Promise.all([
			this.prisma.importRowResult.count({ where }),
			this.prisma.importRowResult.findMany({
				where,
				skip: (page - 1) * limit,
				take: limit,
				orderBy: { rowNumber: "asc" },
			}),
		]);

		const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

		return {
			data: records.map(mapPrismaImportRowResult),
			pagination: {
				page,
				limit,
				total,
				totalPages,
			},
		};
	}

	/**
	 * Get row results that have changed since a specific time
	 * Useful for SSE updates
	 */
	async getRecentRowUpdates(
		importId: string,
		since: Date,
	): Promise<ImportRowResultEntity[]> {
		const records = await this.prisma.importRowResult.findMany({
			where: {
				importId,
				updatedAt: { gt: since },
			},
			orderBy: { rowNumber: "asc" },
		});

		return records.map(mapPrismaImportRowResult);
	}

	/**
	 * Delete an import and all its row results (cascade)
	 */
	async delete(organizationId: string, id: string): Promise<void> {
		await this.ensureExists(organizationId, id);
		await this.prisma.import.delete({ where: { id } });
	}

	/**
	 * Ensure import exists and belongs to organization
	 */
	private async ensureExists(
		organizationId: string,
		id: string,
	): Promise<void> {
		const exists = await this.prisma.import.findFirst({
			where: { organizationId, id },
			select: { id: true },
		});

		if (!exists) {
			throw new Error("IMPORT_NOT_FOUND");
		}
	}
}
