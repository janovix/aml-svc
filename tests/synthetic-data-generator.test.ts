import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { SyntheticDataGenerator } from "../src/lib/synthetic-data-generator";
import type { PrismaClient } from "@prisma/client";
import type { ClientCreateInput } from "../src/domain/client/schemas";
import type { ClientEntity } from "../src/domain/client/types";
import { ClientRepository } from "../src/domain/client/repository";
import { ClientRiskService } from "../src/domain/risk/client/service";

function makeBaseOperation(id: string, clientId: string) {
	return {
		id,
		clientId,
		activityCode: "VEH",
		createdAt: new Date(),
		updatedAt: new Date(),
	};
}

function stubClientEntity(
	organizationId: string,
	input: ClientCreateInput,
): ClientEntity {
	const base = input as Record<string, unknown>;
	return {
		id: `CLIENT_${input.rfc}`,
		rfc: input.rfc,
		organizationId,
		personType: input.personType,
		firstName: base.firstName ?? null,
		lastName: base.lastName ?? null,
		secondLastName: base.secondLastName ?? null,
		birthDate: base.birthDate ?? null,
		curp: base.curp ?? null,
		businessName: base.businessName ?? null,
		incorporationDate: base.incorporationDate ?? null,
		nationality: base.nationality ?? null,
		email: input.email,
		phone: input.phone,
		country: input.country,
		stateCode: input.stateCode,
		city: input.city,
		municipality: input.municipality,
		neighborhood: input.neighborhood,
		street: input.street,
		externalNumber: input.externalNumber,
		internalNumber: base.internalNumber ?? null,
		postalCode: input.postalCode,
		reference: base.reference ?? null,
		notes: base.notes ?? null,
		countryCode: base.countryCode ?? null,
		economicActivityCode: base.economicActivityCode ?? null,
		commercialActivityCode: base.commercialActivityCode ?? null,
		gender: base.gender ?? null,
		occupation: base.occupation ?? null,
		maritalStatus: base.maritalStatus ?? null,
		sourceOfFunds: base.sourceOfFunds ?? null,
		sourceOfWealth: base.sourceOfWealth ?? null,
		kycStatus: "INCOMPLETE",
		completenessStatus: "MINIMUM",
		missingFields: null,
		kycCompletionPct: 0,
		documentsComplete: 0,
		documentsCount: 0,
		documentsRequired: 0,
		shareholdersCount: 0,
		beneficialControllersCount: 0,
		identificationRequired: true,
		identificationTier: "ALWAYS",
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
	} as unknown as ClientEntity;
}

