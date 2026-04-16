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
import type { TenantContext } from "../../lib/tenant-context";

export class ReportService {
	constructor(private readonly repository: ReportRepository) {}

	/**
	 * List reports with filters
	 */
	async list(
		tenant: TenantContext,
		filters: ReportFilterInput,
	): Promise<ListResult<ReportEntity>> {
		return this.repository.list(tenant, filters);
	}

	/**
	 * Get a single report
	 */
	async get(tenant: TenantContext, id: string): Promise<ReportEntity> {
		return this.repository.get(tenant, id);
	}

	/**
	 * Get a report with alert summary
	 */
	async getWithSummary(
		tenant: TenantContext,
		id: string,
	): Promise<ReportWithAlertSummary> {
		return this.repository.getWithAlertSummary(tenant, id);
	}

	/**
	 * Preview data that would be included in a report
	 */
	async preview(
		tenant: TenantContext,
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
			tenant,
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
		tenant: TenantContext,
		createdBy?: string,
	): Promise<ReportEntity> {
		return this.repository.create(input, tenant, createdBy);
	}

	/**
	 * Update a report
	 */
	async patch(
		tenant: TenantContext,
		id: string,
		input: ReportPatchInput,
	): Promise<ReportEntity> {
		return this.repository.patch(tenant, id, input);
	}

	/**
	 * Delete a report (only if DRAFT status)
	 */
	async delete(tenant: TenantContext, id: string): Promise<void> {
		const report = await this.repository.get(tenant, id);

		if (report.status !== "DRAFT") {
			throw new Error("CANNOT_DELETE_NON_DRAFT_REPORT");
		}

		return this.repository.delete(tenant, id);
	}

	/**
	 * Mark a report as generated with PDF file URL
	 */
	async markAsGenerated(
		tenant: TenantContext,
		id: string,
		options: {
			pdfFileUrl?: string | null;
			fileSize?: number | null;
		},
	): Promise<ReportEntity> {
		return this.repository.markAsGenerated(tenant, id, options);
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
		period: number,
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
