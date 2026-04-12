import { describe, it, expect } from "vitest";
import {
	UniversalOperationAmountUmaSeeker,
	UniversalAggregateAmountUmaSeeker,
	UniversalFrequentOperationsSeeker,
	UniversalForeignTransferPaymentSeeker,
	UniversalForeignCurrencyCashSeeker,
	UniversalVirtualCurrencyPaymentSeeker,
	UniversalCashHighValueSeeker,
	UniversalThirdPartyPayerSeeker,
	UniversalQuickRefundPatternSeeker,
	UniversalMinorClientSeeker,
	UniversalMultipleCardsRequestsSeeker,
	UniversalAddressChangesSeeker,
	UniversalSplitPaymentSeeker,
	UniversalQuickFundMovementSeeker,
	UniversalProfileMismatchSeeker,
	UniversalStructuringDetectionSeeker,
	UniversalSharedAddressAnalysisSeeker,
	UniversalPriceAnomalySeeker,
} from "./index";
import type {
	AlertContext,
	AlertOperation,
	UniversalAlertRuleType,
} from "../types";
import type { AlertRuleEntity } from "../../../alert/types";

const UMA_DAILY = 117.31;
/** VEH notice threshold in MXN with default UMA */
const VEH_NOTICE_MXN = 6420 * UMA_DAILY;

function daysAgoIso(days: number): string {
	const d = new Date();
	d.setDate(d.getDate() - days);
	d.setUTCHours(12, 0, 0, 0);
	return d.toISOString();
}

function ruleEntity(
	ruleType: UniversalAlertRuleType,
	activityCode: string,
): AlertRuleEntity {
	return {
		id: `rule-${ruleType}`,
		name: "test",
		active: true,
		severity: "HIGH",
		ruleType,
		isManualOnly: false,
		activityCode,
		createdAt: "2026-01-01T00:00:00Z",
		updatedAt: "2026-01-01T00:00:00Z",
	};
}

function makeContext(overrides: Partial<AlertContext> = {}): AlertContext {
	const activityCode = overrides.activityCode ?? "VEH";
	const base: AlertContext = {
		client: { id: "c1", rfc: "ABC1234567890", name: "Test Client" },
		operations: [],
		umaValue: {
			id: "uma-1",
			dailyValue: UMA_DAILY,
			active: true,
			effectiveDate: "2026-01-01",
			createdAt: "2026-01-01",
			updatedAt: "2026-01-01",
		},
		alertRules: [ruleEntity("operation_amount_uma", activityCode)],
		activityCode,
		evaluationTimestamp: new Date().toISOString(),
	};
	return { ...base, ...overrides };
}

function makeOp(overrides: Partial<AlertOperation> = {}): AlertOperation {
	return {
		id: `op-${Math.random().toString(36).slice(2, 8)}`,
		clientId: "c1",
		amount: 100_000,
		currency: "MXN",
		createdAt: new Date().toISOString(),
		...overrides,
	};
}

describe("UniversalOperationAmountUmaSeeker", () => {
	const seeker = new UniversalOperationAmountUmaSeeker();

	it("triggers when operation amount meets VEH notice threshold in MXN", async () => {
		const op = makeOp({
			amount: VEH_NOTICE_MXN,
			createdAt: daysAgoIso(1),
			operationDate: daysAgoIso(1),
		});
		const ctx = makeContext({
			operations: [op],
			triggerOperation: op,
			alertRules: [ruleEntity("operation_amount_uma", "VEH")],
		});
		const result = await seeker.evaluate(ctx);
		expect(result).not.toBeNull();
		expect(result?.triggered).toBe(true);
	});

	it("does not trigger when amount is below threshold", async () => {
		const op = makeOp({
			amount: VEH_NOTICE_MXN - 1,
			createdAt: daysAgoIso(1),
			operationDate: daysAgoIso(1),
		});
		const ctx = makeContext({
			operations: [op],
			triggerOperation: op,
			alertRules: [ruleEntity("operation_amount_uma", "VEH")],
		});
		const result = await seeker.evaluate(ctx);
		expect(result).toBeNull();
	});
});

