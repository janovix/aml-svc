import { describe, it, expect } from "vitest";
import {
	BaseAlertSeeker,
	UniversalAlertSeeker,
	type AlertContext,
	type SeekerEvaluationResult,
	type AlertOperation,
	type VulnerableActivityCode,
	type AlertRuleType,
	type AlertSeverity,
} from "./types";
import type { PatternType } from "../config/alert-patterns";
import type { AlertRuleEntity, UmaValueEntity } from "../types";
import { DEFAULT_UMA_DAILY_VALUE } from "../config/activity-thresholds";

const nowIso = () => new Date().toISOString();

function makeOperation(
	overrides: Partial<AlertOperation> = {},
): AlertOperation {
	return {
		id: "op-1",
		clientId: "c1",
		amount: 100_000,
		currency: "MXN",
		createdAt: nowIso(),
		...overrides,
	};
}

function makeRule(overrides: Partial<AlertRuleEntity> = {}): AlertRuleEntity {
	const ts = nowIso();
	return {
		id: "rule-1",
		name: "test",
		active: true,
		severity: "HIGH",
		ruleType: "operation_amount_uma",
		isManualOnly: false,
		activityCode: "VEH",
		createdAt: ts,
		updatedAt: ts,
		...overrides,
	};
}

function makeUmaValue(dailyValue: number): UmaValueEntity {
	const ts = nowIso();
	return {
		id: "uma-1",
		dailyValue,
		active: true,
		effectiveDate: "2025-01-01",
		createdAt: ts,
		updatedAt: ts,
	};
}

class ConcreteBaseSeeker extends BaseAlertSeeker {
	readonly activityCode: VulnerableActivityCode = "VEH";
	readonly ruleType: AlertRuleType = "operation_amount_uma";
	readonly name = "ConcreteBase";
	readonly description = "test stub";
	readonly defaultSeverity: AlertSeverity = "HIGH";

	async evaluate(): Promise<SeekerEvaluationResult | null> {
		return null;
	}

	testCalculateUmaThreshold(
		umaValue: UmaValueEntity | null,
		umaMultiplier?: number,
	): number {
		return umaMultiplier === undefined
			? this.calculateUmaThreshold(umaValue)
			: this.calculateUmaThreshold(umaValue, umaMultiplier);
	}

	testFilterOperationsInWindow(
		operations: AlertOperation[],
		windowDays: number,
		referenceDate?: Date,
	): AlertOperation[] {
		return referenceDate === undefined
			? this.filterOperationsInWindow(operations, windowDays)
			: this.filterOperationsInWindow(operations, windowDays, referenceDate);
	}

	testSumOperationAmounts(
		operations: AlertOperation[],
		currency?: string,
	): number {
		return this.sumOperationAmounts(operations, currency);
	}

	testGetCashPayments(
		operations: AlertOperation[],
	): { operation: AlertOperation; amount: number }[] {
		return this.getCashPayments(operations);
	}

	testCreateBaseAlertMetadata(
		operations: AlertOperation[],
		totalAmount: number,
		currency?: string,
	) {
		return this.createBaseAlertMetadata(operations, totalAmount, currency);
	}

	testFindMatchingRule(alertRules: AlertRuleEntity[]) {
		return this.findMatchingRule(alertRules);
	}

	testHashString(data: string): Promise<string> {
		return this.hashString(data);
	}
}

class ConcreteUniversalSeeker extends UniversalAlertSeeker {
	readonly patternType: PatternType = "operation_amount_uma";
	readonly ruleType: AlertRuleType = "operation_amount_uma";
	readonly name = "ConcreteUniversal";
	readonly description = "test stub";
	readonly defaultSeverity: AlertSeverity = "HIGH";

	async evaluate(): Promise<SeekerEvaluationResult | null> {
		return null;
	}

	testCalculateActivityUmaThreshold(
		activityCode: string,
		umaValue: UmaValueEntity | null,
	): number {
		return this.calculateActivityUmaThreshold(activityCode, umaValue);
	}

	testHashString(data: string): Promise<string> {
		return this.hashString(data);
	}
}

function minimalContext(overrides: Partial<AlertContext> = {}): AlertContext {
	return {
		client: { id: "client-a" },
		operations: [],
		umaValue: null,
		alertRules: [],
		activityCode: "VEH",
		evaluationTimestamp: nowIso(),
		...overrides,
	};
}

function minimalResult(
	overrides: Partial<SeekerEvaluationResult> = {},
): SeekerEvaluationResult {
	return {
		triggered: true,
		alertMetadata: {
			operationIds: [],
			totalAmount: 0,
			currency: "MXN",
			triggeredAt: nowIso(),
		},
		matchedOperations: [],
		...overrides,
	};
}

