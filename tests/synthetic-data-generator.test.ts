import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { SyntheticDataGenerator } from "../src/lib/synthetic-data-generator";
import type { PrismaClient } from "@prisma/client";

const hoisted = vi.hoisted(() => ({
	mockRepoCreate: vi.fn(),
	mockAssessClient: vi.fn(),
	mockLoadRiskLookups: vi.fn(),
}));

vi.mock("../src/domain/risk", () => ({
	loadRiskLookups: hoisted.mockLoadRiskLookups,
}));

vi.mock("../src/domain/risk/client/service", () => ({
	ClientRiskService: vi.fn().mockImplementation(() => ({
		assessClient: hoisted.mockAssessClient,
	})),
}));

vi.mock("../src/domain/client/repository", () => ({
	ClientRepository: vi.fn().mockImplementation(() => ({
		create: hoisted.mockRepoCreate,
	})),
}));

function makeBaseClient(
	id: string,
	rfc: string,
	organizationId: string,
	personType: "physical" | "moral" | "trust" = "physical",
) {
	return {
		id,
		rfc,
		organizationId,
		personType,
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

describe("SyntheticDataGenerator", () => {
	let mockPrisma: PrismaClient;
	const organizationId = "org-123";
	const originalRandom = Math.random;

	beforeEach(() => {
		hoisted.mockLoadRiskLookups.mockResolvedValue({
			geo: { getByStateCode: () => ({ riskScore: 1 }) },
			jurisdiction: { getByCountryCode: () => ({ riskScore: 1 }) },
			activity: { getByKey: () => ({ riskScore: 1 }) },
		} as any);
		hoisted.mockAssessClient.mockResolvedValue({
			result: {} as any,
			previousLevel: null,
		});
		hoisted.mockRepoCreate.mockImplementation(async (_tenant: any, input: any) =>
			makeBaseClient(
				`CLT${input.rfc.slice(0, 8)}`,
				input.rfc,
				organizationId,
				input.personType === "moral"
					? "moral"
					: input.personType === "trust"
						? "trust"
						: "physical",
			),
		);

		mockPrisma = {
			catalog: {
				findUnique: vi.fn().mockResolvedValue({ id: "catalog-1" }),
			},
			catalogItem: {
				findMany: vi.fn().mockResolvedValue([
					{ metadata: JSON.stringify({ code: "1110100" }) },
					{ metadata: JSON.stringify({ code: "5520014" }) },
				]),
			},
			client: {
				create: vi.fn(),
				findMany: vi.fn(),
				findUnique: vi.fn(),
				update: vi.fn().mockResolvedValue({}),
			},
			clientWatchlistScreening: {
				create: vi.fn().mockResolvedValue({}),
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
		vi.clearAllMocks();
	});

	describe("client generation", () => {
		it("should generate the requested number of clients", async () => {
			const generator = new SyntheticDataGenerator(mockPrisma, organizationId);
			const result = await generator.generate({ clients: { count: 2 } });

			expect(result.clients.created).toBe(2);
			expect(result.clients.rfcList).toHaveLength(2);
			expect(hoisted.mockRepoCreate).toHaveBeenCalledTimes(2);
			expect(hoisted.mockAssessClient).toHaveBeenCalledTimes(2);
		});

		it("should produce moral and physical clients across a larger random sample", async () => {
			const generator = new SyntheticDataGenerator(mockPrisma, organizationId);
			const result = await generator.generate({ clients: { count: 40 } });

			expect(result.clients.created).toBe(40);
			const types = hoisted.mockRepoCreate.mock.calls.map(
				(c) => c[1].personType,
			);
			expect(types.some((t) => t === "physical")).toBe(true);
			expect(types.some((t) => t === "moral")).toBe(true);
		});

		it("should handle RFC collisions gracefully", async () => {
			hoisted.mockRepoCreate
				.mockRejectedValueOnce(new Error("UNIQUE constraint failed"))
				.mockImplementation(async (_tenant: any, input: any) =>
					makeBaseClient(`CLTX`, input.rfc, organizationId),
				);

			const generator = new SyntheticDataGenerator(mockPrisma, organizationId);
			const result = await generator.generate({ clients: { count: 2 } });

			expect(result.clients.created).toBeGreaterThanOrEqual(1);
		});

		it("should generate documents when includeDocuments is true", async () => {
			hoisted.mockRepoCreate.mockImplementation(async (_tenant: any, input: any) =>
				makeBaseClient("CLIENT_1", input.rfc, organizationId, "physical"),
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
			hoisted.mockRepoCreate.mockImplementation(async (_tenant: any, input: any) =>
				makeBaseClient("CLIENT_1", input.rfc, organizationId),
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

		it("honours riskMix weighting toward a single profile", async () => {
			const generator = new SyntheticDataGenerator(mockPrisma, organizationId);
			await generator.generate({
				clients: {
					count: 5,
					includePep: false,
					includeSanctioned: false,
					riskMix: {
						LOW: 1,
						MEDIUM: 0,
						MEDIUM_HIGH: 0,
						PEP: 0,
						SANCTIONED: 0,
					},
				},
			});
			for (const call of hoisted.mockRepoCreate.mock.calls) {
				expect(call[1].personType).toBe("physical");
				expect(call[1].economicActivityCode).toBeTruthy();
			}
		});
	});

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
			hoisted.mockRepoCreate.mockRejectedValue(new Error("All clients failed"));

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

			let createCallCount = 0;
			hoisted.mockRepoCreate.mockImplementation(async () => {
				const c = clientList[createCallCount % clientList.length];
				createCallCount++;
				return makeBaseClient(c.id, c.rfc, organizationId);
			});

			const generator = new SyntheticDataGenerator(mockPrisma, organizationId);
			await generator.generate({
				clients: { count: CLIENT_COUNT },
				operations: { count: CLIENT_COUNT, skipClients: SKIP },
			});

			expect(createdOpsByClient.size).toBe(CLIENT_COUNT - SKIP);
		});

		it("exactly skipClients clients are left without operations", async () => {
			const CLIENT_COUNT = 8;
			const SKIP = 2;
			const { clientList, createdOpsByClient } =
				setupClientsAndOps(CLIENT_COUNT);

			let createCallCount = 0;
			hoisted.mockRepoCreate.mockImplementation(async () => {
				const c = clientList[createCallCount % clientList.length];
				createCallCount++;
				return makeBaseClient(c.id, c.rfc, organizationId);
			});

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
			hoisted.mockRepoCreate.mockImplementation(async () => {
				const c = clientList[createCallCount % clientList.length];
				createCallCount++;
				return makeBaseClient(c.id, c.rfc, organizationId);
			});

			const generator = new SyntheticDataGenerator(mockPrisma, organizationId);
			await generator.generate({
				clients: { count: CLIENT_COUNT },
				operations: { count: 2, skipClients: SKIP },
			});

			expect(createdOpsByClient.size).toBe(CLIENT_COUNT - SKIP);
		});

		it("distributes extra operations across active clients when count > active clients", async () => {
			const CLIENT_COUNT = 5;
			const SKIP = 0;
			const TOTAL_OPS = 15;
			const { clientList, createdOpsByClient } =
				setupClientsAndOps(CLIENT_COUNT);

			let createCallCount = 0;
			hoisted.mockRepoCreate.mockImplementation(async () => {
				const c = clientList[createCallCount % clientList.length];
				createCallCount++;
				return makeBaseClient(c.id, c.rfc, organizationId);
			});

			const generator = new SyntheticDataGenerator(mockPrisma, organizationId);
			const result = await generator.generate({
				clients: { count: CLIENT_COUNT },
				operations: { count: TOTAL_OPS, skipClients: SKIP },
			});

			expect(result.operations.created).toBe(TOTAL_OPS);
			expect(createdOpsByClient.size).toBe(CLIENT_COUNT);
		});
	});

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

	describe("combined generation", () => {
		it("generates clients then uses their RFCs for operations", async () => {
			hoisted.mockRepoCreate.mockResolvedValue(
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
