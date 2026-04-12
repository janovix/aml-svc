import { describe, expect, it } from "vitest";
import {
	ActivityCodeSchema,
	OperationPaymentSchema,
	OperationFilterSchema,
	OperationCreateSchema,
} from "./schemas";

describe("ActivityCodeSchema", () => {
	it("accepts valid activity codes", () => {
		expect(ActivityCodeSchema.parse("VEH")).toBe("VEH");
	});

	it("rejects invalid codes", () => {
		expect(() => ActivityCodeSchema.parse("ZZZ")).toThrow();
	});
});

describe("OperationPaymentSchema", () => {
	it("parses valid payment", () => {
		const out = OperationPaymentSchema.parse({
			paymentDate: "2024-06-01",
			paymentFormCode: "01",
			currencyCode: "mxn",
			amount: "1500.50",
		});
		expect(out.currencyCode).toBe("MXN");
		expect(out.amount).toBe("1500.50");
	});
});

describe("OperationFilterSchema", () => {
	it("applies defaults for pagination", () => {
		const out = OperationFilterSchema.parse({});
		expect(out.page).toBe(1);
		expect(out.limit).toBe(10);
	});

	it("rejects endDate before startDate", () => {
		expect(() =>
			OperationFilterSchema.parse({
				startDate: "2024-06-02",
				endDate: "2024-06-01",
			}),
		).toThrow();
	});
});

describe("OperationCreateSchema", () => {
	const validBase = {
		clientId: "client-abc-1",
		activityCode: "VEH",
		operationDate: "2024-06-15",
		branchPostalCode: "12345",
		amount: "1000.00",
		payments: [
			{
				paymentDate: "2024-06-15",
				paymentFormCode: "01",
				currencyCode: "MXN",
				amount: "1000.00",
			},
		],
	};

	it("parses minimal valid create payload", () => {
		const out = OperationCreateSchema.parse(validBase);
		expect(out.amount).toBe("1000.00");
		expect(out.payments).toHaveLength(1);
	});

	it("rejects when payment total does not match operation amount", () => {
		expect(() =>
			OperationCreateSchema.parse({
				...validBase,
				payments: [
					{
						paymentDate: "2024-06-15",
						paymentFormCode: "01",
						currencyCode: "MXN",
						amount: "500",
					},
				],
			}),
		).toThrow();
	});
});
