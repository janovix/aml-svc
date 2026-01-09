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
	ReportTemplateConfig,
} from "./types";
import {
	getTemplateConfigs,
	calculateCalendarMonthPeriod,
	calculateQuarterlyPeriod,
	calculateAnnualPeriod,
} from "./types";

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
	 * Preview data that would be included in a report
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
			{
				clientId: input.clientId,
				alertRuleIds: input.filters?.alertRuleIds,
				alertSeverities: input.filters?.alertSeverities,
			},
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
		return this.repository.create(input, organizationId, createdBy);
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
	 * Mark a report as generated with PDF file URL
	 */
	async markAsGenerated(
		organizationId: string,
		id: string,
		options: {
			pdfFileUrl?: string | null;
			fileSize?: number | null;
		},
	): Promise<ReportEntity> {
		return this.repository.markAsGenerated(organizationId, id, options);
	}

	/**
	 * Get all available report templates
	 */
	getTemplates(): ReportTemplateConfig[] {
		return getTemplateConfigs();
	}

	/**
	 * Get period dates for a given period type
	 */
	getPeriodDates(
		periodType: "MONTHLY" | "QUARTERLY" | "ANNUAL",
		year: number,
		period: number, // month (1-12) for MONTHLY, quarter (1-4) for QUARTERLY, ignored for ANNUAL
	): { start: Date; end: Date } {
		switch (periodType) {
			case "MONTHLY":
				return calculateCalendarMonthPeriod(year, period);
			case "QUARTERLY":
				return calculateQuarterlyPeriod(year, period as 1 | 2 | 3 | 4);
			case "ANNUAL":
				return calculateAnnualPeriod(year);
			default:
				throw new Error("Invalid period type");
		}
	}
}
