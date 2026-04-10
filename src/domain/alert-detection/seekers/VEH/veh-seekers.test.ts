import { describe, it, expect } from "vitest";
import type { AlertRuleEntity } from "../../../alert/types";
import { UMA_THRESHOLD } from "../constants";
import { OperationAmountUmaSeeker } from "./operation_amount_uma";
import { AggregateAmountUmaSeeker } from "./aggregate_amount_uma";
import { CashPaymentLimitSeeker } from "./cash_payment_limit";
import { CashFragmentationSeeker } from "./cash_fragmentation";
import { PayerBuyerMismatchSeeker } from "./payer_buyer_mismatch";
import { PepAboveThresholdSeeker } from "./pep_above_threshold";
import { PepOrHighRiskSeeker } from "./pep_or_high_risk";
import { FrequentOperationsSeeker } from "./frequent_operations";
import { NewClientHighValueSeeker } from "./new_client_high_value";
import { ThirdPartyAccountsSeeker } from "./third_party_accounts";
import type { AlertContext, AlertOperation } from "../types";

const UMA_DAILY_DEFAULT = 117.31;
const THRESHOLD_MXN = UMA_THRESHOLD * UMA_DAILY_DEFAULT;

function todayIso(): string {
	return new Date().toISOString();
}

function daysAgoIso(days: number): string {
	const d = new Date();
	d.setDate(d.getDate() - days);
	return d.toISOString();
}

function makeContext(overrides: Partial<AlertContext> = {}): AlertContext {
	const base: AlertContext = {
		client: {
			id: "c1",
			rfc: "ABC1234567890",
			name: "Test",
		},
		operations: [],
		umaValue: {
			id: "uma-1",
			dailyValue: UMA_DAILY_DEFAULT,
			active: true,
			effectiveDate: "2026-01-01",
			createdAt: "2026-01-01",
			updatedAt: "2026-01-01",
		},
		alertRules: [],
		activityCode: "VEH",
		evaluationTimestamp: new Date().toISOString(),
	};
	return {
		...base,
		...overrides,
		client: { ...base.client, ...overrides.client },
	};
}

function makeOp(overrides: Partial<AlertOperation> = {}): AlertOperation {
	return {
		id: `op-${Math.random().toString(36).slice(2, 10)}`,
		clientId: "c1",
		amount: 100_000,
		currency: "MXN",
		createdAt: new Date().toISOString(),
		...overrides,
	};
}

function makeRule(ruleType: string): AlertRuleEntity {
	return {
		id: `rule-${ruleType}`,
		name: ruleType,
		active: true,
		severity: "HIGH",
		ruleType,
		isManualOnly: false,
		activityCode: "VEH",
		createdAt: "2026-01-01T00:00:00.000Z",
		updatedAt: "2026-01-01T00:00:00.000Z",
	};
}

describe("OperationAmountUmaSeeker", () => {
	const seeker = new OperationAmountUmaSeeker();

	it("triggers when MXN operation meets or exceeds 6,420 UMA in MXN", async () => {
		const op = makeOp({
			amount: THRESHOLD_MXN + 10_000,
			createdAt: todayIso(),
		});
		const ctx = makeContext({
			operations: [op],
			triggerOperation: op,
			alertRules: [makeRule("operation_amount_uma")],
		});
		const result = await seeker.evaluate(ctx);
		expect(result).not.toBeNull();
		expect(result?.triggered).toBe(true);
		expect(result?.matchedOperations.map((o) => o.id)).toContain(op.id);
	});

	it("does not trigger below threshold", async () => {
		const op = makeOp({ amount: THRESHOLD_MXN - 1, createdAt: todayIso() });
		const ctx = makeContext({
			operations: [op],
			triggerOperation: op,
			alertRules: [makeRule("operation_amount_uma")],
		});
		expect(await seeker.evaluate(ctx)).toBeNull();
	});

	it("does not trigger for non-MXN", async () => {
		const op = makeOp({
			amount: THRESHOLD_MXN + 1,
			currency: "USD",
			createdAt: todayIso(),
		});
		const ctx = makeContext({
			operations: [op],
			triggerOperation: op,
			alertRules: [makeRule("operation_amount_uma")],
		});
		expect(await seeker.evaluate(ctx)).toBeNull();
	});
});

