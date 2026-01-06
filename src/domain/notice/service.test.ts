import { describe, it, expect } from "vitest";
import { calculateNoticePeriod, getNoticeSubmissionDeadline } from "./types";

describe("Notice Period Calculations (SAT 17-17 Cycle)", () => {
	describe("calculateNoticePeriod", () => {
		it("should calculate December 2024 period correctly (Nov 17 - Dec 16)", () => {
			const period = calculateNoticePeriod(2024, 12);

			expect(period.start.getUTCFullYear()).toBe(2024);
			expect(period.start.getUTCMonth()).toBe(10); // November (0-indexed)
			expect(period.start.getUTCDate()).toBe(17);

			expect(period.end.getUTCFullYear()).toBe(2024);
			expect(period.end.getUTCMonth()).toBe(11); // December
			expect(period.end.getUTCDate()).toBe(16);

			expect(period.reportedMonth).toBe("202412");
			expect(period.displayName).toBe("Diciembre 2024");
		});

		it("should calculate January 2025 period correctly (Dec 17 2024 - Jan 16 2025)", () => {
			const period = calculateNoticePeriod(2025, 1);

			expect(period.start.getUTCFullYear()).toBe(2024);
			expect(period.start.getUTCMonth()).toBe(11); // December (0-indexed)
			expect(period.start.getUTCDate()).toBe(17);

			expect(period.end.getUTCFullYear()).toBe(2025);
			expect(period.end.getUTCMonth()).toBe(0); // January
			expect(period.end.getUTCDate()).toBe(16);

			expect(period.reportedMonth).toBe("202501");
			expect(period.displayName).toBe("Enero 2025");
		});

		it("should calculate July 2024 period correctly (Jun 17 - Jul 16)", () => {
			const period = calculateNoticePeriod(2024, 7);

			expect(period.start.getUTCFullYear()).toBe(2024);
			expect(period.start.getUTCMonth()).toBe(5); // June
			expect(period.start.getUTCDate()).toBe(17);

			expect(period.end.getUTCFullYear()).toBe(2024);
			expect(period.end.getUTCMonth()).toBe(6); // July
			expect(period.end.getUTCDate()).toBe(16);

			expect(period.reportedMonth).toBe("202407");
			expect(period.displayName).toBe("Julio 2024");
		});

		it("should calculate February 2024 period correctly (Jan 17 - Feb 16)", () => {
			const period = calculateNoticePeriod(2024, 2);

			expect(period.start.getUTCFullYear()).toBe(2024);
			expect(period.start.getUTCMonth()).toBe(0); // January (0-indexed)
			expect(period.start.getUTCDate()).toBe(17);

			expect(period.end.getUTCFullYear()).toBe(2024);
			expect(period.end.getUTCMonth()).toBe(1); // February (0-indexed)
			expect(period.end.getUTCDate()).toBe(16);

			expect(period.reportedMonth).toBe("202402");
			expect(period.displayName).toBe("Febrero 2024");
		});

		it("should set start time to 00:00:00.000 UTC", () => {
			const period = calculateNoticePeriod(2024, 6);

			expect(period.start.getUTCHours()).toBe(0);
			expect(period.start.getUTCMinutes()).toBe(0);
			expect(period.start.getUTCSeconds()).toBe(0);
			expect(period.start.getUTCMilliseconds()).toBe(0);
		});

		it("should set end time to 23:59:59.999 UTC", () => {
			const period = calculateNoticePeriod(2024, 6);

			expect(period.end.getUTCHours()).toBe(23);
			expect(period.end.getUTCMinutes()).toBe(59);
			expect(period.end.getUTCSeconds()).toBe(59);
			expect(period.end.getUTCMilliseconds()).toBe(999);
		});

		it("should format reportedMonth as YYYYMM with leading zeros", () => {
			expect(calculateNoticePeriod(2024, 1).reportedMonth).toBe("202401");
			expect(calculateNoticePeriod(2024, 9).reportedMonth).toBe("202409");
			expect(calculateNoticePeriod(2024, 10).reportedMonth).toBe("202410");
			expect(calculateNoticePeriod(2024, 12).reportedMonth).toBe("202412");
		});
	});

	describe("getNoticeSubmissionDeadline", () => {
		it("should return day 17 of the following month for regular months", () => {
			// January 2024 notice is due by February 17, 2024
			const deadline = getNoticeSubmissionDeadline(2024, 1);

			expect(deadline.getUTCFullYear()).toBe(2024);
			expect(deadline.getUTCMonth()).toBe(1); // February (0-indexed)
			expect(deadline.getUTCDate()).toBe(17);
		});

		it("should handle year rollover for December", () => {
			// December 2024 notice is due by January 17, 2025
			const deadline = getNoticeSubmissionDeadline(2024, 12);

			expect(deadline.getUTCFullYear()).toBe(2025);
			expect(deadline.getUTCMonth()).toBe(0); // January
			expect(deadline.getUTCDate()).toBe(17);
		});

		it("should handle mid-year months", () => {
			// June 2024 notice is due by July 17, 2024
			const deadline = getNoticeSubmissionDeadline(2024, 6);

			expect(deadline.getUTCFullYear()).toBe(2024);
			expect(deadline.getUTCMonth()).toBe(6); // July (0-indexed)
			expect(deadline.getUTCDate()).toBe(17);
		});

		it("should set deadline time to end of day 23:59:59.999 UTC", () => {
			const deadline = getNoticeSubmissionDeadline(2024, 6);

			expect(deadline.getUTCHours()).toBe(23);
			expect(deadline.getUTCMinutes()).toBe(59);
			expect(deadline.getUTCSeconds()).toBe(59);
			expect(deadline.getUTCMilliseconds()).toBe(999);
		});
	});

	describe("Period edge cases", () => {
		it("should correctly handle cross-year periods for January notices", () => {
			// January 2025 notice covers Dec 17, 2024 - Jan 16, 2025
			const period = calculateNoticePeriod(2025, 1);
			const deadline = getNoticeSubmissionDeadline(2025, 1);

			// Period spans two years
			expect(period.start.getUTCFullYear()).toBe(2024);
			expect(period.end.getUTCFullYear()).toBe(2025);

			// Deadline is in the same year as the reported month
			expect(deadline.getUTCFullYear()).toBe(2025);
			expect(deadline.getUTCMonth()).toBe(1); // February
		});

		it("should maintain consistent period length (approximately 30 days)", () => {
			// Most periods should be around 30 days (16th to 17th is 30-31 days)
			const periods = [
				calculateNoticePeriod(2024, 1),
				calculateNoticePeriod(2024, 6),
				calculateNoticePeriod(2024, 12),
			];

			for (const period of periods) {
				const diffMs = period.end.getTime() - period.start.getTime();
				const diffDays = diffMs / (1000 * 60 * 60 * 24);

				// Should be approximately 30 days (29-31 depending on month lengths)
				expect(diffDays).toBeGreaterThanOrEqual(29);
				expect(diffDays).toBeLessThanOrEqual(31);
			}
		});
	});
});
