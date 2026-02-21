import { Hono } from "hono";
import { z } from "zod";
import type { Bindings } from "../types";
import { CurrencyService } from "../lib/currency-service";
import { APIError } from "../middleware/error";

export const exchangeRatesRouter = new Hono<{ Bindings: Bindings }>();

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

/**
 * GET /api/v1/exchange-rates
 * Get exchange rate between two currencies.
 * Query params: from, to (3-letter ISO currency codes)
 *
 * Returns cached CurrencyLayer rates (1h TTL).
 * Returns 503 when the CurrencyLayer service is unavailable.
 */
exchangeRatesRouter.get("/", async (c) => {
	const query = c.req.query();

	const parsed = ExchangeRateQuerySchema.safeParse(query);
	if (!parsed.success) {
		throw new APIError(400, "Invalid currency codes", parsed.error.format());
	}

	const { from, to } = parsed.data;

	const currencyService = new CurrencyService(
		c.env.CURRENCYLAYER_API_KEY,
		c.env.CACHE,
	);

	const rate = await currencyService.getExchangeRate(from, to);

	if (!rate) {
		throw new APIError(503, "Exchange rate service unavailable", {
			message: "Could not fetch exchange rate. Please enter manually.",
		});
	}

	return c.json(rate);
});
