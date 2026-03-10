import { describe, it, expect } from "vitest";
import {
	buildEnumFilterMeta,
	buildRangeFilterMeta,
	fromPrismaGroupBy,
} from "./filter-metadata";

describe("buildEnumFilterMeta", () => {
	it("maps rows to FilterMetaDef with sorted options", () => {
		const spec = { id: "status", label: "Status" };
		const groups = [
			{ value: "ACTIVE", count: 5 },
			{ value: "INACTIVE", count: 2 },
		];
		const result = buildEnumFilterMeta(spec, groups);
		expect(result.id).toBe("status");
		expect(result.type).toBe("enum");
		expect(result.options).toHaveLength(2);
		expect(result.options![0].value).toBe("ACTIVE"); // sorted by count desc
	});

	it("applies labelMap when provided", () => {
		const spec = {
			id: "type",
			label: "Type",
			labelMap: { PHYSICAL: "Persona Física" },
		};
		const groups = [{ value: "PHYSICAL", count: 3 }];
		const result = buildEnumFilterMeta(spec, groups);
		expect(result.options![0].label).toBe("Persona Física");
	});

	it("filters out null values from options", () => {
		const spec = { id: "status", label: "Status" };
		const groups = [
			{ value: null, count: 3 },
			{ value: "ACTIVE", count: 1 },
		];
		const result = buildEnumFilterMeta(spec, groups);
		// Null values are filtered out
		expect(result.options!.every((o) => o.value !== null)).toBe(true);
		expect(result.options).toHaveLength(1);
	});

	it("handles empty groups array", () => {
		const spec = { id: "status", label: "Status" };
		const result = buildEnumFilterMeta(spec, []);
		expect(result.options).toHaveLength(0);
	});
});

describe("buildRangeFilterMeta", () => {
	it("includes min and max when both are non-null", () => {
		const spec = {
			id: "amount",
			label: "Amount",
			type: "number-range" as const,
		};
		const result = buildRangeFilterMeta(spec, { min: "100", max: "5000" });
		expect(result).toMatchObject({ id: "amount", min: "100", max: "5000" });
	});

	it("omits min when it is null", () => {
		const spec = { id: "date", label: "Date", type: "date-range" as const };
		const result = buildRangeFilterMeta(spec, { min: null, max: "2024-12-31" });
		expect("min" in result).toBe(false);
		expect(result.max).toBe("2024-12-31");
	});

	it("omits max when it is null", () => {
		const spec = {
			id: "amount",
			label: "Amount",
			type: "number-range" as const,
		};
		const result = buildRangeFilterMeta(spec, { min: "0", max: null });
		expect("max" in result).toBe(false);
		expect(result.min).toBe("0");
	});

	it("produces empty meta when both min and max are null", () => {
		const spec = {
			id: "amount",
			label: "Amount",
			type: "number-range" as const,
		};
		const result = buildRangeFilterMeta(spec, { min: null, max: null });
		expect("min" in result).toBe(false);
		expect("max" in result).toBe(false);
	});
});

describe("fromPrismaGroupBy", () => {
	it("maps groupBy rows to EnumGroupResult with string values", () => {
		const rows = [
			{ status: "ACTIVE", _count: { status: 5 } },
			{ status: "INACTIVE", _count: { status: 2 } },
		];
		const result = fromPrismaGroupBy(rows, "status", "status");
		expect(result).toEqual([
			{ value: "ACTIVE", count: 5 },
			{ value: "INACTIVE", count: 2 },
		]);
	});

	it("returns null value when field value is null", () => {
		const rows = [{ status: null, _count: { status: 3 } }];
		const result = fromPrismaGroupBy(rows, "status", "status");
		expect(result[0].value).toBeNull();
	});

	it("returns 0 count when countField is missing in _count", () => {
		const rows = [{ status: "ACTIVE", _count: {} }];
		const result = fromPrismaGroupBy(rows, "status", "missing_field");
		expect(result[0].count).toBe(0);
	});

	it("converts non-string field values to strings", () => {
		const rows = [{ year: 2024, _count: { year: 1 } }];
		const result = fromPrismaGroupBy(rows, "year", "year");
		expect(result[0].value).toBe("2024");
	});
});
