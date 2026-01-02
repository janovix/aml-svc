import { describe, expect, it, vi, beforeEach } from "vitest";
import {
	AlertRuleRepository,
	AlertRuleConfigRepository,
	AlertRepository,
} from "./repository";
import type { PrismaClient } from "@prisma/client";

// Mock Prisma client
function createMockPrisma(): PrismaClient {
	return {
		alertRule: {
			findMany: vi.fn(),
			findUnique: vi.fn(),
			findFirst: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
			delete: vi.fn(),
			count: vi.fn(),
		},
		alertRuleConfig: {
			findMany: vi.fn(),
			findFirst: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
			delete: vi.fn(),
		},
		alert: {
			findMany: vi.fn(),
			findUnique: vi.fn(),
			findFirst: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
			updateMany: vi.fn(),
			delete: vi.fn(),
			count: vi.fn(),
		},
	} as unknown as PrismaClient;
}

const mockAlertRule = {
	id: "2501",
	name: "Test Alert Rule",
	description: "Test description",
	active: true,
	severity: "HIGH",
	ruleType: "transaction_amount_uma",
	isManualOnly: false,
	activityCode: "VEH",
	metadata: '{"legalBasis": "LFPIORPI"}',
	createdAt: new Date("2024-01-01"),
	updatedAt: new Date("2024-01-01"),
};

const mockAlertRuleManualOnly = {
	...mockAlertRule,
	id: "2502",
	name: "Manual Only Rule",
	ruleType: null,
	isManualOnly: true,
};

const mockAlertRuleConfig = {
	id: "cfg_123",
	alertRuleId: "2501",
	key: "uma_threshold",
	value: "6420",
	isHardcoded: true,
	description: "UMA multiplier threshold",
	createdAt: new Date("2024-01-01"),
	updatedAt: new Date("2024-01-01"),
};

const mockAlert = {
	id: "alt_123",
	organizationId: "org_123",
	alertRuleId: "2501",
	clientId: "clt_123",
	status: "DETECTED",
	severity: "HIGH",
	idempotencyKey: "idem_key_123",
	contextHash: "ctx_hash_123",
	metadata: '{"transactionIds": ["tx_1", "tx_2"]}',
	transactionId: "tx_001",
	isManual: false,
	submissionDeadline: new Date("2024-02-17"),
	fileGeneratedAt: null,
	satFileUrl: null,
	submittedAt: null,
	satAcknowledgmentReceipt: null,
	satFolioNumber: null,
	isOverdue: false,
	notes: null,
	reviewedAt: null,
	reviewedBy: null,
	cancelledAt: null,
	cancelledBy: null,
	cancellationReason: null,
	createdAt: new Date("2024-01-15"),
	updatedAt: new Date("2024-01-15"),
};

