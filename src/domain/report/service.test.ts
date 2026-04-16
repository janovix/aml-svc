import { describe, it, expect, vi, beforeEach } from "vitest";
import {
	calculateCalendarMonthPeriod,
	calculateQuarterlyPeriod,
	calculateAnnualPeriod,
} from "./types";
import { productionTenant } from "../../lib/tenant-context";
import { ReportService } from "./service";
import type { ReportRepository } from "./repository";
import type { ReportEntity } from "./types";

describe("Report Period Calculations (Calendar-based)", () => {
	describe("calculateCalendarMonthPeriod", () => {
		it("should calculate January 2024 period correctly (Jan 1 - Jan 31)", () => {
			const period = calculateCalendarMonthPeriod(2024, 1);

			expect(period.start.getUTCFullYear()).toBe(2024);
			expect(period.start.getUTCMonth()).toBe(0); // January (0-indexed)
			expect(period.start.getUTCDate()).toBe(1);

			expect(period.end.getUTCFullYear()).toBe(2024);
			expect(period.end.getUTCMonth()).toBe(0); // January
			expect(period.end.getUTCDate()).toBe(31);
		});

		it("should calculate February 2024 period correctly (Feb 1 - Feb 29, leap year)", () => {
			const period = calculateCalendarMonthPeriod(2024, 2);

			expect(period.start.getUTCFullYear()).toBe(2024);
			expect(period.start.getUTCMonth()).toBe(1); // February (0-indexed)
			expect(period.start.getUTCDate()).toBe(1);

			expect(period.end.getUTCFullYear()).toBe(2024);
			expect(period.end.getUTCMonth()).toBe(1); // February
			expect(period.end.getUTCDate()).toBe(29); // Leap year
		});

		it("should calculate February 2023 period correctly (Feb 1 - Feb 28, non-leap year)", () => {
			const period = calculateCalendarMonthPeriod(2023, 2);

			expect(period.start.getUTCFullYear()).toBe(2023);
			expect(period.start.getUTCMonth()).toBe(1); // February (0-indexed)
			expect(period.start.getUTCDate()).toBe(1);

			expect(period.end.getUTCFullYear()).toBe(2023);
			expect(period.end.getUTCMonth()).toBe(1); // February
			expect(period.end.getUTCDate()).toBe(28); // Non-leap year
		});

		it("should calculate December 2024 period correctly (Dec 1 - Dec 31)", () => {
			const period = calculateCalendarMonthPeriod(2024, 12);

			expect(period.start.getUTCFullYear()).toBe(2024);
			expect(period.start.getUTCMonth()).toBe(11); // December (0-indexed)
			expect(period.start.getUTCDate()).toBe(1);

			expect(period.end.getUTCFullYear()).toBe(2024);
			expect(period.end.getUTCMonth()).toBe(11); // December
			expect(period.end.getUTCDate()).toBe(31);
		});

		it("should calculate July 2024 period correctly (Jul 1 - Jul 31)", () => {
			const period = calculateCalendarMonthPeriod(2024, 7);

			expect(period.start.getUTCFullYear()).toBe(2024);
			expect(period.start.getUTCMonth()).toBe(6); // July (0-indexed)
			expect(period.start.getUTCDate()).toBe(1);

			expect(period.end.getUTCFullYear()).toBe(2024);
			expect(period.end.getUTCMonth()).toBe(6); // July
			expect(period.end.getUTCDate()).toBe(31);
		});

		it("should set start time to 00:00:00.000 UTC", () => {
			const period = calculateCalendarMonthPeriod(2024, 6);

			expect(period.start.getUTCHours()).toBe(0);
			expect(period.start.getUTCMinutes()).toBe(0);
			expect(period.start.getUTCSeconds()).toBe(0);
			expect(period.start.getUTCMilliseconds()).toBe(0);
		});

		it("should set end time to 23:59:59.999 UTC", () => {
			const period = calculateCalendarMonthPeriod(2024, 6);

			expect(period.end.getUTCHours()).toBe(23);
			expect(period.end.getUTCMinutes()).toBe(59);
			expect(period.end.getUTCSeconds()).toBe(59);
			expect(period.end.getUTCMilliseconds()).toBe(999);
		});
	});

	describe("calculateQuarterlyPeriod", () => {
		it("should calculate Q1 correctly (Jan 1 - Mar 31)", () => {
			const period = calculateQuarterlyPeriod(2024, 1);

			expect(period.start.getUTCFullYear()).toBe(2024);
			expect(period.start.getUTCMonth()).toBe(0); // January
			expect(period.start.getUTCDate()).toBe(1);

			expect(period.end.getUTCFullYear()).toBe(2024);
			expect(period.end.getUTCMonth()).toBe(2); // March
			expect(period.end.getUTCDate()).toBe(31);
		});

		it("should calculate Q2 correctly (Apr 1 - Jun 30)", () => {
			const period = calculateQuarterlyPeriod(2024, 2);

			expect(period.start.getUTCFullYear()).toBe(2024);
			expect(period.start.getUTCMonth()).toBe(3); // April
			expect(period.start.getUTCDate()).toBe(1);

			expect(period.end.getUTCFullYear()).toBe(2024);
			expect(period.end.getUTCMonth()).toBe(5); // June
			expect(period.end.getUTCDate()).toBe(30);
		});

		it("should calculate Q3 correctly (Jul 1 - Sep 30)", () => {
			const period = calculateQuarterlyPeriod(2024, 3);

			expect(period.start.getUTCMonth()).toBe(6); // July
			expect(period.end.getUTCMonth()).toBe(8); // September
			expect(period.end.getUTCDate()).toBe(30);
		});

		it("should calculate Q4 correctly (Oct 1 - Dec 31)", () => {
			const period = calculateQuarterlyPeriod(2024, 4);

			expect(period.start.getUTCMonth()).toBe(9); // October
			expect(period.end.getUTCMonth()).toBe(11); // December
			expect(period.end.getUTCDate()).toBe(31);
		});
	});

	describe("calculateAnnualPeriod", () => {
		it("should calculate full year correctly", () => {
			const period = calculateAnnualPeriod(2024);

			expect(period.start.getUTCFullYear()).toBe(2024);
			expect(period.start.getUTCMonth()).toBe(0);
			expect(period.start.getUTCDate()).toBe(1);

			expect(period.end.getUTCFullYear()).toBe(2024);
			expect(period.end.getUTCMonth()).toBe(11);
			expect(period.end.getUTCDate()).toBe(31);
		});

		it("should set end time to 23:59:59.999 UTC", () => {
			const period = calculateAnnualPeriod(2024);

			expect(period.end.getUTCHours()).toBe(23);
			expect(period.end.getUTCMinutes()).toBe(59);
			expect(period.end.getUTCSeconds()).toBe(59);
			expect(period.end.getUTCMilliseconds()).toBe(999);
		});
	});
});

