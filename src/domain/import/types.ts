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

export type ImportEntityType = "CLIENT" | "OPERATION";

export type ImportRowStatus =
	| "PENDING"
	| "SUCCESS"
	| "WARNING"
	| "ERROR"
	| "SKIPPED";

/** CSV column name -> target property key (e.g. rfc, first_name, client_rfc, amount) */
export type ColumnMapping = Record<string, string>;

export interface ImportEntity {
	id: string;
	organizationId: string;
	entityType: ImportEntityType;
	activityCode: string | null; // Activity code for OPERATION imports
	fileName: string;
	fileUrl: string;
	fileSize: number;
	status: ImportStatus;
	totalRows: number;
	processedRows: number;
	successCount: number;
	warningCount: number;
	errorCount: number;
	skippedCount: number;
	errorMessage: string | null;
	columnMapping: ColumnMapping | null;
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
	entityId: string | null; // Created client/operation ID if successful
	message: string | null;
	errors: string | null; // JSON array of validation errors
	createdAt: string;
	updatedAt: string;
}

export interface ImportWithResults extends ImportEntity {
	rowResults: ImportRowResultEntity[];
}

export type {
	Pagination,
	ListResult,
	ListResultWithMeta,
	FilterMetaDef,
	FilterMetaOption,
	FilterType,
} from "../../lib/list-result";

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
	activityCode?: string; // Required when entityType is OPERATION
	fileUrl: string;
	createdBy: string;
	/** When present, worker maps CSV columns to entity fields using this; when absent, use template column names */
	columnMapping?: ColumnMapping;
}

/**
 * Parsed row data from CSV/Excel
 */
export interface ParsedRow {
	rowNumber: number;
	data: Record<string, string>;
}

/**
 * Result of processing a single row
 */
export interface RowProcessingResult {
	rowNumber: number;
	status: ImportRowStatus;
	entityId?: string;
	message?: string;
	errors?: string[];
}

/**
 * Client data structure from CSV/Excel
 */
export interface ClientRowData {
	person_type: string;
	rfc: string;
	first_name?: string;
	last_name?: string;
	second_last_name?: string;
	birth_date?: string;
	curp?: string;
	business_name?: string;
	incorporation_date?: string;
	nationality?: string;
	email: string;
	phone: string;
	country: string;
	state_code: string;
	city: string;
	municipality: string;
	neighborhood: string;
	street: string;
	external_number: string;
	internal_number?: string;
	postal_code: string;
	reference?: string;
	notes?: string;
	country_code?: string;
	economic_activity_code?: string;
	commercial_activity_code?: string;
	gender?: string;
	occupation?: string;
	marital_status?: string;
	source_of_funds?: string;
	source_of_wealth?: string;
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
