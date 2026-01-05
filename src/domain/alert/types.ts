export type AlertStatus =
	| "DETECTED"
	| "FILE_GENERATED"
	| "SUBMITTED"
	| "OVERDUE"
	| "CANCELLED";
export type AlertSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface AlertRuleEntity {
	id: string; // Alert code (e.g., "2501", "2502", "9999")
	name: string;
	description?: string | null;
	active: boolean;
	severity: AlertSeverity;
	ruleType?: string | null; // Matches seeker's ruleType (null for manual-only)
	isManualOnly: boolean; // True if only manual triggers
	activityCode: string; // VEH, JYS, INM, JOY, ART
	metadata?: Record<string, unknown> | null;
	createdAt: string;
	updatedAt: string;
	configs?: AlertRuleConfigEntity[];
}

export interface AlertRuleConfigEntity {
	id: string;
	alertRuleId: string;
	key: string;
	value: string; // JSON string
	isHardcoded: boolean;
	description?: string | null;
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
	metadata: Record<string, unknown>; // Renamed from alertData
	transactionId?: string | null; // Renamed from triggerTransactionId
	isManual: boolean; // True if manually created

	// SAT Submission tracking
	submissionDeadline?: string | null; // Deadline for SAT submission
	fileGeneratedAt?: string | null; // When the SAT file was generated (via report)
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
