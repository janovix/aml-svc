import type { ReportRepository } from "./repository";
import type {
	ReportCreateInput,
	ReportPatchInput,
	ReportFilterInput,
	ReportPreviewInput,
} from "./schemas";
import type {
	ReportEntity,
	ListResult,
	ReportWithAlertSummary,
	ReportPeriod,
	ReportType,
} from "./types";

/**
 * Month names in Spanish for report naming
 */
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

/**
 * Calculate the reporting period for a given month
 * MONTHLY reports use 17th-16th cycle (e.g., Nov 17 - Dec 16 for December report)
 *
 * @param year - The year of the report (when it's due)
 * @param month - The month of the report (1-12, when it's due)
 * @returns ReportPeriod with start, end, and display information
 */
export function calculateMonthlyPeriod(
	year: number,
	month: number,
): ReportPeriod {
	// For month M in year Y, the period is:
	// Start: Day 17 of month M-1
	// End: Day 16 of month M (at 23:59:59.999)

	// Calculate start date (17th of previous month)
	let startMonth = month - 1;
	let startYear = year;
	if (startMonth === 0) {
		startMonth = 12;
		startYear = year - 1;
	}
	const start = new Date(Date.UTC(startYear, startMonth - 1, 17, 0, 0, 0, 0));

	// Calculate end date (16th of current month at end of day)
	const end = new Date(Date.UTC(year, month - 1, 16, 23, 59, 59, 999));

	// Format reported month as YYYYMM
	const reportedMonth = `${year}${String(month).padStart(2, "0")}`;

	// Display name
	const displayName = `${MONTH_NAMES_ES[month - 1]} ${year}`;

	return {
		start,
		end,
		reportedMonth,
		displayName,
	};
}

/**
 * Calculate quarterly period
 * Q1: Jan 1 - Mar 31
 * Q2: Apr 1 - Jun 30
 * Q3: Jul 1 - Sep 30
 * Q4: Oct 1 - Dec 31
 */
export function calculateQuarterlyPeriod(
	year: number,
	quarter: 1 | 2 | 3 | 4,
): ReportPeriod {
	const quarterMonths: Record<1 | 2 | 3 | 4, [number, number]> = {
		1: [1, 3],
		2: [4, 6],
		3: [7, 9],
		4: [10, 12],
	};

	const [startMonth, endMonth] = quarterMonths[quarter];
	const start = new Date(Date.UTC(year, startMonth - 1, 1, 0, 0, 0, 0));

	// Last day of end month
	const end = new Date(Date.UTC(year, endMonth, 0, 23, 59, 59, 999));

	const reportedMonth = `${year}Q${quarter}`;
	const displayName = `Q${quarter} ${year}`;

	return {
		start,
		end,
		reportedMonth,
		displayName,
	};
}

/**
 * Calculate annual period
 */
export function calculateAnnualPeriod(year: number): ReportPeriod {
	const start = new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0));
	const end = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));

	return {
		start,
		end,
		reportedMonth: `${year}`,
		displayName: `Anual ${year}`,
	};
}

export class ReportService {
	constructor(private readonly repository: ReportRepository) {}

	/**
	 * List reports with filters
	 */
	async list(
		organizationId: string,
		filters: ReportFilterInput,
	): Promise<ListResult<ReportEntity>> {
		return this.repository.list(organizationId, filters);
	}

	/**
	 * Get a single report
	 */
	async get(organizationId: string, id: string): Promise<ReportEntity> {
		return this.repository.get(organizationId, id);
	}

	/**
	 * Get a report with alert summary
	 */
	async getWithSummary(
		organizationId: string,
		id: string,
	): Promise<ReportWithAlertSummary> {
		return this.repository.getWithAlertSummary(organizationId, id);
	}

	/**
	 * Preview alerts that would be included in a report
	 */
	async preview(
		organizationId: string,
		input: ReportPreviewInput,
	): Promise<{
		total: number;
		bySeverity: Record<string, number>;
		byStatus: Record<string, number>;
		periodStart: string;
		periodEnd: string;
	}> {
		const periodStart = new Date(input.periodStart);
		const periodEnd = new Date(input.periodEnd);

		const stats = await this.repository.countAlertsForPeriod(
			organizationId,
			periodStart,
			periodEnd,
		);

		return {
			...stats,
			periodStart: periodStart.toISOString(),
			periodEnd: periodEnd.toISOString(),
		};
	}