describe("UniversalAggregateAmountUmaSeeker", () => {
	const seeker = new UniversalAggregateAmountUmaSeeker();

	it("triggers when 2+ operations in 180-day window sum to at least threshold", async () => {
		const half = Math.ceil(VEH_NOTICE_MXN / 2);
		const op1 = makeOp({
			amount: half,
			createdAt: daysAgoIso(10),
			operationDate: daysAgoIso(10),
		});
		const op2 = makeOp({
			amount: half,
			createdAt: daysAgoIso(5),
			operationDate: daysAgoIso(5),
		});
		const ctx = makeContext({
			operations: [op1, op2],
			alertRules: [ruleEntity("aggregate_amount_uma", "VEH")],
		});
		const result = await seeker.evaluate(ctx);
		expect(result).not.toBeNull();
		expect(result?.triggered).toBe(true);
	});

	it("does not trigger with fewer than 2 operations in window", async () => {
		const op = makeOp({
			amount: VEH_NOTICE_MXN,
			createdAt: daysAgoIso(5),
			operationDate: daysAgoIso(5),
		});
		const ctx = makeContext({
			operations: [op],
			alertRules: [ruleEntity("aggregate_amount_uma", "VEH")],
		});
		expect(await seeker.evaluate(ctx)).toBeNull();
	});

	it("does not trigger when sum is below threshold", async () => {
		const op1 = makeOp({
			amount: 50_000,
			createdAt: daysAgoIso(8),
			operationDate: daysAgoIso(8),
		});
		const op2 = makeOp({
			amount: 50_000,
			createdAt: daysAgoIso(3),
			operationDate: daysAgoIso(3),
		});
		const ctx = makeContext({
			operations: [op1, op2],
			alertRules: [ruleEntity("aggregate_amount_uma", "VEH")],
		});
		expect(await seeker.evaluate(ctx)).toBeNull();
	});
});

describe("UniversalFrequentOperationsSeeker", () => {
	const seeker = new UniversalFrequentOperationsSeeker();

	it("triggers with 3+ operations in 30-day window for VEH", async () => {
		const ops = [1, 2, 3].map((i) =>
			makeOp({
				id: `fo-veh-${i}`,
				amount: 10_000,
				createdAt: daysAgoIso(i),
				operationDate: daysAgoIso(i),
			}),
		);
		const ctx = makeContext({
			activityCode: "VEH",
			operations: ops,
			alertRules: [ruleEntity("frequent_operations", "VEH")],
		});
		const result = await seeker.evaluate(ctx);
		expect(result).not.toBeNull();
		expect(result?.triggered).toBe(true);
	});

	it("returns null for TSC (pattern not applicable)", async () => {
		const ops = [1, 2, 3].map((i) =>
			makeOp({
				id: `fo-tsc-${i}`,
				amount: 10_000,
				createdAt: daysAgoIso(i),
				operationDate: daysAgoIso(i),
			}),
		);
		const ctx = makeContext({
			activityCode: "TSC",
			operations: ops,
			alertRules: [ruleEntity("frequent_operations", "TSC")],
		});
		expect(await seeker.evaluate(ctx)).toBeNull();
	});

	it("does not trigger with fewer than 3 operations in window", async () => {
		const ops = [1, 2].map((i) =>
			makeOp({
				amount: 10_000,
				createdAt: daysAgoIso(i),
				operationDate: daysAgoIso(i),
			}),
		);
		const ctx = makeContext({
			activityCode: "VEH",
			operations: ops,
			alertRules: [ruleEntity("frequent_operations", "VEH")],
		});
		expect(await seeker.evaluate(ctx)).toBeNull();
	});
});

