import type {
	Report as PrismaReportModel,
	ReportTemplate as PrismaReportTemplate,
	ReportPeriodType as PrismaReportPeriodType,
	ReportStatus as PrismaReportStatus,
} from "@prisma/client";

import { generateId } from "../../lib/id-generator";
import type { ReportCreateInput, ReportPatchInput } from "./schemas";
import type {
	ReportEntity,
	ReportStatus,
	ReportTemplate,
	ReportPeriodType,
	ReportDataSource,
	ReportFilters,
	ReportChartConfig as ReportChartConfigType,
} from "./types";

const REPORT_TEMPLATE_TO_PRISMA: Record<ReportTemplate, PrismaReportTemplate> =
	{
		EXECUTIVE_SUMMARY: "EXECUTIVE_SUMMARY",
		COMPLIANCE_STATUS: "COMPLIANCE_STATUS",
		TRANSACTION_ANALYSIS: "TRANSACTION_ANALYSIS",
		CLIENT_RISK_PROFILE: "CLIENT_RISK_PROFILE",
		ALERT_BREAKDOWN: "ALERT_BREAKDOWN",
		PERIOD_COMPARISON: "PERIOD_COMPARISON",
		CUSTOM: "CUSTOM",
	};

const REPORT_TEMPLATE_FROM_PRISMA: Record<
	PrismaReportTemplate,
	ReportTemplate
> = {
	EXECUTIVE_SUMMARY: "EXECUTIVE_SUMMARY",
	COMPLIANCE_STATUS: "COMPLIANCE_STATUS",
	TRANSACTION_ANALYSIS: "TRANSACTION_ANALYSIS",
	CLIENT_RISK_PROFILE: "CLIENT_RISK_PROFILE",
	ALERT_BREAKDOWN: "ALERT_BREAKDOWN",
	PERIOD_COMPARISON: "PERIOD_COMPARISON",
	CUSTOM: "CUSTOM",
};

const REPORT_PERIOD_TYPE_TO_PRISMA: Record<
	ReportPeriodType,
	PrismaReportPeriodType
> = {
	MONTHLY: "MONTHLY",
	QUARTERLY: "QUARTERLY",
	ANNUAL: "ANNUAL",
	CUSTOM: "CUSTOM",
};

const REPORT_PERIOD_TYPE_FROM_PRISMA: Record<
	PrismaReportPeriodType,
	ReportPeriodType
> = {
	MONTHLY: "MONTHLY",
	QUARTERLY: "QUARTERLY",
	ANNUAL: "ANNUAL",
	CUSTOM: "CUSTOM",
};

const _REPORT_STATUS_TO_PRISMA: Record<ReportStatus, PrismaReportStatus> = {
	DRAFT: "DRAFT",
	GENERATED: "GENERATED",
};

const REPORT_STATUS_FROM_PRISMA: Record<PrismaReportStatus, ReportStatus> = {
	DRAFT: "DRAFT",
	GENERATED: "GENERATED",
};

function mapDateTime(value: Date | string | null | undefined): string | null {
	if (!value) return null;
	if (value instanceof Date) {
		return value.toISOString();
	}
	return value;
}

function parseJsonArray<T>(
	json: string | null | undefined,
	defaultValue: T[],
): T[] {
	if (!json) return defaultValue;
	try {
		const parsed = JSON.parse(json);
		return Array.isArray(parsed) ? parsed : defaultValue;
	} catch {
		return defaultValue;
	}
}

function parseJsonObject<T>(
	json: string | null | undefined,
	defaultValue: T,
): T {
	if (!json) return defaultValue;
	try {
		return JSON.parse(json) as T;
	} catch {
		return defaultValue;
	}
}

/**
 * Map Prisma Report model to ReportEntity
 */
