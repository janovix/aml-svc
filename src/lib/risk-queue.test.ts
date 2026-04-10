import { describe, it, expect, beforeEach, vi } from "vitest";
import {
	RiskQueueService,
	createRiskQueueService,
	type RiskJob,
} from "./risk-queue";

vi.mock("@sentry/cloudflare", () => ({ captureException: vi.fn() }));

describe("RiskQueueService", () => {
	let mockQueue: Queue<RiskJob> | undefined;
	let service: RiskQueueService;

	beforeEach(() => {
		mockQueue = {
			send: vi.fn().mockResolvedValue(undefined),
		} as unknown as Queue<RiskJob>;
		service = new RiskQueueService(mockQueue);
	});

	describe("isAvailable", () => {
		it("returns true when queue is provided", () => {
			expect(service.isAvailable()).toBe(true);
		});

		it("returns false when queue is undefined", () => {
			const without = new RiskQueueService(undefined);
			expect(without.isAvailable()).toBe(false);
		});
	});

	describe("queueClientAssess", () => {
		it("sends client.assess job with expected shape", async () => {
			await service.queueClientAssess(
				"organization-123",
				"client-123",
				"manual",
			);

			expect(mockQueue?.send).toHaveBeenCalledTimes(1);
			const job = vi.mocked(mockQueue!.send).mock.calls[0][0];
			expect(job).toMatchObject({
				type: "client.assess",
				organizationId: "organization-123",
				clientId: "client-123",
				triggerReason: "manual",
			});
			expect(job.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
		});

		it("does not throw when queue is undefined", async () => {
			const without = new RiskQueueService(undefined);
			await expect(
				without.queueClientAssess("organization-123", "client-123", "x"),
			).resolves.toBeUndefined();
		});
	});

	describe("queueClientReassess", () => {
		it("sends client.reassess job with expected shape", async () => {
			await service.queueClientReassess("org-1", "client-1", "rule");

			const job = vi.mocked(mockQueue!.send).mock.calls[0][0];
			expect(job).toMatchObject({
				type: "client.reassess",
				organizationId: "org-1",
				clientId: "client-1",
				triggerReason: "rule",
			});
			expect(job.timestamp).toBeDefined();
		});
	});

	describe("queueClientBatchAssess", () => {
		it("sends client.batch_assess job without clientId", async () => {
			await service.queueClientBatchAssess("org-b", "nightly");

			const job = vi.mocked(mockQueue!.send).mock.calls[0][0];
			expect(job).toMatchObject({
				type: "client.batch_assess",
				organizationId: "org-b",
				triggerReason: "nightly",
			});
			expect(job.clientId).toBeUndefined();
			expect(job.timestamp).toBeDefined();
		});
	});

	describe("queueOrgAssess", () => {
		it("sends org.assess job with expected shape", async () => {
			await service.queueOrgAssess("org-o", "settings");

			const job = vi.mocked(mockQueue!.send).mock.calls[0][0];
			expect(job).toMatchObject({
				type: "org.assess",
				organizationId: "org-o",
				triggerReason: "settings",
			});
			expect(job.timestamp).toBeDefined();
		});
	});

	describe("queueScreeningRiskUpdate", () => {
		it("sends screening.risk_update job with expected shape", async () => {
			await service.queueScreeningRiskUpdate("org-s", "client-s", "hit");

			const job = vi.mocked(mockQueue!.send).mock.calls[0][0];
			expect(job).toMatchObject({
				type: "screening.risk_update",
				organizationId: "org-s",
				clientId: "client-s",
				triggerReason: "hit",
			});
			expect(job.timestamp).toBeDefined();
		});
	});

	describe("queueOperationRiskCheck", () => {
		it("sends operation.risk_check job including operationId", async () => {
			await service.queueOperationRiskCheck(
				"org-op",
				"client-op",
				"op-99",
				"created",
			);

			const job = vi.mocked(mockQueue!.send).mock.calls[0][0];
			expect(job).toMatchObject({
				type: "operation.risk_check",
				organizationId: "org-op",
				clientId: "client-op",
				operationId: "op-99",
				triggerReason: "created",
			});
			expect(job.timestamp).toBeDefined();
		});
	});

	describe("error handling", () => {
		it("does not throw when queue.send rejects", async () => {
			const errorQueue = {
				send: vi.fn().mockRejectedValue(new Error("Queue error")),
			} as unknown as Queue<RiskJob>;
			const svc = new RiskQueueService(errorQueue);

			await expect(
				svc.queueClientAssess("org-e", "client-e", "t"),
			).resolves.toBeUndefined();
		});
	});
});

describe("createRiskQueueService", () => {
	it("creates instance with queue", () => {
		const q = { send: vi.fn() } as unknown as Queue<RiskJob>;
		const svc = createRiskQueueService(q);
		expect(svc).toBeInstanceOf(RiskQueueService);
		expect(svc.isAvailable()).toBe(true);
	});

	it("creates instance without queue", () => {
		const svc = createRiskQueueService(undefined);
		expect(svc).toBeInstanceOf(RiskQueueService);
		expect(svc.isAvailable()).toBe(false);
	});
});