describe("AggregateAmountUmaSeeker", () => {
	const seeker = new AggregateAmountUmaSeeker();

	it("triggers when 2+ MXN operations in 180 days sum to at least threshold", async () => {
		const half = Math.ceil(THRESHOLD_MXN / 2);
		const op1 = makeOp({ amount: half, createdAt: todayIso() });
		const op2 = makeOp({ amount: half, createdAt: todayIso() });
		const ctx = makeContext({
			operations: [op1, op2],
			alertRules: [makeRule("aggregate_amount_uma")],
		});
		const result = await seeker.evaluate(ctx);
		expect(result).not.toBeNull();
		expect(result?.triggered).toBe(true);
	});

	it("does not trigger with fewer than 2 operations", async () => {
		const op = makeOp({ amount: THRESHOLD_MXN, createdAt: todayIso() });
		const ctx = makeContext({
			operations: [op],
			alertRules: [makeRule("aggregate_amount_uma")],
		});
		expect(await seeker.evaluate(ctx)).toBeNull();
	});

	it("does not trigger when sum is below threshold", async () => {
		const op1 = makeOp({ amount: 100_000, createdAt: todayIso() });
		const op2 = makeOp({ amount: 100_000, createdAt: todayIso() });
		const ctx = makeContext({
			operations: [op1, op2],
			alertRules: [makeRule("aggregate_amount_uma")],
		});
		expect(await seeker.evaluate(ctx)).toBeNull();
	});

	it("does not trigger when operations fall outside the aggregation window", async () => {
		const old = daysAgoIso(200);
		const op1 = makeOp({
			amount: THRESHOLD_MXN,
			createdAt: old,
			operationDate: old,
		});
		const op2 = makeOp({
			amount: THRESHOLD_MXN,
			createdAt: old,
			operationDate: old,
		});
		const ctx = makeContext({
			operations: [op1, op2],
			alertRules: [makeRule("aggregate_amount_uma")],
		});
		expect(await seeker.evaluate(ctx)).toBeNull();
	});
});

describe("CashPaymentLimitSeeker", () => {
	const seeker = new CashPaymentLimitSeeker();

	it("triggers when CASH payment exceeds UMA-based max", async () => {
		const op = makeOp({
			createdAt: todayIso(),
			paymentMethods: [
				{ id: "pm-1", method: "CASH", amount: THRESHOLD_MXN + 1 },
			],
		});
		const ctx = makeContext({
			operations: [op],
			triggerOperation: op,
			alertRules: [makeRule("cash_payment_limit")],
		});
		const result = await seeker.evaluate(ctx);
		expect(result).not.toBeNull();
		expect(result?.triggered).toBe(true);
	});

	it("triggers when EFECTIVO payment exceeds UMA-based max", async () => {
		const op = makeOp({
			createdAt: todayIso(),
			paymentMethods: [
				{ id: "pm-1", method: "EFECTIVO", amount: THRESHOLD_MXN + 1 },
			],
		});
		const ctx = makeContext({
			operations: [op],
			triggerOperation: op,
			alertRules: [makeRule("cash_payment_limit")],
		});
		const result = await seeker.evaluate(ctx);
		expect(result).not.toBeNull();
		expect(result?.triggered).toBe(true);
	});

	it("does not trigger when cash is at or below limit", async () => {
		const op = makeOp({
			createdAt: todayIso(),
			paymentMethods: [{ id: "pm-1", method: "CASH", amount: THRESHOLD_MXN }],
		});
		const ctx = makeContext({
			operations: [op],
			triggerOperation: op,
			alertRules: [makeRule("cash_payment_limit")],
		});
		expect(await seeker.evaluate(ctx)).toBeNull();
	});
});

