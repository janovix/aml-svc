export type AlertStatus = "PENDING" | "REVIEWED" | "RESOLVED" | "DISMISSED";
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
	notes?: string | null;
	reviewedAt?: string | null;
	reviewedBy?: string | null;
	resolvedAt?: string | null;
	resolvedBy?: string | null;
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
