import type { PrismaClient, Prisma } from "@prisma/client";
import type {
	ReportCreateInput,
	ReportPatchInput,
	ReportFilterInput,
} from "./schemas";
import type { ReportEntity, ListResult, ReportWithAlertSummary } from "./types";
import {
	mapPrismaReport,
	mapReportCreateInputToPrisma,
	mapReportPatchInputToPrisma,
} from "./mappers";

export class ReportRepository {
	constructor(private readonly prisma: PrismaClient) {}

	/**
	 * List reports with pagination and filters
	 */
	async list(
		organizationId: string,
		filters: ReportFilterInput,
	): Promise<ListResult<ReportEntity>> {
		const { page, limit, type, status, periodStart, periodEnd } = filters;
		const skip = (page - 1) * limit;

		const where: Prisma.ReportWhereInput = {
			organizationId,
		};

		if (type) {
			where.type = type;
		}
		if (status) {
			where.status = status;
		}
		if (periodStart) {
			where.periodStart = { gte: new Date(periodStart) };
		}
		if (periodEnd) {
			where.periodEnd = { lte: new Date(periodEnd) };
		}

		const [reports, total] = await Promise.all([
			this.prisma.report.findMany({
				where,
				orderBy: { createdAt: "desc" },
				skip,
				take: limit,
			}),
			this.prisma.report.count({ where }),
		]);

		return {
			data: reports.map(mapPrismaReport),
			pagination: {
				page,
				limit,
				total,
				totalPages: Math.ceil(total / limit),
			},
		};
	}

	/**
	 * Get a single report by ID
	 */
	async get(organizationId: string, id: string): Promise<ReportEntity> {
		const report = await this.prisma.report.findFirst({
			where: { id, organizationId },
		});

		if (!report) {
			throw new Error("REPORT_NOT_FOUND");
		}

		return mapPrismaReport(report);
	}

	/**
	 * Get a report with alert summary
	 */
	async getWithAlertSummary(
		organizationId: string,
		id: string,
	): Promise<ReportWithAlertSummary> {
		const report = await this.get(organizationId, id);

		// Get alert statistics for this report
		const alerts = await this.prisma.alert.findMany({
			where: { reportId: id, organizationId },
			include: { alertRule: true },
		});

		const bySeverity: Record<string, number> = {};
		const byStatus: Record<string, number> = {};
		const byRuleMap: Map<string, { ruleName: string; count: number }> =
			new Map();

		for (const alert of alerts) {
			// Count by severity
			bySeverity[alert.severity] = (bySeverity[alert.severity] || 0) + 1;

			// Count by status
			byStatus[alert.status] = (byStatus[alert.status] || 0) + 1;

			// Count by rule
			const existing = byRuleMap.get(alert.alertRuleId);
			if (existing) {
				existing.count++;
			} else {
				byRuleMap.set(alert.alertRuleId, {
					ruleName: alert.alertRule?.name || alert.alertRuleId,
					count: 1,
				});
			}
		}

		const byRule = Array.from(byRuleMap.entries()).map(
			([ruleId, { ruleName, count }]) => ({
				ruleId,
				ruleName,
				count,
			}),
		);

		return {
			...report,
			alertSummary: {
				total: alerts.length,
				bySeverity,
				byStatus,
				byRule,
			},
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
		const data = mapReportCreateInputToPrisma(input, organizationId, createdBy);

		const report = await this.prisma.report.create({
			data,
		});

		return mapPrismaReport(report);
	}

	/**
	 * Update a report (partial)
	 */
	async patch(
		organizationId: string,
		id: string,
		input: ReportPatchInput,
	): Promise<ReportEntity> {
		await this.ensureExists(organizationId, id);

		const data = mapReportPatchInputToPrisma(input);

		const report = await this.prisma.report.update({
			where: { id },
			data,
		});

		return mapPrismaReport(report);
	}

	/**
	 * Delete a report
	 */
	async delete(organizationId: string, id: string): Promise<void> {
		await this.ensureExists(organizationId, id);

		// First, remove the reportId from all alerts linked to this report
		await this.prisma.alert.updateMany({
			where: { reportId: id, organizationId },
			data: { reportId: null },
		});

		await this.prisma.report.delete({
			where: { id },
		});
	}

	/**
	 * Count alerts in a period that can be included in a report
	 * (not cancelled, not already submitted)
	 */
	async countAlertsForPeriod(
		organizationId: string,
		periodStart: Date,
		periodEnd: Date,
	): Promise<{
		total: number;
		bySeverity: Record<string, number>;
		byStatus: Record<string, number>;
	}> {
		const alerts = await this.prisma.alert.findMany({
			where: {
				organizationId,
				createdAt: {
					gte: periodStart,
					lte: periodEnd,
				},
				status: {
					notIn: ["CANCELLED", "SUBMITTED"],
				},
				reportId: null, // Not already in a report
			},
			select: {
				severity: true,
				status: true,
			},
		});

		const bySeverity: Record<string, number> = {};
		const byStatus: Record<string, number> = {};

		for (const alert of alerts) {
			bySeverity[alert.severity] = (bySeverity[alert.severity] || 0) + 1;
			byStatus[alert.status] = (byStatus[alert.status] || 0) + 1;
		}

		return {
			total: alerts.length,
			bySeverity,
			byStatus,
		};
	}

	/**
	 * Assign alerts to a report
	 */
	async assignAlertsToReport(
		organizationId: string,
		reportId: string,
		periodStart: Date,
		periodEnd: Date,
	): Promise<number> {
		const result = await this.prisma.alert.updateMany({
			where: {
				organizationId,
				createdAt: {
					gte: periodStart,
					lte: periodEnd,
				},
				status: {
					notIn: ["CANCELLED", "SUBMITTED"],
				},
				reportId: null,
			},
			data: { reportId },
		});

		// Update report record count
		await this.prisma.report.update({
			where: { id: reportId },
			data: { recordCount: result.count },
		});

		return result.count;
	}

	/**
	 * Get all alerts for a report (for XML/PDF generation)
	 */
	async getAlertsForReport(organizationId: string, reportId: string) {
		return this.prisma.alert.findMany({
			where: { reportId, organizationId },
			include: {
				alertRule: true,
				client: true,
			},
			orderBy: { createdAt: "asc" },
		});
	}

	/**
	 * Update report file URL after generation
	 */
	async updateFileUrl(
		organizationId: string,
		id: string,
		fileUrl: string,
		fileSize: number,
		isXml: boolean,
	): Promise<ReportEntity> {
		await this.ensureExists(organizationId, id);

		const report = await this.prisma.report.update({
			where: { id },
			data: {
				...(isXml ? { xmlFileUrl: fileUrl } : { pdfFileUrl: fileUrl }),
				fileSize,
				generatedAt: new Date(),
				status: "GENERATED",
			},
		});

		return mapPrismaReport(report);
	}

	/**
	 * Check if a report exists for the given period and type
	 */
	async existsForPeriod(
		organizationId: string,
		type: string,
		periodStart: Date,
		periodEnd: Date,
	): Promise<boolean> {
		const count = await this.prisma.report.count({
			where: {
				organizationId,
				type: type as "MONTHLY" | "QUARTERLY" | "ANNUAL" | "CUSTOM",
				periodStart,
				periodEnd,
			},
		});
		return count > 0;
	}

	private async ensureExists(
		organizationId: string,
		id: string,
	): Promise<void> {
		const report = await this.prisma.report.findFirst({
			where: { id, organizationId },
		});
		if (!report) {
			throw new Error("REPORT_NOT_FOUND");
		}
	}
}
