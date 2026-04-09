import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { ReportAggregator } from "./report-aggregator";

describe("ReportAggregator", () => {
	it("aggregate with empty dataSources returns empty sections and risk indicators", async () => {
		const prisma = {
			client: {
				count: vi.fn().mockResolvedValue(0),
			},
			alert: {
				count: vi.fn().mockResolvedValue(0),
			},
		} as unknown as PrismaClient;

		const agg = new ReportAggregator(prisma);
		const start = new Date("2024-01-01");
		const end = new Date("2024-01-31");

		const result = await agg.aggregate({
			organizationId: "org-1",
			periodStart: start,
			periodEnd: end,
			dataSources: [],
		});

		expect(result.alerts.total).toBe(0);
		expect(result.operations.total).toBe(0);
		expect(result.clients.total).toBe(0);
		expect(result.riskIndicators.complianceScore).toBe(100);
		expect(result.riskIndicators.highRiskClients).toBe(0);
		expect(prisma.client.count).toHaveBeenCalled();
		expect(prisma.alert.count).toHaveBeenCalled();
	});

	it("calculateRiskIndicators deducts from compliance score based on alerts aggregation", async () => {
		const prisma = {
			client: {
				count: vi.fn().mockResolvedValue(0),
			},
			alert: {
				count: vi.fn().mockResolvedValue(0),
			},
		} as unknown as PrismaClient;

		const agg = new ReportAggregator(prisma);
		const indicators = await agg.calculateRiskIndicators(
			"org-1",
			{
				total: 5,
				bySeverity: { CRITICAL: 2, HIGH: 3 },
				byStatus: {},
				byRule: [],
				byMonth: [],
				avgResolutionDays: 0,
				overdueCount: 1,
			},
			{
				total: 0,
				byPersonType: {},
				byCountry: {},
				withAlerts: 0,
				newInPeriod: 0,
			},
		);

		expect(indicators.complianceScore).toBeLessThan(100);
		expect(indicators.complianceScore).toBeGreaterThanOrEqual(0);
	});
});
