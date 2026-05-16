import { describe, it, expect, vi, beforeEach } from "vitest";
import { BeneficialControllerRepository } from "./repository";

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

function bcRow(id: string, clientId: string) {
	const now = new Date();
	return {
		id,
		clientId,
		shareholderId: null,
		bcType: "SHAREHOLDER",
		identificationCriteria: "CONTROL",
		controlMechanism: null,
		isLegalRepresentative: false,
		firstName: "A",
		lastName: "B",
		secondLastName: null,
		birthDate: null,
		birthCountry: null,
		nationality: null,
		occupation: null,
		curp: null,
		rfc: null,
		idDocumentType: null,
		idDocumentNumber: null,
		idDocumentAuthority: null,
		idCopyDocId: null,
		curpCopyDocId: null,
		cedulaFiscalDocId: null,
		addressProofDocId: null,
		constanciaBcDocId: null,
		powerOfAttorneyDocId: null,
		email: null,
		phone: null,
		country: null,
		stateCode: null,
		city: null,
		street: null,
		postalCode: null,
		isPEP: false,
		watchlistQueryId: null,
		ofacSanctioned: false,
		unscSanctioned: false,
		sat69bListed: false,
		adverseMediaFlagged: false,
		screeningResult: "pending",
		screenedAt: null,
		verifiedAt: null,
		verifiedBy: null,
		notes: null,
		createdAt: now,
		updatedAt: now,
	};
}

describe("BeneficialControllerRepository", () => {
	let prisma: {
		client: {
			findUnique: ReturnType<typeof vi.fn>;
			update: ReturnType<typeof vi.fn>;
		};
		beneficialController: {
			findMany: ReturnType<typeof vi.fn>;
			count: ReturnType<typeof vi.fn>;
			findFirst: ReturnType<typeof vi.fn>;
			findUnique: ReturnType<typeof vi.fn>;
			create: ReturnType<typeof vi.fn>;
			update: ReturnType<typeof vi.fn>;
			delete: ReturnType<typeof vi.fn>;
		};
	};
	let repo: BeneficialControllerRepository;

	beforeEach(() => {
		prisma = {
			client: {
				findUnique: vi.fn().mockResolvedValue(kycClientFixture("c1")),
				update: vi.fn().mockResolvedValue(undefined),
			},
			beneficialController: {
				findMany: vi.fn(),
				count: vi.fn(),
				findFirst: vi.fn(),
				findUnique: vi.fn(),
				create: vi.fn(),
				update: vi.fn(),
				delete: vi.fn(),
			},
		};
		repo = new BeneficialControllerRepository(prisma as never);
	});

	it("list maps rows and total", async () => {
		const row = bcRow("bc1", "c1");
		prisma.beneficialController.findMany.mockResolvedValue([row]);
		prisma.beneficialController.count.mockResolvedValue(1);
		const out = await repo.list({ clientId: "c1" });
		expect(out.total).toBe(1);
		expect(out.data[0].id).toBe("bc1");
	});

	it("getById returns null when not found", async () => {
		prisma.beneficialController.findFirst.mockResolvedValue(null);
		await expect(repo.getById("c1", "bc1")).resolves.toBeNull();
	});

	it("create persists and returns entity", async () => {
		const row = bcRow("bc-new", "c1");
		prisma.beneficialController.create.mockResolvedValue(row);
		const entity = await repo.create("c1", {
			bcType: "SHAREHOLDER",
			identificationCriteria: "CONTROL",
			firstName: "A",
			lastName: "B",
		} as never);
		expect(entity.clientId).toBe("c1");
		expect(prisma.beneficialController.create).toHaveBeenCalled();
	});

	it("updateScreening updates watchlist fields", async () => {
		const row = bcRow("bc1", "c1");
		row.ofacSanctioned = true;
		prisma.beneficialController.update.mockResolvedValue(row);
		const entity = await repo.updateScreening("bc1", {
			ofacSanctioned: true,
			screeningResult: "hit",
		});
		expect(entity.ofacSanctioned).toBe(true);
	});

	it("findByShareholderId returns list", async () => {
		const row = bcRow("bc1", "c1");
		prisma.beneficialController.findMany.mockResolvedValue([row]);
		const out = await repo.findByShareholderId("sh1");
		expect(out.total).toBe(1);
	});
});
