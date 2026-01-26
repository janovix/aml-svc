import { describe, it, expect, beforeEach, vi } from "vitest";
import {
	PEPQueueService,
	createPEPQueueService,
	type PEPJob,
} from "./pep-queue";

describe("PEPQueueService", () => {
	let service: PEPQueueService;
	let mockQueue: Queue<PEPJob>;

	beforeEach(() => {
		mockQueue = {
			send: vi.fn(),
		} as unknown as Queue<PEPJob>;

		service = new PEPQueueService(mockQueue);
	});

	describe("isAvailable", () => {
		it("should return true when queue is defined", () => {
			expect(service.isAvailable()).toBe(true);
		});

		it("should return false when queue is undefined", () => {
			const serviceWithoutQueue = new PEPQueueService(undefined);
			expect(serviceWithoutQueue.isAvailable()).toBe(false);
		});
	});

	describe("queueClientPEPCheck", () => {
		it("should queue a client PEP check with all options", async () => {
			await service.queueClientPEPCheck("CLT123456789", "John Doe Smith", {
				organizationId: "org-123",
				triggeredBy: "create",
			});

			expect(mockQueue.send).toHaveBeenCalledWith(
				expect.objectContaining({
					type: "client.check",
					entityId: "CLT123456789",
					entityType: "client",
					name: "John Doe Smith",
					organizationId: "org-123",
					triggeredBy: "create",
				}),
			);
			expect(mockQueue.send).toHaveBeenCalledTimes(1);
		});

		it("should queue a client PEP check with minimal options", async () => {
			await service.queueClientPEPCheck("CLT123456789", "Jane Doe");

			expect(mockQueue.send).toHaveBeenCalledWith(
				expect.objectContaining({
					type: "client.check",
					entityId: "CLT123456789",
					entityType: "client",
					name: "Jane Doe",
					triggeredBy: "manual",
				}),
			);
		});

		it("should include timestamp in the job", async () => {
			const beforeTime = new Date().toISOString();
			await service.queueClientPEPCheck("CLT123456789", "John Doe");
			const afterTime = new Date().toISOString();

			const call = vi.mocked(mockQueue.send).mock.calls[0][0];
			expect(call.timestamp).toBeDefined();
			expect(call.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
			expect(call.timestamp >= beforeTime).toBe(true);
			expect(call.timestamp <= afterTime).toBe(true);
		});

		it("should not throw when queue is undefined", async () => {
			const serviceWithoutQueue = new PEPQueueService(undefined);

			await expect(
				serviceWithoutQueue.queueClientPEPCheck("CLT123456789", "John Doe"),
			).resolves.not.toThrow();

			expect(mockQueue.send).not.toHaveBeenCalled();
		});

		it("should not throw when queue.send fails", async () => {
			vi.mocked(mockQueue.send).mockRejectedValue(new Error("Queue error"));

			await expect(
				service.queueClientPEPCheck("CLT123456789", "John Doe"),
			).resolves.not.toThrow();
		});
	});

	describe("queueUBOPEPCheck", () => {
		it("should queue a UBO PEP check with all options", async () => {
			await service.queueUBOPEPCheck("UBO123456789", "Jane Smith Doe", {
				organizationId: "org-456",
				triggeredBy: "update",
			});

			expect(mockQueue.send).toHaveBeenCalledWith(
				expect.objectContaining({
					type: "ubo.check",
					entityId: "UBO123456789",
					entityType: "ubo",
					name: "Jane Smith Doe",
					organizationId: "org-456",
					triggeredBy: "update",
				}),
			);
			expect(mockQueue.send).toHaveBeenCalledTimes(1);
		});

		it("should queue a UBO PEP check with minimal options", async () => {
			await service.queueUBOPEPCheck("UBO123456789", "Jane Smith");

			expect(mockQueue.send).toHaveBeenCalledWith(
				expect.objectContaining({
					type: "ubo.check",
					entityId: "UBO123456789",
					entityType: "ubo",
					name: "Jane Smith",
					triggeredBy: "manual",
				}),
			);
		});

		it("should include timestamp in the job", async () => {
			const beforeTime = new Date().toISOString();
			await service.queueUBOPEPCheck("UBO123456789", "Jane Smith");
			const afterTime = new Date().toISOString();

			const call = vi.mocked(mockQueue.send).mock.calls[0][0];
			expect(call.timestamp).toBeDefined();
			expect(call.timestamp >= beforeTime).toBe(true);
			expect(call.timestamp <= afterTime).toBe(true);
		});

		it("should not throw when queue is undefined", async () => {
			const serviceWithoutQueue = new PEPQueueService(undefined);

			await expect(
				serviceWithoutQueue.queueUBOPEPCheck("UBO123456789", "Jane Smith"),
			).resolves.not.toThrow();

			expect(mockQueue.send).not.toHaveBeenCalled();
		});

		it("should not throw when queue.send fails", async () => {
			vi.mocked(mockQueue.send).mockRejectedValue(new Error("Queue error"));

			await expect(
				service.queueUBOPEPCheck("UBO123456789", "Jane Smith"),
			).resolves.not.toThrow();
		});
	});

	describe("queueBatchRefresh", () => {
		it("should queue a batch refresh job", async () => {
			await service.queueBatchRefresh();

			expect(mockQueue.send).toHaveBeenCalledWith(
				expect.objectContaining({
					type: "batch.refresh",
					entityId: "batch",
					entityType: "client",
					name: "batch-refresh",
					triggeredBy: "cron",
				}),
			);
			expect(mockQueue.send).toHaveBeenCalledTimes(1);
		});

		it("should include timestamp in the job", async () => {
			const beforeTime = new Date().toISOString();
			await service.queueBatchRefresh();
			const afterTime = new Date().toISOString();

			const call = vi.mocked(mockQueue.send).mock.calls[0][0];
			expect(call.timestamp).toBeDefined();
			expect(call.timestamp >= beforeTime).toBe(true);
			expect(call.timestamp <= afterTime).toBe(true);
		});

		it("should not throw when queue is undefined", async () => {
			const serviceWithoutQueue = new PEPQueueService(undefined);

			await expect(
				serviceWithoutQueue.queueBatchRefresh(),
			).resolves.not.toThrow();

			expect(mockQueue.send).not.toHaveBeenCalled();
		});

		it("should not throw when queue.send fails", async () => {
			vi.mocked(mockQueue.send).mockRejectedValue(new Error("Queue error"));

			await expect(service.queueBatchRefresh()).resolves.not.toThrow();
		});
	});

	describe("createPEPQueueService", () => {
		it("should create a service with queue", () => {
			const service = createPEPQueueService(mockQueue);

			expect(service).toBeInstanceOf(PEPQueueService);
			expect(service.isAvailable()).toBe(true);
		});

		it("should create a service without queue", () => {
			const service = createPEPQueueService(undefined);

			expect(service).toBeInstanceOf(PEPQueueService);
			expect(service.isAvailable()).toBe(false);
		});
	});
});