describe("UniversalForeignTransferPaymentSeeker", () => {
	const seeker = new UniversalForeignTransferPaymentSeeker();

	it("triggers on foreign transfer (countryCode not MX/MEX)", async () => {
		const op = makeOp({
			paymentMethods: [
				{
					id: "pm1",
					method: "TRANSFER",
					amount: 100_000,
					countryCode: "US",
				},
			] as unknown as NonNullable<AlertOperation["paymentMethods"]>,
		});
		const ctx = makeContext({
			operations: [op],
			triggerOperation: op,
			alertRules: [ruleEntity("foreign_transfer_payment", "VEH")],
		});
		const result = await seeker.evaluate(ctx);
		expect(result).not.toBeNull();
		expect(result?.triggered).toBe(true);
	});

	it("does not trigger without foreign transfer", async () => {
		const op = makeOp({
			paymentMethods: [
				{ id: "pm1", method: "TRANSFER", amount: 100_000, countryCode: "MX" },
			] as unknown as NonNullable<AlertOperation["paymentMethods"]>,
		});
		const ctx = makeContext({
			operations: [op],
			triggerOperation: op,
			alertRules: [ruleEntity("foreign_transfer_payment", "VEH")],
		});
		expect(await seeker.evaluate(ctx)).toBeNull();
	});
});

describe("UniversalForeignCurrencyCashSeeker", () => {
	const seeker = new UniversalForeignCurrencyCashSeeker();

	it("triggers on non-MXN cash payment", async () => {
		const op = makeOp({
			currency: "USD",
			paymentMethods: [{ id: "pm1", method: "CASH", amount: 5000 }],
		});
		const ctx = makeContext({
			operations: [op],
			triggerOperation: op,
			alertRules: [ruleEntity("foreign_currency_cash", "VEH")],
		});
		const result = await seeker.evaluate(ctx);
		expect(result).not.toBeNull();
		expect(result?.triggered).toBe(true);
	});

	it("does not trigger for MXN operations", async () => {
		const op = makeOp({
			currency: "MXN",
			paymentMethods: [{ id: "pm1", method: "CASH", amount: 5000 }],
		});
		const ctx = makeContext({
			operations: [op],
			triggerOperation: op,
			alertRules: [ruleEntity("foreign_currency_cash", "VEH")],
		});
		expect(await seeker.evaluate(ctx)).toBeNull();
	});
});

describe("UniversalVirtualCurrencyPaymentSeeker", () => {
	const seeker = new UniversalVirtualCurrencyPaymentSeeker();

	it("triggers when payment method indicates crypto", async () => {
		const op = makeOp({
			paymentMethods: [{ id: "pm1", method: "BITCOIN", amount: 100_000 }],
		});
		const ctx = makeContext({
			operations: [op],
			triggerOperation: op,
			alertRules: [ruleEntity("virtual_currency_payment", "VEH")],
		});
		const result = await seeker.evaluate(ctx);
		expect(result).not.toBeNull();
		expect(result?.triggered).toBe(true);
	});

	it("does not trigger with conventional payment methods", async () => {
		const op = makeOp({
			paymentMethods: [{ id: "pm1", method: "CARD", amount: 100_000 }],
		});
		const ctx = makeContext({
			operations: [op],
			triggerOperation: op,
			alertRules: [ruleEntity("virtual_currency_payment", "VEH")],
		});
		expect(await seeker.evaluate(ctx)).toBeNull();
	});

	it("returns null for AVI (not applicable)", async () => {
		const op = makeOp({
			paymentMethods: [{ id: "pm1", method: "BITCOIN", amount: 100_000 }],
		});
		const ctx = makeContext({
			activityCode: "AVI",
			operations: [op],
			triggerOperation: op,
			alertRules: [ruleEntity("virtual_currency_payment", "AVI")],
		});
		expect(await seeker.evaluate(ctx)).toBeNull();
	});
});

