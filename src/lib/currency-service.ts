/**
 * Currency conversion service using CurrencyLayer API.
 * Docs: https://currencylayer.com/documentation
 *
 * CurrencyLayer free tier constraints:
 * - USD as base currency only (we calculate cross-rates via USD)
 * - 100 requests/month → caching is critical
 * - HTTP only (no HTTPS on free tier)
 * - Updates hourly
 */

const CACHE_TTL = 3600; // 1 hour cache
const CACHE_KEY_PREFIX = "exchange_rate:";

export interface ExchangeRate {
	from: string;
	to: string;
	rate: number;
	timestamp: number;
}

interface CurrencyLayerResponse {
	success: boolean;
	terms?: string;
	privacy?: string;
	timestamp?: number;
	source?: string;
	quotes?: Record<string, number>;
	error?: {
		code: number;
		type: string;
		info: string;
	};
}

export class CurrencyService {
	constructor(
		private apiKey: string | undefined,
		private cache?: KVNamespace,
	) {}

	/**
	 * Fetch exchange rate between two currencies.
	 * CurrencyLayer free tier only supports USD as base, so we calculate
	 * cross-rates via USD: rate(FROM→TO) = USD_TO / USD_FROM
	 */
	async getExchangeRate(
		from: string,
		to: string,
	): Promise<ExchangeRate | null> {
		if (!this.apiKey) {
			console.warn("CURRENCYLAYER_API_KEY not configured");
			return null;
		}

		// Same currency, no conversion needed
		if (from === to) {
			return { from, to, rate: 1, timestamp: Date.now() };
		}

		// Check cache first
		const cacheKey = `${CACHE_KEY_PREFIX}${from}_${to}`;
		if (this.cache) {
			try {
				const cached = await this.cache.get(cacheKey, "json");
				if (cached) {
					return cached as ExchangeRate;
				}
			} catch {
				// Cache miss or error, continue to fetch
			}
		}

		try {
			const url = `http://api.currencylayer.com/live?access_key=${this.apiKey}&currencies=${from},${to}&format=1`;

			const response = await fetch(url);
			const data: CurrencyLayerResponse = await response.json();

			if (!data.success || !data.quotes) {
				console.error("CurrencyLayer API error:", data.error);
				return null;
			}

			// Calculate rate from→to via USD
			const usdToFrom = data.quotes[`USD${from}`];
			const usdToTo = data.quotes[`USD${to}`];

			if (!usdToFrom || !usdToTo) {
				console.error(
					`Missing currency quotes: USD${from}=${usdToFrom}, USD${to}=${usdToTo}`,
				);
				return null;
			}

			const rate = usdToTo / usdToFrom;

			const result: ExchangeRate = {
				from,
				to,
				rate: Math.round(rate * 1_000_000) / 1_000_000, // 6 decimal places
				timestamp: (data.timestamp ?? Math.floor(Date.now() / 1000)) * 1000,
			};

			// Cache the result (and the reverse)
			if (this.cache) {
				const reverseResult: ExchangeRate = {
					from: to,
					to: from,
					rate: Math.round((1 / rate) * 1_000_000) / 1_000_000,
					timestamp: result.timestamp,
				};

				await Promise.all([
					this.cache.put(cacheKey, JSON.stringify(result), {
						expirationTtl: CACHE_TTL,
					}),
					this.cache.put(
						`${CACHE_KEY_PREFIX}${to}_${from}`,
						JSON.stringify(reverseResult),
						{ expirationTtl: CACHE_TTL },
					),
				]);
			}

			return result;
		} catch (error) {
			console.error("Failed to fetch exchange rate:", error);
			return null;
		}
	}
}
