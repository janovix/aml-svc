import { describe, it, expect } from "vitest";
import {
	calculateMonthlyPeriod,
	calculateQuarterlyPeriod,
	calculateAnnualPeriod,
} from "./service";

describe("Report Period Calculations", () => {
	describe("calculateMonthlyPeriod", () => {
		it("should calculate December 2024 period correctly (Nov 17 - Dec 16)", () => {
			const period = calculateMonthlyPeriod(2024, 12);

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
			const period = calculateMonthlyPeriod(2025, 1);

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
			const period = calculateMonthlyPeriod(2024, 7);

			expect(period.start.getUTCFullYear()).toBe(2024);
			expect(period.start.getUTCMonth()).toBe(5); // June
			expect(period.start.getUTCDate()).toBe(17);

			expect(period.end.getUTCFullYear()).toBe(2024);
			expect(period.end.getUTCMonth()).toBe(6); // July
			expect(period.end.getUTCDate()).toBe(16);

			expect(period.reportedMonth).toBe("202407");
			expect(period.displayName).toBe("Julio 2024");
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

			expect(period.reportedMonth).toBe("2024Q1");
			expect(period.displayName).toBe("Q1 2024");
		});

		it("should calculate Q2 correctly (Apr 1 - Jun 30)", () => {
			const period = calculateQuarterlyPeriod(2024, 2);

			expect(period.start.getUTCFullYear()).toBe(2024);
			expect(period.start.getUTCMonth()).toBe(3); // April
			expect(period.start.getUTCDate()).toBe(1);

			expect(period.end.getUTCFullYear()).toBe(2024);
			expect(period.end.getUTCMonth()).toBe(5); // June
			expect(period.end.getUTCDate()).toBe(30);

			expect(period.reportedMonth).toBe("2024Q2");
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

			expect(period.reportedMonth).toBe("2024Q4");
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

			expect(period.reportedMonth).toBe("2024");
			expect(period.displayName).toBe("Anual 2024");
		});
	});
});
