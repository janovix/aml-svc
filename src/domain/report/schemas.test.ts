import { describe, it, expect } from "vitest";
import {
	ReportCreateSchema,
	ReportPatchSchema,
	ReportFilterSchema,
	ReportPreviewSchema,
	ReportTemplateSchema,
	ReportPeriodTypeSchema,
	ReportStatusSchema,
	ReportDataSourceSchema,
	ChartTypeSchema,
} from "./schemas";

describe("Report Schemas", () => {
	describe("ReportTemplateSchema", () => {
		it("should accept valid report templates", () => {
			expect(ReportTemplateSchema.parse("EXECUTIVE_SUMMARY")).toBe(
				"EXECUTIVE_SUMMARY",
			);
			expect(ReportTemplateSchema.parse("COMPLIANCE_STATUS")).toBe(
				"COMPLIANCE_STATUS",
			);
			expect(ReportTemplateSchema.parse("TRANSACTION_ANALYSIS")).toBe(
				"TRANSACTION_ANALYSIS",
			);
			expect(ReportTemplateSchema.parse("CLIENT_RISK_PROFILE")).toBe(
				"CLIENT_RISK_PROFILE",
			);
			expect(ReportTemplateSchema.parse("ALERT_BREAKDOWN")).toBe(
				"ALERT_BREAKDOWN",
			);
			expect(ReportTemplateSchema.parse("PERIOD_COMPARISON")).toBe(
				"PERIOD_COMPARISON",
			);
			expect(ReportTemplateSchema.parse("CUSTOM")).toBe("CUSTOM");
		});

		it("should reject invalid report templates", () => {
			expect(() => ReportTemplateSchema.parse("INVALID")).toThrow();
			expect(() => ReportTemplateSchema.parse("MONTHLY")).toThrow();
		});
	});

	describe("ReportPeriodTypeSchema", () => {
		it("should accept valid period types", () => {
			expect(ReportPeriodTypeSchema.parse("MONTHLY")).toBe("MONTHLY");
			expect(ReportPeriodTypeSchema.parse("QUARTERLY")).toBe("QUARTERLY");
			expect(ReportPeriodTypeSchema.parse("ANNUAL")).toBe("ANNUAL");
			expect(ReportPeriodTypeSchema.parse("CUSTOM")).toBe("CUSTOM");
		});

		it("should reject invalid period types", () => {
			expect(() => ReportPeriodTypeSchema.parse("INVALID")).toThrow();
			expect(() => ReportPeriodTypeSchema.parse("weekly")).toThrow();
		});
	});

	describe("ReportStatusSchema", () => {
		it("should accept valid report statuses", () => {
			expect(ReportStatusSchema.parse("DRAFT")).toBe("DRAFT");
			expect(ReportStatusSchema.parse("GENERATED")).toBe("GENERATED");
		});

		it("should reject SAT-specific statuses (moved to Notice)", () => {
			expect(() => ReportStatusSchema.parse("SUBMITTED")).toThrow();
			expect(() => ReportStatusSchema.parse("ACKNOWLEDGED")).toThrow();
		});

		it("should reject invalid report statuses", () => {
			expect(() => ReportStatusSchema.parse("PENDING")).toThrow();
			expect(() => ReportStatusSchema.parse("completed")).toThrow();
		});
	});

	describe("ReportDataSourceSchema", () => {
		it("should accept valid data sources", () => {
			expect(ReportDataSourceSchema.parse("ALERTS")).toBe("ALERTS");
			expect(ReportDataSourceSchema.parse("TRANSACTIONS")).toBe("TRANSACTIONS");
			expect(ReportDataSourceSchema.parse("CLIENTS")).toBe("CLIENTS");
		});

		it("should reject invalid data sources", () => {
			expect(() => ReportDataSourceSchema.parse("ALL")).toThrow();
			expect(() => ReportDataSourceSchema.parse("invalid")).toThrow();
		});
	});

	describe("ChartTypeSchema", () => {
		it("should accept valid chart types", () => {
			expect(ChartTypeSchema.parse("PIE")).toBe("PIE");
			expect(ChartTypeSchema.parse("BAR")).toBe("BAR");
			expect(ChartTypeSchema.parse("LINE")).toBe("LINE");
			expect(ChartTypeSchema.parse("DONUT")).toBe("DONUT");
			expect(ChartTypeSchema.parse("STACKED_BAR")).toBe("STACKED_BAR");
		});

		it("should reject invalid chart types", () => {
			expect(() => ChartTypeSchema.parse("AREA")).toThrow();
			expect(() => ChartTypeSchema.parse("scatter")).toThrow();
		});
	});

	describe("ReportCreateSchema", () => {
		it("should validate a valid report creation", () => {
			const input = {
				name: "Executive Summary Q4 2024",
				template: "EXECUTIVE_SUMMARY",
				periodType: "QUARTERLY",
				periodStart: "2024-10-01T00:00:00Z",
				periodEnd: "2024-12-31T23:59:59Z",
				dataSources: ["ALERTS", "TRANSACTIONS"],
				notes: "Quarterly executive summary",
			};

			const result = ReportCreateSchema.parse(input);
			expect(result.name).toBe("Executive Summary Q4 2024");
			expect(result.template).toBe("EXECUTIVE_SUMMARY");
			expect(result.periodType).toBe("QUARTERLY");
		});

		it("should default template to CUSTOM when not provided", () => {
			const input = {
				name: "Test Report",
				periodStart: "2024-01-01T00:00:00Z",
				periodEnd: "2024-01-31T23:59:59Z",
			};

			const result = ReportCreateSchema.parse(input);
			expect(result.template).toBe("CUSTOM");
		});

		it("should default periodType to CUSTOM when not provided", () => {
			const input = {
				name: "Test Report",
				periodStart: "2024-01-01T00:00:00Z",
				periodEnd: "2024-01-31T23:59:59Z",
			};

			const result = ReportCreateSchema.parse(input);
			expect(result.periodType).toBe("CUSTOM");
		});

		it("should default dataSources to ALERTS when not provided", () => {
			const input = {
				name: "Test Report",
				periodStart: "2024-01-01T00:00:00Z",
				periodEnd: "2024-01-31T23:59:59Z",
			};

			const result = ReportCreateSchema.parse(input);
			expect(result.dataSources).toEqual(["ALERTS"]);
		});

		it("should reject periodEnd before periodStart", () => {
			const input = {
				name: "Test Report",
				periodStart: "2024-12-31T23:59:59Z",
				periodEnd: "2024-01-01T00:00:00Z", // End before start
			};

			expect(() => ReportCreateSchema.parse(input)).toThrow();
		});

		it("should require clientId for CLIENT_RISK_PROFILE template", () => {
			const input = {
				name: "Client Risk Profile",
				template: "CLIENT_RISK_PROFILE",
				periodStart: "2024-01-01T00:00:00Z",
				periodEnd: "2024-01-31T23:59:59Z",
				// Missing clientId
			};

			expect(() => ReportCreateSchema.parse(input)).toThrow();
		});

		it("should accept CLIENT_RISK_PROFILE template with clientId", () => {
			const input = {
				name: "Client Risk Profile",
				template: "CLIENT_RISK_PROFILE",
				periodStart: "2024-01-01T00:00:00Z",
				periodEnd: "2024-01-31T23:59:59Z",
				clientId: "CLIENT123",
			};

			const result = ReportCreateSchema.parse(input);
			expect(result.template).toBe("CLIENT_RISK_PROFILE");
			expect(result.clientId).toBe("CLIENT123");
		});

		it("should accept charts configuration", () => {
			const input = {
				name: "Test Report",
				periodStart: "2024-01-01T00:00:00Z",
				periodEnd: "2024-01-31T23:59:59Z",
				charts: [
					{
						type: "PIE",
						title: "Alerts by Severity",
						dataKey: "alertsBySeverity",
						showLegend: true,
					},
				],
			};

			const result = ReportCreateSchema.parse(input);
			expect(result.charts).toHaveLength(1);
			expect(result.charts[0].type).toBe("PIE");
		});

		it("should default includeSummaryCards to true", () => {
			const input = {
				name: "Test Report",
				periodStart: "2024-01-01T00:00:00Z",
				periodEnd: "2024-01-31T23:59:59Z",
			};

			const result = ReportCreateSchema.parse(input);
			expect(result.includeSummaryCards).toBe(true);
		});

		it("should default includeDetailTables to true", () => {
			const input = {
				name: "Test Report",
				periodStart: "2024-01-01T00:00:00Z",
				periodEnd: "2024-01-31T23:59:59Z",
			};

			const result = ReportCreateSchema.parse(input);
			expect(result.includeDetailTables).toBe(true);
		});
	});

	describe("ReportPatchSchema", () => {
		it("should allow partial updates", () => {
			expect(ReportPatchSchema.parse({ name: "New Name" })).toEqual({
				name: "New Name",
			});

			expect(ReportPatchSchema.parse({ includeSummaryCards: false })).toEqual({
				includeSummaryCards: false,
			});

			expect(ReportPatchSchema.parse({ notes: null })).toEqual({
				notes: null,
			});
		});

		it("should allow updating charts", () => {
			const result = ReportPatchSchema.parse({
				charts: [
					{
						type: "BAR",
						title: "New Chart",
						dataKey: "newData",
						showLegend: false,
					},
				],
			});

			expect(result.charts).toHaveLength(1);
			expect(result.charts![0].type).toBe("BAR");
		});

		it("should validate chart types in patch", () => {
			expect(() =>
				ReportPatchSchema.parse({
					charts: [{ type: "INVALID", title: "Test", dataKey: "test" }],
				}),
			).toThrow();
		});
	});

	describe("ReportFilterSchema", () => {
		it("should provide defaults for page and limit", () => {
			const result = ReportFilterSchema.parse({});
			expect(result.page).toBe(1);
			expect(result.limit).toBe(20);
		});

		it("should parse string numbers to integers", () => {
			const result = ReportFilterSchema.parse({
				page: "2",
				limit: "50",
			});
			expect(result.page).toBe(2);
			expect(result.limit).toBe(50);
		});

		it("should validate template filter", () => {
			const result = ReportFilterSchema.parse({
				template: "EXECUTIVE_SUMMARY",
			});
			expect(result.template).toBe("EXECUTIVE_SUMMARY");
		});

		it("should validate periodType filter", () => {
			const result = ReportFilterSchema.parse({ periodType: "QUARTERLY" });
			expect(result.periodType).toBe("QUARTERLY");
		});

		it("should validate status filter", () => {
			const result = ReportFilterSchema.parse({ status: "GENERATED" });
			expect(result.status).toBe("GENERATED");
		});

		it("should validate clientId filter", () => {
			const result = ReportFilterSchema.parse({ clientId: "CLIENT123" });
			expect(result.clientId).toBe("CLIENT123");
		});
	});

	describe("ReportPreviewSchema", () => {
		it("should validate preview request", () => {
			const input = {
				periodType: "MONTHLY",
				periodStart: "2024-01-01T00:00:00Z",
				periodEnd: "2024-01-31T23:59:59Z",
			};

			const result = ReportPreviewSchema.parse(input);
			expect(result.periodType).toBe("MONTHLY");
		});

		it("should require periodType, periodStart, and periodEnd", () => {
			expect(() =>
				ReportPreviewSchema.parse({ periodType: "MONTHLY" }),
			).toThrow();

			expect(() =>
				ReportPreviewSchema.parse({
					periodStart: "2024-01-01T00:00:00Z",
					periodEnd: "2024-01-31T23:59:59Z",
				}),
			).toThrow();
		});

		it("should default dataSources to ALERTS", () => {
			const input = {
				periodType: "MONTHLY",
				periodStart: "2024-01-01T00:00:00Z",
				periodEnd: "2024-01-31T23:59:59Z",
			};

			const result = ReportPreviewSchema.parse(input);
			expect(result.dataSources).toEqual(["ALERTS"]);
		});

		it("should accept optional filters", () => {
			const input = {
				periodType: "MONTHLY",
				periodStart: "2024-01-01T00:00:00Z",
				periodEnd: "2024-01-31T23:59:59Z",
				filters: {
					alertSeverities: ["HIGH", "CRITICAL"],
					minAmount: 10000,
				},
			};

			const result = ReportPreviewSchema.parse(input);
			expect(result.filters.alertSeverities).toEqual(["HIGH", "CRITICAL"]);
			expect(result.filters.minAmount).toBe(10000);
		});
	});
});
