import { describe, it, expect } from "vitest";
import {
	ReportCreateSchema,
	ReportPatchSchema,
	ReportFilterSchema,
	ReportPreviewSchema,
	ReportTypeSchema,
	ReportStatusSchema,
} from "./schemas";

describe("Report Schemas", () => {
	describe("ReportTypeSchema", () => {
		it("should accept valid report types", () => {
			expect(ReportTypeSchema.parse("MONTHLY")).toBe("MONTHLY");
			expect(ReportTypeSchema.parse("QUARTERLY")).toBe("QUARTERLY");
			expect(ReportTypeSchema.parse("ANNUAL")).toBe("ANNUAL");
			expect(ReportTypeSchema.parse("CUSTOM")).toBe("CUSTOM");
		});

		it("should reject invalid report types", () => {
			expect(() => ReportTypeSchema.parse("INVALID")).toThrow();
			expect(() => ReportTypeSchema.parse("weekly")).toThrow();
		});
	});

	describe("ReportStatusSchema", () => {
		it("should accept valid report statuses", () => {
			expect(ReportStatusSchema.parse("DRAFT")).toBe("DRAFT");
			expect(ReportStatusSchema.parse("GENERATED")).toBe("GENERATED");
			expect(ReportStatusSchema.parse("SUBMITTED")).toBe("SUBMITTED");
			expect(ReportStatusSchema.parse("ACKNOWLEDGED")).toBe("ACKNOWLEDGED");
		});

		it("should reject invalid report statuses", () => {
			expect(() => ReportStatusSchema.parse("PENDING")).toThrow();
			expect(() => ReportStatusSchema.parse("completed")).toThrow();
		});
	});

	describe("ReportCreateSchema", () => {
		it("should validate a valid monthly report creation", () => {
			const input = {
				name: "Reporte Mensual Diciembre 2024",
				type: "MONTHLY",
				periodStart: "2024-11-17T00:00:00Z",
				periodEnd: "2024-12-16T23:59:59Z",
				reportedMonth: "202412",
				notes: "Test report",
			};

			const result = ReportCreateSchema.parse(input);
			expect(result.name).toBe("Reporte Mensual Diciembre 2024");
			expect(result.type).toBe("MONTHLY");
			expect(result.reportedMonth).toBe("202412");
		});

		it("should reject invalid reportedMonth format", () => {
			const input = {
				name: "Test Report",
				type: "MONTHLY",
				periodStart: "2024-11-17T00:00:00Z",
				periodEnd: "2024-12-16T23:59:59Z",
				reportedMonth: "2024-12", // Invalid format
			};

			expect(() => ReportCreateSchema.parse(input)).toThrow();
		});

		it("should reject periodEnd before periodStart", () => {
			const input = {
				name: "Test Report",
				type: "MONTHLY",
				periodStart: "2024-12-16T23:59:59Z",
				periodEnd: "2024-11-17T00:00:00Z", // End before start
				reportedMonth: "202412",
			};

			expect(() => ReportCreateSchema.parse(input)).toThrow();
		});

		it("should default type to MONTHLY when not provided", () => {
			const input = {
				name: "Test Report",
				periodStart: "2024-11-17T00:00:00Z",
				periodEnd: "2024-12-16T23:59:59Z",
				reportedMonth: "202412",
			};

			const result = ReportCreateSchema.parse(input);
			expect(result.type).toBe("MONTHLY");
		});
	});

	describe("ReportPatchSchema", () => {
		it("should allow partial updates", () => {
			expect(ReportPatchSchema.parse({ name: "New Name" })).toEqual({
				name: "New Name",
			});

			expect(ReportPatchSchema.parse({ status: "GENERATED" })).toEqual({
				status: "GENERATED",
			});

			expect(ReportPatchSchema.parse({ notes: null })).toEqual({
				notes: null,
			});
		});

		it("should validate status values", () => {
			expect(() => ReportPatchSchema.parse({ status: "INVALID" })).toThrow();
		});
	});

	describe("ReportFilterSchema", () => {
		it("should provide defaults for page and limit", () => {
			const result = ReportFilterSchema.parse({});
			expect(result.page).toBe(1);
			expect(result.limit).toBe(20);
		});

		it("should parse string numbers to integers", () => {
			const result = ReportFilterSchema.parse({
				page: "2",
				limit: "50",
			});
			expect(result.page).toBe(2);
			expect(result.limit).toBe(50);
		});

		it("should validate type filter", () => {
			const result = ReportFilterSchema.parse({ type: "QUARTERLY" });
			expect(result.type).toBe("QUARTERLY");
		});

		it("should validate status filter", () => {
			const result = ReportFilterSchema.parse({ status: "SUBMITTED" });
			expect(result.status).toBe("SUBMITTED");
		});
	});

	describe("ReportPreviewSchema", () => {
		it("should validate preview request", () => {
			const input = {
				type: "MONTHLY",
				periodStart: "2024-11-17T00:00:00Z",
				periodEnd: "2024-12-16T23:59:59Z",
			};

			const result = ReportPreviewSchema.parse(input);
			expect(result.type).toBe("MONTHLY");
		});

		it("should require all fields", () => {
			expect(() => ReportPreviewSchema.parse({ type: "MONTHLY" })).toThrow();

			expect(() =>
				ReportPreviewSchema.parse({
					periodStart: "2024-11-17T00:00:00Z",
					periodEnd: "2024-12-16T23:59:59Z",
				}),
			).toThrow();
		});
	});
});
