/**
 * Import Domain Types
 * Types for bulk data import functionality
 */

export type ImportStatus =
	| "PENDING"
	| "VALIDATING"
	| "PROCESSING"
	| "COMPLETED"
	| "FAILED";

export type ImportEntityType = "CLIENT" | "TRANSACTION";

export type ImportRowStatus =
	| "PENDING"
	| "SUCCESS"
	| "WARNING"
	| "ERROR"
	| "SKIPPED";

export interface ImportEntity {
	id: string;
	organizationId: string;
	entityType: ImportEntityType;
	fileName: string;
	fileUrl: string;
	fileSize: number;
	status: ImportStatus;
	totalRows: number;
	processedRows: number;
	successCount: number;
	warningCount: number;
	errorCount: number;
	errorMessage: string | null;
	createdBy: string;
	startedAt: string | null;
	completedAt: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface ImportRowResultEntity {
	id: string;
	importId: string;
	rowNumber: number;
	status: ImportRowStatus;
	rawData: string; // JSON string of original row data
	entityId: string | null; // Created client/transaction ID if successful
	message: string | null;
	errors: string | null; // JSON array of validation errors
	createdAt: string;
	updatedAt: string;
}

export interface ImportWithResults extends ImportEntity {
	rowResults: ImportRowResultEntity[];
}

export interface Pagination {
	page: number;
	limit: number;
	total: number;
	totalPages: number;
}

export interface ListResult<T> {
	data: T[];
	pagination: Pagination;
}

/**
 * Progress update sent from import worker
 */
export interface ImportProgressUpdate {
	importId: string;
	rowNumber: number;
	status: ImportRowStatus;
	entityId?: string;
	message?: string;
	errors?: string[];
}

/**
 * Import job payload for the queue
 */
export interface ImportJob {
	importId: string;
	organizationId: string;
	entityType: ImportEntityType;
	fileUrl: string;
	createdBy: string;
}

/**
 * SSE event types for real-time updates
 */
export type ImportSSEEventType =
	| "connected"
	| "row_update"
	| "status_change"
	| "completed"
	| "error"
	| "ping";

export interface ImportSSEEvent {
	type: ImportSSEEventType;
	data: unknown;
	timestamp: string;
}