describe("CashFragmentationSeeker", () => {
	const seeker = new CashFragmentationSeeker();

	it("triggers with 2+ cash payments in 30 days when fragmentation score reaches 2", async () => {
		const amt = 50_000;
		const op1 = makeOp({
			createdAt: todayIso(),
			paymentMethods: [{ id: "pm-1", method: "CASH", amount: amt }],
		});
		const op2 = makeOp({
			createdAt: todayIso(),
			paymentMethods: [{ id: "pm-1", method: "CASH", amount: amt }],
		});
		const ctx = makeContext({
			operations: [op1, op2],
			alertRules: [makeRule("cash_fragmentation")],
		});
		const result = await seeker.evaluate(ctx);
		expect(result).not.toBeNull();
		expect(result?.triggered).toBe(true);
	});

	it("triggers with 3+ cash payments in 30 days", async () => {
		const ops = [makeOp, makeOp, makeOp].map((fn) =>
			fn({
				createdAt: todayIso(),
				paymentMethods: [{ id: "pm-1", method: "CASH", amount: 40_000 }],
			}),
		);
		const ctx = makeContext({
			operations: ops,
			alertRules: [makeRule("cash_fragmentation")],
		});
		const result = await seeker.evaluate(ctx);
		expect(result).not.toBeNull();
		expect(result?.triggered).toBe(true);
	});

	it("does not trigger with fewer than 2 cash payments", async () => {
		const op = makeOp({
			createdAt: todayIso(),
			paymentMethods: [{ id: "pm-1", method: "CASH", amount: 50_000 }],
		});
		const ctx = makeContext({
			operations: [op],
			alertRules: [makeRule("cash_fragmentation")],
		});
		expect(await seeker.evaluate(ctx)).toBeNull();
	});
});

describe("PayerBuyerMismatchSeeker", () => {
	const seeker = new PayerBuyerMismatchSeeker();

	it("triggers when payerId differs from client id", async () => {
		const op = makeOp({ payerId: "other-payer", createdAt: todayIso() });
		const ctx = makeContext({
			operations: [op],
			triggerOperation: op,
			alertRules: [makeRule("payer_buyer_mismatch")],
		});
		const result = await seeker.evaluate(ctx);
		expect(result).not.toBeNull();
		expect(result?.triggered).toBe(true);
	});

	it("triggers when payment method accountHolderId differs from client id", async () => {
		const op = makeOp({
			createdAt: todayIso(),
			paymentMethods: [
				{
					id: "pm-1",
					method: "TRANSFER",
					amount: 10_000,
					accountHolderId: "other-holder",
				},
			],
		});
		const ctx = makeContext({
			operations: [op],
			triggerOperation: op,
			alertRules: [makeRule("payer_buyer_mismatch")],
		});
		const result = await seeker.evaluate(ctx);
		expect(result).not.toBeNull();
		expect(result?.triggered).toBe(true);
	});

	it("does not trigger when payer and account holders match client", async () => {
		const op = makeOp({
			payerId: "c1",
			createdAt: todayIso(),
			paymentMethods: [
				{
					id: "pm-1",
					method: "TRANSFER",
					amount: 10_000,
					accountHolderId: "c1",
				},
			],
		});
		const ctx = makeContext({
			operations: [op],
			triggerOperation: op,
			alertRules: [makeRule("payer_buyer_mismatch")],
		});
		expect(await seeker.evaluate(ctx)).toBeNull();
	});
});

