import { describe, it, expect } from "vitest";
import { z } from "zod";
import { parseQueryParams, multiEnum } from "./query-params";

describe("parseQueryParams", () => {
	it("returns single string value for a single-occurrence key", () => {
		const params = new URLSearchParams("foo=bar");
		expect(parseQueryParams(params)).toEqual({ foo: "bar" });
	});

	it("returns array when the same key appears more than once", () => {
		const params = new URLSearchParams("status=A&status=B");
		expect(parseQueryParams(params)).toEqual({ status: ["A", "B"] });
	});

	it("returns array when key is in multiValueFields even if single occurrence", () => {
		const params = new URLSearchParams("status=ACTIVE");
		expect(parseQueryParams(params, ["status"])).toEqual({
			status: ["ACTIVE"],
		});
	});

	it("handles mixed single and multi-value keys", () => {
		const params = new URLSearchParams(
			"name=John&status=ACTIVE&status=PENDING&page=1",
		);
		const result = parseQueryParams(params, ["status"]);
		expect(result).toEqual({
			name: "John",
			status: ["ACTIVE", "PENDING"],
			page: "1",
		});
	});

	it("returns empty object for empty search params", () => {
		const params = new URLSearchParams("");
		expect(parseQueryParams(params)).toEqual({});
	});

	it("deduplicated keys - does not create duplicate entries", () => {
		const params = new URLSearchParams("x=1&x=2&x=3");
		const result = parseQueryParams(params);
		expect(result).toEqual({ x: ["1", "2", "3"] });
	});

	it("uses empty default for multiValueFields", () => {
		const params = new URLSearchParams("a=1");
		expect(parseQueryParams(params, [])).toEqual({ a: "1" });
	});
});

describe("multiEnum", () => {
	const schema = multiEnum(z.enum(["A", "B", "C"]));

	it("returns undefined when value is undefined", () => {
		const result = schema.safeParse(undefined);
		expect(result.success).toBe(true);
		expect(result.data).toBeUndefined();
	});

	it("wraps a single string value in an array", () => {
		const result = schema.safeParse("A");
		expect(result.success).toBe(true);
		expect(result.data).toEqual(["A"]);
	});

	it("passes through an array value unchanged", () => {
		const result = schema.safeParse(["A", "B"]);
		expect(result.success).toBe(true);
		expect(result.data).toEqual(["A", "B"]);
	});

	it("fails validation when single value is not in enum", () => {
		const result = schema.safeParse("D");
		expect(result.success).toBe(false);
	});

	it("fails validation when array contains invalid enum value", () => {
		const result = schema.safeParse(["A", "Z"]);
		expect(result.success).toBe(false);
	});

	it("returns empty array when passed empty array", () => {
		const result = schema.safeParse([]);
		expect(result.success).toBe(true);
		expect(result.data).toEqual([]);
	});
});
