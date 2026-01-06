/**
 * Notice entity types for SAT regulatory submissions (avisos)
 * Handles the 17-17 period cycle for SAT compliance
 */

export type NoticeStatus = "DRAFT" | "GENERATED" | "SUBMITTED" | "ACKNOWLEDGED";

export interface NoticeEntity {
	id: string;
	organizationId: string;
	name: string;
	status: NoticeStatus;
	periodStart: string; // ISO datetime - Day 17 of previous month
	periodEnd: string; // ISO datetime - Day 16 of current month
	reportedMonth: string; // YYYYMM format for SAT

	recordCount: number;

	// XML file output
	xmlFileUrl?: string | null;
	fileSize?: number | null;

	generatedAt?: string | null;
	submittedAt?: string | null;
	satFolioNumber?: string | null;
	createdBy?: string | null;
	notes?: string | null;

	createdAt: string;
	updatedAt: string;
}

export interface NoticeWithAlertSummary extends NoticeEntity {
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
 * Represents the SAT period for a notice (17-17 cycle)
 */
export interface NoticePeriod {
	start: Date; // Day 17 of previous month
	end: Date; // Day 16 of current month
	reportedMonth: string; // YYYYMM
	displayName: string; // e.g., "Diciembre 2024"
}

/**
 * Calculate the SAT 17-17 period for a given month
 * For month M in year Y:
 * - Start: Day 17 of month M-1
 * - End: Day 16 of month M
 *
 * @param year - The year of the reported month
 * @param month - The month (1-12) of the reported month
 * @returns The SAT period with start, end, and display name
 */
export function calculateNoticePeriod(
	year: number,
	month: number,
): NoticePeriod {
	const MONTH_NAMES_ES = [
		"Enero",
		"Febrero",
		"Marzo",
		"Abril",
		"Mayo",
		"Junio",
		"Julio",
		"Agosto",
		"Septiembre",
		"Octubre",
		"Noviembre",
		"Diciembre",
	];

	// Calculate start month (previous month)
	let startMonth = month - 1;
	let startYear = year;
	if (startMonth === 0) {
		startMonth = 12;
		startYear = year - 1;
	}

	// Period starts on day 17 of previous month
	const start = new Date(Date.UTC(startYear, startMonth - 1, 17, 0, 0, 0, 0));

	// Period ends on day 16 of current month at end of day
	const end = new Date(Date.UTC(year, month - 1, 16, 23, 59, 59, 999));

	const reportedMonth = `${year}${String(month).padStart(2, "0")}`;
	const displayName = `${MONTH_NAMES_ES[month - 1]} ${year}`;

	return {
		start,
		end,
		reportedMonth,
		displayName,
	};
}

/**
 * Get the submission deadline for a SAT notice
 * SAT requires submission by day 17 of the month following the reported period
 *
 * @param year - The year of the reported month
 * @param month - The month (1-12) of the reported month
 * @returns The submission deadline date
 */
export function getNoticeSubmissionDeadline(year: number, month: number): Date {
	// Deadline is day 17 of the following month
	let deadlineMonth = month + 1;
	let deadlineYear = year;
	if (deadlineMonth > 12) {
		deadlineMonth = 1;
		deadlineYear = year + 1;
	}

	return new Date(
		Date.UTC(deadlineYear, deadlineMonth - 1, 17, 23, 59, 59, 999),
	);
}