describe("AlertRuleRepository", () => {
	let mockPrisma: PrismaClient;
	let repository: AlertRuleRepository;

	beforeEach(() => {
		mockPrisma = createMockPrisma();
		repository = new AlertRuleRepository(mockPrisma);
	});

	describe("list", () => {
		it("returns paginated list of alert rules without organizationId filter", async () => {
			vi.mocked(mockPrisma.alertRule.count).mockResolvedValue(2);
			vi.mocked(mockPrisma.alertRule.findMany).mockResolvedValue([
				mockAlertRule,
				mockAlertRuleManualOnly,
			] as never);

			const result = await repository.list({ page: 1, limit: 10 });

			expect(result.data).toHaveLength(2);
			expect(result.pagination.total).toBe(2);
			expect(mockPrisma.alertRule.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: {},
					skip: 0,
					take: 10,
				}),
			);
		});

		it("filters by active status", async () => {
			vi.mocked(mockPrisma.alertRule.count).mockResolvedValue(1);
			vi.mocked(mockPrisma.alertRule.findMany).mockResolvedValue([
				mockAlertRule,
			] as never);

			await repository.list({ page: 1, limit: 10, active: true });

			expect(mockPrisma.alertRule.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: { active: true },
				}),
			);
		});

		it("filters by activityCode", async () => {
			vi.mocked(mockPrisma.alertRule.count).mockResolvedValue(1);
			vi.mocked(mockPrisma.alertRule.findMany).mockResolvedValue([
				mockAlertRule,
			] as never);

			await repository.list({ page: 1, limit: 10, activityCode: "VEH" });

			expect(mockPrisma.alertRule.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: { activityCode: "VEH" },
				}),
			);
		});

		it("filters by isManualOnly", async () => {
			vi.mocked(mockPrisma.alertRule.count).mockResolvedValue(1);
			vi.mocked(mockPrisma.alertRule.findMany).mockResolvedValue([
				mockAlertRuleManualOnly,
			] as never);

			await repository.list({ page: 1, limit: 10, isManualOnly: true });

			expect(mockPrisma.alertRule.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: { isManualOnly: true },
				}),
			);
		});

		it("supports search by name or description", async () => {
			vi.mocked(mockPrisma.alertRule.count).mockResolvedValue(1);
			vi.mocked(mockPrisma.alertRule.findMany).mockResolvedValue([
				mockAlertRule,
			] as never);

			await repository.list({ page: 1, limit: 10, search: "test" });

			expect(mockPrisma.alertRule.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: expect.objectContaining({
						OR: [
							{ name: { contains: "test" } },
							{ description: { contains: "test" } },
						],
					}),
				}),
			);
		});
	});

	describe("getById", () => {
		it("returns alert rule by id without organizationId", async () => {
			vi.mocked(mockPrisma.alertRule.findUnique).mockResolvedValue(
				mockAlertRule as never,
			);

			const result = await repository.getById("2501");

			expect(result).toBeDefined();
			expect(result?.id).toBe("2501");
			expect(mockPrisma.alertRule.findUnique).toHaveBeenCalledWith({
				where: { id: "2501" },
			});
		});

		it("returns null when not found", async () => {
			vi.mocked(mockPrisma.alertRule.findUnique).mockResolvedValue(null);

			const result = await repository.getById("nonexistent");

			expect(result).toBeNull();
		});
	});

	describe("getByRuleType", () => {
		it("finds active rule by ruleType", async () => {
			vi.mocked(mockPrisma.alertRule.findFirst).mockResolvedValue(
				mockAlertRule as never,
			);

			const result = await repository.getByRuleType("transaction_amount_uma");

			expect(result).toBeDefined();
			expect(result?.ruleType).toBe("transaction_amount_uma");
			expect(mockPrisma.alertRule.findFirst).toHaveBeenCalledWith({
				where: { ruleType: "transaction_amount_uma", active: true },
			});
		});
	});

	describe("listActive", () => {
		it("returns all active rules", async () => {
			vi.mocked(mockPrisma.alertRule.findMany).mockResolvedValue([
				mockAlertRule,
			] as never);

			const result = await repository.listActive();

			expect(result).toHaveLength(1);
			expect(mockPrisma.alertRule.findMany).toHaveBeenCalledWith({
				where: { active: true },
				orderBy: { createdAt: "desc" },
			});
		});
	});

	describe("listActiveForSeeker", () => {
		it("returns only active rules that are not manual-only", async () => {
			vi.mocked(mockPrisma.alertRule.findMany).mockResolvedValue([
				mockAlertRule,
			] as never);

			const result = await repository.listActiveForSeeker();

			expect(result).toHaveLength(1);
			expect(mockPrisma.alertRule.findMany).toHaveBeenCalledWith({
				where: { active: true, isManualOnly: false },
				orderBy: { createdAt: "desc" },
			});
		});
	});

	describe("create", () => {
		it("creates alert rule with ruleType and activityCode", async () => {
			const createInput = {
				id: "2503",
				name: "New Rule",
				description: "New description",
				active: true,
				severity: "MEDIUM" as const,
				ruleType: "cash_payment_limit",
				isManualOnly: false,
				activityCode: "VEH",
			};

			vi.mocked(mockPrisma.alertRule.create).mockResolvedValue({
				...mockAlertRule,
				...createInput,
			} as never);

			const result = await repository.create(createInput);

			expect(result.id).toBe("2503");
			expect(result.ruleType).toBe("cash_payment_limit");
			expect(mockPrisma.alertRule.create).toHaveBeenCalled();
		});
	});

	describe("delete", () => {
		it("throws ALERT_RULE_NOT_FOUND when rule does not exist", async () => {
			vi.mocked(mockPrisma.alertRule.findUnique).mockResolvedValue(null);

			await expect(repository.delete("nonexistent")).rejects.toThrow(
				"ALERT_RULE_NOT_FOUND",
			);
		});
	});
});