describe("ReportService", () => {
	let mockRepository: ReportRepository;
	let service: ReportService;
	const tenant = productionTenant("org-1");

	const mockReport: ReportEntity = {
		id: "rpt-1",
		organizationId: "org-1",
		name: "Test",
		template: "EXECUTIVE_SUMMARY",
		periodType: "MONTHLY",
		periodStart: "2024-01-01T00:00:00.000Z",
		periodEnd: "2024-01-31T23:59:59.999Z",
		dataSources: ["ALERTS"],
		filters: {},
		charts: [],
		includeSummaryCards: true,
		includeDetailTables: true,
		status: "DRAFT",
		createdAt: "2024-01-01T00:00:00Z",
		updatedAt: "2024-01-01T00:00:00Z",
	};

	beforeEach(() => {
		mockRepository = {
			list: vi.fn(),
			get: vi.fn(),
			getWithAlertSummary: vi.fn(),
			countAlertsForPeriod: vi.fn(),
			create: vi.fn(),
			patch: vi.fn(),
			delete: vi.fn(),
			markAsGenerated: vi.fn(),
		} as unknown as ReportRepository;

		service = new ReportService(mockRepository);
	});

	it("list delegates to repository", async () => {
		vi.mocked(mockRepository.list).mockResolvedValue({
			data: [mockReport],
			pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
		});

		const filters = { page: 1, limit: 10 } as never;
		const result = await service.list(tenant, filters);

		expect(mockRepository.list).toHaveBeenCalledWith(tenant, filters);
		expect(result.data).toEqual([mockReport]);
	});

	it("delete throws when report is not DRAFT", async () => {
		const tenant = productionTenant("org-1");
		vi.mocked(mockRepository.get).mockResolvedValue({
			...mockReport,
			status: "GENERATED",
		} as ReportEntity);

		await expect(service.delete(tenant, "rpt-1")).rejects.toThrow(
			"CANNOT_DELETE_NON_DRAFT_REPORT",
		);
	});

	it("delete delegates when status is DRAFT", async () => {
		const tenant = productionTenant("org-1");
		vi.mocked(mockRepository.get).mockResolvedValue(mockReport);
		vi.mocked(mockRepository.delete).mockResolvedValue(undefined);

		await service.delete(tenant, "rpt-1");

		expect(mockRepository.delete).toHaveBeenCalledWith(tenant, "rpt-1");
	});

	it("getPeriodDates routes monthly quarterly annual", () => {
		const m = service.getPeriodDates("MONTHLY", 2024, 3);
		expect(m.start.getUTCMonth()).toBe(2);

		const q = service.getPeriodDates("QUARTERLY", 2024, 2);
		expect(q.start.getUTCMonth()).toBe(3);

		const a = service.getPeriodDates("ANNUAL", 2024, 1);
		expect(a.start.getUTCMonth()).toBe(0);
	});

	it("getTemplates returns non-empty template configs", () => {
		const templates = service.getTemplates();
		expect(Array.isArray(templates)).toBe(true);
		expect(templates.length).toBeGreaterThan(0);
	});
});
