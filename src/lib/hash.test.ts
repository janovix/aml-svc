import { describe, it, expect } from "vitest";
import { hash, generateContextHash, generateIdempotencyKey } from "./hash";

describe("hash", () => {
	it("produces a 64-character hex string", async () => {
		const result = await hash("test");
		expect(result).toMatch(/^[0-9a-f]{64}$/);
	});

	it("is deterministic", async () => {
		const a = await hash("hello");
		const b = await hash("hello");
		expect(a).toBe(b);
	});

	it("produces different hashes for different inputs", async () => {
		const a = await hash("hello");
		const b = await hash("world");
		expect(a).not.toBe(b);
	});

	it("handles empty string", async () => {
		const result = await hash("");
		expect(result).toMatch(/^[0-9a-f]{64}$/);
	});
});

describe("generateContextHash", () => {
	it("produces consistent hash regardless of key order", async () => {
		const a = await generateContextHash({ foo: "1", bar: "2" });
		const b = await generateContextHash({ bar: "2", foo: "1" });
		expect(a).toBe(b);
	});

	it("produces different hashes for different data", async () => {
		const a = await generateContextHash({ foo: "1" });
		const b = await generateContextHash({ foo: "2" });
		expect(a).not.toBe(b);
	});
});

describe("generateIdempotencyKey", () => {
	it("produces a 64-char hex string", async () => {
		const result = await generateIdempotencyKey("c1", "r1", "ctx1");
		expect(result).toMatch(/^[0-9a-f]{64}$/);
	});

	it("is deterministic for same inputs", async () => {
		const a = await generateIdempotencyKey("c1", "r1", "ctx1");
		const b = await generateIdempotencyKey("c1", "r1", "ctx1");
		expect(a).toBe(b);
	});

	it("produces different keys for different inputs", async () => {
		const a = await generateIdempotencyKey("c1", "r1", "ctx1");
		const b = await generateIdempotencyKey("c1", "r1", "ctx2");
		expect(a).not.toBe(b);
	});
});
