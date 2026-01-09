import { describe, it, expect } from "vitest";
import {
	AuditLogFiltersSchema,
	ChainVerifyRequestSchema,
	AuditExportRequestSchema,
	EntityHistoryRequestSchema,
	AuditActionSchema,
	AuditActorTypeSchema,
	AuditEntityTypeSchema,
} from "./schemas";

describe("Audit Schemas", () => {
	describe("AuditActionSchema", () => {
		it("should accept valid actions", () => {
			const validActions = [
				"CREATE",
				"UPDATE",
				"DELETE",
				"READ",
				"EXPORT",
				"VERIFY",
				"LOGIN",
				"LOGOUT",
				"SUBMIT",
				"GENERATE",
			];

			for (const action of validActions) {
				expect(() => AuditActionSchema.parse(action)).not.toThrow();
			}
		});

		it("should reject invalid actions", () => {
			expect(() => AuditActionSchema.parse("INVALID")).toThrow();
			expect(() => AuditActionSchema.parse("")).toThrow();
			expect(() => AuditActionSchema.parse(123)).toThrow();
		});
	});

	describe("AuditActorTypeSchema", () => {
		it("should accept valid actor types", () => {
			const validTypes = ["USER", "SYSTEM", "API", "SERVICE_BINDING"];

			for (const type of validTypes) {
				expect(() => AuditActorTypeSchema.parse(type)).not.toThrow();
			}
		});

		it("should reject invalid actor types", () => {
			expect(() => AuditActorTypeSchema.parse("INVALID")).toThrow();
			expect(() => AuditActorTypeSchema.parse("")).toThrow();
		});
	});

	describe("AuditEntityTypeSchema", () => {
		it("should accept valid entity types", () => {
			const validTypes = [
				"CLIENT",
				"CLIENT_DOCUMENT",
				"CLIENT_ADDRESS",
				"TRANSACTION",
				"TRANSACTION_PAYMENT_METHOD",
				"ALERT",
				"ALERT_RULE",
				"ALERT_RULE_CONFIG",
				"NOTICE",
				"REPORT",
				"UMA_VALUE",
				"ORGANIZATION_SETTINGS",
				"CATALOG",
				"CATALOG_ITEM",
				"AUDIT_LOG",
			];

			for (const type of validTypes) {
				expect(() => AuditEntityTypeSchema.parse(type)).not.toThrow();
			}
		});

		it("should reject invalid entity types", () => {
			expect(() => AuditEntityTypeSchema.parse("INVALID")).toThrow();
			expect(() => AuditEntityTypeSchema.parse("")).toThrow();
		});
	});

	describe("AuditLogFiltersSchema", () => {
		it("should parse valid filters with defaults", () => {
			const result = AuditLogFiltersSchema.parse({});

			expect(result.page).toBe(1);
			expect(result.limit).toBe(20);
		});

		it("should parse filters with all options", () => {
			const result = AuditLogFiltersSchema.parse({
				page: "2",
				limit: "50",
				entityType: "CLIENT",
				entityId: "CLT123456789",
				action: "CREATE",
				actorId: "user123",
				actorType: "USER",
				startDate: "2025-01-01",
				endDate: "2025-01-31",
			});

			expect(result.page).toBe(2);
			expect(result.limit).toBe(50);
			expect(result.entityType).toBe("CLIENT");
			expect(result.entityId).toBe("CLT123456789");
			expect(result.action).toBe("CREATE");
			expect(result.actorId).toBe("user123");
			expect(result.actorType).toBe("USER");
			expect(result.startDate).toBe("2025-01-01");
			expect(result.endDate).toBe("2025-01-31");
		});

		it("should reject invalid date format", () => {
			expect(() =>
				AuditLogFiltersSchema.parse({ startDate: "01-01-2025" }),
			).toThrow();
			expect(() =>
				AuditLogFiltersSchema.parse({ endDate: "2025/01/31" }),
			).toThrow();
		});

		it("should reject limit > 100", () => {
			expect(() => AuditLogFiltersSchema.parse({ limit: "200" })).toThrow();
		});

		it("should reject page < 1", () => {
			expect(() => AuditLogFiltersSchema.parse({ page: "0" })).toThrow();
		});
	});

	describe("ChainVerifyRequestSchema", () => {
		it("should parse empty request with defaults", () => {
			const result = ChainVerifyRequestSchema.parse({});

			expect(result.limit).toBe(1000);
			expect(result.startSequence).toBeUndefined();
			expect(result.endSequence).toBeUndefined();
		});

		it("should parse request with all options", () => {
			const result = ChainVerifyRequestSchema.parse({
				startSequence: 1,
				endSequence: 100,
				limit: 500,
			});

			expect(result.startSequence).toBe(1);
			expect(result.endSequence).toBe(100);
			expect(result.limit).toBe(500);
		});

		it("should reject limit > 10000", () => {
			expect(() => ChainVerifyRequestSchema.parse({ limit: 20000 })).toThrow();
		});

		it("should reject negative sequence numbers", () => {
			expect(() =>
				ChainVerifyRequestSchema.parse({ startSequence: -1 }),
			).toThrow();
		});
	});

	describe("AuditExportRequestSchema", () => {
		it("should parse empty request with defaults", () => {
			const result = AuditExportRequestSchema.parse({});

			expect(result.format).toBe("json");
			expect(result.limit).toBe(10000);
		});

		it("should parse request with all options", () => {
			const result = AuditExportRequestSchema.parse({
				format: "csv",
				startDate: "2025-01-01",
				endDate: "2025-01-31",
				entityType: "CLIENT",
				limit: "5000",
			});

			expect(result.format).toBe("csv");
			expect(result.startDate).toBe("2025-01-01");
			expect(result.endDate).toBe("2025-01-31");
			expect(result.entityType).toBe("CLIENT");
			expect(result.limit).toBe(5000);
		});

		it("should reject invalid format", () => {
			expect(() => AuditExportRequestSchema.parse({ format: "xml" })).toThrow();
		});

		it("should reject limit > 50000", () => {
			expect(() =>
				AuditExportRequestSchema.parse({ limit: "100000" }),
			).toThrow();
		});
	});

	describe("EntityHistoryRequestSchema", () => {
		it("should parse empty request with defaults", () => {
			const result = EntityHistoryRequestSchema.parse({});

			expect(result.page).toBe(1);
			expect(result.limit).toBe(20);
		});

		it("should parse request with options", () => {
			const result = EntityHistoryRequestSchema.parse({
				page: "3",
				limit: "50",
			});

			expect(result.page).toBe(3);
			expect(result.limit).toBe(50);
		});

		it("should reject limit > 100", () => {
			expect(() =>
				EntityHistoryRequestSchema.parse({ limit: "200" }),
			).toThrow();
		});
	});
});
