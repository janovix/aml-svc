import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { retry } from "./retry";

describe("retry", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("returns the result on first success", async () => {
		const fn = vi.fn().mockResolvedValue("ok");
		const result = await retry(fn);
		expect(result).toBe("ok");
		expect(fn).toHaveBeenCalledTimes(1);
	});

	it("retries and succeeds after transient failures", async () => {
		const fn = vi
			.fn()
			.mockRejectedValueOnce(new Error("fail 1"))
			.mockRejectedValueOnce(new Error("fail 2"))
			.mockResolvedValue("ok");

		const promise = retry(fn);
		await vi.runAllTimersAsync();
		const result = await promise;
		expect(result).toBe("ok");
		expect(fn).toHaveBeenCalledTimes(3);
	});

	it("throws the last error after exhausting retries", async () => {
		const fn = vi.fn().mockRejectedValue(new Error("persistent failure"));

		const promise = retry(fn, { maxRetries: 2 }).catch((e: Error) => e);
		await vi.runAllTimersAsync();
		const error = await promise;
		expect(error).toBeInstanceOf(Error);
		expect((error as Error).message).toBe("persistent failure");
		expect(fn).toHaveBeenCalledTimes(3);
	});

	it("respects custom maxRetries", async () => {
		const fn = vi.fn().mockRejectedValue(new Error("fail"));

		const promise = retry(fn, { maxRetries: 1 }).catch((e: Error) => e);
		await vi.runAllTimersAsync();
		const error = await promise;
		expect(error).toBeInstanceOf(Error);
		expect(fn).toHaveBeenCalledTimes(2);
	});

	it("respects maxRetries of 0 (no retries)", async () => {
		const fn = vi.fn().mockRejectedValue(new Error("fail"));

		const promise = retry(fn, { maxRetries: 0 }).catch((e: Error) => e);
		await vi.runAllTimersAsync();
		const error = await promise;
		expect(error).toBeInstanceOf(Error);
		expect(fn).toHaveBeenCalledTimes(1);
	});

	it("caps delay at maxDelay", async () => {
		const fn = vi
			.fn()
			.mockRejectedValueOnce(new Error("1"))
			.mockRejectedValueOnce(new Error("2"))
			.mockResolvedValue("ok");

		const promise = retry(fn, {
			maxRetries: 3,
			initialDelay: 1000,
			backoffMultiplier: 100,
			maxDelay: 500,
		});

		await vi.runAllTimersAsync();
		const result = await promise;
		expect(result).toBe("ok");
		expect(fn).toHaveBeenCalledTimes(3);
	});
});
