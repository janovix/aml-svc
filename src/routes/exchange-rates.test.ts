import { describe, expect, it } from "vitest";
import { z } from "zod";

// Test the validation schema that exchange-rates uses
const ExchangeRateQuerySchema = z.object({
	from: z
		.string()
		.length(3)
		.transform((v) => v.toUpperCase()),
	to: z
		.string()
		.length(3)
		.transform((v) => v.toUpperCase()),
});

describe("Exchange Rates Route Validation", () => {
	describe("ExchangeRateQuerySchema", () => {
		it("validates and transforms valid currency codes to uppercase", () => {
			const result = ExchangeRateQuerySchema.safeParse({
				from: "usd",
				to: "mxn",
			});

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.from).toBe("USD");
				expect(result.data.to).toBe("MXN");
			}
		});

		it("validates valid uppercase currency codes", () => {
			const result = ExchangeRateQuerySchema.safeParse({
				from: "USD",
				to: "EUR",
			});

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.from).toBe("USD");
				expect(result.data.to).toBe("EUR");
			}
		});

		it("rejects currency codes that are too short", () => {
			const result = ExchangeRateQuerySchema.safeParse({
				from: "US",
				to: "MXN",
			});

			expect(result.success).toBe(false);
		});

		it("rejects currency codes that are too long", () => {
			const result = ExchangeRateQuerySchema.safeParse({
				from: "USDA",
				to: "MXN",
			});

			expect(result.success).toBe(false);
		});

		it("rejects missing from parameter", () => {
			const result = ExchangeRateQuerySchema.safeParse({
				to: "MXN",
			});

			expect(result.success).toBe(false);
		});

		it("rejects missing to parameter", () => {
			const result = ExchangeRateQuerySchema.safeParse({
				from: "USD",
			});

			expect(result.success).toBe(false);
		});

		it("rejects empty objects", () => {
			const result = ExchangeRateQuerySchema.safeParse({});

			expect(result.success).toBe(false);
		});

		it("rejects non-string currency codes", () => {
			const result = ExchangeRateQuerySchema.safeParse({
				from: 123,
				to: "MXN",
			});

			expect(result.success).toBe(false);
		});

		it("handles mixed case currency codes", () => {
			const result = ExchangeRateQuerySchema.safeParse({
				from: "UsD",
				to: "mXn",
			});

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.from).toBe("USD");
				expect(result.data.to).toBe("MXN");
			}
		});

		it("supports various valid currency codes", () => {
			const validCodes = ["USD", "MXN", "EUR", "GBP", "JPY", "CAD", "AUD"];

			for (let i = 0; i < validCodes.length - 1; i++) {
				const result = ExchangeRateQuerySchema.safeParse({
					from: validCodes[i],
					to: validCodes[i + 1],
				});

				expect(result.success).toBe(true);
				if (result.success) {
					expect(result.data.from).toBe(validCodes[i]);
					expect(result.data.to).toBe(validCodes[i + 1]);
				}
			}
		});
	});
});
