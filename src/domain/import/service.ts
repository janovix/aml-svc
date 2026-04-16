/**
 * Import Domain Service
 * Business logic for bulk data imports
 */

import type { ImportRepository } from "./repository";
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
	ListResultWithMeta,
	ImportRowStatus,
	ImportJob,
} from "./types";
import type { ImportStartInput } from "./schemas";
import type { TenantContext } from "../../lib/tenant-context";

export class ImportService {
	constructor(private readonly repository: ImportRepository) {}

	/**
	 * List imports for an organization
	 */
	list(
		tenant: TenantContext,
		filters: ImportFilters,
	): Promise<ListResultWithMeta<ImportEntity>> {
		return this.repository.list(tenant, filters);
	}

	/**
	 * Get a single import by ID
	 */
	async get(tenant: TenantContext, id: string): Promise<ImportEntity> {
		const importRecord = await this.repository.getById(tenant, id);
		if (!importRecord) {
			throw new Error("IMPORT_NOT_FOUND");
		}
		return importRecord;
	}

	/**
	 * Get import with row results
	 */
	async getWithResults(
		tenant: TenantContext,
		id: string,
		rowFilters?: ImportRowFilters,
	): Promise<ImportWithResults> {
		const result = await this.repository.getWithResults(tenant, id, rowFilters);
		if (!result) {
			throw new Error("IMPORT_NOT_FOUND");
		}
		return result;
	}

	/**
	 * Create a new import and prepare job for queue
	 */
	async create(
		tenant: TenantContext,
		createdBy: string,
		input: ImportCreateInput,
		fileUrl: string,
	): Promise<{ import: ImportEntity; job: ImportJob }> {
		const { organizationId } = tenant;
		const importRecord = await this.repository.create(
			tenant,
			createdBy,
			input,
			fileUrl,
		);

		const job: ImportJob = {
			importId: importRecord.id,
			organizationId,
			entityType: importRecord.entityType,
			activityCode: importRecord.activityCode ?? undefined,
			fileUrl: importRecord.fileUrl,
			createdBy,
		};

		return { import: importRecord, job };
	}

	/**
	 * Start import: persist column mapping and return job payload for the queue.
	 * Caller (route) must send the job to IMPORT_PROCESSING_QUEUE.
	 */
	async startImport(
		tenant: TenantContext,
		importId: string,
		input: ImportStartInput,
	): Promise<{ import: ImportEntity; job: ImportJob }> {
		const { organizationId } = tenant;
		const updated = await this.repository.updateColumnMappingIfPending(
			importId,
			tenant,
			input.columnMapping,
		);
		if (!updated) {
			throw new Error("IMPORT_NOT_PENDING");
		}
		const job: ImportJob = {
			importId: updated.id,
			organizationId,
			entityType: updated.entityType,
			activityCode: updated.activityCode ?? undefined,
			fileUrl: updated.fileUrl,
			createdBy: updated.createdBy,
			columnMapping: input.columnMapping,
		};
		return { import: updated, job };
	}

	/**
	 * Update import status (used by worker)
	 */
	updateStatus(
		id: string,
		update: ImportStatusUpdateInput,
	): Promise<ImportEntity> {
		return this.repository.updateStatus(id, update);
	}

	/**
	 * Mark import as started (VALIDATING)
	 */
	async startValidation(id: string, totalRows: number): Promise<ImportEntity> {
		return this.repository.updateStatus(id, {
			status: "VALIDATING",
			totalRows,
		});
	}

	/**
	 * Mark import as processing
	 */
	async startProcessing(id: string): Promise<ImportEntity> {
		return this.repository.updateStatus(id, {
			status: "PROCESSING",
		});
	}

	/**
	 * Mark import as completed
	 */
	async complete(
		id: string,
		counts: {
			successCount: number;
			warningCount: number;
			errorCount: number;
		},
	): Promise<ImportEntity> {
		return this.repository.updateStatus(id, {
			status: "COMPLETED",
			...counts,
		});
	}

	/**
	 * Mark import as failed with error message
	 */
	async fail(id: string, errorMessage: string): Promise<ImportEntity> {
		return this.repository.updateStatus(id, {
			status: "FAILED",
			errorMessage,
		});
	}

	/**
	 * Create row result records in bulk
	 */
	createRowResults(
		importId: string,
		input: ImportBulkRowCreateInput,
	): Promise<void> {
		return this.repository.createRowResults(importId, input);
	}

	/**
	 * Update a single row result and increment counts
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
		const result = await this.repository.updateRowResult(
			importId,
			rowNumber,
			update,
		);

		if (result) {
			const counts: {
				processedRows: number;
				successCount?: number;
				warningCount?: number;
				errorCount?: number;
				skippedCount?: number;
			} = { processedRows: 1 };

			switch (update.status) {
				case "SUCCESS":
					counts.successCount = 1;
					break;
				case "WARNING":
					counts.warningCount = 1;
					break;
				case "SKIPPED":
					counts.skippedCount = 1;
					break;
				case "ERROR":
					counts.errorCount = 1;
					break;
			}

			await this.repository.incrementCounts(importId, counts);
		}

		return result;
	}

	/**
	 * Get row results for an import
	 */
	listRowResults(
		importId: string,
		filters: ImportRowFilters,
	): Promise<ListResult<ImportRowResultEntity>> {
		return this.repository.listRowResults(importId, filters);
	}

	/**
	 * Get row updates since a specific time (for SSE)
	 */
	getRecentRowUpdates(
		importId: string,
		since: Date,
	): Promise<ImportRowResultEntity[]> {
		return this.repository.getRecentRowUpdates(importId, since);
	}

	/**
	 * Delete an import
	 */
	delete(tenant: TenantContext, id: string): Promise<void> {
		return this.repository.delete(tenant, id);
	}
}