describe("UniversalCashHighValueSeeker", () => {
	const seeker = new UniversalCashHighValueSeeker();

	it("triggers when a cash payment exceeds the activity UMA threshold", async () => {
		const op = makeOp({
			paymentMethods: [
				{ id: "pm1", method: "CASH", amount: VEH_NOTICE_MXN + 1 },
			],
		});
		const ctx = makeContext({
			operations: [op],
			triggerOperation: op,
			alertRules: [ruleEntity("cash_high_value", "VEH")],
		});
		const result = await seeker.evaluate(ctx);
		expect(result).not.toBeNull();
		expect(result?.triggered).toBe(true);
	});

	it("does not trigger when cash is at or below threshold", async () => {
		const op = makeOp({
			paymentMethods: [{ id: "pm1", method: "CASH", amount: VEH_NOTICE_MXN }],
		});
		const ctx = makeContext({
			operations: [op],
			triggerOperation: op,
			alertRules: [ruleEntity("cash_high_value", "VEH")],
		});
		expect(await seeker.evaluate(ctx)).toBeNull();
	});
});

describe("UniversalThirdPartyPayerSeeker", () => {
	const seeker = new UniversalThirdPartyPayerSeeker();

	it("triggers when payerId differs from client id", async () => {
		const op = makeOp({ payerId: "other-payer" });
		const ctx = makeContext({
			operations: [op],
			triggerOperation: op,
			alertRules: [ruleEntity("third_party_payer", "VEH")],
		});
		const result = await seeker.evaluate(ctx);
		expect(result).not.toBeNull();
		expect(result?.triggered).toBe(true);
	});

	it("does not trigger when payer matches client", async () => {
		const op = makeOp({ payerId: "c1" });
		const ctx = makeContext({
			operations: [op],
			triggerOperation: op,
			alertRules: [ruleEntity("third_party_payer", "VEH")],
		});
		expect(await seeker.evaluate(ctx)).toBeNull();
	});
});

describe("UniversalQuickRefundPatternSeeker", () => {
	const seeker = new UniversalQuickRefundPatternSeeker();

	it("triggers when refund follows original within 14 days with similar amount", async () => {
		const original = makeOp({
			id: "orig-1",
			amount: 100_000,
			createdAt: daysAgoIso(10),
			operationDate: daysAgoIso(10),
		});
		const refund = makeOp({
			id: "ref-1",
			amount: 95_000,
			operationType: "REFUND",
			createdAt: daysAgoIso(5),
			operationDate: daysAgoIso(5),
		});
		const ctx = makeContext({
			activityCode: "VEH",
			operations: [original, refund],
			alertRules: [ruleEntity("quick_refund_pattern", "VEH")],
		});
		const result = await seeker.evaluate(ctx);
		expect(result).not.toBeNull();
		expect(result?.triggered).toBe(true);
	});

	it("does not trigger without a refund-type operation", async () => {
		const op1 = makeOp({
			amount: 100_000,
			createdAt: daysAgoIso(10),
			operationDate: daysAgoIso(10),
		});
		const op2 = makeOp({
			amount: 95_000,
			createdAt: daysAgoIso(5),
			operationDate: daysAgoIso(5),
		});
		const ctx = makeContext({
			activityCode: "VEH",
			operations: [op1, op2],
			alertRules: [ruleEntity("quick_refund_pattern", "VEH")],
		});
		expect(await seeker.evaluate(ctx)).toBeNull();
	});
});

describe("UniversalMinorClientSeeker", () => {
	const seeker = new UniversalMinorClientSeeker();

	it("triggers for client under 18 on VEH with DOB and an operation", async () => {
		const op = makeOp({
			createdAt: daysAgoIso(1),
			operationDate: daysAgoIso(1),
		});
		const ctx = makeContext({
			client: {
				id: "c1",
				rfc: "ABC1234567890",
				name: "Minor",
				dateOfBirth: "2015-06-01",
			},
			operations: [op],
			triggerOperation: op,
			alertRules: [ruleEntity("minor_client", "VEH")],
		});
		const result = await seeker.evaluate(ctx);
		expect(result).not.toBeNull();
		expect(result?.triggered).toBe(true);
	});

	it("does not trigger when client is an adult", async () => {
		const op = makeOp();
		const ctx = makeContext({
			client: {
				id: "c1",
				rfc: "ABC1234567890",
				name: "Adult",
				dateOfBirth: "1990-01-01",
			},
			operations: [op],
			triggerOperation: op,
			alertRules: [ruleEntity("minor_client", "VEH")],
		});
		expect(await seeker.evaluate(ctx)).toBeNull();
	});

	it("does not trigger without date of birth", async () => {
		const op = makeOp();
		const ctx = makeContext({
			operations: [op],
			triggerOperation: op,
			alertRules: [ruleEntity("minor_client", "VEH")],
		});
		expect(await seeker.evaluate(ctx)).toBeNull();
	});
});