describe("AlertRuleConfigRepository", () => {
	let mockPrisma: PrismaClient;
	let repository: AlertRuleConfigRepository;

	beforeEach(() => {
		mockPrisma = createMockPrisma();
		repository = new AlertRuleConfigRepository(mockPrisma);
	});

	describe("listByAlertRuleId", () => {
		it("returns all configs for an alert rule", async () => {
			vi.mocked(mockPrisma.alertRuleConfig.findMany).mockResolvedValue([
				mockAlertRuleConfig,
			] as never);

			const result = await repository.listByAlertRuleId("2501");

			expect(result).toHaveLength(1);
			expect(result[0].key).toBe("uma_threshold");
			expect(mockPrisma.alertRuleConfig.findMany).toHaveBeenCalledWith({
				where: { alertRuleId: "2501" },
				orderBy: { key: "asc" },
			});
		});
	});

	describe("getByKey", () => {
		it("returns config by alertRuleId and key", async () => {
			vi.mocked(mockPrisma.alertRuleConfig.findFirst).mockResolvedValue(
				mockAlertRuleConfig as never,
			);

			const result = await repository.getByKey("2501", "uma_threshold");

			expect(result).toBeDefined();
			expect(result?.value).toBe("6420");
		});
	});

	describe("create", () => {
		it("creates new config", async () => {
			vi.mocked(mockPrisma.alertRuleConfig.create).mockResolvedValue(
				mockAlertRuleConfig as never,
			);

			const result = await repository.create("2501", {
				key: "new_threshold",
				value: "1000",
				isHardcoded: false,
			});

			expect(result).toBeDefined();
			expect(mockPrisma.alertRuleConfig.create).toHaveBeenCalled();
		});
	});

	describe("update", () => {
		it("throws ALERT_RULE_CONFIG_NOT_FOUND when config does not exist", async () => {
			vi.mocked(mockPrisma.alertRuleConfig.findFirst).mockResolvedValue(null);

			await expect(
				repository.update("2501", "nonexistent", { value: "100" }),
			).rejects.toThrow("ALERT_RULE_CONFIG_NOT_FOUND");
		});

		it("throws ALERT_RULE_CONFIG_IS_HARDCODED when trying to update hardcoded config", async () => {
			vi.mocked(mockPrisma.alertRuleConfig.findFirst).mockResolvedValue(
				mockAlertRuleConfig as never,
			);

			await expect(
				repository.update("2501", "uma_threshold", { value: "9999" }),
			).rejects.toThrow("ALERT_RULE_CONFIG_IS_HARDCODED");
		});

		it("updates non-hardcoded config successfully", async () => {
			const editableConfig = { ...mockAlertRuleConfig, isHardcoded: false };
			vi.mocked(mockPrisma.alertRuleConfig.findFirst).mockResolvedValue(
				editableConfig as never,
			);
			vi.mocked(mockPrisma.alertRuleConfig.update).mockResolvedValue({
				...editableConfig,
				value: "9999",
			} as never);

			const result = await repository.update("2501", "uma_threshold", {
				value: "9999",
			});

			expect(result.value).toBe("9999");
		});
	});

	describe("delete", () => {
		it("throws ALERT_RULE_CONFIG_IS_HARDCODED when trying to delete hardcoded config", async () => {
			vi.mocked(mockPrisma.alertRuleConfig.findFirst).mockResolvedValue(
				mockAlertRuleConfig as never,
			);

			await expect(repository.delete("2501", "uma_threshold")).rejects.toThrow(
				"ALERT_RULE_CONFIG_IS_HARDCODED",
			);
		});

		it("deletes non-hardcoded config successfully", async () => {
			const editableConfig = { ...mockAlertRuleConfig, isHardcoded: false };
			vi.mocked(mockPrisma.alertRuleConfig.findFirst).mockResolvedValue(
				editableConfig as never,
			);
			vi.mocked(mockPrisma.alertRuleConfig.delete).mockResolvedValue(
				editableConfig as never,
			);

			await expect(
				repository.delete("2501", "uma_threshold"),
			).resolves.not.toThrow();
		});
	});
});

