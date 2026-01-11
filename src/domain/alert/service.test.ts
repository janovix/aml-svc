import { describe, it, expect, beforeEach, vi } from "vitest";
import {
	AlertService,
	AlertRuleService,
	AlertRuleConfigService,
} from "./service";
import type {
	AlertRepository,
	AlertRuleRepository,
	AlertRuleConfigRepository,
} from "./repository";
import type {
	AlertEntity,
	AlertRuleEntity,
	AlertRuleConfigEntity,
} from "./types";

describe("AlertRuleService", () => {
	let service: AlertRuleService;
	let mockRepository: AlertRuleRepository;

	const mockRule: AlertRuleEntity = {
		id: "2501",
		name: "Test Rule",
		description: "Test Description",
		active: true,
		severity: "HIGH",
		ruleType: "test-rule",
		isManualOnly: false,
		activityCode: "VEH",
		metadata: null,
		createdAt: "2024-01-01T00:00:00Z",
		updatedAt: "2024-01-01T00:00:00Z",
	};

	beforeEach(() => {
		mockRepository = {
			list: vi.fn(),
			getById: vi.fn(),
			getByRuleType: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
			patch: vi.fn(),
			delete: vi.fn(),
			listActive: vi.fn(),
			listActiveForSeeker: vi.fn(),
		} as unknown as AlertRuleRepository;

		service = new AlertRuleService(mockRepository);
	});

	describe("get", () => {
		it("should return rule when found", async () => {
			vi.mocked(mockRepository.getById).mockResolvedValue(mockRule);

			const result = await service.get("2501");

			expect(mockRepository.getById).toHaveBeenCalledWith("2501");
			expect(result).toEqual(mockRule);
		});

		it("should throw error when rule not found", async () => {
			vi.mocked(mockRepository.getById).mockResolvedValue(null);

			await expect(service.get("non-existent")).rejects.toThrow(
				"ALERT_RULE_NOT_FOUND",
			);
		});
	});

	describe("getByRuleType", () => {
		it("should return rule when found by rule type", async () => {
			vi.mocked(mockRepository.getByRuleType).mockResolvedValue(mockRule);

			const result = await service.getByRuleType("test-rule");

			expect(mockRepository.getByRuleType).toHaveBeenCalledWith("test-rule");
			expect(result).toEqual(mockRule);
		});

		it("should throw error when rule not found by rule type", async () => {
			vi.mocked(mockRepository.getByRuleType).mockResolvedValue(null);

			await expect(service.getByRuleType("non-existent")).rejects.toThrow(
				"ALERT_RULE_NOT_FOUND",
			);
		});
	});

	describe("listActiveForSeeker", () => {
		it("should return active rules for seeker", async () => {
			vi.mocked(mockRepository.listActiveForSeeker).mockResolvedValue([
				mockRule,
			]);

			const result = await service.listActiveForSeeker();

			expect(mockRepository.listActiveForSeeker).toHaveBeenCalled();
			expect(result).toEqual([mockRule]);
		});
	});
});

describe("AlertRuleConfigService", () => {
	let service: AlertRuleConfigService;
	let mockRepository: AlertRuleConfigRepository;

	const mockConfig: AlertRuleConfigEntity = {
		id: "config-1",
		alertRuleId: "2501",
		key: "threshold",
		value: "1000000",
		isHardcoded: false,
		description: "Threshold value",
		createdAt: "2024-01-01T00:00:00Z",
		updatedAt: "2024-01-01T00:00:00Z",
	};

	beforeEach(() => {
		mockRepository = {
			listByAlertRuleId: vi.fn(),
			getByKey: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
			delete: vi.fn(),
		} as unknown as AlertRuleConfigRepository;

		service = new AlertRuleConfigService(mockRepository);
	});

	describe("getByKey", () => {
		it("should return config when found", async () => {
			vi.mocked(mockRepository.getByKey).mockResolvedValue(mockConfig);

			const result = await service.getByKey("2501", "threshold");

			expect(mockRepository.getByKey).toHaveBeenCalledWith("2501", "threshold");
			expect(result).toEqual(mockConfig);
		});

		it("should throw error when config not found", async () => {
			vi.mocked(mockRepository.getByKey).mockResolvedValue(null);

			await expect(service.getByKey("2501", "non-existent")).rejects.toThrow(
				"ALERT_RULE_CONFIG_NOT_FOUND",
			);
		});
	});
});

describe("AlertService", () => {
	let service: AlertService;
	let mockRepository: AlertRepository;
	const organizationId = "org-123";

	const mockAlert: AlertEntity = {
		id: "alert-123",
		alertRuleId: "2501",
		clientId: "client-123",
		status: "DETECTED",
		severity: "HIGH",
		idempotencyKey: "key-123",
		contextHash: "hash-123",
		metadata: {},
		transactionId: "transaction-123",
		isManual: false,
		isOverdue: false,
		createdAt: "2024-01-15T00:00:00Z",
		updatedAt: "2024-01-15T00:00:00Z",
	};

	beforeEach(() => {
		mockRepository = {
			list: vi.fn(),
			getById: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
			patch: vi.fn(),
			delete: vi.fn(),
			findByIdempotencyKey: vi.fn(),
		} as unknown as AlertRepository;

		service = new AlertService(mockRepository);
	});

	describe("get", () => {
		it("should return alert when found", async () => {
			vi.mocked(mockRepository.getById).mockResolvedValue(mockAlert);

			const result = await service.get(organizationId, "alert-123");

			expect(mockRepository.getById).toHaveBeenCalledWith(
				organizationId,
				"alert-123",
			);
			expect(result).toEqual(mockAlert);
		});

		it("should throw error when alert not found", async () => {
			vi.mocked(mockRepository.getById).mockResolvedValue(null);

			await expect(service.get(organizationId, "non-existent")).rejects.toThrow(
				"ALERT_NOT_FOUND",
			);
		});
	});

	describe("findByIdempotencyKey", () => {
		it("should return alert when found by idempotency key", async () => {
			vi.mocked(mockRepository.findByIdempotencyKey).mockResolvedValue(
				mockAlert,
			);

			const result = await service.findByIdempotencyKey(
				organizationId,
				"key-123",
			);

			expect(mockRepository.findByIdempotencyKey).toHaveBeenCalledWith(
				organizationId,
				"key-123",
			);
			expect(result).toEqual(mockAlert);
		});

		it("should return null when not found", async () => {
			vi.mocked(mockRepository.findByIdempotencyKey).mockResolvedValue(null);

			const result = await service.findByIdempotencyKey(
				organizationId,
				"non-existent",
			);

			expect(result).toBeNull();
		});
	});
});