describe("UniversalMultipleCardsRequestsSeeker", () => {
	const seeker = new UniversalMultipleCardsRequestsSeeker();

	it("triggers with 3+ operations in 30 days for TSC", async () => {
		const ops = [1, 2, 3].map((i) =>
			makeOp({
				amount: 5000,
				createdAt: daysAgoIso(i),
				operationDate: daysAgoIso(i),
			}),
		);
		const ctx = makeContext({
			activityCode: "TSC",
			operations: ops,
			alertRules: [ruleEntity("multiple_cards_requests", "TSC")],
		});
		const result = await seeker.evaluate(ctx);
		expect(result).not.toBeNull();
		expect(result?.triggered).toBe(true);
	});

	it("returns null for VEH (not applicable)", async () => {
		const ops = [1, 2, 3].map((i) =>
			makeOp({
				amount: 5000,
				createdAt: daysAgoIso(i),
				operationDate: daysAgoIso(i),
			}),
		);
		const ctx = makeContext({
			activityCode: "VEH",
			operations: ops,
			alertRules: [ruleEntity("multiple_cards_requests", "VEH")],
		});
		expect(await seeker.evaluate(ctx)).toBeNull();
	});
});

describe("UniversalAddressChangesSeeker", () => {
	const seeker = new UniversalAddressChangesSeeker();

	it("triggers when combined change counts reach 2+ on MPC", async () => {
		const op = makeOp();
		const ctx = makeContext({
			activityCode: "MPC",
			client: {
				id: "c1",
				rfc: "ABC1234567890",
				name: "Entity",
				addressChangeCount: 1,
				nameChangeCount: 1,
				legalRepChangeCount: 0,
			},
			operations: [op],
			triggerOperation: op,
			alertRules: [ruleEntity("address_changes", "MPC")],
		});
		const result = await seeker.evaluate(ctx);
		expect(result).not.toBeNull();
		expect(result?.triggered).toBe(true);
	});

	it("returns null for VEH (not applicable)", async () => {
		const op = makeOp();
		const ctx = makeContext({
			activityCode: "VEH",
			client: {
				id: "c1",
				rfc: "ABC1234567890",
				name: "Entity",
				addressChangeCount: 5,
			},
			operations: [op],
			triggerOperation: op,
			alertRules: [ruleEntity("address_changes", "VEH")],
		});
		expect(await seeker.evaluate(ctx)).toBeNull();
	});
});

describe("UniversalSplitPaymentSeeker", () => {
	const seeker = new UniversalSplitPaymentSeeker();

	it("triggers when an operation has 3+ payment methods on JYS", async () => {
		const op = makeOp({
			paymentMethods: [
				{ id: "p1", method: "CARD", amount: 30_000 },
				{ id: "p2", method: "TRANSFER", amount: 30_000 },
				{ id: "p3", method: "CASH", amount: 30_000 },
			],
		});
		const ctx = makeContext({
			activityCode: "JYS",
			operations: [op],
			triggerOperation: op,
			alertRules: [ruleEntity("split_payment", "JYS")],
		});
		const result = await seeker.evaluate(ctx);
		expect(result).not.toBeNull();
		expect(result?.triggered).toBe(true);
	});

	it("does not trigger with fewer than 3 payment methods", async () => {
		const op = makeOp({
			paymentMethods: [
				{ id: "p1", method: "CARD", amount: 50_000 },
				{ id: "p2", method: "CASH", amount: 50_000 },
			],
		});
		const ctx = makeContext({
			activityCode: "JYS",
			operations: [op],
			triggerOperation: op,
			alertRules: [ruleEntity("split_payment", "JYS")],
		});
		expect(await seeker.evaluate(ctx)).toBeNull();
	});
});

