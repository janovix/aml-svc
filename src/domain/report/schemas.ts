import { z } from "zod";

export const REPORT_PERIOD_TYPE_VALUES = [
	"MONTHLY",
	"QUARTERLY",
	"ANNUAL",
	"CUSTOM",
] as const;
export const ReportPeriodTypeSchema = z.enum(REPORT_PERIOD_TYPE_VALUES);

export const REPORT_TEMPLATE_VALUES = [
	"EXECUTIVE_SUMMARY",
	"COMPLIANCE_STATUS",
	"TRANSACTION_ANALYSIS",
	"CLIENT_RISK_PROFILE",
	"ALERT_BREAKDOWN",
	"PERIOD_COMPARISON",
	"CUSTOM",
] as const;
export const ReportTemplateSchema = z.enum(REPORT_TEMPLATE_VALUES);

export const REPORT_DATA_SOURCE_VALUES = [
	"ALERTS",
	"TRANSACTIONS",
	"CLIENTS",
] as const;
export const ReportDataSourceSchema = z.enum(REPORT_DATA_SOURCE_VALUES);

export const CHART_TYPE_VALUES = [
	"PIE",
	"BAR",
	"LINE",
	"DONUT",
	"STACKED_BAR",
] as const;
export const ChartTypeSchema = z.enum(CHART_TYPE_VALUES);

export const REPORT_STATUS_VALUES = ["DRAFT", "GENERATED"] as const;
export const ReportStatusSchema = z.enum(REPORT_STATUS_VALUES);

const RESOURCE_ID_REGEX = /^[A-Za-z0-9-_]+$/;
const ResourceIdSchema = z
	.string()
	.trim()
	.min(1, "Invalid ID format")
	.max(64, "Invalid ID format")
	.regex(RESOURCE_ID_REGEX, "Invalid ID format");

// ISO datetime helper
const isoString = z
	.string()
	.transform((value) => {
		// Handle partial datetime formats like "2025-09-19T14:06"
		if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) {
			return `${value}:00Z`;
		}
		// Handle date-only formats
		if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
			return `${value}T00:00:00Z`;
		}
		// Handle datetime without seconds: "2025-09-19T14:06:00"
		if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(value)) {
			return `${value}Z`;
		}
		return value;
	})
	.refine(
		(value) => {
			try {
				const date = new Date(value);
				return !isNaN(date.getTime()) && value.includes("T");
			} catch {
				return false;
			}
		},
		{ message: "Invalid ISO datetime" },
	)
	.transform((value) => {
		const date = new Date(value);
		return date.toISOString();
	});

// Chart configuration schema
export const ReportChartConfigSchema = z.object({
	type: ChartTypeSchema,
	title: z.string().min(1).max(100),
	dataKey: z.string().min(1).max(50),
	showLegend: z.boolean().default(true),
});

export type ReportChartConfig = z.infer<typeof ReportChartConfigSchema>;

// Report filters schema
export const ReportFiltersSchema = z.object({
	clientIds: z.array(ResourceIdSchema).optional(),
	alertRuleIds: z.array(z.string()).optional(),
	alertSeverities: z.array(z.string()).optional(),
	transactionTypes: z.array(z.string()).optional(),
	minAmount: z.coerce.number().min(0).optional(),
	maxAmount: z.coerce.number().min(0).optional(),
});

export type ReportFiltersInput = z.infer<typeof ReportFiltersSchema>;

// Report Create Schema
export const ReportCreateSchema = z
	.object({
		name: z.string().min(1).max(200),
		template: ReportTemplateSchema.default("CUSTOM"),
		periodType: ReportPeriodTypeSchema.default("CUSTOM"),
		periodStart: isoString,
		periodEnd: isoString,
		comparisonPeriodStart: isoString.optional().nullable(),
		comparisonPeriodEnd: isoString.optional().nullable(),
		dataSources: z.array(ReportDataSourceSchema).default(["ALERTS"]),
		filters: ReportFiltersSchema.default({}),
		clientId: ResourceIdSchema.optional().nullable(),
		charts: z.array(ReportChartConfigSchema).default([]),
		includeSummaryCards: z.boolean().default(true),
		includeDetailTables: z.boolean().default(true),
		notes: z.string().max(1000).optional().nullable(),
	})
	.refine(
		(data) => {
			const start = new Date(data.periodStart);
			const end = new Date(data.periodEnd);
			return start < end;
		},
		{ message: "periodStart must be before periodEnd" },
	)
	.refine(
		(data) => {
			// If template is CLIENT_RISK_PROFILE, clientId is required
			if (data.template === "CLIENT_RISK_PROFILE" && !data.clientId) {
				return false;
			}
			return true;
		},
		{ message: "clientId is required for CLIENT_RISK_PROFILE template" },
	);

export type ReportCreateInput = z.infer<typeof ReportCreateSchema>;

// Report Patch Schema (partial update)
export const ReportPatchSchema = z.object({
	name: z.string().min(1).max(200).optional(),
	charts: z.array(ReportChartConfigSchema).optional(),
	includeSummaryCards: z.boolean().optional(),
	includeDetailTables: z.boolean().optional(),
	notes: z.string().max(1000).optional().nullable(),
});

export type ReportPatchInput = z.infer<typeof ReportPatchSchema>;

// Report ID Param Schema
export const ReportIdParamSchema = z.object({
	id: ResourceIdSchema,
});

export type ReportIdParam = z.infer<typeof ReportIdParamSchema>;

// Report Filter Schema
export const ReportFilterSchema = z.object({
	page: z.coerce.number().int().min(1).default(1),
	limit: z.coerce.number().int().min(1).max(100).default(20),
	template: ReportTemplateSchema.optional(),
	periodType: ReportPeriodTypeSchema.optional(),
	status: ReportStatusSchema.optional(),
	periodStart: isoString.optional(),
	periodEnd: isoString.optional(),
	clientId: ResourceIdSchema.optional(),
});

export type ReportFilterInput = z.infer<typeof ReportFilterSchema>;

// Preview Schema - for checking data before creating report
export const ReportPreviewSchema = z.object({
	periodType: ReportPeriodTypeSchema,
	periodStart: isoString,
	periodEnd: isoString,
	dataSources: z.array(ReportDataSourceSchema).default(["ALERTS"]),
	filters: ReportFiltersSchema.default({}),
	clientId: ResourceIdSchema.optional(),
});

export type ReportPreviewInput = z.infer<typeof ReportPreviewSchema>;

// Aggregation query schema
export const ReportAggregationQuerySchema = z.object({
	periodStart: isoString,
	periodEnd: isoString,
	comparisonPeriodStart: isoString.optional(),
	comparisonPeriodEnd: isoString.optional(),
	clientId: ResourceIdSchema.optional(),
});

export type ReportAggregationQuery = z.infer<
	typeof ReportAggregationQuerySchema
>;
