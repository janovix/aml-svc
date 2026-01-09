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
		const {
			page,
			limit,
			template,
			periodType,
			status,
			periodStart,
			periodEnd,
			clientId,
		} = filters;
		const skip = (page - 1) * limit;

		const where: Prisma.ReportWhereInput = {
			organizationId,
		};

		if (template) {
			where.template = template;
		}
		if (periodType) {
			where.periodType = periodType;
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
		if (clientId) {
			where.clientId = clientId;
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
	 * Count alerts in a period (for analytics reports)
	 */
	async countAlertsForPeriod(
		organizationId: string,
		periodStart: Date,
		periodEnd: Date,
		filters?: {
			clientId?: string;
			alertRuleIds?: string[];
			alertSeverities?: string[];
		},
	): Promise<{
		total: number;
		bySeverity: Record<string, number>;
		byStatus: Record<string, number>;
	}> {
		const where: Prisma.AlertWhereInput = {
			organizationId,
			createdAt: {
				gte: periodStart,
				lte: periodEnd,
			},
		};

		if (filters?.clientId) {
			where.clientId = filters.clientId;
		}
		if (filters?.alertRuleIds && filters.alertRuleIds.length > 0) {
			where.alertRuleId = { in: filters.alertRuleIds };
		}
		if (filters?.alertSeverities && filters.alertSeverities.length > 0) {
			where.severity = {
				in: filters.alertSeverities as (
					| "LOW"
					| "MEDIUM"
					| "HIGH"
					| "CRITICAL"
				)[],
			};
		}

		const alerts = await this.prisma.alert.findMany({
			where,
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
		await this.ensureExists(organizationId, id);

		const now = new Date();

		const report = await this.prisma.report.update({
			where: { id },
			data: {
				...(options.pdfFileUrl !== undefined && {
					pdfFileUrl: options.pdfFileUrl,
				}),
				...(options.fileSize !== undefined && { fileSize: options.fileSize }),
				generatedAt: now,
				status: "GENERATED",
			},
		});

		return mapPrismaReport(report);
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
