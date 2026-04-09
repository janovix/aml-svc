import { describe, expect, it } from "vitest";
import { mapPaymentToEntity } from "./mappers";
import type { OperationPayment } from "@prisma/client";

describe("mapPaymentToEntity", () => {
	it("maps prisma payment to entity shape", () => {
		const payment = {
			id: "pay-1",
			operationId: "op-1",
			paymentDate: new Date("2024-03-10T15:30:00.000Z"),
			paymentFormCode: "03",
			monetaryInstrumentCode: null,
			currencyCode: "MXN",
			amount: "1234.56",
			exchangeRate: null,
			bankName: "Test Bank",
			accountNumberMasked: "****1234",
			checkNumber: null,
			reference: "REF",
			createdAt: new Date("2024-03-10T16:00:00.000Z"),
			updatedAt: new Date("2024-03-10T16:00:00.000Z"),
		} as unknown as OperationPayment;

		const entity = mapPaymentToEntity(payment);

		expect(entity.id).toBe("pay-1");
		expect(entity.paymentDate).toBe("2024-03-10");
		expect(entity.amount).toBe("1234.56");
		expect(entity.currencyCode).toBe("MXN");
	});
});
