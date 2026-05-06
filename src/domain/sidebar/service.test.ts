import { describe, expect, it, vi } from "vitest";
import type { SidebarBadgeCounters } from "./service";
import { getSidebarBadges, primaryNoticeReportedMonth } from "./service";
import type { TenantContext } from "../../lib/tenant-context";

describe("sidebar badge service", () => {
	it("computes reported month before the 17th as current calendar month", () => {
		const may10 = new Date(2026, 4, 10);
		expect(primaryNoticeReportedMonth(may10)).toBe("202605");
	});

	it("computes reported month after the 16th as next calendar month", () => {
		const may17 = new Date(2026, 4, 17);
		expect(primaryNoticeReportedMonth(may17)).toBe("202606");
	});

	it("aggregates parallel counter results", async () => {
		const tenant: TenantContext = {
			organizationId: "org-1",
			environment: "production",
		};
		const counters: SidebarBadgeCounters = {
			countOpenAlerts: vi.fn().mockResolvedValue(2),
			countDraftNoticesForReportedMonth: vi.fn().mockResolvedValue(1),
			countDraftReports: vi.fn().mockResolvedValue(0),
			countRiskDueForReview: vi.fn().mockResolvedValue(3),
			countFailedImports: vi.fn().mockResolvedValue(1),
			countTrainingTodo: vi.fn().mockResolvedValue(4),
		};

		const fixedNow = new Date(2026, 2, 5);
		const result = await getSidebarBadges(tenant, "user-9", counters, fixedNow);

		expect(result).toEqual({
			alerts: 2,
			notices: 1,
			reports: 0,
			riskModels: 3,
			imports: 1,
			training: 4,
		});

		expect(counters.countDraftNoticesForReportedMonth).toHaveBeenCalledWith(
			tenant,
			primaryNoticeReportedMonth(fixedNow),
		);
		expect(counters.countTrainingTodo).toHaveBeenCalledWith("org-1", "user-9");
	});
});
