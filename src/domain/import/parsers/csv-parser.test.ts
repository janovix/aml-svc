import { describe, it, expect } from "vitest";
import {
	parseCSV,
	validateHeaders,
	getCSVHeaders,
	applyColumnMappingToHeaders,
	applyColumnMappingToRow,
} from "./csv-parser";

describe("parseCSV", () => {
	it("parses basic CSV with header and data rows", () => {
		const csv = "Name,Age\nAlice,30\nBob,25";
		const rows = parseCSV(csv);
		expect(rows).toHaveLength(2);
		expect(rows[0].rowNumber).toBe(1);
		expect(rows[0].data).toEqual({ name: "Alice", age: "30" });
		expect(rows[1].rowNumber).toBe(2);
		expect(rows[1].data).toEqual({ name: "Bob", age: "25" });
	});

	it("handles CRLF line endings", () => {
		const csv = "Name,Age\r\nAlice,30\r\nBob,25";
		const rows = parseCSV(csv);
		expect(rows).toHaveLength(2);
		expect(rows[0].data.name).toBe("Alice");
	});

	it("handles quoted fields with commas", () => {
		const csv = 'Name,Address\nAlice,"123 Main St, Apt 4"';
		const rows = parseCSV(csv);
		expect(rows[0].data.address).toBe("123 Main St, Apt 4");
	});

	it("handles escaped double quotes", () => {
		const csv = 'Name,Note\nAlice,"She said ""hello"""';
		const rows = parseCSV(csv);
		expect(rows[0].data.note).toBe('She said "hello"');
	});

	it("lowercases and trims headers", () => {
		const csv = "  Name  , AGE \nAlice,30";
		const rows = parseCSV(csv);
		expect(rows[0].data).toHaveProperty("name");
		expect(rows[0].data).toHaveProperty("age");
	});

	it("skips empty lines", () => {
		const csv = "Name,Age\n\nAlice,30\n\nBob,25\n";
		const rows = parseCSV(csv);
		expect(rows).toHaveLength(2);
	});

	it("throws for header-only CSV", () => {
		expect(() => parseCSV("Name,Age")).toThrow(
			"CSV file must have at least a header row and one data row",
		);
	});

	it("throws for empty CSV", () => {
		expect(() => parseCSV("")).toThrow();
	});

	it("handles missing values (fewer columns than headers)", () => {
		const csv = "Name,Age,City\nAlice,30";
		const rows = parseCSV(csv);
		expect(rows[0].data.city).toBe("");
	});
});

describe("validateHeaders", () => {
	it("returns valid when all required headers present", () => {
		const result = validateHeaders(["name", "age"], ["name", "age"]);
		expect(result.valid).toBe(true);
		expect(result.missing).toEqual([]);
	});

	it("is case-insensitive", () => {
		const result = validateHeaders(["NAME", "Age"], ["name", "age"]);
		expect(result.valid).toBe(true);
	});

	it("reports missing headers", () => {
		const result = validateHeaders(["name"], ["name", "age", "city"]);
		expect(result.valid).toBe(false);
		expect(result.missing).toEqual(["age", "city"]);
	});

	it("handles extra headers gracefully", () => {
		const result = validateHeaders(["name", "age", "extra"], ["name", "age"]);
		expect(result.valid).toBe(true);
	});
});

describe("getCSVHeaders", () => {
	it("returns lowercase trimmed headers", () => {
		expect(getCSVHeaders("Name, AGE , City")).toEqual(["name", "age", "city"]);
	});

	it("returns empty array for empty string", () => {
		expect(getCSVHeaders("")).toEqual([]);
	});

	it("handles quoted headers", () => {
		expect(getCSVHeaders('"First Name",Age')).toEqual(["first name", "age"]);
	});
});

describe("applyColumnMappingToHeaders", () => {
	it("remaps headers using the mapping", () => {
		const result = applyColumnMappingToHeaders(["nombre", "edad"], {
			nombre: "name",
			edad: "age",
		});
		expect(result).toEqual(["name", "age"]);
	});

	it("preserves unmapped headers", () => {
		const result = applyColumnMappingToHeaders(["nombre", "city"], {
			nombre: "name",
		});
		expect(result).toEqual(["name", "city"]);
	});

	it("is case-insensitive on mapping keys", () => {
		const result = applyColumnMappingToHeaders(["nombre"], { Nombre: "name" });
		expect(result).toEqual(["name"]);
	});
});

describe("applyColumnMappingToRow", () => {
	it("remaps row keys using the mapping", () => {
		const result = applyColumnMappingToRow(
			{ nombre: "Alice", edad: "30" },
			{ nombre: "name", edad: "age" },
		);
		expect(result).toEqual({ name: "Alice", age: "30" });
	});

	it("preserves unmapped keys", () => {
		const result = applyColumnMappingToRow(
			{ nombre: "Alice", city: "CDMX" },
			{ nombre: "name" },
		);
		expect(result).toEqual({ name: "Alice", city: "CDMX" });
	});
});
