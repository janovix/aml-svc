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
	ImportRowStatus,
	ImportJob,
} from "./types";

export class ImportService {
	constructor(private readonly repository: ImportRepository) {}

	/**
	 * List imports for an organization
	 */
	list(
		organizationId: string,
		filters: ImportFilters,
	): Promise<ListResult<ImportEntity>> {
		return this.repository.list(organizationId, filters);
	}

	/**
	 * Get a single import by ID
	 */
	async get(organizationId: string, id: string): Promise<ImportEntity> {
		const importRecord = await this.repository.getById(organizationId, id);
		if (!importRecord) {
			throw new Error("IMPORT_NOT_FOUND");
		}
		return importRecord;
	}

	/**
	 * Get import with row results
	 */
	async getWithResults(
		organizationId: string,
		id: string,
		rowFilters?: ImportRowFilters,
	): Promise<ImportWithResults> {
		const result = await this.repository.getWithResults(
			organizationId,
			id,
			rowFilters,
		);
		if (!result) {
			throw new Error("IMPORT_NOT_FOUND");
		}
		return result;
	}

	/**
	 * Create a new import and prepare job for queue
	 */
	async create(
		organizationId: string,
		createdBy: string,
		input: ImportCreateInput,
		fileUrl: string,
	): Promise<{ import: ImportEntity; job: ImportJob }> {
		const importRecord = await this.repository.create(
			organizationId,
			createdBy,
			input,
			fileUrl,
		);

		const job: ImportJob = {
			importId: importRecord.id,
			organizationId,
			entityType: importRecord.entityType,
			fileUrl: importRecord.fileUrl,
			createdBy,
		};

		return { import: importRecord, job };
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
		// Update the row
		const result = await this.repository.updateRowResult(
			importId,
			rowNumber,
			update,
		);

		if (result) {
			// Increment the appropriate count
			const counts: {
				processedRows: number;
				successCount?: number;
				warningCount?: number;
				errorCount?: number;
			} = { processedRows: 1 };

			switch (update.status) {
				case "SUCCESS":
					counts.successCount = 1;
					break;
				case "WARNING":
					counts.warningCount = 1;
					break;
				case "ERROR":
				case "SKIPPED":
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
	delete(organizationId: string, id: string): Promise<void> {
		return this.repository.delete(organizationId, id);
	}
}