describe("UniversalQuickFundMovementSeeker", () => {
	const seeker = new UniversalQuickFundMovementSeeker();

	it("triggers on deposit then withdrawal within 48 hours for AVI", async () => {
		const t0 = new Date();
		const deposit = makeOp({
			id: "dep-1",
			operationType: "DEPOSIT",
			createdAt: t0.toISOString(),
			operationDate: t0.toISOString(),
		});
		const t1 = new Date(t0.getTime() + 24 * 60 * 60 * 1000);
		const withdrawal = makeOp({
			id: "wd-1",
			operationType: "WITHDRAWAL",
			createdAt: t1.toISOString(),
			operationDate: t1.toISOString(),
		});
		const ctx = makeContext({
			activityCode: "AVI",
			operations: [deposit, withdrawal],
			alertRules: [ruleEntity("quick_fund_movement", "AVI")],
		});
		const result = await seeker.evaluate(ctx);
		expect(result).not.toBeNull();
		expect(result?.triggered).toBe(true);
	});

	it("returns null for VEH (not applicable)", async () => {
		const t0 = new Date();
		const deposit = makeOp({
			operationType: "DEPOSIT",
			createdAt: t0.toISOString(),
			operationDate: t0.toISOString(),
		});
		const t1 = new Date(t0.getTime() + 12 * 60 * 60 * 1000);
		const withdrawal = makeOp({
			operationType: "WITHDRAWAL",
			createdAt: t1.toISOString(),
			operationDate: t1.toISOString(),
		});
		const ctx = makeContext({
			activityCode: "VEH",
			operations: [deposit, withdrawal],
			alertRules: [ruleEntity("quick_fund_movement", "VEH")],
		});
		expect(await seeker.evaluate(ctx)).toBeNull();
	});
});

describe("UniversalProfileMismatchSeeker", () => {
	const seeker = new UniversalProfileMismatchSeeker();

	it("triggers when economic activity code is missing", async () => {
		const op = makeOp();
		const ctx = makeContext({
			operations: [op],
			triggerOperation: op,
			client: { id: "c1", rfc: "ABC1234567890", name: "Test Client" },
			alertRules: [ruleEntity("profile_mismatch", "VEH")],
		});
		const result = await seeker.evaluate(ctx);
		expect(result).not.toBeNull();
		expect(result?.triggered).toBe(true);
		expect(result?.alertMetadata.indicators).toContain(
			"missing_economic_activity",
		);
	});

	it("does not trigger when profile is complete and no anomaly flags", async () => {
		const op = makeOp({ amount: 50_000 });
		const ctx = makeContext({
			operations: [op],
			triggerOperation: op,
			client: {
				id: "c1",
				rfc: "ABC1234567890",
				name: "Test Client",
				economicActivityCode: "620000",
			},
			alertRules: [ruleEntity("profile_mismatch", "VEH")],
		});
		expect(await seeker.evaluate(ctx)).toBeNull();
	});
});

