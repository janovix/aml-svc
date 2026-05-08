import { describe, it, expect, vi, beforeEach } from "vitest";
import { Prisma } from "@prisma/client";
import { ShareholderRepository } from "./repository";

vi.mock("../client/identification-tier.js", () => ({
	computeClientIdentificationTier: vi.fn().mockResolvedValue({
		identificationTier: "BELOW_THRESHOLD",
		identificationRequired: false,
		identificationThresholdMxn: null,
		noticeThresholdMxn: null,
	}),
}));

function kycClientFixture(clientId: string) {
	return {
		id: clientId,
		organizationId: "o1",
		personType: "PHYSICAL",
		firstName: "A",
		lastName: "B",
		secondLastName: null,
		birthDate: null,
		curp: null,
		rfc: null,
		nationality: null,
		countryCode: "MX",
		email: "a@b.com",
		phone: "555",
		country: "MX",
		stateCode: "CMX",
		city: "X",
		municipality: null,
		neighborhood: null,
		street: "Y",
		externalNumber: "1",
		postalCode: "12345",
		economicActivityCode: "x",
		gender: "x",
		occupation: "x",
		maritalStatus: "x",
		sourceOfFunds: "x",
		screeningResult: "clear",
		screenedAt: new Date(),
		documents: [],
		beneficialControllers: [],
		shareholders: [],
	};
}

function shRow(id: string, clientId: string) {
	const now = new Date();
	return {
		id,
		clientId,
		parentShareholderId: null,
		entityType: "PERSON",
		firstName: "A",
		lastName: "B",
		secondLastName: null,
		rfc: null,
		businessName: null,
		taxId: null,
		incorporationDate: null,
		nationality: null,
		representativeName: null,
		representativeCurp: null,
		representativeRfc: null,
		actaConstitutivaDocId: null,
		cedulaFiscalDocId: null,
		addressProofDocId: null,
		powerOfAttorneyDocId: null,
		ownershipPercentage: new Prisma.Decimal(100),
		email: null,
		phone: null,
		createdAt: now,
		updatedAt: now,
	};
}

describe("ShareholderRepository", () => {
	let prisma: {
		client: {
			findUnique: ReturnType<typeof vi.fn>;
			update: ReturnType<typeof vi.fn>;
		};
		shareholder: {
			findMany: ReturnType<typeof vi.fn>;
			count: ReturnType<typeof vi.fn>;
			findFirst: ReturnType<typeof vi.fn>;
			findUnique: ReturnType<typeof vi.fn>;
			create: ReturnType<typeof vi.fn>;
			update: ReturnType<typeof vi.fn>;
			delete: ReturnType<typeof vi.fn>;
		};
	};
	let repo: ShareholderRepository;

	beforeEach(() => {
		prisma = {
			client: {
				findUnique: vi.fn().mockResolvedValue(kycClientFixture("c1")),
				update: vi.fn().mockResolvedValue(undefined),
			},
			shareholder: {
				findMany: vi.fn(),
				count: vi.fn(),
				findFirst: vi.fn(),
				findUnique: vi.fn(),
				create: vi.fn(),
				update: vi.fn(),
				delete: vi.fn(),
			},
		};
		repo = new ShareholderRepository(prisma as never);
	});

	it("list applies optional filters", async () => {
		const row = shRow("s1", "c1");
		prisma.shareholder.findMany.mockResolvedValue([row]);
		prisma.shareholder.count.mockResolvedValue(1);
		await repo.list({
			clientId: "c1",
			parentShareholderId: null,
			entityType: "PERSON",
		});
		expect(prisma.shareholder.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({
					clientId: "c1",
					parentShareholderId: null,
					entityType: "PERSON",
				}),
			}),
		);
	});

	it("getById returns mapped entity", async () => {
		const row = shRow("s1", "c1");
		prisma.shareholder.findFirst.mockResolvedValue(row);
		const entity = await repo.getById("c1", "s1");
		expect(entity?.id).toBe("s1");
	});

	it("create delegates to prisma.create", async () => {
		const row = shRow("s-new", "c1");
		prisma.shareholder.create.mockResolvedValue(row);
		const entity = await repo.create("c1", {
			entityType: "PERSON",
			firstName: "A",
			lastName: "B",
			ownershipPercentage: 100,
		} as never);
		expect(entity.clientId).toBe("c1");
	});

	it("delete removes shareholder", async () => {
		prisma.shareholder.delete.mockResolvedValue(undefined);
		await repo.delete("c1", "s1");
		expect(prisma.shareholder.delete).toHaveBeenCalledWith({
			where: { id: "s1", clientId: "c1" },
		});
	});
});
