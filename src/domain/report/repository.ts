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
import type { TenantContext } from "../../lib/tenant-context";

export class ReportRepository {
	constructor(private readonly prisma: PrismaClient) {}

	/**
	 * List reports with pagination and filters
	 */
	async list(
		tenant: TenantContext,
		filters: ReportFilterInput,
	): Promise<ListResult<ReportEntity>> {
		const { organizationId, environment } = tenant;
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
			environment,
		};

		if (template?.length) {
			where.template = { in: template };
		}
		if (periodType?.length) {
			where.periodType = { in: periodType };
		}
		if (status?.length) {
			where.status = { in: status };
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
	async get(tenant: TenantContext, id: string): Promise<ReportEntity> {
		const { organizationId, environment } = tenant;
		const report = await this.prisma.report.findFirst({
			where: { id, organizationId, environment },
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
		tenant: TenantContext,
		id: string,
	): Promise<ReportWithAlertSummary> {
		const { organizationId, environment } = tenant;
		const report = await this.get(tenant, id);

		const alerts = await this.prisma.alert.findMany({
			where: { reportId: id, organizationId, environment },
			include: { alertRule: true },
		});

		const bySeverity: Record<string, number> = {};
		const byStatus: Record<string, number> = {};
		const byRuleMap: Map<string, { ruleName: string; count: number }> =
			new Map();

		for (const alert of alerts) {
			bySeverity[alert.severity] = (bySeverity[alert.severity] || 0) + 1;

			byStatus[alert.status] = (byStatus[alert.status] || 0) + 1;

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
		tenant: TenantContext,
		createdBy?: string,
	): Promise<ReportEntity> {
		const { organizationId, environment } = tenant;
		const data = mapReportCreateInputToPrisma(input, organizationId, createdBy);

		const report = await this.prisma.report.create({
			data: {
				...data,
				environment,
			},
		});

		return mapPrismaReport(report);
	}

	/**
	 * Update a report (partial)
	 */
	async patch(
		tenant: TenantContext,
		id: string,
		input: ReportPatchInput,
	): Promise<ReportEntity> {
		await this.ensureExists(tenant, id);

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
	async delete(tenant: TenantContext, id: string): Promise<void> {
		const { organizationId, environment } = tenant;
		await this.ensureExists(tenant, id);

		await this.prisma.alert.updateMany({
			where: { reportId: id, organizationId, environment },
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
		tenant: TenantContext,
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
		const { organizationId, environment } = tenant;
		const where: Prisma.AlertWhereInput = {
			organizationId,
			environment,
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
		tenant: TenantContext,
		id: string,
		options: {
			pdfFileUrl?: string | null;
			fileSize?: number | null;
		},
	): Promise<ReportEntity> {
		await this.ensureExists(tenant, id);

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

	private async ensureExists(tenant: TenantContext, id: string): Promise<void> {
		const { organizationId, environment } = tenant;
		const report = await this.prisma.report.findFirst({
			where: { id, organizationId, environment },
		});
		if (!report) {
			throw new Error("REPORT_NOT_FOUND");
		}
	}
}
