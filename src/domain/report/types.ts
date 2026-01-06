/**
 * Report entity types for analytics and business intelligence
 * All reports use standard calendar periods and generate PDF output
 */

// Report period types - all use standard calendar periods
export type ReportPeriodType = "MONTHLY" | "QUARTERLY" | "ANNUAL" | "CUSTOM";

// Report templates for common use cases
export type ReportTemplate =
	| "EXECUTIVE_SUMMARY" // High-level compliance overview
	| "COMPLIANCE_STATUS" // Audit-ready compliance report
	| "TRANSACTION_ANALYSIS" // Transaction volume & patterns
	| "CLIENT_RISK_PROFILE" // Deep-dive on specific client
	| "ALERT_BREAKDOWN" // Alert management metrics
	| "PERIOD_COMPARISON" // Trend analysis
	| "CUSTOM"; // User-defined report

// Data sources that can be included
export type ReportDataSource = "ALERTS" | "TRANSACTIONS" | "CLIENTS";

// Chart types available for visualization
export type ChartType = "PIE" | "BAR" | "LINE" | "DONUT" | "STACKED_BAR";

// Report status (simplified - no SAT workflow)
export type ReportStatus = "DRAFT" | "GENERATED";

export interface ReportChartConfig {
	type: ChartType;
	title: string;
	dataKey: string; // e.g., "alertsBySeverity", "transactionsByMonth"
	showLegend: boolean;
}

export interface ReportFilters {
	clientIds?: string[]; // Filter by specific clients
	alertRuleIds?: string[]; // Filter by alert rules
	alertSeverities?: string[]; // Filter by severity levels
	transactionTypes?: string[]; // Filter by operation type
	minAmount?: number; // Minimum transaction amount
	maxAmount?: number; // Maximum transaction amount
}

export interface ReportEntity {
	id: string;
	organizationId: string;
	name: string;

	// Report configuration
	template: ReportTemplate;
	periodType: ReportPeriodType;
	periodStart: string; // ISO datetime
	periodEnd: string; // ISO datetime

	// Optional comparison period for trend analysis
	comparisonPeriodStart?: string | null;
	comparisonPeriodEnd?: string | null;

	// Data sources and filtering
	dataSources: ReportDataSource[];
	filters: ReportFilters;
	clientId?: string | null; // For CLIENT_RISK_PROFILE template

	// Visualization settings
	charts: ReportChartConfig[];
	includeSummaryCards: boolean;
	includeDetailTables: boolean;

	// Report state
	status: ReportStatus;

	// PDF output
	pdfFileUrl?: string | null;
	fileSize?: number | null;

	generatedAt?: string | null;
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
 * Report template configuration with default settings
 */
export interface ReportTemplateConfig {
	template: ReportTemplate;
	name: string;
	description: string;
	dataSources: ReportDataSource[];
	defaultCharts: ReportChartConfig[];
	requiresClientId: boolean;
}

/**
 * Get template configurations for all available templates
 */
export function getTemplateConfigs(): ReportTemplateConfig[] {
	return [
		{
			template: "EXECUTIVE_SUMMARY",
			name: "Executive Summary",
			description: "High-level compliance overview for leadership",
			dataSources: ["ALERTS", "TRANSACTIONS", "CLIENTS"],
			defaultCharts: [
				{
					type: "DONUT",
					title: "Alerts by Severity",
					dataKey: "alertsBySeverity",
					showLegend: true,
				},
				{
					type: "BAR",
					title: "Monthly Trends",
					dataKey: "alertsByMonth",
					showLegend: false,
				},
			],
			requiresClientId: false,
		},
		{
			template: "COMPLIANCE_STATUS",
			name: "Compliance Status",
			description: "Audit-ready compliance report",
			dataSources: ["ALERTS", "CLIENTS"],
			defaultCharts: [
				{
					type: "PIE",
					title: "Alert Status",
					dataKey: "alertsByStatus",
					showLegend: true,
				},
				{
					type: "BAR",
					title: "Alerts by Rule",
					dataKey: "alertsByRule",
					showLegend: false,
				},
			],
			requiresClientId: false,
		},
		{
			template: "TRANSACTION_ANALYSIS",
			name: "Transaction Analysis",
			description: "Transaction volume and pattern analysis",
			dataSources: ["TRANSACTIONS"],
			defaultCharts: [
				{
					type: "LINE",
					title: "Transaction Volume",
					dataKey: "transactionsByMonth",
					showLegend: false,
				},
				{
					type: "PIE",
					title: "By Vehicle Type",
					dataKey: "transactionsByVehicleType",
					showLegend: true,
				},
			],
			requiresClientId: false,
		},
		{
			template: "CLIENT_RISK_PROFILE",
			name: "Client Risk Profile",
			description: "Deep-dive analysis of a specific client",
			dataSources: ["ALERTS", "TRANSACTIONS", "CLIENTS"],
			defaultCharts: [
				{
					type: "BAR",
					title: "Alert History",
					dataKey: "clientAlertHistory",
					showLegend: false,
				},
				{
					type: "LINE",
					title: "Transaction History",
					dataKey: "clientTransactionHistory",
					showLegend: false,
				},
			],
			requiresClientId: true,
		},
		{
			template: "ALERT_BREAKDOWN",
			name: "Alert Breakdown",
			description: "Detailed alert management metrics",
			dataSources: ["ALERTS"],
			defaultCharts: [
				{
					type: "STACKED_BAR",
					title: "Alerts by Rule & Severity",
					dataKey: "alertsByRuleSeverity",
					showLegend: true,
				},
				{
					type: "PIE",
					title: "Alert Status",
					dataKey: "alertsByStatus",
					showLegend: true,
				},
			],
			requiresClientId: false,
		},
		{
			template: "PERIOD_COMPARISON",
			name: "Period Comparison",
			description: "Trend analysis with period-over-period comparison",
			dataSources: ["ALERTS", "TRANSACTIONS"],
			defaultCharts: [
				{
					type: "BAR",
					title: "Period Comparison",
					dataKey: "periodComparison",
					showLegend: true,
				},
				{
					type: "LINE",
					title: "Trend Analysis",
					dataKey: "trendAnalysis",
					showLegend: false,
				},
			],
			requiresClientId: false,
		},
		{
			template: "CUSTOM",
			name: "Custom Report",
			description: "User-defined report with custom configuration",
			dataSources: ["ALERTS"],
			defaultCharts: [],
			requiresClientId: false,
		},
	];
}

/**
 * Calculate calendar-based monthly period
 * Standard calendar month (1st to last day)
 */
export function calculateCalendarMonthPeriod(
	year: number,
	month: number,
): { start: Date; end: Date } {
	const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
	const end = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999)); // Last day of month
	return { start, end };
}

/**
 * Calculate quarterly period
 */
export function calculateQuarterlyPeriod(
	year: number,
	quarter: 1 | 2 | 3 | 4,
): { start: Date; end: Date } {
	const quarterMonths: Record<1 | 2 | 3 | 4, [number, number]> = {
		1: [1, 3],
		2: [4, 6],
		3: [7, 9],
		4: [10, 12],
	};

	const [startMonth, endMonth] = quarterMonths[quarter];
	const start = new Date(Date.UTC(year, startMonth - 1, 1, 0, 0, 0, 0));
	const end = new Date(Date.UTC(year, endMonth, 0, 23, 59, 59, 999));

	return { start, end };
}

/**
 * Calculate annual period
 */
export function calculateAnnualPeriod(year: number): {
	start: Date;
	end: Date;
} {
	const start = new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0));
	const end = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));

	return { start, end };
}
