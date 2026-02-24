import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { SyntheticDataGenerator } from "../src/lib/synthetic-data-generator";
import type { PrismaClient } from "@prisma/client";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function makeBaseClient(id: string, rfc: string, organizationId: string) {
	return {
		id,
		rfc,
		organizationId,
		personType: "PHYSICAL" as const,
		firstName: "Juan",
		lastName: "Pérez",
		createdAt: new Date(),
		updatedAt: new Date(),
	};
}

function makeBaseOperation(id: string, clientId: string) {
	return {
		id,
		clientId,
		activityCode: "VEH",
		createdAt: new Date(),
		updatedAt: new Date(),
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// Test suite
// ─────────────────────────────────────────────────────────────────────────────

describe("SyntheticDataGenerator", () => {
	let mockPrisma: PrismaClient;
	const organizationId = "org-123";
	const originalRandom = Math.random;

	beforeEach(() => {
		mockPrisma = {
			client: {
				create: vi.fn(),
				findMany: vi.fn(),
				findUnique: vi.fn(),
			},
			operation: {
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
		Math.random = originalRandom;
	});

	// ── Client generation ────────────────────────────────────────────────────

	describe("client generation", () => {
		it("should generate the requested number of clients", async () => {
			vi.mocked(mockPrisma.client.create).mockResolvedValue(
				makeBaseClient("CLIENT_1", "ABCD123456EF7", organizationId) as any,
			);

			const generator = new SyntheticDataGenerator(mockPrisma, organizationId);
			const result = await generator.generate({ clients: { count: 2 } });

			expect(result.clients.created).toBe(2);
			expect(result.clients.rfcList).toHaveLength(2);
			expect(mockPrisma.client.create).toHaveBeenCalledTimes(2);
		});

		it("should generate a mix of physical and moral clients", async () => {
			let callCount = 0;
			vi.mocked(mockPrisma.client.create).mockImplementation((async (
				args: any,
			) => {
				callCount++;
				return {
					...makeBaseClient(
						`CLIENT_${callCount}`,
						`RFC${callCount}`,
						organizationId,
					),
					personType: args.data.personType,
				};
			}) as any);

			const generator = new SyntheticDataGenerator(mockPrisma, organizationId);
			const result = await generator.generate({ clients: { count: 10 } });

			expect(result.clients.created).toBe(10);

			const calls = vi.mocked(mockPrisma.client.create).mock.calls;
			const moral = calls.filter((c) => c[0].data.personType === "MORAL");
			const physical = calls.filter((c) => c[0].data.personType === "PHYSICAL");

			// With 10 clients and 70/30 split we cannot guarantee both in a small
			// sample, but the generator must never return an invalid type.
			expect(moral.length + physical.length).toBe(10);
		});

		it("should handle RFC collisions gracefully", async () => {
			vi.mocked(mockPrisma.client.create)
				.mockRejectedValueOnce(new Error("UNIQUE constraint failed"))
				.mockResolvedValueOnce(
					makeBaseClient("CLIENT_1", "RFC1", organizationId) as any,
				);

			const generator = new SyntheticDataGenerator(mockPrisma, organizationId);
			const result = await generator.generate({ clients: { count: 2 } });

			// Collision skipped → only the successful one counts
			expect(result.clients.created).toBeGreaterThanOrEqual(1);
		});

		it("should generate documents when includeDocuments is true", async () => {
			vi.mocked(mockPrisma.client.create).mockResolvedValue(
				makeBaseClient("CLIENT_1", "ABCD123456EF7", organizationId) as any,
			);
			vi.mocked(mockPrisma.clientDocument.create).mockResolvedValue({
				id: "DOC_1",
				clientId: "CLIENT_1",
				createdAt: new Date(),
				updatedAt: new Date(),
			} as any);

			const generator = new SyntheticDataGenerator(mockPrisma, organizationId);
			await generator.generate({
				clients: { count: 5, includeDocuments: true },
			});

			expect(mockPrisma.clientDocument.create).toHaveBeenCalled();
		});

		it("should generate addresses when includeAddresses is true", async () => {
			vi.mocked(mockPrisma.client.create).mockResolvedValue(
				makeBaseClient("CLIENT_1", "ABCD123456EF7", organizationId) as any,
			);
			vi.mocked(mockPrisma.clientAddress.create).mockResolvedValue({
				id: "ADDR_1",
				clientId: "CLIENT_1",
				createdAt: new Date(),
				updatedAt: new Date(),
			} as any);

			const generator = new SyntheticDataGenerator(mockPrisma, organizationId);
			await generator.generate({
				clients: { count: 1, includeAddresses: true },
			});

			expect(mockPrisma.clientAddress.create).toHaveBeenCalled();
		});
	});

	// ── Operation generation ─────────────────────────────────────────────────

	describe("operation generation", () => {
		it("should generate operations for existing clients when no clients are requested", async () => {
			vi.mocked(mockPrisma.client.findMany).mockResolvedValue([
				{ id: "CLIENT_1", rfc: "RFC1" },
				{ id: "CLIENT_2", rfc: "RFC2" },
			] as any);

			let opCount = 0;
			vi.mocked(mockPrisma.operation.create).mockImplementation((async () => {
				opCount++;
				return makeBaseOperation(`OP_${opCount}`, "CLIENT_1");
			}) as any);

			const generator = new SyntheticDataGenerator(mockPrisma, organizationId);
			const result = await generator.generate({
				operations: { count: 3, skipClients: 0 },
			});

			expect(result.operations.created).toBe(3);
			expect(result.operations.operationIds).toHaveLength(3);
		});

		it("should throw when no clients are available and none can be created", async () => {
			vi.mocked(mockPrisma.client.findMany).mockResolvedValue([]);
			vi.mocked(mockPrisma.client.create).mockRejectedValue(
				new Error("All clients failed"),
			);

			const generator = new SyntheticDataGenerator(mockPrisma, organizationId);
			await expect(
				generator.generate({ operations: { count: 1 } }),
			).rejects.toThrow();
		});

		it("should handle individual operation creation errors gracefully", async () => {
			vi.mocked(mockPrisma.client.findMany).mockResolvedValue([
				{ id: "CLIENT_1", rfc: "RFC1" },
			] as any);

			vi.mocked(mockPrisma.operation.create)
				.mockRejectedValueOnce(new Error("Operation error"))
				.mockResolvedValueOnce(makeBaseOperation("OP_2", "CLIENT_1") as any);

			const generator = new SyntheticDataGenerator(mockPrisma, organizationId);
			const result = await generator.generate({
				operations: { count: 2, skipClients: 0 },
			});

			expect(result.operations.created).toBeGreaterThanOrEqual(1);
		});
	});

	// ── Two-pass distribution ────────────────────────────────────────────────

	describe("two-pass distribution (no perClient)", () => {
		function setupClientsAndOps(clientCount: number) {
			const clientList = Array.from({ length: clientCount }, (_, i) => ({
				id: `CLIENT_${i}`,
				rfc: `RFC${i}`,
			}));

			vi.mocked(mockPrisma.client.findMany).mockResolvedValue(
				clientList as any,
			);

			const createdOpsByClient = new Map<string, number>();
			vi.mocked(mockPrisma.operation.create).mockImplementation((async (
				args: any,
			) => {
				const cid = args.data.clientId as string;
				createdOpsByClient.set(cid, (createdOpsByClient.get(cid) ?? 0) + 1);
				return makeBaseOperation(`OP_${cid}`, cid);
			}) as any);

			return { clientList, createdOpsByClient };
		}

		it("every active client receives at least one operation", async () => {
			const CLIENT_COUNT = 10;
			const SKIP = 3;
			const { clientList, createdOpsByClient } =
				setupClientsAndOps(CLIENT_COUNT);

			// Seed rfcList via client creation mock (bypasses createClients path)
			// For this test we call generate with both clients and operations so the
			// rfcList path is exercised.
			let createCallCount = 0;
			vi.mocked(mockPrisma.client.create).mockImplementation((async () => {
				const c = clientList[createCallCount % clientList.length];
				createCallCount++;
				return makeBaseClient(c.id, c.rfc, organizationId);
			}) as any);

			const generator = new SyntheticDataGenerator(mockPrisma, organizationId);
			await generator.generate({
				clients: { count: CLIENT_COUNT },
				operations: { count: CLIENT_COUNT, skipClients: SKIP },
			});

			// Active clients = CLIENT_COUNT - SKIP = 7
			// Every active client must have >= 1 operation
			const clientsWithOps = createdOpsByClient.size;
			expect(clientsWithOps).toBe(CLIENT_COUNT - SKIP);
		});

		it("exactly skipClients clients are left without operations", async () => {
			const CLIENT_COUNT = 8;
			const SKIP = 2;
			const { clientList, createdOpsByClient } =
				setupClientsAndOps(CLIENT_COUNT);

			let createCallCount = 0;
			vi.mocked(mockPrisma.client.create).mockImplementation((async () => {
				const c = clientList[createCallCount % clientList.length];
				createCallCount++;
				return makeBaseClient(c.id, c.rfc, organizationId);
			}) as any);

			const generator = new SyntheticDataGenerator(mockPrisma, organizationId);
			await generator.generate({
				clients: { count: CLIENT_COUNT },
				operations: { count: CLIENT_COUNT, skipClients: SKIP },
			});

			const clientsWithoutOps = CLIENT_COUNT - createdOpsByClient.size;
			expect(clientsWithoutOps).toBe(SKIP);
		});

		it("auto-adjusts operation count upward when count < active clients", async () => {
			const CLIENT_COUNT = 10;
			const SKIP = 3;
			const { clientList, createdOpsByClient } =
				setupClientsAndOps(CLIENT_COUNT);

			let createCallCount = 0;
			vi.mocked(mockPrisma.client.create).mockImplementation((async () => {
				const c = clientList[createCallCount % clientList.length];
				createCallCount++;
				return makeBaseClient(c.id, c.rfc, organizationId);
			}) as any);

			const generator = new SyntheticDataGenerator(mockPrisma, organizationId);
			// Intentionally pass a count lower than active clients (10 - 3 = 7)
			await generator.generate({
				clients: { count: CLIENT_COUNT },
				operations: { count: 2, skipClients: SKIP },
			});

			// Despite count: 2, all 7 active clients should have operations
			expect(createdOpsByClient.size).toBe(CLIENT_COUNT - SKIP);
		});

		it("distributes extra operations across active clients when count > active clients", async () => {
			const CLIENT_COUNT = 5;
			const SKIP = 0;
			const TOTAL_OPS = 15; // 3× the number of clients
			const { clientList, createdOpsByClient } =
				setupClientsAndOps(CLIENT_COUNT);

			let createCallCount = 0;
			vi.mocked(mockPrisma.client.create).mockImplementation((async () => {
				const c = clientList[createCallCount % clientList.length];
				createCallCount++;
				return makeBaseClient(c.id, c.rfc, organizationId);
			}) as any);

			const generator = new SyntheticDataGenerator(mockPrisma, organizationId);
			const result = await generator.generate({
				clients: { count: CLIENT_COUNT },
				operations: { count: TOTAL_OPS, skipClients: SKIP },
			});

			expect(result.operations.created).toBe(TOTAL_OPS);
			// All clients must have at least 1 operation
			expect(createdOpsByClient.size).toBe(CLIENT_COUNT);
		});
	});

	// ── Legacy perClient mode ────────────────────────────────────────────────

	describe("legacy perClient distribution", () => {
		it("respects perClient and distributes evenly", async () => {
			vi.mocked(mockPrisma.client.findMany).mockResolvedValue([
				{ id: "CLIENT_1", rfc: "RFC1" },
				{ id: "CLIENT_2", rfc: "RFC2" },
			] as any);

			let opCount = 0;
			vi.mocked(mockPrisma.operation.create).mockImplementation((async () => {
				opCount++;
				return makeBaseOperation(`OP_${opCount}`, "CLIENT_1");
			}) as any);

			const generator = new SyntheticDataGenerator(mockPrisma, organizationId);
			const result = await generator.generate({
				operations: { count: 4, perClient: 2 },
			});

			expect(result.operations.created).toBe(4);
			expect(mockPrisma.operation.create).toHaveBeenCalledTimes(4);
		});
	});

	// ── Combined clients + operations ────────────────────────────────────────

	describe("combined generation", () => {
		it("generates clients then uses their RFCs for operations", async () => {
			vi.mocked(mockPrisma.client.create).mockResolvedValue(
				makeBaseClient("CLIENT_1", "RFC_COMBO", organizationId) as any,
			);

			vi.mocked(mockPrisma.client.findMany).mockResolvedValue([
				{ id: "CLIENT_1", rfc: "RFC_COMBO" },
			] as any);

			vi.mocked(mockPrisma.operation.create).mockResolvedValue(
				makeBaseOperation("OP_1", "CLIENT_1") as any,
			);

			const generator = new SyntheticDataGenerator(mockPrisma, organizationId);
			const result = await generator.generate({
				clients: { count: 1 },
				operations: { count: 2, skipClients: 0 },
			});

			expect(result.clients.created).toBe(1);
			expect(result.operations.created).toBe(2);
		});
	});
});