describe("ConcreteBaseSeeker (BaseAlertSeeker helpers)", () => {
	const seeker = new ConcreteBaseSeeker();

	describe("calculateUmaThreshold", () => {
		it("uses dailyValue * multiplier when umaValue is present", () => {
			const uma = makeUmaValue(120);
			expect(seeker.testCalculateUmaThreshold(uma)).toBe(120 * 6420);
		});

		it("uses 113.14 * multiplier when umaValue is null", () => {
			expect(seeker.testCalculateUmaThreshold(null)).toBeCloseTo(
				113.14 * 6420,
				5,
			);
		});

		it("respects custom multiplier", () => {
			const uma = makeUmaValue(50);
			expect(seeker.testCalculateUmaThreshold(uma, 10)).toBe(500);
			expect(seeker.testCalculateUmaThreshold(null, 2)).toBeCloseTo(
				113.14 * 2,
				5,
			);
		});
	});

	describe("filterOperationsInWindow", () => {
		const referenceDate = new Date("2025-06-15T12:00:00.000Z");

		it("keeps operations within the window and drops older ones", () => {
			const inside = makeOperation({
				id: "in",
				createdAt: "2025-06-10T12:00:00.000Z",
			});
			const outside = makeOperation({
				id: "out",
				createdAt: "2025-05-01T12:00:00.000Z",
			});
			const filtered = seeker.testFilterOperationsInWindow(
				[inside, outside],
				7,
				referenceDate,
			);
			expect(filtered.map((o) => o.id)).toEqual(["in"]);
		});

		it("uses operationDate when set", () => {
			const op = makeOperation({
				id: "od",
				createdAt: "2020-01-01T00:00:00.000Z",
				operationDate: "2025-06-14T12:00:00.000Z",
			});
			const filtered = seeker.testFilterOperationsInWindow(
				[op],
				7,
				referenceDate,
			);
			expect(filtered).toHaveLength(1);
		});

		it("uses custom referenceDate", () => {
			const ref = new Date("2025-01-20T00:00:00.000Z");
			const inside = makeOperation({
				id: "i",
				createdAt: "2025-01-18T00:00:00.000Z",
			});
			const outside = makeOperation({
				id: "o",
				createdAt: "2024-12-01T00:00:00.000Z",
			});
			const filtered = seeker.testFilterOperationsInWindow(
				[inside, outside],
				5,
				ref,
			);
			expect(filtered.map((o) => o.id)).toEqual(["i"]);
		});
	});

	describe("sumOperationAmounts", () => {
		it("sums all amounts when no currency filter", () => {
			const ops = [
				makeOperation({ id: "a", amount: 100 }),
				makeOperation({ id: "b", amount: 250, currency: "USD" }),
			];
			expect(seeker.testSumOperationAmounts(ops)).toBe(350);
		});

		it("filters by currency when provided", () => {
			const ops = [
				makeOperation({ id: "a", amount: 100, currency: "MXN" }),
				makeOperation({ id: "b", amount: 999, currency: "USD" }),
			];
			expect(seeker.testSumOperationAmounts(ops, "MXN")).toBe(100);
		});
	});

	describe("getCashPayments", () => {
		it("collects CASH, EFECTIVO, and method code 1", () => {
			const op1 = makeOperation({
				id: "o1",
				paymentMethods: [
					{ id: "pm1", method: "CASH", amount: 50 },
					{ id: "pm2", method: "TRANSFER", amount: 200 },
				],
			});
			const op2 = makeOperation({
				id: "o2",
				paymentMethods: [
					{ id: "pm3", method: "EFECTIVO", amount: 30 },
					{ id: "pm4", method: "1", amount: 10 },
				],
			});
			const rows = seeker.testGetCashPayments([op1, op2]);
			expect(rows).toHaveLength(3);
			expect(rows.map((r) => r.amount).sort((a, b) => a - b)).toEqual([
				10, 30, 50,
			]);
		});

		it("returns empty when no cash-like payment methods", () => {
			const op = makeOperation({
				paymentMethods: [{ id: "pm", method: "CARD", amount: 100 }],
			});
			expect(seeker.testGetCashPayments([op])).toEqual([]);
			expect(seeker.testGetCashPayments([makeOperation()])).toEqual([]);
		});
	});

	describe("createBaseAlertMetadata", () => {
		it("returns operationIds, totalAmount, currency, and ISO triggeredAt", () => {
			const ops = [makeOperation({ id: "x1" }), makeOperation({ id: "x2" })];
			const meta = seeker.testCreateBaseAlertMetadata(ops, 1234.5, "USD");
			expect(meta.operationIds).toEqual(["x1", "x2"]);
			expect(meta.totalAmount).toBe(1234.5);
			expect(meta.currency).toBe("USD");
			expect(meta.triggeredAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
			expect(Number.isNaN(Date.parse(meta.triggeredAt))).toBe(false);
		});

		it("defaults currency to MXN", () => {
			const meta = seeker.testCreateBaseAlertMetadata([makeOperation()], 1);
			expect(meta.currency).toBe("MXN");
		});
	});

	describe("findMatchingRule", () => {
		it("returns active rule with matching ruleType", () => {
			const match = makeRule({ id: "good" });
			const rules = [
				makeRule({ id: "wrong-type", ruleType: "aggregate_amount_uma" }),
				match,
			];
			expect(seeker.testFindMatchingRule(rules)).toEqual(match);
		});

		it("skips inactive rules", () => {
			const rules = [makeRule({ active: false })];
			expect(seeker.testFindMatchingRule(rules)).toBeUndefined();
		});

		it("skips manual-only rules", () => {
			const rules = [makeRule({ isManualOnly: true })];
			expect(seeker.testFindMatchingRule(rules)).toBeUndefined();
		});
	});

	describe("hashString", () => {
		it("produces a 64-character lowercase hex string", async () => {
			const h = await seeker.testHashString("hello");
			expect(h).toHaveLength(64);
			expect(h).toMatch(/^[0-9a-f]{64}$/);
		});

		it("is deterministic for the same input", async () => {
			const a = await seeker.testHashString("same");
			const b = await seeker.testHashString("same");
			expect(a).toBe(b);
		});
	});

	describe("generateIdempotencyKey", () => {
		it("hashes client id, ruleType, and sorted operation ids", async () => {
			const context = minimalContext({
				client: { id: "c-99" },
			});
			const result = minimalResult({
				matchedOperations: [
					makeOperation({ id: "op-3" }),
					makeOperation({ id: "op-1" }),
				],
			});
			const expectedData = "c-99:operation_amount_uma:op-1:op-3";
			const key = await seeker.generateIdempotencyKey(context, result);
			const direct = await seeker.testHashString(expectedData);
			expect(key).toBe(direct);
			expect(key).toHaveLength(64);
		});
	});
});

describe("ConcreteUniversalSeeker (UniversalAlertSeeker helpers)", () => {
	const seeker = new ConcreteUniversalSeeker();

	describe("getAlertCodeForActivity", () => {
		it("returns alert code for VEH", () => {
			expect(seeker.getAlertCodeForActivity("VEH")).toBe("100");
		});

		it("returns null for an activity not mapped to the pattern", () => {
			expect(seeker.getAlertCodeForActivity("NOT_A_VA")).toBeNull();
		});
	});

	describe("appliesTo", () => {
		it("is true for VEH when operation_amount_uma applies", () => {
			expect(seeker.appliesTo("VEH")).toBe(true);
		});

		it("is false when the pattern does not map the activity", () => {
			expect(seeker.appliesTo("NOT_A_VA")).toBe(false);
		});
	});

	describe("getNoticeThresholdUma", () => {
		it("returns configured notice UMA for VEH (6420)", () => {
			expect(seeker.getNoticeThresholdUma("VEH")).toBe(6420);
		});

		it("returns fallback 6420 for unknown activity codes", () => {
			expect(seeker.getNoticeThresholdUma("UNKNOWN")).toBe(6420);
		});
	});

	describe("getActivityNoticeThresholdMxn", () => {
		it("multiplies notice UMA by daily value for numeric thresholds", () => {
			expect(seeker.getActivityNoticeThresholdMxn("VEH", 113.14)).toBe(
				6420 * 113.14,
			);
		});

		it("returns 0 when notice threshold is ALWAYS (SPR)", () => {
			expect(seeker.getActivityNoticeThresholdMxn("SPR", 117.31)).toBe(0);
		});
	});

	describe("calculateActivityUmaThreshold", () => {
		it("uses umaValue.dailyValue when present", () => {
			const uma = makeUmaValue(200);
			expect(seeker.testCalculateActivityUmaThreshold("VEH", uma)).toBe(
				6420 * 200,
			);
		});

		it("uses DEFAULT_UMA_DAILY_VALUE when umaValue is null", () => {
			expect(seeker.testCalculateActivityUmaThreshold("VEH", null)).toBe(
				6420 * DEFAULT_UMA_DAILY_VALUE,
			);
		});

		it("returns 0 for ALWAYS notice threshold (SPR)", () => {
			expect(seeker.testCalculateActivityUmaThreshold("SPR", null)).toBe(0);
			expect(
				seeker.testCalculateActivityUmaThreshold("SPR", makeUmaValue(99)),
			).toBe(0);
		});
	});

	describe("generateIdempotencyKey", () => {
		it("produces 64-char hex and embeds activityCode in the preimage", async () => {
			const ops = [makeOperation({ id: "z2" }), makeOperation({ id: "z1" })];
			const ctxA = minimalContext({
				activityCode: "VEH",
				client: { id: "cli-1" },
			});
			const ctxB = minimalContext({
				activityCode: "INM",
				client: { id: "cli-1" },
			});
			const result = minimalResult({ matchedOperations: ops });

			const keyA = await seeker.generateIdempotencyKey(ctxA, result);
			const keyB = await seeker.generateIdempotencyKey(ctxB, result);

			expect(keyA).toHaveLength(64);
			expect(keyA).toMatch(/^[0-9a-f]{64}$/);
			expect(keyB).toMatch(/^[0-9a-f]{64}$/);
			expect(keyA).not.toBe(keyB);

			const expectedA = "VEH:cli-1:operation_amount_uma:z1,z2";
			expect(await seeker.testHashString(expectedA)).toBe(keyA);
		});
	});
});