describe("UniversalStructuringDetectionSeeker", () => {
	const seeker = new UniversalStructuringDetectionSeeker();

	it("triggers when 3+ ops in 180d are in [0.85*threshold, threshold) for JYS", async () => {
		const jysThreshold = 645 * UMA_DAILY;
		const lower = jysThreshold * 0.85;
		const mid = lower + (jysThreshold - lower) / 2;
		const ops = [1, 2, 3].map((i) =>
			makeOp({
				id: `str-${i}`,
				amount: Math.floor(mid + i * 100),
				createdAt: daysAgoIso(i * 5),
				operationDate: daysAgoIso(i * 5),
			}),
		);
		const ctx = makeContext({
			activityCode: "JYS",
			operations: ops,
			alertRules: [ruleEntity("structuring_detection", "JYS")],
		});
		const result = await seeker.evaluate(ctx);
		expect(result).not.toBeNull();
		expect(result?.triggered).toBe(true);
	});

	it("returns null for SPR (ALWAYS threshold — no structuring band)", async () => {
		const ctx = makeContext({
			activityCode: "SPR",
			operations: [],
			alertRules: [ruleEntity("structuring_detection", "SPR")],
		});
		expect(await seeker.evaluate(ctx)).toBeNull();
	});

	it("does not trigger with fewer than 3 suspicious operations", async () => {
		const jysThreshold = 645 * UMA_DAILY;
		const lower = jysThreshold * 0.85;
		const mid = lower + (jysThreshold - lower) / 2;
		const ops = [1, 2].map((i) =>
			makeOp({
				amount: Math.floor(mid + i * 100),
				createdAt: daysAgoIso(i * 5),
				operationDate: daysAgoIso(i * 5),
			}),
		);
		const ctx = makeContext({
			activityCode: "JYS",
			operations: ops,
			alertRules: [ruleEntity("structuring_detection", "JYS")],
		});
		expect(await seeker.evaluate(ctx)).toBeNull();
	});
});

describe("UniversalSharedAddressAnalysisSeeker", () => {
	const seeker = new UniversalSharedAddressAnalysisSeeker();

	it("triggers when sharedAddressClientCount is at least 2 on VEH", async () => {
		const op = makeOp();
		const ctx = makeContext({
			client: {
				id: "c1",
				rfc: "ABC1234567890",
				name: "Test Client",
				sharedAddressClientCount: 2,
			},
			operations: [op],
			triggerOperation: op,
			alertRules: [ruleEntity("shared_address_analysis", "VEH")],
		});
		const result = await seeker.evaluate(ctx);
		expect(result).not.toBeNull();
		expect(result?.triggered).toBe(true);
	});

	it("does not trigger when share counts are below 2", async () => {
		const op = makeOp();
		const ctx = makeContext({
			client: {
				id: "c1",
				rfc: "ABC1234567890",
				name: "Test Client",
				sharedAddressClientCount: 1,
				sharedRepresentativeCount: 0,
			},
			operations: [op],
			triggerOperation: op,
			alertRules: [ruleEntity("shared_address_analysis", "VEH")],
		});
		expect(await seeker.evaluate(ctx)).toBeNull();
	});
});

describe("UniversalPriceAnomalySeeker", () => {
	const seeker = new UniversalPriceAnomalySeeker();

	it("triggers when z-score of trigger vs history is at least 2.5", async () => {
		const historical = [10_000, 11_000, 9000, 10_500].map((amt, i) =>
			makeOp({
				id: `hist-${i}`,
				amount: amt,
				createdAt: daysAgoIso(20 - i),
				operationDate: daysAgoIso(20 - i),
			}),
		);
		const trigger = makeOp({
			id: "trigger-price",
			amount: 80_000,
			createdAt: daysAgoIso(1),
			operationDate: daysAgoIso(1),
		});
		const ctx = makeContext({
			operations: [...historical, trigger],
			triggerOperation: trigger,
			alertRules: [ruleEntity("price_anomaly", "VEH")],
		});
		const result = await seeker.evaluate(ctx);
		expect(result).not.toBeNull();
		expect(result?.triggered).toBe(true);
	});

	it("returns null with insufficient operation history", async () => {
		const ops = [10_000, 11_000, 9000].map((amt, i) =>
			makeOp({
				id: `p-${i}`,
				amount: amt,
				createdAt: daysAgoIso(5 - i),
				operationDate: daysAgoIso(5 - i),
			}),
		);
		const trigger = ops[2]!;
		const ctx = makeContext({
			operations: ops,
			triggerOperation: trigger,
			alertRules: [ruleEntity("price_anomaly", "VEH")],
		});
		expect(await seeker.evaluate(ctx)).toBeNull();
	});
});
