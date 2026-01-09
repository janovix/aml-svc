import { describe, it, expect } from "vitest";
import {
	NoticeStatusSchema,
	NoticeCreateSchema,
	NoticeCreateWithPeriodSchema,
	NoticePatchSchema,
	NoticeFilterSchema,
	NoticePreviewSchema,
	NoticeSubmitSchema,
	NoticeAcknowledgeSchema,
} from "./schemas";

describe("Notice Schemas", () => {
	describe("NoticeStatusSchema", () => {
		it("should accept all valid notice statuses for SAT workflow", () => {
			expect(NoticeStatusSchema.parse("DRAFT")).toBe("DRAFT");
			expect(NoticeStatusSchema.parse("GENERATED")).toBe("GENERATED");
			expect(NoticeStatusSchema.parse("SUBMITTED")).toBe("SUBMITTED");
			expect(NoticeStatusSchema.parse("ACKNOWLEDGED")).toBe("ACKNOWLEDGED");
		});

		it("should reject invalid notice statuses", () => {
			expect(() => NoticeStatusSchema.parse("PENDING")).toThrow();
			expect(() => NoticeStatusSchema.parse("completed")).toThrow();
			expect(() => NoticeStatusSchema.parse("CANCELLED")).toThrow();
		});
	});

	describe("NoticeCreateSchema", () => {
		it("should validate a valid notice creation with year/month", () => {
			const input = {
				name: "Aviso SAT Diciembre 2024",
				year: 2024,
				month: 12,
				notes: "Monthly SAT notice",
			};

			const result = NoticeCreateSchema.parse(input);
			expect(result.name).toBe("Aviso SAT Diciembre 2024");
			expect(result.year).toBe(2024);
			expect(result.month).toBe(12);
		});

		it("should coerce string numbers to integers", () => {
			const input = {
				name: "Test Notice",
				year: "2024" as unknown as number,
				month: "6" as unknown as number,
			};

			const result = NoticeCreateSchema.parse(input);
			expect(result.year).toBe(2024);
			expect(result.month).toBe(6);
		});

		it("should reject year before 2020", () => {
			const input = {
				name: "Test Notice",
				year: 2019,
				month: 6,
			};

			expect(() => NoticeCreateSchema.parse(input)).toThrow();
		});

		it("should reject year after 2100", () => {
			const input = {
				name: "Test Notice",
				year: 2101,
				month: 6,
			};

			expect(() => NoticeCreateSchema.parse(input)).toThrow();
		});

		it("should reject month less than 1", () => {
			const input = {
				name: "Test Notice",
				year: 2024,
				month: 0,
			};

			expect(() => NoticeCreateSchema.parse(input)).toThrow();
		});

		it("should reject month greater than 12", () => {
			const input = {
				name: "Test Notice",
				year: 2024,
				month: 13,
			};

			expect(() => NoticeCreateSchema.parse(input)).toThrow();
		});

		it("should accept optional notes", () => {
			const input = {
				name: "Test Notice",
				year: 2024,
				month: 6,
			};

			const result = NoticeCreateSchema.parse(input);
			expect(result.notes).toBeUndefined();
		});

		it("should accept null notes", () => {
			const input = {
				name: "Test Notice",
				year: 2024,
				month: 6,
				notes: null,
			};

			const result = NoticeCreateSchema.parse(input);
			expect(result.notes).toBeNull();
		});
	});

	describe("NoticeCreateWithPeriodSchema", () => {
		it("should validate a valid notice with explicit period", () => {
			const input = {
				name: "Aviso SAT Diciembre 2024",
				periodStart: "2024-11-17T00:00:00Z",
				periodEnd: "2024-12-16T23:59:59Z",
				reportedMonth: "202412",
				notes: "Monthly SAT notice",
			};

			const result = NoticeCreateWithPeriodSchema.parse(input);
			expect(result.name).toBe("Aviso SAT Diciembre 2024");
			expect(result.reportedMonth).toBe("202412");
		});

		it("should reject invalid reportedMonth format", () => {
			const input = {
				name: "Test Notice",
				periodStart: "2024-11-17T00:00:00Z",
				periodEnd: "2024-12-16T23:59:59Z",
				reportedMonth: "2024-12", // Invalid format
			};

			expect(() => NoticeCreateWithPeriodSchema.parse(input)).toThrow();
		});

		it("should reject periodEnd before periodStart", () => {
			const input = {
				name: "Test Notice",
				periodStart: "2024-12-16T23:59:59Z",
				periodEnd: "2024-11-17T00:00:00Z", // End before start
				reportedMonth: "202412",
			};

			expect(() => NoticeCreateWithPeriodSchema.parse(input)).toThrow();
		});

		it("should validate YYYYMM format for reportedMonth", () => {
			// Valid formats
			expect(
				NoticeCreateWithPeriodSchema.parse({
					name: "Test",
					periodStart: "2024-01-17T00:00:00Z",
					periodEnd: "2024-02-16T23:59:59Z",
					reportedMonth: "202401",
				}).reportedMonth,
			).toBe("202401");

			expect(
				NoticeCreateWithPeriodSchema.parse({
					name: "Test",
					periodStart: "2024-12-17T00:00:00Z",
					periodEnd: "2025-01-16T23:59:59Z",
					reportedMonth: "202501",
				}).reportedMonth,
			).toBe("202501");

			// Invalid: month 00
			expect(() =>
				NoticeCreateWithPeriodSchema.parse({
					name: "Test",
					periodStart: "2024-01-17T00:00:00Z",
					periodEnd: "2024-02-16T23:59:59Z",
					reportedMonth: "202400",
				}),
			).toThrow();

			// Invalid: month 13
			expect(() =>
				NoticeCreateWithPeriodSchema.parse({
					name: "Test",
					periodStart: "2024-01-17T00:00:00Z",
					periodEnd: "2024-02-16T23:59:59Z",
					reportedMonth: "202413",
				}),
			).toThrow();
		});
	});

	describe("NoticePatchSchema", () => {
		it("should allow partial updates", () => {
			expect(NoticePatchSchema.parse({ name: "New Name" })).toEqual({
				name: "New Name",
			});

			expect(NoticePatchSchema.parse({ notes: "Updated notes" })).toEqual({
				notes: "Updated notes",
			});

			expect(NoticePatchSchema.parse({ notes: null })).toEqual({
				notes: null,
			});
		});

		it("should allow updating satFolioNumber", () => {
			expect(NoticePatchSchema.parse({ satFolioNumber: "SAT-12345" })).toEqual({
				satFolioNumber: "SAT-12345",
			});
		});

		it("should reject satFolioNumber over 100 characters", () => {
			expect(() =>
				NoticePatchSchema.parse({
					satFolioNumber: "A".repeat(101),
				}),
			).toThrow();
		});
	});

	describe("NoticeFilterSchema", () => {
		it("should provide defaults for page and limit", () => {
			const result = NoticeFilterSchema.parse({});
			expect(result.page).toBe(1);
			expect(result.limit).toBe(20);
		});

		it("should parse string numbers to integers", () => {
			const result = NoticeFilterSchema.parse({
				page: "2",
				limit: "50",
			});
			expect(result.page).toBe(2);
			expect(result.limit).toBe(50);
		});

		it("should validate status filter", () => {
			const result = NoticeFilterSchema.parse({ status: "SUBMITTED" });
			expect(result.status).toBe("SUBMITTED");
		});

		it("should validate year filter", () => {
			const result = NoticeFilterSchema.parse({ year: "2024" });
			expect(result.year).toBe(2024);
		});

		it("should reject invalid status", () => {
			expect(() => NoticeFilterSchema.parse({ status: "INVALID" })).toThrow();
		});
	});

	describe("NoticePreviewSchema", () => {
		it("should validate preview request with year/month", () => {
			const input = {
				year: 2024,
				month: 12,
			};

			const result = NoticePreviewSchema.parse(input);
			expect(result.year).toBe(2024);
			expect(result.month).toBe(12);
		});

		it("should coerce string numbers", () => {
			const result = NoticePreviewSchema.parse({
				year: "2024",
				month: "6",
			});
			expect(result.year).toBe(2024);
			expect(result.month).toBe(6);
		});

		it("should require both year and month", () => {
			expect(() => NoticePreviewSchema.parse({ year: 2024 })).toThrow();
			expect(() => NoticePreviewSchema.parse({ month: 12 })).toThrow();
		});
	});

	describe("NoticeSubmitSchema", () => {
		it("should accept optional satFolioNumber", () => {
			const result = NoticeSubmitSchema.parse({});
			expect(result.satFolioNumber).toBeUndefined();
		});

		it("should accept satFolioNumber when provided", () => {
			const result = NoticeSubmitSchema.parse({
				satFolioNumber: "SAT-12345-ABC",
			});
			expect(result.satFolioNumber).toBe("SAT-12345-ABC");
		});

		it("should reject satFolioNumber over 100 characters", () => {
			expect(() =>
				NoticeSubmitSchema.parse({
					satFolioNumber: "A".repeat(101),
				}),
			).toThrow();
		});
	});

	describe("NoticeAcknowledgeSchema", () => {
		it("should require satFolioNumber", () => {
			expect(() => NoticeAcknowledgeSchema.parse({})).toThrow();
		});

		it("should accept valid satFolioNumber", () => {
			const result = NoticeAcknowledgeSchema.parse({
				satFolioNumber: "SAT-ACK-12345",
			});
			expect(result.satFolioNumber).toBe("SAT-ACK-12345");
		});

		it("should reject empty satFolioNumber", () => {
			expect(() =>
				NoticeAcknowledgeSchema.parse({
					satFolioNumber: "",
				}),
			).toThrow();
		});

		it("should reject satFolioNumber over 100 characters", () => {
			expect(() =>
				NoticeAcknowledgeSchema.parse({
					satFolioNumber: "A".repeat(101),
				}),
			).toThrow();
		});
	});
});
