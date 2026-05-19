import { describe, expect, it } from "vitest";
import { computeStatus } from "./service";
import type { OperationExceptionUpsertInput } from "./schemas";

describe("computeStatus", () => {
	const fullInput: OperationExceptionUpsertInput = {
		exceptionType: "FIRST_SALE_REAL_ESTATE",
		isFirstSale: true,
		hasDevelopmentBankFunding: true,
		paidThroughFinancialSystem: true,
		hasDocumentaryEvidence: true,
	};

	it("returns VALIDATED when all conditions met and evidence exists", () => {
		expect(computeStatus(fullInput, 1)).toBe("VALIDATED");
	});

	it("returns VALIDATED with multiple evidence items", () => {
		expect(computeStatus(fullInput, 5)).toBe("VALIDATED");
	});

	it("returns INCOMPLETE when evidence count is zero but all booleans true", () => {
		expect(computeStatus(fullInput, 0)).toBe("INCOMPLETE");
	});

	it("returns INCOMPLETE when isFirstSale is not answered", () => {
		expect(computeStatus({ ...fullInput, isFirstSale: undefined }, 1)).toBe(
			"INCOMPLETE",
		);
	});

	it("returns INCOMPLETE when isFirstSale is null", () => {
		expect(computeStatus({ ...fullInput, isFirstSale: null }, 1)).toBe(
			"INCOMPLETE",
		);
	});

	it("returns INCOMPLETE when hasDevelopmentBankFunding is not answered", () => {
		expect(
			computeStatus({ ...fullInput, hasDevelopmentBankFunding: undefined }, 1),
		).toBe("INCOMPLETE");
	});

	it("returns INCOMPLETE when paidThroughFinancialSystem is not answered", () => {
		expect(
			computeStatus({ ...fullInput, paidThroughFinancialSystem: undefined }, 1),
		).toBe("INCOMPLETE");
	});

	it("returns INCOMPLETE when hasDocumentaryEvidence is not answered", () => {
		expect(
			computeStatus({ ...fullInput, hasDocumentaryEvidence: undefined }, 1),
		).toBe("INCOMPLETE");
	});

	it("returns INVALIDATED when isFirstSale is false", () => {
		expect(computeStatus({ ...fullInput, isFirstSale: false }, 1)).toBe(
			"INVALIDATED",
		);
	});

	it("returns INVALIDATED when hasDevelopmentBankFunding is false", () => {
		expect(
			computeStatus({ ...fullInput, hasDevelopmentBankFunding: false }, 1),
		).toBe("INVALIDATED");
	});

	it("returns INVALIDATED when paidThroughFinancialSystem is false", () => {
		expect(
			computeStatus({ ...fullInput, paidThroughFinancialSystem: false }, 1),
		).toBe("INVALIDATED");
	});

	it("returns INVALIDATED when hasDocumentaryEvidence is false", () => {
		expect(
			computeStatus({ ...fullInput, hasDocumentaryEvidence: false }, 1),
		).toBe("INVALIDATED");
	});

	it("returns INVALIDATED even when multiple conditions fail", () => {
		expect(
			computeStatus(
				{
					...fullInput,
					isFirstSale: false,
					hasDevelopmentBankFunding: false,
				},
				3,
			),
		).toBe("INVALIDATED");
	});

	it("returns INCOMPLETE for entirely empty input (no answers)", () => {
		expect(computeStatus({ exceptionType: "FIRST_SALE_REAL_ESTATE" }, 0)).toBe(
			"INCOMPLETE",
		);
	});
});
