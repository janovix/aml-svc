import { describe, it, expect } from "vitest";
import {
	generateId,
	isValidId,
	getEntityTypeFromId,
	ID_PREFIXES,
	type EntityType,
} from "./id-generator";

describe("ID Generator", () => {
	describe("generateId", () => {
		it("should generate IDs with correct prefix for each entity type", () => {
			const entityTypes: EntityType[] = [
				"CLIENT",
				"CLIENT_DOCUMENT",
				"CLIENT_ADDRESS",
				"CATALOG",
				"CATALOG_ITEM",
				"TRANSACTION",
				"TRANSACTION_PAYMENT_METHOD",
				"ALERT_RULE",
				"ALERT",
				"UMA_VALUE",
				"ORGANIZATION_SETTINGS",
			];

			for (const entityType of entityTypes) {
				const id = generateId(entityType);
				const prefix = ID_PREFIXES[entityType];
				expect(id.startsWith(prefix)).toBe(true);
				expect(id.length).toBe(12); // 3 prefix + 9 random
			}
		});

		it("should generate unique IDs", () => {
			const ids = new Set<string>();
			const iterations = 1000; // Increased to better test uniqueness
			for (let i = 0; i < iterations; i++) {
				const id = generateId("TRANSACTION");
				// Check for duplicates - if found, it's a collision
				if (ids.has(id)) {
					throw new Error(
						`Collision detected: ID ${id} was generated twice (iteration ${i})`,
					);
				}
				ids.add(id);
			}
			expect(ids.size).toBe(iterations);
		});

		it("should generate IDs with only alphanumeric characters", () => {
			for (let i = 0; i < 50; i++) {
				const id = generateId("CLIENT");
				expect(id).toMatch(/^[A-Z0-9a-z]+$/);
			}
		});
	});

	describe("isValidId", () => {
		it("should validate correct IDs", () => {
			const id = generateId("TRANSACTION");
			expect(isValidId(id, "TRANSACTION")).toBe(true);
		});

		it("should reject IDs with wrong prefix", () => {
			const id = generateId("TRANSACTION");
			expect(isValidId(id, "CLIENT")).toBe(false);
		});

		it("should reject IDs with wrong length", () => {
			expect(isValidId("TRN123", "TRANSACTION")).toBe(false);
			expect(isValidId("TRN1234567890123", "TRANSACTION")).toBe(false);
		});

		it("should reject invalid characters", () => {
			expect(isValidId("TRN-12345678", "TRANSACTION")).toBe(false);
			expect(isValidId("TRN_12345678", "TRANSACTION")).toBe(false);
		});
	});

	describe("getEntityTypeFromId", () => {
		it("should extract entity type from valid IDs", () => {
			const entityTypes: EntityType[] = [
				"CLIENT",
				"TRANSACTION",
				"ALERT",
				"CATALOG_ITEM",
			];

			for (const entityType of entityTypes) {
				const id = generateId(entityType);
				expect(getEntityTypeFromId(id)).toBe(entityType);
			}
		});

		it("should return null for invalid IDs", () => {
			expect(getEntityTypeFromId("INVALID123")).toBe(null);
			expect(getEntityTypeFromId("ABC")).toBe(null);
			expect(getEntityTypeFromId("")).toBe(null);
		});
	});
});
