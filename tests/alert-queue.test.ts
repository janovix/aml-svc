import { describe, it, expect, beforeEach, vi } from "vitest";
import {
	AlertQueueService,
	createAlertQueueService,
	type AlertJob,
} from "../src/lib/alert-queue";

describe("AlertQueueService", () => {
	let mockQueue: Queue<AlertJob> | undefined;
	let service: AlertQueueService;

	beforeEach(() => {
		mockQueue = {
			send: vi.fn().mockResolvedValue(undefined),
		} as unknown as Queue<AlertJob>;
		service = new AlertQueueService(mockQueue);
	});

	describe("isAvailable", () => {
		it("should return true when queue is available", () => {
			expect(service.isAvailable()).toBe(true);
		});

		it("should return false when queue is undefined", () => {
			const serviceWithoutQueue = new AlertQueueService(undefined);
			expect(serviceWithoutQueue.isAvailable()).toBe(false);
		});
	});

	describe("queueClientCreated", () => {
		it("should send a client.created job to the queue", async () => {
			await service.queueClientCreated("client-123");

			expect(mockQueue?.send).toHaveBeenCalledTimes(1);
			const call = vi.mocked(mockQueue!.send).mock.calls[0][0];
			expect(call.type).toBe("client.created");
			expect(call.clientId).toBe("client-123");
			expect(call.transactionId).toBeUndefined();
			expect(call.timestamp).toBeDefined();
		});

		it("should not throw when queue is undefined", async () => {
			const serviceWithoutQueue = new AlertQueueService(undefined);
			await expect(
				serviceWithoutQueue.queueClientCreated("client-123"),
			).resolves.not.toThrow();
		});

		it("should handle queue errors gracefully", async () => {
			const errorQueue = {
				send: vi.fn().mockRejectedValue(new Error("Queue error")),
			} as unknown as Queue<AlertJob>;
			const serviceWithError = new AlertQueueService(errorQueue);

			await expect(
				serviceWithError.queueClientCreated("client-123"),
			).resolves.not.toThrow();
		});
	});

	describe("queueClientUpdated", () => {
		it("should send a client.updated job to the queue", async () => {
			await service.queueClientUpdated("client-456");

			expect(mockQueue?.send).toHaveBeenCalledTimes(1);
			const call = vi.mocked(mockQueue!.send).mock.calls[0][0];
			expect(call.type).toBe("client.updated");
			expect(call.clientId).toBe("client-456");
			expect(call.transactionId).toBeUndefined();
			expect(call.timestamp).toBeDefined();
		});

		it("should not throw when queue is undefined", async () => {
			const serviceWithoutQueue = new AlertQueueService(undefined);
			await expect(
				serviceWithoutQueue.queueClientUpdated("client-456"),
			).resolves.not.toThrow();
		});
	});

	describe("queueTransactionCreated", () => {
		it("should send a transaction.created job to the queue", async () => {
			await service.queueTransactionCreated("client-789", "transaction-123");

			expect(mockQueue?.send).toHaveBeenCalledTimes(1);
			const call = vi.mocked(mockQueue!.send).mock.calls[0][0];
			expect(call.type).toBe("transaction.created");
			expect(call.clientId).toBe("client-789");
			expect(call.transactionId).toBe("transaction-123");
			expect(call.timestamp).toBeDefined();
		});

		it("should not throw when queue is undefined", async () => {
			const serviceWithoutQueue = new AlertQueueService(undefined);
			await expect(
				serviceWithoutQueue.queueTransactionCreated(
					"client-789",
					"transaction-123",
				),
			).resolves.not.toThrow();
		});
	});
});

describe("createAlertQueueService", () => {
	it("should create an AlertQueueService instance", () => {
		const mockQueue = {
			send: vi.fn(),
		} as unknown as Queue<AlertJob>;

		const service = createAlertQueueService(mockQueue);
		expect(service).toBeInstanceOf(AlertQueueService);
		expect(service.isAvailable()).toBe(true);
	});

	it("should create service with undefined queue", () => {
		const service = createAlertQueueService(undefined);
		expect(service).toBeInstanceOf(AlertQueueService);
		expect(service.isAvailable()).toBe(false);
	});
});
