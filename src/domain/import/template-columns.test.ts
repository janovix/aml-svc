import { describe, it, expect } from "vitest";
import {
	CORE_OPERATION_COLUMNS,
	PAYMENT_COLUMNS,
	getActivityColumns,
	getRequiredColumns,
} from "./template-columns";

describe("template-columns", () => {
	describe("getActivityColumns", () => {
		it("returns core + activity extension + payment columns for VEH", () => {
			const cols = getActivityColumns("VEH");
			expect(cols).toContain("client_rfc");
			expect(cols).toContain("operation_date");
			expect(cols).toContain("vehicle_type");
			expect(cols).toContain("brand");
			expect(cols).toContain("payment_form_code_1");
			expect(cols).toContain("payment_amount_5");
			expect(cols.length).toBeGreaterThanOrEqual(
				CORE_OPERATION_COLUMNS.length + PAYMENT_COLUMNS.length,
			);
		});

		it("returns core + activity extension + payment columns for JYS", () => {
			const cols = getActivityColumns("JYS");
			expect(cols).toContain("game_type_code");
			expect(cols).toContain("prize_amount");
		});

		it("includes all core columns for every activity", () => {
			const cols = getActivityColumns("INM");
			for (const core of CORE_OPERATION_COLUMNS) {
				expect(cols).toContain(core);
			}
		});
	});

	describe("getRequiredColumns", () => {
		it("returns core required + activity-specific required for VEH", () => {
			const cols = getRequiredColumns("VEH");
			expect(cols).toContain("client_rfc");
			expect(cols).toContain("operation_date");
			expect(cols).toContain("amount");
			expect(cols).toContain("vehicle_type");
			expect(cols).toContain("brand");
			expect(cols).toContain("model");
			expect(cols).toContain("year");
		});

		it("returns core required only for JYS (no activity-specific required)", () => {
			const cols = getRequiredColumns("JYS");
			expect(cols).toContain("client_rfc");
			expect(cols).toContain("amount");
			expect(cols.filter((c) => c === "vehicle_type")).toHaveLength(0);
		});

		it("includes activity-specific required for INM", () => {
			const cols = getRequiredColumns("INM");
			expect(cols).toContain("property_type_code");
		});

		it("includes activity-specific required for BLI", () => {
			const cols = getRequiredColumns("BLI");
			expect(cols).toContain("item_type");
			expect(cols).toContain("armor_level_code");
		});

		it("includes activity-specific required for CHV", () => {
			const cols = getRequiredColumns("CHV");
			expect(cols).toContain("denomination_code");
			expect(cols).toContain("check_count");
		});

		it("includes activity-specific required for all activity codes", () => {
			const activities = [
				"VEH",
				"INM",
				"MJR",
				"AVI",
				"JYS",
				"ARI",
				"BLI",
				"DON",
				"MPC",
				"FEP",
				"FES",
				"SPR",
				"CHV",
				"TSC",
				"TPP",
				"TDR",
				"TCV",
				"OBA",
				"DIN",
			] as const;
			for (const code of activities) {
				const cols = getRequiredColumns(code);
				expect(cols.length).toBeGreaterThan(0);
				expect(cols).toContain("client_rfc");
				expect(cols).toContain("amount");
			}
		});
	});
});
