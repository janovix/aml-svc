import { describe, it, expect } from "vitest";
import {
	calculateCalendarMonthPeriod,
	calculateQuarterlyPeriod,
	calculateAnnualPeriod,
} from "./types";

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
