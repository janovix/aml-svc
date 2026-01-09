import { describe, it, expect } from "vitest";
import {
	sha256,
	hmacSha256,
	verifyHmacSha256,
	computeDataHash,
	computeSignature,
	verifyEntrySignature,
	verifyChain,
	type AuditDataHashInput,
} from "./audit-crypto";

describe("Audit Crypto", () => {
	const testSecretKey = "test-secret-key-for-audit-trail";

	describe("sha256", () => {
		it("should compute consistent SHA-256 hash", async () => {
			const data = "Hello, World!";
			const hash1 = await sha256(data);
			const hash2 = await sha256(data);

			expect(hash1).toBe(hash2);
			expect(hash1).toHaveLength(64); // SHA-256 produces 64 hex characters
		});

		it("should produce different hashes for different inputs", async () => {
			const hash1 = await sha256("Hello");
			const hash2 = await sha256("World");

			expect(hash1).not.toBe(hash2);
		});

		it("should handle empty string", async () => {
			const hash = await sha256("");
			expect(hash).toHaveLength(64);
		});

		it("should handle unicode characters", async () => {
			const hash = await sha256("Hello, 世界! 🌍");
			expect(hash).toHaveLength(64);
		});
	});

	describe("hmacSha256", () => {
		it("should compute consistent HMAC-SHA256 signature", async () => {
			const data = "Test data";
			const sig1 = await hmacSha256(data, testSecretKey);
			const sig2 = await hmacSha256(data, testSecretKey);

			expect(sig1).toBe(sig2);
			expect(sig1).toHaveLength(64);
		});

		it("should produce different signatures for different keys", async () => {
			const data = "Test data";
			const sig1 = await hmacSha256(data, "key1");
			const sig2 = await hmacSha256(data, "key2");

			expect(sig1).not.toBe(sig2);
		});

		it("should produce different signatures for different data", async () => {
			const sig1 = await hmacSha256("Data 1", testSecretKey);
			const sig2 = await hmacSha256("Data 2", testSecretKey);

			expect(sig1).not.toBe(sig2);
		});
	});

	describe("verifyHmacSha256", () => {
		it("should verify valid signatures", async () => {
			const data = "Test data";
			const signature = await hmacSha256(data, testSecretKey);
			const isValid = await verifyHmacSha256(data, signature, testSecretKey);

			expect(isValid).toBe(true);
		});

		it("should reject invalid signatures", async () => {
			const data = "Test data";
			const isValid = await verifyHmacSha256(
				data,
				"invalid-signature",
				testSecretKey,
			);

			expect(isValid).toBe(false);
		});

		it("should reject signatures with wrong key", async () => {
			const data = "Test data";
			const signature = await hmacSha256(data, testSecretKey);
			const isValid = await verifyHmacSha256(data, signature, "wrong-key");

			expect(isValid).toBe(false);
		});
	});

	describe("computeDataHash", () => {
		const testInput: AuditDataHashInput = {
			entityType: "CLIENT",
			entityId: "CLT123456789",
			action: "CREATE",
			actorId: "user123",
			actorType: "USER",
			timestamp: "2025-01-09T12:00:00.000Z",
			oldData: null,
			newData: '{"name":"Test Client"}',
			sequenceNumber: 1,
			metadata: null,
		};

		it("should compute consistent hash for same input", async () => {
			const hash1 = await computeDataHash(testInput);
			const hash2 = await computeDataHash(testInput);

			expect(hash1).toBe(hash2);
			expect(hash1).toHaveLength(64);
		});

		it("should produce different hash for different inputs", async () => {
			const hash1 = await computeDataHash(testInput);
			const hash2 = await computeDataHash({
				...testInput,
				entityId: "CLT987654321",
			});

			expect(hash1).not.toBe(hash2);
		});

		it("should include all fields in hash computation", async () => {
			const fields: (keyof AuditDataHashInput)[] = [
				"entityType",
				"entityId",
				"action",
				"actorId",
				"actorType",
				"timestamp",
				"oldData",
				"newData",
				"sequenceNumber",
				"metadata",
			];

			const baseHash = await computeDataHash(testInput);

			for (const field of fields) {
				const modifiedInput = { ...testInput };
				if (field === "sequenceNumber") {
					modifiedInput[field] = 999;
				} else if (modifiedInput[field] === null) {
					(modifiedInput as Record<string, unknown>)[field] = "changed";
				} else {
					(modifiedInput as Record<string, unknown>)[field] = "modified";
				}

				const modifiedHash = await computeDataHash(modifiedInput);
				expect(modifiedHash).not.toBe(baseHash);
			}
		});
	});

	describe("computeSignature", () => {
		it("should compute signature with previous signature", async () => {
			const dataHash = "abc123def456";
			const previousSignature = "prev-sig-123";

			const signature = await computeSignature(
				dataHash,
				previousSignature,
				testSecretKey,
			);

			expect(signature).toHaveLength(64);
		});

		it("should compute signature without previous signature (genesis)", async () => {
			const dataHash = "abc123def456";

			const signature = await computeSignature(dataHash, null, testSecretKey);

			expect(signature).toHaveLength(64);
		});

		it("should produce different signatures for different previous signatures", async () => {
			const dataHash = "abc123def456";

			const sig1 = await computeSignature(dataHash, "prev1", testSecretKey);
			const sig2 = await computeSignature(dataHash, "prev2", testSecretKey);
			const sig3 = await computeSignature(dataHash, null, testSecretKey);

			expect(sig1).not.toBe(sig2);
			expect(sig1).not.toBe(sig3);
			expect(sig2).not.toBe(sig3);
		});
	});

	describe("verifyEntrySignature", () => {
		it("should verify valid entry signature", async () => {
			const entry: AuditDataHashInput = {
				entityType: "CLIENT",
				entityId: "CLT123456789",
				action: "CREATE",
				actorId: "user123",
				actorType: "USER",
				timestamp: "2025-01-09T12:00:00.000Z",
				oldData: null,
				newData: '{"name":"Test Client"}',
				sequenceNumber: 1,
				metadata: null,
			};

			const dataHash = await computeDataHash(entry);
			const previousSignature = null;
			const signature = await computeSignature(
				dataHash,
				previousSignature,
				testSecretKey,
			);

			const isValid = await verifyEntrySignature(
				{ ...entry, dataHash, signature },
				previousSignature,
				testSecretKey,
			);

			expect(isValid).toBe(true);
		});

		it("should reject entry with tampered data", async () => {
			const entry: AuditDataHashInput = {
				entityType: "CLIENT",
				entityId: "CLT123456789",
				action: "CREATE",
				actorId: "user123",
				actorType: "USER",
				timestamp: "2025-01-09T12:00:00.000Z",
				oldData: null,
				newData: '{"name":"Test Client"}',
				sequenceNumber: 1,
				metadata: null,
			};

			const dataHash = await computeDataHash(entry);
			const previousSignature = null;
			const signature = await computeSignature(
				dataHash,
				previousSignature,
				testSecretKey,
			);

			// Tamper with the data
			const tamperedEntry = {
				...entry,
				newData: '{"name":"Hacked Client"}',
				dataHash,
				signature,
			};

			const isValid = await verifyEntrySignature(
				tamperedEntry,
				previousSignature,
				testSecretKey,
			);

			expect(isValid).toBe(false);
		});

		it("should reject entry with wrong previous signature", async () => {
			const entry: AuditDataHashInput = {
				entityType: "CLIENT",
				entityId: "CLT123456789",
				action: "CREATE",
				actorId: "user123",
				actorType: "USER",
				timestamp: "2025-01-09T12:00:00.000Z",
				oldData: null,
				newData: '{"name":"Test Client"}',
				sequenceNumber: 1,
				metadata: null,
			};

			const dataHash = await computeDataHash(entry);
			const correctPreviousSig = "correct-previous-sig";
			const signature = await computeSignature(
				dataHash,
				correctPreviousSig,
				testSecretKey,
			);

			// Verify with wrong previous signature
			const isValid = await verifyEntrySignature(
				{ ...entry, dataHash, signature },
				"wrong-previous-sig",
				testSecretKey,
			);

			expect(isValid).toBe(false);
		});
	});

	describe("verifyChain", () => {
		it("should verify valid chain of entries", async () => {
			// Build a valid chain
			const entries: Array<
				AuditDataHashInput & {
					id: string;
					dataHash: string;
					previousSignature: string | null;
					signature: string;
				}
			> = [];

			let previousSignature: string | null = null;

			for (let i = 1; i <= 5; i++) {
				const entry: AuditDataHashInput = {
					entityType: "CLIENT",
					entityId: `CLT00000000${i}`,
					action: "CREATE",
					actorId: "user123",
					actorType: "USER",
					timestamp: `2025-01-09T12:0${i}:00.000Z`,
					oldData: null,
					newData: `{"name":"Client ${i}"}`,
					sequenceNumber: i,
					metadata: null,
				};

				const dataHash = await computeDataHash(entry);
				const signature = await computeSignature(
					dataHash,
					previousSignature,
					testSecretKey,
				);

				entries.push({
					id: `AUD00000000${i}`,
					...entry,
					dataHash,
					previousSignature,
					signature,
				});

				previousSignature = signature;
			}

			const result = await verifyChain(entries, testSecretKey);

			expect(result.valid).toBe(true);
			expect(result.entriesVerified).toBe(5);
			expect(result.firstInvalidEntry).toBeUndefined();
		});

		it("should detect tampered entry in chain", async () => {
			// Build a valid chain
			const entries: Array<
				AuditDataHashInput & {
					id: string;
					dataHash: string;
					previousSignature: string | null;
					signature: string;
				}
			> = [];

			let previousSignature: string | null = null;

			for (let i = 1; i <= 5; i++) {
				const entry: AuditDataHashInput = {
					entityType: "CLIENT",
					entityId: `CLT00000000${i}`,
					action: "CREATE",
					actorId: "user123",
					actorType: "USER",
					timestamp: `2025-01-09T12:0${i}:00.000Z`,
					oldData: null,
					newData: `{"name":"Client ${i}"}`,
					sequenceNumber: i,
					metadata: null,
				};

				const dataHash = await computeDataHash(entry);
				const signature = await computeSignature(
					dataHash,
					previousSignature,
					testSecretKey,
				);

				entries.push({
					id: `AUD00000000${i}`,
					...entry,
					dataHash,
					previousSignature,
					signature,
				});

				previousSignature = signature;
			}

			// Tamper with entry 3
			entries[2].newData = '{"name":"HACKED"}';

			const result = await verifyChain(entries, testSecretKey);

			expect(result.valid).toBe(false);
			expect(result.entriesVerified).toBe(2); // Only first 2 verified successfully
			expect(result.firstInvalidEntry).toEqual({
				id: "AUD000000003",
				sequenceNumber: 3,
				error: "DATA_HASH_MISMATCH",
			});
		});

		it("should detect chain break", async () => {
			// Build entries with broken chain
			const entries: Array<
				AuditDataHashInput & {
					id: string;
					dataHash: string;
					previousSignature: string | null;
					signature: string;
				}
			> = [];

			// First entry
			const entry1: AuditDataHashInput = {
				entityType: "CLIENT",
				entityId: "CLT000000001",
				action: "CREATE",
				actorId: "user123",
				actorType: "USER",
				timestamp: "2025-01-09T12:01:00.000Z",
				oldData: null,
				newData: '{"name":"Client 1"}',
				sequenceNumber: 1,
				metadata: null,
			};
			const dataHash1 = await computeDataHash(entry1);
			const signature1 = await computeSignature(dataHash1, null, testSecretKey);

			entries.push({
				id: "AUD000000001",
				...entry1,
				dataHash: dataHash1,
				previousSignature: null,
				signature: signature1,
			});

			// Second entry with wrong previousSignature
			const entry2: AuditDataHashInput = {
				entityType: "CLIENT",
				entityId: "CLT000000002",
				action: "CREATE",
				actorId: "user123",
				actorType: "USER",
				timestamp: "2025-01-09T12:02:00.000Z",
				oldData: null,
				newData: '{"name":"Client 2"}',
				sequenceNumber: 2,
				metadata: null,
			};
			const dataHash2 = await computeDataHash(entry2);
			const signature2 = await computeSignature(
				dataHash2,
				signature1,
				testSecretKey,
			);

			entries.push({
				id: "AUD000000002",
				...entry2,
				dataHash: dataHash2,
				previousSignature: "wrong-previous-signature", // Broken chain!
				signature: signature2,
			});

			const result = await verifyChain(entries, testSecretKey);

			expect(result.valid).toBe(false);
			expect(result.entriesVerified).toBe(1);
			expect(result.firstInvalidEntry).toEqual({
				id: "AUD000000002",
				sequenceNumber: 2,
				error: "CHAIN_BREAK",
			});
		});

		it("should verify empty chain", async () => {
			const result = await verifyChain([], testSecretKey);

			expect(result.valid).toBe(true);
			expect(result.entriesVerified).toBe(0);
		});
	});
});
