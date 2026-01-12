import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { SyntheticDataGenerator } from "../src/lib/synthetic-data-generator";
import type { PrismaClient } from "@prisma/client";

describe("SyntheticDataGenerator", () => {
	let mockPrisma: PrismaClient;
	const organizationId = "org-123";
	const originalRandom = Math.random;

	beforeEach(() => {
		mockPrisma = {
			client: {
				create: vi.fn() as any,
				findMany: vi.fn(),
				findUnique: vi.fn(),
			},
			transaction: {
				create: vi.fn(),
			},
			clientDocument: {
				create: vi.fn(),
			},
			clientAddress: {
				create: vi.fn(),
			},
		} as unknown as PrismaClient;
	});

	afterEach(() => {
		// Restore Math.random in case it was mocked
		Math.random = originalRandom;
	});

	describe("generate", () => {
		it("should generate clients when requested", async () => {
			vi.mocked(mockPrisma.client.create).mockResolvedValue({
				id: "CLIENT_123",
				rfc: "ABCD123456EF7",
				organizationId,
				personType: "PHYSICAL",
				firstName: "Juan",
				lastName: "Pérez",
				createdAt: new Date(),
				updatedAt: new Date(),
			} as Awaited<ReturnType<typeof mockPrisma.client.create>>);

			const generator = new SyntheticDataGenerator(mockPrisma, organizationId);
			const result = await generator.generate({
				clients: { count: 2 },
			});

			expect(result.clients.created).toBe(2);
			expect(result.clients.rfcList).toHaveLength(2);
			expect(mockPrisma.client.create).toHaveBeenCalledTimes(2);
		});

		it("should generate transactions when requested", async () => {
			vi.mocked(mockPrisma.client.findMany).mockResolvedValue([
				{ id: "CLIENT_1", rfc: "RFC1" },
				{ id: "CLIENT_2", rfc: "RFC2" },
			] as any);

			vi.mocked(mockPrisma.transaction.create).mockResolvedValue({
				id: "TRANSACTION_123",
				clientId: "CLIENT_1",
				createdAt: new Date(),
				updatedAt: new Date(),
			} as any);

			const generator = new SyntheticDataGenerator(mockPrisma, organizationId);
			const result = await generator.generate({
				transactions: { count: 3 },
			});

			expect(result.transactions.created).toBe(3);
			expect(result.transactions.transactionIds).toHaveLength(3);
			expect(mockPrisma.transaction.create).toHaveBeenCalledTimes(3);
		});

		it("should generate clients and transactions together", async () => {
			vi.mocked(mockPrisma.client.create).mockResolvedValue({
				id: "CLIENT_123",
				rfc: "ABCD123456EF7",
				organizationId,
				personType: "PHYSICAL",
				createdAt: new Date(),
				updatedAt: new Date(),
			} as any);

			vi.mocked(mockPrisma.client.findMany).mockResolvedValue([
				{ id: "CLIENT_123", rfc: "ABCD123456EF7" },
			] as any);

			vi.mocked(mockPrisma.transaction.create).mockResolvedValue({
				id: "TRANSACTION_123",
				clientId: "CLIENT_123",
				createdAt: new Date(),
				updatedAt: new Date(),
			} as any);

			const generator = new SyntheticDataGenerator(mockPrisma, organizationId);
			const result = await generator.generate({
				clients: { count: 1 },
				transactions: { count: 2 },
			});

			expect(result.clients.created).toBe(1);
			expect(result.transactions.created).toBe(2);
		});

		it("should generate documents when includeDocuments is true", async () => {
			// Mock multiple clients to increase chance of physical client
			vi.mocked(mockPrisma.client.create).mockResolvedValue({
				id: "CLIENT_123",
				rfc: "ABCD123456EF7",
				organizationId,
				personType: "PHYSICAL",
				firstName: "Juan",
				createdAt: new Date(),
				updatedAt: new Date(),
			} as any);

			vi.mocked(mockPrisma.clientDocument.create).mockResolvedValue({
				id: "DOC_123",
				clientId: "CLIENT_123",
				createdAt: new Date(),
				updatedAt: new Date(),
			} as any);

			const generator = new SyntheticDataGenerator(mockPrisma, organizationId);
			// Generate multiple clients to ensure at least one is physical (70% chance each)
			await generator.generate({
				clients: { count: 5, includeDocuments: true },
			});

			// Documents should be created for at least one physical client
			// Since we're generating 5 clients with 70% chance each, we should have at least one physical
			expect(mockPrisma.clientDocument.create).toHaveBeenCalled();
		});

		it("should generate addresses when includeAddresses is true", async () => {
			vi.mocked(mockPrisma.client.create).mockResolvedValue({
				id: "CLIENT_123",
				rfc: "ABCD123456EF7",
				organizationId,
				personType: "PHYSICAL",
				createdAt: new Date(),
				updatedAt: new Date(),
			} as any);

			vi.mocked(mockPrisma.clientAddress.create).mockResolvedValue({
				id: "ADDR_123",
				clientId: "CLIENT_123",
				createdAt: new Date(),
				updatedAt: new Date(),
			} as any);

			const generator = new SyntheticDataGenerator(mockPrisma, organizationId);
			await generator.generate({
				clients: { count: 1, includeAddresses: true },
			});

			expect(mockPrisma.clientAddress.create).toHaveBeenCalled();
		});

		it("should handle RFC collisions gracefully", async () => {
			vi.mocked(mockPrisma.client.create)
				.mockRejectedValueOnce(new Error("UNIQUE constraint failed"))
				.mockResolvedValueOnce({
					id: "CLIENT_123",
					rfc: "ABCD123456EF7",
					organizationId,
					personType: "PHYSICAL",
					createdAt: new Date(),
					updatedAt: new Date(),
				} as any);

			const generator = new SyntheticDataGenerator(mockPrisma, organizationId);
			const result = await generator.generate({
				clients: { count: 2 },
			});

			// Should skip the duplicate and continue
			expect(result.clients.created).toBeGreaterThanOrEqual(1);
		});

		it("should throw error when transaction generation fails without clients", async () => {
			// Mock ensureClientsForTransactions to return empty array
			vi.mocked(mockPrisma.client.findMany).mockResolvedValue([]);
			// Mock generateClients to return empty rfcList (all clients fail)
			vi.mocked(mockPrisma.client.create).mockRejectedValue(
				new Error("All clients failed"),
			);

			const generator = new SyntheticDataGenerator(mockPrisma, organizationId);

			await expect(
				generator.generate({
					transactions: { count: 1 },
				}),
			).rejects.toThrow();
		});

		it("should distribute transactions across clients when perClient is specified", async () => {
			vi.mocked(mockPrisma.client.findMany).mockResolvedValue([
				{ id: "CLIENT_1", rfc: "RFC1" },
				{ id: "CLIENT_2", rfc: "RFC2" },
			] as any);

			vi.mocked(mockPrisma.transaction.create).mockResolvedValue({
				id: "TRANSACTION_123",
				clientId: "CLIENT_1",
				createdAt: new Date(),
				updatedAt: new Date(),
			} as any);

			const generator = new SyntheticDataGenerator(mockPrisma, organizationId);
			const result = await generator.generate({
				transactions: { count: 4, perClient: 2 },
			});

			expect(result.transactions.created).toBe(4);
			expect(mockPrisma.transaction.create).toHaveBeenCalledTimes(4);
		});

		it("should generate mix of physical and moral clients", async () => {
			// Mock Math.random to ensure we get a mix of both types
			// First 7 calls return > 0.3 (physical), next 3 return < 0.3 (moral)
			let randomCallCount = 0;
			const originalRandom = Math.random;
			Math.random = vi.fn(() => {
				randomCallCount++;
				// Return values that will create 7 physical and 3 moral clients
				// For physical: Math.random() > 0.3, so return 0.5
				// For moral: Math.random() <= 0.3, so return 0.2
				if (randomCallCount <= 7) {
					return 0.5; // Will create physical
				}
				return 0.2; // Will create moral
			}) as any;

			let callCount = 0;
			const mockCreateFn = vi.fn().mockImplementation(async () => {
				callCount++;
				return {
					id: `CLIENT_${callCount}`,
					rfc: `RFC${callCount}`,
					organizationId,
					personType: callCount <= 7 ? "PHYSICAL" : "MORAL",
					createdAt: new Date(),
					updatedAt: new Date(),
				} as any;
			});
			(mockPrisma.client as any).create = mockCreateFn;

			const generator = new SyntheticDataGenerator(mockPrisma, organizationId);
			const result = await generator.generate({
				clients: { count: 10 },
			});

			expect(result.clients.created).toBe(10);
			// Verify both types were created
			const createCalls = mockCreateFn.mock.calls;
			const moralCalls = createCalls.filter(
				(call) => call[0].data.personType === "MORAL",
			);
			const physicalCalls = createCalls.filter(
				(call) => call[0].data.personType === "PHYSICAL",
			);

			expect(moralCalls.length).toBeGreaterThan(0);
			expect(physicalCalls.length).toBeGreaterThan(0);

			// Restore Math.random
			Math.random = originalRandom;
			expect(physicalCalls.length).toBeGreaterThan(0);
		});

		it("should handle transaction creation errors gracefully", async () => {
			vi.mocked(mockPrisma.client.findMany).mockResolvedValue([
				{ id: "CLIENT_1", rfc: "RFC1" },
			] as any);

			vi.mocked(mockPrisma.transaction.create)
				.mockRejectedValueOnce(new Error("Transaction error"))
				.mockResolvedValueOnce({
					id: "TRANSACTION_123",
					clientId: "CLIENT_1",
					createdAt: new Date(),
					updatedAt: new Date(),
				} as any);

			const generator = new SyntheticDataGenerator(mockPrisma, organizationId);
			const result = await generator.generate({
				transactions: { count: 2 },
			});

			// Should continue after error
			expect(result.transactions.created).toBeGreaterThanOrEqual(1);
		});
	});
});
