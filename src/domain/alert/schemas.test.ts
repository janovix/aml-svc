import { describe, expect, it } from "vitest";
import {
	AlertRuleCreateSchema,
	AlertRuleUpdateSchema,
	AlertRulePatchSchema,
	AlertRuleFilterSchema,
	AlertRuleConfigCreateSchema,
	AlertRuleConfigUpdateSchema,
	AlertCreateSchema,
	AlertUpdateSchema,
	AlertPatchSchema,
	AlertFilterSchema,
} from "./schemas";

describe("AlertRule Schemas", () => {
	describe("AlertRuleCreateSchema", () => {
		it("validates valid alert rule creation input", () => {
			const input = {
				id: "2501",
				name: "Test Rule",
				description: "Test description",
				active: true,
				severity: "HIGH",
				ruleType: "transaction_amount_uma",
				isManualOnly: false,
				activityCode: "VEH",
				metadata: { legalBasis: "LFPIORPI" },
			};

			const result = AlertRuleCreateSchema.safeParse(input);
			expect(result.success).toBe(true);
		});

		it("allows null ruleType for manual-only rules", () => {
			const input = {
				name: "Manual Only Rule",
				active: true,
				severity: "MEDIUM",
				ruleType: null,
				isManualOnly: true,
				activityCode: "VEH",
			};

			const result = AlertRuleCreateSchema.safeParse(input);
			expect(result.success).toBe(true);
		});

		it("defaults active to true", () => {
			const input = {
				name: "Test Rule",
				severity: "MEDIUM",
			};

			const result = AlertRuleCreateSchema.safeParse(input);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.active).toBe(true);
			}
		});

		it("defaults isManualOnly to false", () => {
			const input = {
				name: "Test Rule",
				severity: "MEDIUM",
			};

			const result = AlertRuleCreateSchema.safeParse(input);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.isManualOnly).toBe(false);
			}
		});

		it("defaults activityCode to VEH", () => {
			const input = {
				name: "Test Rule",
			};

			const result = AlertRuleCreateSchema.safeParse(input);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.activityCode).toBe("VEH");
			}
		});

		it("rejects invalid severity", () => {
			const input = {
				name: "Test Rule",
				severity: "INVALID",
			};

			const result = AlertRuleCreateSchema.safeParse(input);
			expect(result.success).toBe(false);
		});

		it("rejects empty name", () => {
			const input = {
				name: "",
				severity: "HIGH",
			};

			const result = AlertRuleCreateSchema.safeParse(input);
			expect(result.success).toBe(false);
		});
	});

	describe("AlertRuleUpdateSchema", () => {
		it("validates complete update input", () => {
			const input = {
				name: "Updated Rule",
				description: "Updated description",
				active: false,
				severity: "LOW",
				ruleType: "new_type",
				isManualOnly: true,
				activityCode: "JYS",
			};

			const result = AlertRuleUpdateSchema.safeParse(input);
			expect(result.success).toBe(true);
		});

		it("requires all fields for update", () => {
			const input = {
				name: "Updated Rule",
				// Missing other required fields
			};

			const result = AlertRuleUpdateSchema.safeParse(input);
			expect(result.success).toBe(false);
		});
	});

	describe("AlertRulePatchSchema", () => {
		it("allows partial updates", () => {
			const input = {
				active: false,
			};

			const result = AlertRulePatchSchema.safeParse(input);
			expect(result.success).toBe(true);
		});

		it("rejects empty payload", () => {
			const input = {};

			const result = AlertRulePatchSchema.safeParse(input);
			expect(result.success).toBe(false);
		});

		it("allows updating isManualOnly", () => {
			const input = {
				isManualOnly: true,
			};

			const result = AlertRulePatchSchema.safeParse(input);
			expect(result.success).toBe(true);
		});

		it("allows updating activityCode", () => {
			const input = {
				activityCode: "INM",
			};

			const result = AlertRulePatchSchema.safeParse(input);
			expect(result.success).toBe(true);
		});
	});

	describe("AlertRuleFilterSchema", () => {
		it("validates filter with all fields", () => {
			const input = {
				search: "test",
				active: true,
				severity: "HIGH",
				activityCode: "VEH",
				isManualOnly: true,
				page: "1",
				limit: "10",
			};

			const result = AlertRuleFilterSchema.safeParse(input);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.active).toBe(true);
				expect(result.data.isManualOnly).toBe(true);
				expect(result.data.activityCode).toBe("VEH");
			}
		});

		it("coerces boolean strings to booleans", () => {
			const input = {
				active: "true",
				isManualOnly: "false",
			};

			const result = AlertRuleFilterSchema.safeParse(input);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(typeof result.data.active).toBe("boolean");
				expect(typeof result.data.isManualOnly).toBe("boolean");
			}
		});

		it("defaults page to 1", () => {
			const result = AlertRuleFilterSchema.safeParse({});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.page).toBe(1);
			}
		});

		it("defaults limit to 10", () => {
			const result = AlertRuleFilterSchema.safeParse({});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.limit).toBe(10);
			}
		});
	});
});

