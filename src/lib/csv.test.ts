import { describe, it, expect } from "vitest";
import { parseCsvPreview } from "./csv";

describe("parseCsvPreview", () => {
	it("returns empty headers and no rows for empty string", () => {
		const result = parseCsvPreview("");
		expect(result.headers).toEqual([]);
		expect(result.sampleRows).toEqual([]);
	});

	it("returns empty headers and no rows for whitespace-only input", () => {
		const result = parseCsvPreview("   \n  \n  ");
		expect(result.headers).toEqual([]);
		expect(result.sampleRows).toEqual([]);
	});

	it("parses headers only when no data rows", () => {
		const result = parseCsvPreview("a,b,c");
		expect(result.headers).toEqual(["a", "b", "c"]);
		expect(result.sampleRows).toEqual([]);
	});

	it("parses headers and one data row", () => {
		const result = parseCsvPreview("name,age\nAlice,30");
		expect(result.headers).toEqual(["name", "age"]);
		expect(result.sampleRows).toEqual([{ name: "Alice", age: "30" }]);
	});

	it("parses multiple rows and respects maxSampleRows", () => {
		const csv = "x,y\n1,2\n3,4\n5,6\n7,8\n9,10";
		const result = parseCsvPreview(csv, 3);
		expect(result.headers).toEqual(["x", "y"]);
		expect(result.sampleRows).toHaveLength(3);
		expect(result.sampleRows[0]).toEqual({ x: "1", y: "2" });
		expect(result.sampleRows[1]).toEqual({ x: "3", y: "4" });
		expect(result.sampleRows[2]).toEqual({ x: "5", y: "6" });
	});

	it("handles quoted fields with commas inside", () => {
		const result = parseCsvPreview('a,b\n"hello, world",42');
		expect(result.headers).toEqual(["a", "b"]);
		expect(result.sampleRows).toEqual([{ a: "hello, world", b: "42" }]);
	});

	it("handles default maxSampleRows of 5", () => {
		const csv = "h\n1\n2\n3\n4\n5\n6\n7";
		const result = parseCsvPreview(csv);
		expect(result.sampleRows).toHaveLength(5);
		expect(result.sampleRows.map((r) => r.h)).toEqual([
			"1",
			"2",
			"3",
			"4",
			"5",
		]);
	});

	it("skips empty lines between rows", () => {
		const result = parseCsvPreview("a\n1\n\n2\n\n\n3");
		expect(result.headers).toEqual(["a"]);
		expect(result.sampleRows).toEqual([{ a: "1" }, { a: "2" }, { a: "3" }]);
	});

	it("assigns unique column_N for empty header cells and deduplicates headers", () => {
		const result = parseCsvPreview(",b,\n1,2,3");
		// Empty at index 0 -> column_0, at index 2 -> column_2; each position gets a distinct key
		expect(result.headers).toEqual(["column_0", "b", "column_2"]);
		expect(result.sampleRows[0]).toEqual({
			column_0: "1",
			b: "2",
			column_2: "3",
		});
	});

	it("handles CRLF line endings", () => {
		const result = parseCsvPreview("a,b\r\n1,2\r\n3,4");
		expect(result.headers).toEqual(["a", "b"]);
		expect(result.sampleRows).toEqual([
			{ a: "1", b: "2" },
			{ a: "3", b: "4" },
		]);
	});

	it("fills missing row values with empty string", () => {
		const result = parseCsvPreview("a,b,c\n1,2");
		expect(result.sampleRows[0]).toEqual({ a: "1", b: "2", c: "" });
	});
});
