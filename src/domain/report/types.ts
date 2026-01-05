export type ReportType = "MONTHLY" | "QUARTERLY" | "ANNUAL" | "CUSTOM";
export type ReportStatus = "DRAFT" | "GENERATED" | "SUBMITTED" | "ACKNOWLEDGED";

export interface ReportEntity {
	id: string;
	organizationId: string;
	name: string;
	type: ReportType;
	status: ReportStatus;
	periodStart: string; // ISO datetime
	periodEnd: string; // ISO datetime
	reportedMonth: string; // YYYYMM format for SAT or period identifier

	recordCount: number;

	// File outputs
	// MONTHLY reports have both XML (for SAT submission) and PDF (for internal use)
	// QUARTERLY/ANNUAL/CUSTOM reports have PDF only
	xmlFileUrl?: string | null; // R2 URL of SAT XML (MONTHLY only)
	pdfFileUrl?: string | null; // R2 URL of PDF report (all report types)
	fileSize?: number | null;
	pdfFileSize?: number | null; // Separate size for PDF when both exist

	generatedAt?: string | null;
	submittedAt?: string | null; // Only for MONTHLY (SAT submission)
	satFolioNumber?: string | null; // Only for MONTHLY (SAT acknowledgment)
	createdBy?: string | null;
	notes?: string | null;

	createdAt: string;
	updatedAt: string;
}

export interface ReportWithAlertSummary extends ReportEntity {
	alertSummary: {
		total: number;
		bySeverity: Record<string, number>;
		byStatus: Record<string, number>;
		byRule: Array<{ ruleId: string; ruleName: string; count: number }>;
	};
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
 * Represents the period for a report
 */
export interface ReportPeriod {
	start: Date;
	end: Date;
	reportedMonth: string; // YYYYMM
	displayName: string; // e.g., "Diciembre 2024"
}