describe("PepAboveThresholdSeeker", () => {
	const seeker = new PepAboveThresholdSeeker();

	it("triggers when client is PEP and MXN operation meets threshold", async () => {
		const op = makeOp({ amount: THRESHOLD_MXN, createdAt: todayIso() });
		const ctx = makeContext({
			client: { id: "c1", rfc: "X", name: "Pep", isPep: true },
			operations: [op],
			triggerOperation: op,
			alertRules: [makeRule("pep_above_threshold")],
		});
		const result = await seeker.evaluate(ctx);
		expect(result).not.toBeNull();
		expect(result?.triggered).toBe(true);
	});

	it("does not trigger when client is not PEP", async () => {
		const op = makeOp({ amount: THRESHOLD_MXN + 1, createdAt: todayIso() });
		const ctx = makeContext({
			client: { id: "c1", rfc: "X", name: "Norm", isPep: false },
			operations: [op],
			triggerOperation: op,
			alertRules: [makeRule("pep_above_threshold")],
		});
		expect(await seeker.evaluate(ctx)).toBeNull();
	});

	it("does not trigger when amount is below threshold", async () => {
		const op = makeOp({ amount: THRESHOLD_MXN - 1, createdAt: todayIso() });
		const ctx = makeContext({
			client: { id: "c1", rfc: "X", name: "Pep", isPep: true },
			operations: [op],
			triggerOperation: op,
			alertRules: [makeRule("pep_above_threshold")],
		});
		expect(await seeker.evaluate(ctx)).toBeNull();
	});
});

describe("PepOrHighRiskSeeker", () => {
	const seeker = new PepOrHighRiskSeeker();

	it("triggers for PEP client with at least one operation", async () => {
		const op = makeOp({ createdAt: todayIso() });
		const ctx = makeContext({
			client: { id: "c1", rfc: "X", name: "Pep", isPep: true },
			operations: [op],
			triggerOperation: op,
			alertRules: [makeRule("pep_or_high_risk")],
		});
		const result = await seeker.evaluate(ctx);
		expect(result).not.toBeNull();
		expect(result?.triggered).toBe(true);
	});

	it("triggers for HIGH risk client with at least one operation", async () => {
		const op = makeOp({ createdAt: todayIso() });
		const ctx = makeContext({
			client: { id: "c1", rfc: "X", name: "Hi", riskLevel: "HIGH" },
			operations: [op],
			triggerOperation: op,
			alertRules: [makeRule("pep_or_high_risk")],
		});
		const result = await seeker.evaluate(ctx);
		expect(result).not.toBeNull();
		expect(result?.triggered).toBe(true);
	});

	it("does not trigger for normal client", async () => {
		const op = makeOp({ createdAt: todayIso() });
		const ctx = makeContext({
			client: {
				id: "c1",
				rfc: "X",
				name: "Norm",
				isPep: false,
				riskLevel: "LOW",
			},
			operations: [op],
			triggerOperation: op,
			alertRules: [makeRule("pep_or_high_risk")],
		});
		expect(await seeker.evaluate(ctx)).toBeNull();
	});
});

describe("FrequentOperationsSeeker", () => {
	const seeker = new FrequentOperationsSeeker();

	it("triggers with 3+ operations in the 30-day window", async () => {
		const ops = [makeOp(), makeOp(), makeOp()].map((o) => ({
			...o,
			createdAt: todayIso(),
		}));
		const ctx = makeContext({
			operations: ops,
			alertRules: [makeRule("frequent_operations")],
		});
		const result = await seeker.evaluate(ctx);
		expect(result).not.toBeNull();
		expect(result?.triggered).toBe(true);
	});

	it("does not trigger with fewer than 3 operations in window", async () => {
		const ops = [makeOp(), makeOp()].map((o) => ({
			...o,
			createdAt: todayIso(),
		}));
		const ctx = makeContext({
			operations: ops,
			alertRules: [makeRule("frequent_operations")],
		});
		expect(await seeker.evaluate(ctx)).toBeNull();
	});

	it("does not count operations outside the 30-day window", async () => {
		const old = daysAgoIso(200);
		const ops = [
			makeOp({ createdAt: old, operationDate: old }),
			makeOp({ createdAt: old, operationDate: old }),
			makeOp({ createdAt: old, operationDate: old }),
		];
		const ctx = makeContext({
			operations: ops,
			alertRules: [makeRule("frequent_operations")],
		});
		expect(await seeker.evaluate(ctx)).toBeNull();
	});
});