	/**
	 * Create a new report
	 */
	async create(
		input: ReportCreateInput,
		organizationId: string,
		createdBy?: string,
	): Promise<ReportEntity> {
		const periodStart = new Date(input.periodStart);
		const periodEnd = new Date(input.periodEnd);

		// Check if a report already exists for this period and type
		const exists = await this.repository.existsForPeriod(
			organizationId,
			input.type ?? "MONTHLY",
			periodStart,
			periodEnd,
		);

		if (exists) {
			throw new Error("REPORT_ALREADY_EXISTS_FOR_PERIOD");
		}

		// Create the report
		const report = await this.repository.create(
			input,
			organizationId,
			createdBy,
		);

		// Assign alerts to the report
		const alertCount = await this.repository.assignAlertsToReport(
			organizationId,
			report.id,
			periodStart,
			periodEnd,
		);

		// Return updated report with correct count
		return {
			...report,
			recordCount: alertCount,
		};
	}

	/**
	 * Update a report
	 */
	async patch(
		organizationId: string,
		id: string,
		input: ReportPatchInput,
	): Promise<ReportEntity> {
		return this.repository.patch(organizationId, id, input);
	}

	/**
	 * Delete a report (only if DRAFT status)
	 */
	async delete(organizationId: string, id: string): Promise<void> {
		const report = await this.repository.get(organizationId, id);

		if (report.status !== "DRAFT") {
			throw new Error("CANNOT_DELETE_NON_DRAFT_REPORT");
		}

		return this.repository.delete(organizationId, id);
	}

	/**
	 * Get alerts for a report (for file generation)
	 */
	async getAlertsForReport(organizationId: string, reportId: string) {
		return this.repository.getAlertsForReport(organizationId, reportId);
	}

	/**
	 * Update report with generated file URL
	 */
	async updateFileUrl(
		organizationId: string,
		id: string,
		fileUrl: string,
		fileSize: number,
		type: ReportType,
	): Promise<ReportEntity> {
		const isXml = type === "MONTHLY";
		return this.repository.updateFileUrl(
			organizationId,
			id,
			fileUrl,
			fileSize,
			isXml,
		);
	}

	/**
	 * Mark a report as generated with optional file URLs
	 */
	async markAsGenerated(
		organizationId: string,
		id: string,
		options: {
			xmlFileUrl?: string | null;
			pdfFileUrl?: string | null;
			fileSize?: number | null;
		},
	): Promise<ReportEntity> {
		return this.repository.markAsGenerated(organizationId, id, options);
	}

	/**
	 * Mark report as submitted to SAT
	 */
	async markAsSubmitted(
		organizationId: string,
		id: string,
		satFolioNumber?: string,
	): Promise<ReportEntity> {
		const report = await this.repository.get(organizationId, id);

		if (report.type !== "MONTHLY") {
			throw new Error("ONLY_MONTHLY_REPORTS_CAN_BE_SUBMITTED");
		}

		if (report.status !== "GENERATED") {
			throw new Error("REPORT_MUST_BE_GENERATED_BEFORE_SUBMISSION");
		}

		return this.repository.patch(organizationId, id, {
			status: "SUBMITTED",
			submittedAt: new Date().toISOString(),
			satFolioNumber: satFolioNumber ?? null,
		});
	}

	/**
	 * Mark report as acknowledged by SAT
	 */
	async markAsAcknowledged(
		organizationId: string,
		id: string,
		satFolioNumber: string,
	): Promise<ReportEntity> {
		const report = await this.repository.get(organizationId, id);

		if (report.type !== "MONTHLY") {
			throw new Error("ONLY_MONTHLY_REPORTS_CAN_BE_ACKNOWLEDGED");
		}

		if (report.status !== "SUBMITTED") {
			throw new Error("REPORT_MUST_BE_SUBMITTED_BEFORE_ACKNOWLEDGMENT");
		}

		return this.repository.patch(organizationId, id, {
			status: "ACKNOWLEDGED",
			satFolioNumber,
		});
	}
}
