import { describe, it, expect, vi, beforeEach } from "vitest";
import { CurrencyService } from "./currency-service";

describe("CurrencyService", () => {
	let mockCache: KVNamespace;

	beforeEach(() => {
		mockCache = {
			get: vi.fn().mockResolvedValue(null),
			put: vi.fn().mockResolvedValue(undefined),
		} as unknown as KVNamespace;

		// Reset fetch mock
		global.fetch = vi.fn();
	});

	describe("getExchangeRate", () => {
		it("returns null when API key is not configured", async () => {
			const service = new CurrencyService(undefined, mockCache);
			const result = await service.getExchangeRate("USD", "MXN");
			expect(result).toBeNull();
		});

		it("returns rate 1 for same currency", async () => {
			const service = new CurrencyService("test-key", mockCache);
			const result = await service.getExchangeRate("USD", "USD");
			expect(result).toEqual({
				from: "USD",
				to: "USD",
				rate: 1,
				timestamp: expect.any(Number),
			});
		});

		it("handles USD to MXN conversion (base currency to target)", async () => {
			const service = new CurrencyService("test-key", mockCache);

			// Mock CurrencyLayer response for USD → MXN
			global.fetch = vi.fn().mockResolvedValue({
				json: async () => ({
					success: true,
					timestamp: 1234567890,
					quotes: {
						USDMXN: 20.5,
					},
				}),
			});

			const result = await service.getExchangeRate("USD", "MXN");

			expect(result).toEqual({
				from: "USD",
				to: "MXN",
				rate: 20.5,
				timestamp: 1234567890000,
			});

			// Verify correct API call
			expect(global.fetch).toHaveBeenCalledWith(
				"http://api.currencylayer.com/live?access_key=test-key&currencies=MXN&format=1",
			);
		});

		it("handles MXN to USD conversion (target to base currency)", async () => {
			const service = new CurrencyService("test-key", mockCache);

			// Mock CurrencyLayer response for MXN → USD
			global.fetch = vi.fn().mockResolvedValue({
				json: async () => ({
					success: true,
					timestamp: 1234567890,
					quotes: {
						USDMXN: 20.5,
					},
				}),
			});

			const result = await service.getExchangeRate("MXN", "USD");

			expect(result).toEqual({
				from: "MXN",
				to: "USD",
				rate: 0.04878, // 1 / 20.5 rounded to 6 decimals
				timestamp: 1234567890000,
			});

			// Verify correct API call
			expect(global.fetch).toHaveBeenCalledWith(
				"http://api.currencylayer.com/live?access_key=test-key&currencies=MXN&format=1",
			);
		});

		it("handles cross-rate conversion (EUR to MXN via USD)", async () => {
			const service = new CurrencyService("test-key", mockCache);

			// Mock CurrencyLayer response for EUR → MXN
			global.fetch = vi.fn().mockResolvedValue({
				json: async () => ({
					success: true,
					timestamp: 1234567890,
					quotes: {
						USDEUR: 0.85, // 1 USD = 0.85 EUR
						USDMXN: 20.5, // 1 USD = 20.5 MXN
					},
				}),
			});

			const result = await service.getExchangeRate("EUR", "MXN");

			// Rate = USDMXN / USDEUR = 20.5 / 0.85 = 24.117647
			expect(result).toEqual({
				from: "EUR",
				to: "MXN",
				rate: 24.117647,
				timestamp: 1234567890000,
			});

			// Verify correct API call (both currencies needed for cross-rate)
			expect(global.fetch).toHaveBeenCalledWith(
				"http://api.currencylayer.com/live?access_key=test-key&currencies=EUR,MXN&format=1",
			);
		});

		it("returns null when API returns error", async () => {
			const service = new CurrencyService("test-key", mockCache);

			global.fetch = vi.fn().mockResolvedValue({
				json: async () => ({
					success: false,
					error: {
						code: 101,
						type: "invalid_access_key",
						info: "Invalid API key",
					},
				}),
			});

			const result = await service.getExchangeRate("USD", "MXN");
			expect(result).toBeNull();
		});

		it("returns null when required quote is missing", async () => {
			const service = new CurrencyService("test-key", mockCache);

			global.fetch = vi.fn().mockResolvedValue({
				json: async () => ({
					success: true,
					timestamp: 1234567890,
					quotes: {
						// Missing USDMXN
					},
				}),
			});

			const result = await service.getExchangeRate("USD", "MXN");
			expect(result).toBeNull();
		});

		it("caches results and reverse rates", async () => {
			const service = new CurrencyService("test-key", mockCache);

			global.fetch = vi.fn().mockResolvedValue({
				json: async () => ({
					success: true,
					timestamp: 1234567890,
					quotes: {
						USDMXN: 20.5,
					},
				}),
			});

			await service.getExchangeRate("USD", "MXN");

			// Verify cache was called to store both directions
			expect(mockCache.put).toHaveBeenCalledTimes(2);
			expect(mockCache.put).toHaveBeenCalledWith(
				"exchange_rate:USD_MXN",
				expect.any(String),
				{ expirationTtl: 3600 },
			);
			expect(mockCache.put).toHaveBeenCalledWith(
				"exchange_rate:MXN_USD",
				expect.any(String),
				{ expirationTtl: 3600 },
			);
		});

		it("returns cached result when available", async () => {
			const cachedResult = {
				from: "USD",
				to: "MXN",
				rate: 20.5,
				timestamp: 1234567890000,
			};

			mockCache.get = vi.fn().mockResolvedValue(cachedResult);

			const service = new CurrencyService("test-key", mockCache);
			const result = await service.getExchangeRate("USD", "MXN");

			expect(result).toEqual(cachedResult);
			expect(global.fetch).not.toHaveBeenCalled();
		});

		it("handles fetch errors gracefully", async () => {
			const service = new CurrencyService("test-key", mockCache);

			global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

			const result = await service.getExchangeRate("USD", "MXN");
			expect(result).toBeNull();
		});
	});
});