describe("AlertRepository", () => {
	let mockPrisma: PrismaClient;
	let repository: AlertRepository;

	beforeEach(() => {
		mockPrisma = createMockPrisma();
		repository = new AlertRepository(mockPrisma);
	});

	describe("list", () => {
		it("filters by organizationId (organization-specific)", async () => {
			vi.mocked(mockPrisma.alert.updateMany).mockResolvedValue({ count: 0 });
			vi.mocked(mockPrisma.alert.count).mockResolvedValue(1);
			vi.mocked(mockPrisma.alert.findMany).mockResolvedValue([
				{ ...mockAlert, alertRule: mockAlertRule },
			] as never);

			await repository.list("org_123", { page: 1, limit: 10 });

			expect(mockPrisma.alert.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: { organizationId: "org_123" },
				}),
			);
		});

		it("filters by isManual flag", async () => {
			vi.mocked(mockPrisma.alert.updateMany).mockResolvedValue({ count: 0 });
			vi.mocked(mockPrisma.alert.count).mockResolvedValue(1);
			vi.mocked(mockPrisma.alert.findMany).mockResolvedValue([
				{ ...mockAlert, alertRule: mockAlertRule, isManual: true },
			] as never);

			await repository.list("org_123", { page: 1, limit: 10, isManual: true });

			expect(mockPrisma.alert.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: expect.objectContaining({
						organizationId: "org_123",
						isManual: true,
					}),
				}),
			);
		});
	});

	describe("create", () => {
		it("returns existing alert for same idempotency key (idempotent)", async () => {
			vi.mocked(mockPrisma.alert.findUnique).mockResolvedValue({
				...mockAlert,
				alertRule: mockAlertRule,
			} as never);

			const result = await repository.create(
				{
					alertRuleId: "2501",
					clientId: "clt_123",
					severity: "HIGH",
					idempotencyKey: "idem_key_123",
					contextHash: "ctx_hash_123",
					metadata: { transactionIds: [] },
					isManual: false,
				},
				"org_123",
			);

			expect(result.id).toBe("alt_123");
			expect(mockPrisma.alert.create).not.toHaveBeenCalled();
		});

		it("throws ALERT_RULE_NOT_FOUND when rule does not exist", async () => {
			vi.mocked(mockPrisma.alert.findUnique).mockResolvedValue(null);
			vi.mocked(mockPrisma.alertRule.findUnique).mockResolvedValue(null);

			await expect(
				repository.create(
					{
						alertRuleId: "nonexistent",
						clientId: "clt_123",
						severity: "HIGH",
						idempotencyKey: "new_key",
						contextHash: "ctx_hash",
						metadata: {},
						isManual: false,
					},
					"org_123",
				),
			).rejects.toThrow("ALERT_RULE_NOT_FOUND");
		});

		it("throws ALERT_RULE_IS_MANUAL_ONLY when trying automatic creation on manual-only rule", async () => {
			vi.mocked(mockPrisma.alert.findUnique).mockResolvedValue(null);
			vi.mocked(mockPrisma.alertRule.findUnique).mockResolvedValue(
				mockAlertRuleManualOnly as never,
			);

			await expect(
				repository.create(
					{
						alertRuleId: "2502",
						clientId: "clt_123",
						severity: "HIGH",
						idempotencyKey: "new_key",
						contextHash: "ctx_hash",
						metadata: {},
						isManual: false, // Automatic creation
					},
					"org_123",
				),
			).rejects.toThrow("ALERT_RULE_IS_MANUAL_ONLY");
		});

		it("allows manual creation on manual-only rule", async () => {
			vi.mocked(mockPrisma.alert.findUnique).mockResolvedValue(null);
			vi.mocked(mockPrisma.alertRule.findUnique).mockResolvedValue(
				mockAlertRuleManualOnly as never,
			);
			vi.mocked(mockPrisma.alert.create).mockResolvedValue({
				...mockAlert,
				isManual: true,
				alertRule: mockAlertRuleManualOnly,
			} as never);

			const result = await repository.create(
				{
					alertRuleId: "2502",
					clientId: "clt_123",
					severity: "HIGH",
					idempotencyKey: "new_key",
					contextHash: "ctx_hash",
					metadata: {},
					isManual: true, // Manual creation
				},
				"org_123",
			);

			expect(result.isManual).toBe(true);
			expect(mockPrisma.alert.create).toHaveBeenCalled();
		});

		it("creates alert with metadata and transactionId", async () => {
			vi.mocked(mockPrisma.alert.findUnique).mockResolvedValue(null);
			vi.mocked(mockPrisma.alertRule.findUnique).mockResolvedValue(
				mockAlertRule as never,
			);
			vi.mocked(mockPrisma.alert.create).mockResolvedValue({
				...mockAlert,
				alertRule: mockAlertRule,
			} as never);

			const result = await repository.create(
				{
					alertRuleId: "2501",
					clientId: "clt_123",
					severity: "HIGH",
					idempotencyKey: "new_key",
					contextHash: "ctx_hash",
					metadata: { transactionIds: ["tx_1", "tx_2"], amount: 100000 },
					transactionId: "tx_001",
					isManual: false,
				},
				"org_123",
			);

			expect(result).toBeDefined();
			expect(mockPrisma.alert.create).toHaveBeenCalled();
		});
	});

	describe("getById", () => {
		it("requires organizationId to access alert", async () => {
			vi.mocked(mockPrisma.alert.findFirst).mockResolvedValue({
				...mockAlert,
				alertRule: mockAlertRule,
			} as never);

			await repository.getById("org_123", "alt_123");

			expect(mockPrisma.alert.findFirst).toHaveBeenCalledWith(
				expect.objectContaining({
					where: { id: "alt_123", organizationId: "org_123" },
				}),
			);
		});

		it("returns null for alert in different organization", async () => {
			vi.mocked(mockPrisma.alert.findFirst).mockResolvedValue(null);

			const result = await repository.getById("other_org", "alt_123");

			expect(result).toBeNull();
		});
	});

	describe("findByIdempotencyKey", () => {
		it("finds alert by idempotency key within organization", async () => {
			vi.mocked(mockPrisma.alert.findFirst).mockResolvedValue({
				...mockAlert,
				alertRule: mockAlertRule,
			} as never);

			const result = await repository.findByIdempotencyKey(
				"org_123",
				"idem_key_123",
			);

			expect(result).toBeDefined();
			expect(result?.idempotencyKey).toBe("idem_key_123");
			expect(mockPrisma.alert.findFirst).toHaveBeenCalledWith(
				expect.objectContaining({
					where: { idempotencyKey: "idem_key_123", organizationId: "org_123" },
				}),
			);
		});
	});
});