describe("NewClientHighValueSeeker", () => {
	const seeker = new NewClientHighValueSeeker();
	const highValue = 2_000_000;

	it("triggers for new client (recent createdAt) and amount >= 2,000,000 MXN", async () => {
		const op = makeOp({ amount: highValue, createdAt: todayIso() });
		const ctx = makeContext({
			client: {
				id: "c1",
				rfc: "X",
				name: "New",
				createdAt: todayIso(),
			},
			operations: [op],
			triggerOperation: op,
			alertRules: [makeRule("new_client_high_value")],
		});
		const result = await seeker.evaluate(ctx);
		expect(result).not.toBeNull();
		expect(result?.triggered).toBe(true);
	});

	it("triggers when no prior operations exist (excluding same-day history rule)", async () => {
		const op = makeOp({ amount: highValue, createdAt: todayIso() });
		const ctx = makeContext({
			client: {
				id: "c1",
				rfc: "X",
				name: "New",
				createdAt: daysAgoIso(400),
			},
			operations: [op],
			triggerOperation: op,
			alertRules: [makeRule("new_client_high_value")],
		});
		const result = await seeker.evaluate(ctx);
		expect(result).not.toBeNull();
		expect(result?.triggered).toBe(true);
	});

	it("does not trigger for old client with historical operations", async () => {
		const past = daysAgoIso(200);
		const historical = makeOp({
			amount: 1,
			createdAt: past,
			operationDate: past,
		});
		const current = makeOp({ amount: highValue, createdAt: todayIso() });
		const ctx = makeContext({
			client: {
				id: "c1",
				rfc: "X",
				name: "Old",
				createdAt: daysAgoIso(400),
			},
			operations: [historical, current],
			triggerOperation: current,
			alertRules: [makeRule("new_client_high_value")],
		});
		expect(await seeker.evaluate(ctx)).toBeNull();
	});

	it("does not trigger below high-value threshold", async () => {
		const op = makeOp({ amount: highValue - 1, createdAt: todayIso() });
		const ctx = makeContext({
			client: {
				id: "c1",
				rfc: "X",
				name: "New",
				createdAt: todayIso(),
			},
			operations: [op],
			triggerOperation: op,
			alertRules: [makeRule("new_client_high_value")],
		});
		expect(await seeker.evaluate(ctx)).toBeNull();
	});
});

describe("ThirdPartyAccountsSeeker", () => {
	const seeker = new ThirdPartyAccountsSeeker();

	it("triggers when TRANSFER has accountHolderId different from client", async () => {
		const op = makeOp({
			createdAt: todayIso(),
			paymentMethods: [
				{
					id: "pm-1",
					method: "TRANSFER",
					amount: 500_000,
					accountHolderId: "third-party",
				},
			],
		});
		const ctx = makeContext({
			operations: [op],
			triggerOperation: op,
			alertRules: [makeRule("third_party_accounts")],
		});
		const result = await seeker.evaluate(ctx);
		expect(result).not.toBeNull();
		expect(result?.triggered).toBe(true);
	});

	it("triggers for WIRE with third-party account holder", async () => {
		const op = makeOp({
			createdAt: todayIso(),
			paymentMethods: [
				{
					id: "pm-1",
					method: "WIRE",
					amount: 100_000,
					accountHolderId: "tp",
				},
			],
		});
		const ctx = makeContext({
			operations: [op],
			triggerOperation: op,
			alertRules: [makeRule("third_party_accounts")],
		});
		const result = await seeker.evaluate(ctx);
		expect(result).not.toBeNull();
		expect(result?.triggered).toBe(true);
	});

	it("does not trigger when account holder matches client", async () => {
		const op = makeOp({
			createdAt: todayIso(),
			paymentMethods: [
				{
					id: "pm-1",
					method: "TRANSFER",
					amount: 500_000,
					accountHolderId: "c1",
				},
			],
		});
		const ctx = makeContext({
			operations: [op],
			triggerOperation: op,
			alertRules: [makeRule("third_party_accounts")],
		});
		expect(await seeker.evaluate(ctx)).toBeNull();
	});
});