export function mapPrismaReport(prisma: PrismaReportModel): ReportEntity {
	return {
		id: prisma.id,
		organizationId: prisma.organizationId,
		name: prisma.name,
		template: REPORT_TEMPLATE_FROM_PRISMA[prisma.template],
		periodType: REPORT_PERIOD_TYPE_FROM_PRISMA[prisma.periodType],
		periodStart: mapDateTime(prisma.periodStart) ?? "",
		periodEnd: mapDateTime(prisma.periodEnd) ?? "",
		comparisonPeriodStart: mapDateTime(prisma.comparisonPeriodStart),
		comparisonPeriodEnd: mapDateTime(prisma.comparisonPeriodEnd),
		dataSources: parseJsonArray<ReportDataSource>(prisma.dataSources, [
			"ALERTS",
		]),
		filters: parseJsonObject<ReportFilters>(prisma.filters, {}),
		clientId: prisma.clientId,
		charts: parseJsonArray<ReportChartConfigType>(prisma.charts, []),
		includeSummaryCards: prisma.includeSummaryCards,
		includeDetailTables: prisma.includeDetailTables,
		status: REPORT_STATUS_FROM_PRISMA[prisma.status],
		pdfFileUrl: prisma.pdfFileUrl,
		fileSize: prisma.fileSize,
		generatedAt: mapDateTime(prisma.generatedAt),
		createdBy: prisma.createdBy,
		notes: prisma.notes,
		createdAt: mapDateTime(prisma.createdAt) ?? "",
		updatedAt: mapDateTime(prisma.updatedAt) ?? "",
	};
}

/**
 * Map ReportCreateInput to Prisma create data
 */
export function mapReportCreateInputToPrisma(
	input: ReportCreateInput,
	organizationId: string,
	createdBy?: string,
): {
	id: string;
	organizationId: string;
	name: string;
	template: PrismaReportTemplate;
	periodType: PrismaReportPeriodType;
	periodStart: Date;
	periodEnd: Date;
	comparisonPeriodStart: Date | null;
	comparisonPeriodEnd: Date | null;
	dataSources: string;
	filters: string;
	clientId: string | null;
	charts: string;
	includeSummaryCards: boolean;
	includeDetailTables: boolean;
	status: PrismaReportStatus;
	createdBy: string | null;
	notes: string | null;
} {
	return {
		id: generateId("REPORT"),
		organizationId,
		name: input.name,
		template: REPORT_TEMPLATE_TO_PRISMA[input.template ?? "CUSTOM"],
		periodType: REPORT_PERIOD_TYPE_TO_PRISMA[input.periodType ?? "CUSTOM"],
		periodStart: new Date(input.periodStart),
		periodEnd: new Date(input.periodEnd),
		comparisonPeriodStart: input.comparisonPeriodStart
			? new Date(input.comparisonPeriodStart)
			: null,
		comparisonPeriodEnd: input.comparisonPeriodEnd
			? new Date(input.comparisonPeriodEnd)
			: null,
		dataSources: JSON.stringify(input.dataSources ?? ["ALERTS"]),
		filters: JSON.stringify(input.filters ?? {}),
		clientId: input.clientId ?? null,
		charts: JSON.stringify(input.charts ?? []),
		includeSummaryCards: input.includeSummaryCards ?? true,
		includeDetailTables: input.includeDetailTables ?? true,
		status: "DRAFT",
		createdBy: createdBy ?? null,
		notes: input.notes ?? null,
	};
}

/**
 * Map ReportPatchInput to Prisma update data
 */
export function mapReportPatchInputToPrisma(input: ReportPatchInput): Partial<{
	name: string;
	charts: string;
	includeSummaryCards: boolean;
	includeDetailTables: boolean;
	notes: string | null;
}> {
	const result: Partial<{
		name: string;
		charts: string;
		includeSummaryCards: boolean;
		includeDetailTables: boolean;
		notes: string | null;
	}> = {};

	if (input.name !== undefined) {
		result.name = input.name;
	}
	if (input.charts !== undefined) {
		result.charts = JSON.stringify(input.charts);
	}
	if (input.includeSummaryCards !== undefined) {
		result.includeSummaryCards = input.includeSummaryCards;
	}
	if (input.includeDetailTables !== undefined) {
		result.includeDetailTables = input.includeDetailTables;
	}
	if (input.notes !== undefined) {
		result.notes = input.notes;
	}

	return result;
}
