export type AlertStatus =
	| "DETECTED"
	| "FILE_GENERATED"
	| "SUBMITTED"
	| "OVERDUE"
	| "CANCELLED";
export type AlertSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface AlertRuleEntity {
	id: string;
	name: string;
	description?: string | null;
	active: boolean;
	severity: AlertSeverity;
	ruleConfig: Record<string, unknown>; // Parsed JSON
	metadata?: Record<string, unknown> | null;
	createdAt: string;
	updatedAt: string;
}

export interface AlertEntity {
	id: string;
	alertRuleId: string;
	clientId: string;
	status: AlertStatus;
	severity: AlertSeverity;
	idempotencyKey: string;
	contextHash: string;
	alertData: Record<string, unknown>; // Parsed JSON
	triggerTransactionId?: string | null;

	// SAT Submission tracking
	submissionDeadline?: string | null; // Deadline for SAT submission
	fileGeneratedAt?: string | null; // When the SAT file was generated
	submittedAt?: string | null; // When submitted to SAT
	satAcknowledgmentReceipt?: string | null; // File URL or reference to SAT acknowledgment
	satFolioNumber?: string | null; // Folio number from SAT acknowledgment
	isOverdue: boolean; // Computed: true if submissionDeadline has passed and status != SUBMITTED

	// Review and cancellation
	notes?: string | null;
	reviewedAt?: string | null;
	reviewedBy?: string | null;
	cancelledAt?: string | null;
	cancelledBy?: string | null;
	cancellationReason?: string | null; // Reason for cancellation

	createdAt: string;
	updatedAt: string;
	alertRule?: AlertRuleEntity;
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