describe("AlertRuleConfig Schemas", () => {
	describe("AlertRuleConfigCreateSchema", () => {
		it("validates valid config creation", () => {
			const input = {
				key: "uma_threshold",
				value: "6420",
				isHardcoded: true,
				description: "UMA multiplier threshold",
			};

			const result = AlertRuleConfigCreateSchema.safeParse(input);
			expect(result.success).toBe(true);
		});

		it("defaults isHardcoded to false", () => {
			const input = {
				key: "custom_threshold",
				value: "1000",
			};

			const result = AlertRuleConfigCreateSchema.safeParse(input);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.isHardcoded).toBe(false);
			}
		});

		it("requires key and value", () => {
			const input = {
				isHardcoded: true,
			};

			const result = AlertRuleConfigCreateSchema.safeParse(input);
			expect(result.success).toBe(false);
		});
	});

	describe("AlertRuleConfigUpdateSchema", () => {
		it("allows updating value only", () => {
			const input = {
				value: "9999",
			};

			const result = AlertRuleConfigUpdateSchema.safeParse(input);
			expect(result.success).toBe(true);
		});

		it("allows updating description only", () => {
			const input = {
				description: "Updated description",
			};

			const result = AlertRuleConfigUpdateSchema.safeParse(input);
			expect(result.success).toBe(true);
		});

		it("allows empty object (no updates)", () => {
			const result = AlertRuleConfigUpdateSchema.safeParse({});
			expect(result.success).toBe(true);
		});
	});
});

describe("Alert Schemas", () => {
	describe("AlertCreateSchema", () => {
		it("validates valid alert creation with metadata and transactionId", () => {
			const input = {
				alertRuleId: "2501",
				clientId: "clt_123",
				severity: "HIGH",
				idempotencyKey: "idem_123",
				contextHash: "ctx_123",
				metadata: { transactionIds: ["tx_1", "tx_2"], amount: 100000 },
				transactionId: "tx_001",
				isManual: false,
			};

			const result = AlertCreateSchema.safeParse(input);
			expect(result.success).toBe(true);
		});

		it("allows null transactionId", () => {
			const input = {
				alertRuleId: "2501",
				clientId: "clt_123",
				severity: "HIGH",
				idempotencyKey: "idem_123",
				contextHash: "ctx_123",
				metadata: {},
				transactionId: null,
				isManual: true,
			};

			const result = AlertCreateSchema.safeParse(input);
			expect(result.success).toBe(true);
		});

		it("defaults isManual to false", () => {
			const input = {
				alertRuleId: "2501",
				clientId: "clt_123",
				severity: "HIGH",
				idempotencyKey: "idem_123",
				contextHash: "ctx_123",
				metadata: {},
			};

			const result = AlertCreateSchema.safeParse(input);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.isManual).toBe(false);
			}
		});

		it("requires metadata field", () => {
			const input = {
				alertRuleId: "2501",
				clientId: "clt_123",
				severity: "HIGH",
				idempotencyKey: "idem_123",
				contextHash: "ctx_123",
				// Missing metadata
			};

			const result = AlertCreateSchema.safeParse(input);
			expect(result.success).toBe(false);
		});

		it("validates ISO datetime for submissionDeadline", () => {
			const input = {
				alertRuleId: "2501",
				clientId: "clt_123",
				severity: "HIGH",
				idempotencyKey: "idem_123",
				contextHash: "ctx_123",
				metadata: {},
				submissionDeadline: "2025-02-17T14:30:00Z",
			};

			const result = AlertCreateSchema.safeParse(input);
			expect(result.success).toBe(true);
		});

		it("accepts partial datetime format for submissionDeadline", () => {
			const input = {
				alertRuleId: "2501",
				clientId: "clt_123",
				severity: "HIGH",
				idempotencyKey: "idem_123",
				contextHash: "ctx_123",
				metadata: {},
				submissionDeadline: "2025-02-17T14:30",
			};

			const result = AlertCreateSchema.safeParse(input);
			expect(result.success).toBe(true);
		});
	});

	describe("AlertUpdateSchema", () => {
		it("validates status update", () => {
			const input = {
				status: "SUBMITTED",
				notes: "Submitted to SAT",
				submittedAt: "2025-01-17T10:00:00Z",
				satFolioNumber: "SAT-2025-001",
			};

			const result = AlertUpdateSchema.safeParse(input);
			expect(result.success).toBe(true);
		});

		it("rejects invalid status", () => {
			const input = {
				status: "INVALID_STATUS",
			};

			const result = AlertUpdateSchema.safeParse(input);
			expect(result.success).toBe(false);
		});

		it("validates cancellation fields", () => {
			const input = {
				status: "CANCELLED",
				cancelledBy: "user_123",
				cancellationReason: "False positive",
			};

			const result = AlertUpdateSchema.safeParse(input);
			expect(result.success).toBe(true);
		});
	});

	describe("AlertPatchSchema", () => {
		it("allows partial updates", () => {
			const input = {
				notes: "Updated notes",
			};

			const result = AlertPatchSchema.safeParse(input);
			expect(result.success).toBe(true);
		});

		it("rejects empty payload", () => {
			const result = AlertPatchSchema.safeParse({});
			expect(result.success).toBe(false);
		});
	});

	describe("AlertFilterSchema", () => {
		it("validates filter with isManual", () => {
			const input = {
				alertRuleId: "2501",
				isManual: "true",
				page: "1",
				limit: "20",
			};

			const result = AlertFilterSchema.safeParse(input);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.isManual).toBe(true);
			}
		});

		it("validates filter with isOverdue", () => {
			const input = {
				isOverdue: "true",
			};

			const result = AlertFilterSchema.safeParse(input);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.isOverdue).toBe(true);
			}
		});

		it("coerces page and limit to numbers", () => {
			const input = {
				page: "5",
				limit: "50",
			};

			const result = AlertFilterSchema.safeParse(input);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.page).toBe(5);
				expect(result.data.limit).toBe(50);
			}
		});
	});
});
