import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
	Client,
	EvaluationResult,
	Operation,
	UmaValueEntity,
} from "../types";
import { RuleEvaluator } from "./rule-evaluator";

const NOW = new Date("2026-04-09T12:00:00.000Z");
const H = 60 * 60 * 1000;
const D = 24 * H;
const M = 60 * 1000;

function makeOp(overrides: Partial<Operation> = {}): Operation {
	return {
		id: "op-1",
		clientId: "c1",
		amount: 1000,
		currency: "MXN",
		createdAt: new Date().toISOString(),
		...overrides,
	};
}

function makeClient(overrides: Partial<Client> = {}): Client {
	return {
		id: "c1",
		...overrides,
	};
}

function makeUma(): UmaValueEntity {
	return {
		id: "uma-1",
		dailyValue: 117.31,
		active: true,
		effectiveDate: "2026-01-01",
		createdAt: "2026-01-01",
		updatedAt: "2026-01-01",
	};
}

function isoMsAgo(ms: number): string {
	return new Date(NOW.getTime() - ms).toISOString();
}

describe("RuleEvaluator", () => {
	let evaluator: RuleEvaluator;

	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(NOW);
		evaluator = new RuleEvaluator();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe("operation_amount", () => {
		it("triggers when an operation is at or above threshold within 24h", () => {
			const res: EvaluationResult = evaluator.evaluate(
				{ type: "operation_amount", threshold: 500, timeWindow: "24h" },
				makeClient(),
				[
					makeOp({
						id: "a",
						amount: 800,
						createdAt: isoMsAgo(2 * H),
					}),
				],
				null,
			);
			expect(res.triggered).toBe(true);
			expect(res.data.operationIds).toEqual(["a"]);
		});

		it("does not trigger when amount is below threshold within window", () => {
			const res = evaluator.evaluate(
				{ type: "operation_amount", threshold: 500, timeWindow: "24h" },
				makeClient(),
				[
					makeOp({
						amount: 400,
						createdAt: isoMsAgo(1 * H),
					}),
				],
				null,
			);
			expect(res.triggered).toBe(false);
		});

		it("does not trigger when currency does not match", () => {
			const res = evaluator.evaluate(
				{
					type: "operation_amount",
					threshold: 100,
					currency: "MXN",
					timeWindow: "24h",
				},
				makeClient(),
				[
					makeOp({
						amount: 5000,
						currency: "USD",
						createdAt: isoMsAgo(1 * H),
					}),
				],
				null,
			);
			expect(res.triggered).toBe(false);
		});
	});

	describe("operation_count", () => {
		it("triggers when operation count exceeds threshold in window", () => {
			const res = evaluator.evaluate(
				{ type: "operation_count", threshold: 2, timeWindow: "24h" },
				makeClient(),
				[
					makeOp({ id: "x", createdAt: isoMsAgo(1 * H) }),
					makeOp({ id: "y", createdAt: isoMsAgo(2 * H) }),
					makeOp({ id: "z", createdAt: isoMsAgo(3 * H) }),
				],
				null,
			);
			expect(res.triggered).toBe(true);
			expect(res.data.operationCount).toBe(3);
		});

		it("does not trigger when operation count is at or below threshold", () => {
			const res = evaluator.evaluate(
				{ type: "operation_count", threshold: 2, timeWindow: "24h" },
				makeClient(),
				[
					makeOp({ id: "x", createdAt: isoMsAgo(1 * H) }),
					makeOp({ id: "y", createdAt: isoMsAgo(2 * H) }),
				],
				null,
			);
			expect(res.triggered).toBe(false);
		});
	});

	describe("aggregate_amount", () => {
		it("triggers when sum of amounts in window meets threshold", () => {
			const res = evaluator.evaluate(
				{
					type: "aggregate_amount",
					threshold: 1000,
					timeWindow: "24h",
				},
				makeClient(),
				[
					makeOp({ id: "a", amount: 600, createdAt: isoMsAgo(2 * H) }),
					makeOp({ id: "b", amount: 600, createdAt: isoMsAgo(3 * H) }),
				],
				null,
			);
			expect(res.triggered).toBe(true);
			expect(res.data.totalAmount).toBe(1200);
		});

		it("does not trigger when sum is below threshold", () => {
			const res = evaluator.evaluate(
				{
					type: "aggregate_amount",
					threshold: 1000,
					timeWindow: "24h",
				},
				makeClient(),
				[
					makeOp({ amount: 400, createdAt: isoMsAgo(1 * H) }),
					makeOp({ amount: 400, createdAt: isoMsAgo(2 * H) }),
				],
				null,
			);
			expect(res.triggered).toBe(false);
		});

		it("applies operationType filter to the aggregate", () => {
			const base = {
				type: "aggregate_amount" as const,
				threshold: 5000,
				timeWindow: "24h" as const,
			};
			const ops = [
				makeOp({
					id: "d",
					amount: 6000,
					operationType: "DEPOSIT",
					createdAt: isoMsAgo(H),
				}),
				makeOp({
					id: "w",
					amount: 500,
					operationType: "WITHDRAW",
					createdAt: isoMsAgo(H),
				}),
			];

			const depositOnly = evaluator.evaluate(
				{ ...base, operationType: "DEPOSIT" },
				makeClient(),
				ops,
				null,
			);
			expect(depositOnly.triggered).toBe(true);
			expect(depositOnly.data.totalAmount).toBe(6000);

			const transferOnly = evaluator.evaluate(
				{ ...base, operationType: "TRANSFER" },
				makeClient(),
				ops,
				null,
			);
			expect(transferOnly.triggered).toBe(false);
		});
	});

	describe("custom", () => {
		it("AND triggers only when every condition passes", () => {
			const triggered = evaluator.evaluate(
				{
					type: "custom",
					logic: "AND",
					conditions: [
						{ field: "client.rfc", operator: "equals", value: "RFC1" },
						{ field: "operations.amount", operator: "count", threshold: 1 },
					],
				},
				makeClient({ rfc: "RFC1" }),
				[
					makeOp({ id: "o1", createdAt: isoMsAgo(H) }),
					makeOp({ id: "o2", createdAt: isoMsAgo(2 * H) }),
				],
				null,
			);
			expect(triggered.triggered).toBe(true);

			const notTriggered = evaluator.evaluate(
				{
					type: "custom",
					logic: "AND",
					conditions: [
						{ field: "client.rfc", operator: "equals", value: "RFC1" },
						{ field: "operations.amount", operator: "count", threshold: 1 },
					],
				},
				makeClient({ rfc: "OTHER" }),
				[
					makeOp({ id: "o1", createdAt: isoMsAgo(H) }),
					makeOp({ id: "o2", createdAt: isoMsAgo(2 * H) }),
				],
				null,
			);
			expect(notTriggered.triggered).toBe(false);
		});

		it("OR triggers when any condition passes", () => {
			const triggered = evaluator.evaluate(
				{
					type: "custom",
					logic: "OR",
					conditions: [
						{ field: "client.rfc", operator: "equals", value: "NOPE" },
						{ field: "operations.amount", operator: "count", threshold: 0 },
					],
				},
				makeClient({ rfc: "RFCX" }),
				[makeOp({ createdAt: isoMsAgo(H) })],
				null,
			);
			expect(triggered.triggered).toBe(true);

			const notTriggered = evaluator.evaluate(
				{
					type: "custom",
					logic: "OR",
					conditions: [
						{ field: "client.rfc", operator: "equals", value: "NOPE" },
						{ field: "operations.amount", operator: "count", threshold: 5 },
					],
				},
				makeClient(),
				[
					makeOp({ id: "a", createdAt: isoMsAgo(H) }),
					makeOp({ id: "b", createdAt: isoMsAgo(2 * H) }),
				],
				null,
			);
			expect(notTriggered.triggered).toBe(false);
		});

		it("does not trigger when conditions are missing or empty", () => {
			const noArray = evaluator.evaluate(
				{ type: "custom", logic: "AND" },
				makeClient(),
				[makeOp()],
				null,
			);
			expect(noArray.triggered).toBe(false);

			const empty = evaluator.evaluate(
				{ type: "custom", logic: "AND", conditions: [] },
				makeClient(),
				[makeOp()],
				null,
			);
			expect(empty.triggered).toBe(false);
		});
	});

	it("does not trigger for unknown rule type", () => {
		const res = evaluator.evaluate(
			{ type: "not_a_rule" } as never,
			makeClient(),
			[makeOp({ amount: 1e9 })],
			null,
		);
		expect(res.triggered).toBe(false);
		expect(res.data.operationIds).toEqual([]);
	});

	describe("calculateThreshold (via operation_amount)", () => {
		it("uses 6420 * dailyValue when threshold is 6420 and UMA is present", () => {
			const uma = makeUma();
			const scaled = 6420 * uma.dailyValue;
			const above = evaluator.evaluate(
				{ type: "operation_amount", threshold: 6420, timeWindow: "24h" },
				makeClient(),
				[
					makeOp({
						amount: scaled + 1,
						createdAt: isoMsAgo(H),
					}),
				],
				uma,
			);
			expect(above.triggered).toBe(true);

			const below = evaluator.evaluate(
				{ type: "operation_amount", threshold: 6420, timeWindow: "24h" },
				makeClient(),
				[
					makeOp({
						amount: scaled - 1,
						createdAt: isoMsAgo(H),
					}),
				],
				uma,
			);
			expect(below.triggered).toBe(false);
		});

		it("uses raw 6420 when threshold is 6420 and UMA is null", () => {
			const res = evaluator.evaluate(
				{ type: "operation_amount", threshold: 6420, timeWindow: "24h" },
				makeClient(),
				[
					makeOp({
						amount: 6420,
						createdAt: isoMsAgo(H),
					}),
				],
				null,
			);
			expect(res.triggered).toBe(true);

			const below = evaluator.evaluate(
				{ type: "operation_amount", threshold: 6420, timeWindow: "24h" },
				makeClient(),
				[
					makeOp({
						amount: 6419,
						createdAt: isoMsAgo(H),
					}),
				],
				null,
			);
			expect(below.triggered).toBe(false);
		});
	});

	describe("parseTimeWindow", () => {
		it("treats 24h, 7d, and 30m as valid windows", () => {
			const op24 = makeOp({
				amount: 10_000,
				createdAt: isoMsAgo(23 * H),
			});
			const r24 = evaluator.evaluate(
				{ type: "operation_amount", threshold: 100, timeWindow: "24h" },
				makeClient(),
				[op24],
				null,
			);
			expect(r24.triggered).toBe(true);

			const r7 = evaluator.evaluate(
				{
					type: "aggregate_amount",
					threshold: 500,
					timeWindow: "7d",
				},
				makeClient(),
				[
					makeOp({
						id: "old",
						amount: 10_000,
						createdAt: isoMsAgo(8 * D),
					}),
					makeOp({
						id: "new",
						amount: 600,
						createdAt: isoMsAgo(1 * D),
					}),
				],
				null,
			);
			expect(r7.triggered).toBe(true);
			expect(r7.data.operationIds).toContain("new");
			expect(r7.data.totalAmount).toBe(600);

			const r30m = evaluator.evaluate(
				{ type: "operation_count", threshold: 0, timeWindow: "30m" },
				makeClient(),
				[makeOp({ id: "in", createdAt: isoMsAgo(20 * M) })],
				null,
			);
			expect(r30m.triggered).toBe(true);

			const outside30m = evaluator.evaluate(
				{ type: "operation_count", threshold: 0, timeWindow: "30m" },
				makeClient(),
				[makeOp({ createdAt: isoMsAgo(45 * M) })],
				null,
			);
			expect(outside30m.triggered).toBe(false);
		});

		it("defaults invalid windows to 24h", () => {
			const inside = evaluator.evaluate(
				{
					type: "operation_amount",
					threshold: 100,
					timeWindow: "not-valid",
				},
				makeClient(),
				[
					makeOp({
						amount: 500,
						createdAt: isoMsAgo(23 * H),
					}),
				],
				null,
			);
			expect(inside.triggered).toBe(true);

			const outside = evaluator.evaluate(
				{
					type: "operation_amount",
					threshold: 100,
					timeWindow: "not-valid",
				},
				makeClient(),
				[
					makeOp({
						amount: 500,
						createdAt: isoMsAgo(25 * H),
					}),
				],
				null,
			);
			expect(outside.triggered).toBe(false);
		});
	});
});