describe("SyntheticDataGenerator", () => {
	let mockPrisma: PrismaClient;
	const organizationId = "org-123";
	const originalRandom = Math.random;
	/** Vitest `MockInstance` vs method arity is mismatching under `tsc -p tests/tsconfig.json`. */
	let repoCreateSpy: any;
	let assessSpy: any;

	beforeEach(() => {
		mockPrisma = {
			client: {
				findMany: vi.fn(),
				update: vi.fn().mockResolvedValue({}),
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
			clientWatchlistScreening: {
				findFirst: vi.fn().mockResolvedValue(null),
				create: vi.fn().mockResolvedValue({}),
			},
			catalogItem: {
				findMany: vi
					.fn()
					.mockResolvedValue([
						{ metadata: JSON.stringify({ code: "MX" }) },
						{ metadata: JSON.stringify({ code: "1110100" }) },
						{ metadata: JSON.stringify({ code: "2720004" }) },
					]),
			},
			geographicRiskZone: {
				findMany: vi.fn().mockResolvedValue([]),
			},
			jurisdictionRisk: {
				findMany: vi.fn().mockResolvedValue([]),
			},
			activityRiskProfile: {
				findMany: vi.fn().mockResolvedValue([]),
			},
		} as unknown as PrismaClient;

		repoCreateSpy = vi
			.spyOn(ClientRepository.prototype, "create")
			.mockImplementation(async (...args: unknown[]) =>
				stubClientEntity(organizationId, args[1] as ClientCreateInput),
			);

		assessSpy = vi
			.spyOn(ClientRiskService.prototype, "assessClient")
			.mockResolvedValue({
				result: {
					clientId: "stub",
					organizationId,
					inherentRiskScore: 1,
					residualRiskScore: 1,
					riskLevel: "LOW",
					dueDiligenceLevel: "SIMPLIFIED",
					ddProfile: {},
					elements: {} as never,
					mitigantEffect: 0,
					mitigantFactors: [],
					nextReviewMonths: 12,
				},
				previousLevel: null,
			} as never);
	});

	afterEach(() => {
		Math.random = originalRandom;
		vi.restoreAllMocks();
	});

	describe("client generation", () => {
		it("should generate the requested number of clients", async () => {
			const generator = new SyntheticDataGenerator(mockPrisma, organizationId);
			const result = await generator.generate({ clients: { count: 2 } });

			expect(result.clients.created).toBe(2);
			expect(result.clients.rfcList).toHaveLength(2);
			expect(repoCreateSpy).toHaveBeenCalledTimes(2);
			expect(assessSpy).toHaveBeenCalledTimes(2);
		});

		it("should produce physical and moral personas across profiles", async () => {
			const generator = new SyntheticDataGenerator(mockPrisma, organizationId);
			const result = await generator.generate({ clients: { count: 24 } });

			expect(result.clients.created).toBe(24);
			const types = repoCreateSpy.mock.calls.map(
				(c: unknown[]) => (c[1] as ClientCreateInput).personType,
			);
			expect(types.some((t: string) => t === "physical")).toBe(true);
			expect(types.some((t: string) => t === "moral")).toBe(true);
		});

		it("should handle RFC collisions gracefully", async () => {
			repoCreateSpy
				.mockRejectedValueOnce(new Error("UNIQUE constraint failed"))
				.mockImplementation(async (...args: unknown[]) =>
					stubClientEntity(organizationId, args[1] as ClientCreateInput),
				);

			const generator = new SyntheticDataGenerator(mockPrisma, organizationId);
			const result = await generator.generate({ clients: { count: 2 } });

			expect(result.clients.created).toBeGreaterThanOrEqual(1);
		});

		it("should generate documents when includeDocuments is true", async () => {
			vi.mocked(mockPrisma.clientDocument.create).mockResolvedValue({
				id: "DOC_1",
				clientId: "CLIENT_1",
				createdAt: new Date(),
				updatedAt: new Date(),
			} as never);

			const generator = new SyntheticDataGenerator(mockPrisma, organizationId);
			await generator.generate({
				clients: { count: 5, includeDocuments: true },
			});

			expect(mockPrisma.clientDocument.create).toHaveBeenCalled();
		});

		it("should generate addresses when includeAddresses is true", async () => {
			vi.mocked(mockPrisma.clientAddress.create).mockResolvedValue({
				id: "ADDR_1",
				clientId: "CLIENT_1",
				createdAt: new Date(),
				updatedAt: new Date(),
			} as never);

			const generator = new SyntheticDataGenerator(mockPrisma, organizationId);
			await generator.generate({
				clients: { count: 1, includeAddresses: true },
			});

			expect(mockPrisma.clientAddress.create).toHaveBeenCalled();
		});

		it("writes screening snapshots for PEP and sanctioned profiles sometimes", async () => {
			Math.random = () => 0.99;
			const generator = new SyntheticDataGenerator(mockPrisma, organizationId);
			await generator.generate({
				clients: {
					count: 30,
					riskMix: { PEP: 50, SANCTIONED: 50 },
					includePep: true,
					includeSanctioned: true,
				},
			});
			expect(mockPrisma.clientWatchlistScreening.create).toHaveBeenCalled();
		});
	});

	describe("operation generation", () => {
		it("should generate operations for existing clients when no clients are requested", async () => {
			vi.mocked(mockPrisma.client.findMany).mockResolvedValue([
				{ id: "CLIENT_1", rfc: "RFC1" },
				{ id: "CLIENT_2", rfc: "RFC2" },
			] as never);

			let opCount = 0;
			(mockPrisma as any).operation.create.mockImplementation(async () =>
				makeBaseOperation(`OP_${++opCount}`, "CLIENT_1"),
			);

			const generator = new SyntheticDataGenerator(mockPrisma, organizationId);
			const result = await generator.generate({
				operations: { count: 3, skipClients: 0 },
			});

			expect(result.operations.created).toBe(3);
			expect(result.operations.operationIds).toHaveLength(3);
		});

		it("should throw when no clients are available and none can be created", async () => {
			vi.mocked(mockPrisma.client.findMany).mockResolvedValue([]);
			repoCreateSpy.mockRejectedValue(new Error("All clients failed"));

			const generator = new SyntheticDataGenerator(mockPrisma, organizationId);
			await expect(
				generator.generate({ operations: { count: 1 } }),
			).rejects.toThrow();
		});

		it("should handle individual operation creation errors gracefully", async () => {
			vi.mocked(mockPrisma.client.findMany).mockResolvedValue([
				{ id: "CLIENT_1", rfc: "RFC1" },
			] as never);

			vi.mocked(mockPrisma.operation.create)
				.mockRejectedValueOnce(new Error("Operation error"))
				.mockResolvedValueOnce(makeBaseOperation("OP_2", "CLIENT_1") as never);

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
				clientList as never,
			);

			const createdOpsByClient = new Map<string, number>();
			(mockPrisma as any).operation.create.mockImplementation(
				async (args: { data: { clientId: string } }) => {
					const cid = args.data.clientId;
					createdOpsByClient.set(cid, (createdOpsByClient.get(cid) ?? 0) + 1);
					return makeBaseOperation(`OP_${cid}`, cid);
				},
			);

			return { clientList, createdOpsByClient };
		}

		it("every active client receives at least one operation", async () => {
			const CLIENT_COUNT = 10;
			const SKIP = 3;
			const { clientList, createdOpsByClient } =
				setupClientsAndOps(CLIENT_COUNT);

			let createCallCount = 0;
			repoCreateSpy.mockImplementation(async (...args: unknown[]) => {
				const input = args[1] as ClientCreateInput;
				const c = clientList[createCallCount % clientList.length]!;
				createCallCount++;
				return stubClientEntity(organizationId, {
					...(input as Record<string, unknown>),
					rfc: c.rfc,
					personType: input.personType,
				} as ClientCreateInput);
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
			repoCreateSpy.mockImplementation(async (...args: unknown[]) => {
				const input = args[1] as ClientCreateInput;
				const c = clientList[createCallCount % clientList.length]!;
				createCallCount++;
				return stubClientEntity(organizationId, {
					...(input as Record<string, unknown>),
					rfc: c.rfc,
					personType: input.personType,
				} as ClientCreateInput);
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
			repoCreateSpy.mockImplementation(async (...args: unknown[]) => {
				const input = args[1] as ClientCreateInput;
				const c = clientList[createCallCount % clientList.length]!;
				createCallCount++;
				return stubClientEntity(organizationId, {
					...(input as Record<string, unknown>),
					rfc: c.rfc,
					personType: input.personType,
				} as ClientCreateInput);
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
			repoCreateSpy.mockImplementation(async (...args: unknown[]) => {
				const input = args[1] as ClientCreateInput;
				const c = clientList[createCallCount % clientList.length]!;
				createCallCount++;
				return stubClientEntity(organizationId, {
					...(input as Record<string, unknown>),
					rfc: c.rfc,
					personType: input.personType,
				} as ClientCreateInput);
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
			] as never);

			let opCount = 0;
			(mockPrisma as any).operation.create.mockImplementation(async () =>
				makeBaseOperation(`OP_${++opCount}`, "CLIENT_1"),
			);

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
			repoCreateSpy.mockImplementation(async (...args: unknown[]) => {
				const input = args[1] as ClientCreateInput;
				return stubClientEntity(organizationId, {
					...(input as Record<string, unknown>),
					rfc: "RFC_COMBO",
					personType: input.personType,
				} as ClientCreateInput);
			});

			vi.mocked(mockPrisma.client.findMany).mockResolvedValue([
				{ id: "CLIENT_RFC_COMBO", rfc: "RFC_COMBO" },
			] as never);

			vi.mocked(mockPrisma.operation.create).mockResolvedValue(
				makeBaseOperation("OP_1", "CLIENT_RFC_COMBO") as never,
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
