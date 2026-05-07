import { describe, it, expect, vi, beforeEach } from "vitest";
import type { PrismaClient, PersonType } from "@prisma/client";

// recalculateKycProgress uses a dynamic import of this module so Vitest mocks apply
// under the Workers test pool.
vi.mock("./identification-tier", () => ({
	computeClientIdentificationTier: vi.fn(),
}));

import { recalculateKycProgress } from "./kyc-progress";
import { computeClientIdentificationTier } from "./identification-tier";

const mockComputeTier = vi.mocked(computeClientIdentificationTier);

const ALWAYS_TIER = {
	identificationTier: "ALWAYS" as const,
	identificationRequired: true,
	identificationThresholdMxn: null as number | null,
	noticeThresholdMxn: null as number | null,
	maxSingleOperationMxn: 0,
	sixMonthCumulativeMxn: 0,
	singleOpExceedsThreshold: false,
	cumulativeExceedsNoticeThreshold: false,
	identificationThresholdPct: 100,
	noticeThresholdPct: 100,
};

const BELOW_TIER = {
	...ALWAYS_TIER,
	identificationTier: "BELOW_THRESHOLD" as const,
	identificationRequired: false,
	identificationThresholdMxn: 500_000,
	noticeThresholdMxn: 1_000_000,
};

const ABOVE_TIER = {
	...ALWAYS_TIER,
	identificationTier: "ABOVE_THRESHOLD" as const,
	identificationRequired: true,
	identificationThresholdMxn: 500_000,
	noticeThresholdMxn: 1_000_000,
};

function makeMockPrisma(
	clientData: Record<string, unknown> | null = null,
): PrismaClient {
	return {
		client: {
			findUnique: vi.fn().mockResolvedValue(clientData),
			update: vi.fn().mockResolvedValue({}),
		},
	} as unknown as PrismaClient;
}

const BASE_CLIENT = {
	id: "c-1",
	organizationId: "org-1",
	personType: "PHYSICAL" as PersonType,
	firstName: "Juan",
	lastName: "Pérez",
	email: "juan@test.com",
	phone: "+521234567890",
	country: "MX",
	stateCode: "DIF",
	city: "CDMX",
	municipality: "CDMX",
	neighborhood: "Centro",
	street: "Calle 1",
	externalNumber: "10",
	postalCode: "06000",
	rfc: "ABCD123456EF7",
	screeningResult: null,
	identificationType: null,
	documents: [],
	beneficialControllers: [],
	shareholders: [],
};

describe("recalculateKycProgress", () => {
	beforeEach(() => {
		mockComputeTier.mockResolvedValue(ALWAYS_TIER);
	});

	it("throws when client is not found", async () => {
		const prisma = makeMockPrisma(null);
		await expect(recalculateKycProgress(prisma, "nonexistent")).rejects.toThrow(
			/Client not found/,
		);
	});

	it("calculates KYC progress for PHYSICAL person type", async () => {
		const prisma = makeMockPrisma({ ...BASE_CLIENT });
		await recalculateKycProgress(prisma, "c-1");
		expect(prisma.client.update).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: "c-1" },
				data: expect.objectContaining({
					kycCompletionPct: expect.any(Number),
				}),
			}),
		);
	});

	it("calculates KYC progress for MORAL person type (exercises beneficialControllers branch)", async () => {
		const moralClient = {
			...BASE_CLIENT,
			personType: "MORAL" as PersonType,
			businessName: "Empresa SA",
			beneficialControllers: [{ id: "bc-1" }],
		};
		const prisma = makeMockPrisma(moralClient);
		await recalculateKycProgress(prisma, "c-1");
		expect(prisma.client.update).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({ kycCompletionPct: expect.any(Number) }),
			}),
		);
	});

	it("calculates KYC progress for MORAL without beneficial controllers", async () => {
		const moralClient = {
			...BASE_CLIENT,
			personType: "MORAL" as PersonType,
			businessName: "Empresa SA",
			beneficialControllers: [], // no BCs
		};
		const prisma = makeMockPrisma(moralClient);
		await recalculateKycProgress(prisma, "c-1");
		expect(prisma.client.update).toHaveBeenCalled();
	});

	it("calculates KYC progress with screening result = clear", async () => {
		const prisma = makeMockPrisma({ ...BASE_CLIENT, screeningResult: "clear" });
		await recalculateKycProgress(prisma, "c-1");
		expect(prisma.client.update).toHaveBeenCalled();
	});

	it("calculates KYC progress with all required PHYSICAL documents uploaded", async () => {
		const clientWithDocs = {
			...BASE_CLIENT,
			documents: [
				{ documentType: "NATIONAL_ID" },
				{ documentType: "PROOF_OF_ADDRESS" },
				{ documentType: "TAX_ID" },
			],
		};
		const prisma = makeMockPrisma(clientWithDocs);
		await recalculateKycProgress(prisma, "c-1");
		const updateCall = vi.mocked(prisma.client.update).mock.calls[0][0] as {
			data: { documentsComplete: number };
		};
		expect(updateCall.data.documentsComplete).toBe(1);
	});

	it("returns kycCompletionPct 100 when PHYSICAL client has all sections complete", async () => {
		const fullPhysical = {
			...BASE_CLIENT,
			personType: "PHYSICAL" as PersonType,
			secondLastName: "López",
			birthDate: "1990-01-15",
			curp: "PELJ900115HDFRRN01",
			nationality: "MX",
			countryCode: "MX",
			economicActivityCode: "123",
			gender: "M",
			occupation: "Engineer",
			maritalStatus: "single",
			sourceOfFunds: "employment",
			screeningResult: "clear",
			screenedAt: new Date("2025-01-01"),
			documents: [
				{ documentType: "NATIONAL_ID" },
				{ documentType: "PROOF_OF_ADDRESS" },
				{ documentType: "TAX_ID" },
			],
		};
		const prisma = makeMockPrisma(fullPhysical);
		await recalculateKycProgress(prisma, "c-1");
		const updateCall = vi.mocked(prisma.client.update).mock.calls[0][0] as {
			data: { kycCompletionPct: number };
		};
		expect(updateCall.data.kycCompletionPct).toBe(100);
	});

	it("returns kycCompletionPct 100 when MORAL client has all sections complete", async () => {
		const fullMoral = {
			...BASE_CLIENT,
			personType: "MORAL" as PersonType,
			firstName: null,
			lastName: null,
			businessName: "Empresa SA de CV",
			incorporationDate: "2020-06-01",
			countryCode: "MX",
			commercialActivityCode: "5520014",
			screeningResult: "clear",
			screenedAt: new Date("2025-01-01"),
			documents: [
				{ documentType: "ACTA_CONSTITUTIVA" },
				{ documentType: "PODER_NOTARIAL" },
				{ documentType: "TAX_ID" },
				{ documentType: "PROOF_OF_ADDRESS" },
			],
			beneficialControllers: [{ id: "bc-1" }],
		};
		const prisma = makeMockPrisma(fullMoral);
		await recalculateKycProgress(prisma, "c-1");
		const updateCall = vi.mocked(prisma.client.update).mock.calls[0][0] as {
			data: { kycCompletionPct: number };
		};
		expect(updateCall.data.kycCompletionPct).toBe(100);
	});

	it("returns partial kycCompletionPct when PHYSICAL client has only some sections filled", async () => {
		const partialPhysical = {
			...BASE_CLIENT,
			secondLastName: null,
			birthDate: null,
			curp: null,
			nationality: null,
			economicActivityCode: null,
			gender: null,
			occupation: null,
			maritalStatus: null,
			sourceOfFunds: null,
			screeningResult: null,
			screenedAt: null,
			documents: [],
		};
		const prisma = makeMockPrisma(partialPhysical);
		await recalculateKycProgress(prisma, "c-1");
		const updateCall = vi.mocked(prisma.client.update).mock.calls[0][0] as {
			data: { kycCompletionPct: number };
		};
		expect(updateCall.data.kycCompletionPct).toBeGreaterThan(0);
		expect(updateCall.data.kycCompletionPct).toBeLessThan(100);
	});

	it("credits document section and marks documentsComplete when BELOW identification threshold (no docs)", async () => {
		mockComputeTier.mockResolvedValue(BELOW_TIER);
		const partialPhysical = {
			...BASE_CLIENT,
			secondLastName: null,
			birthDate: null,
			curp: null,
			nationality: null,
			economicActivityCode: null,
			gender: null,
			occupation: null,
			maritalStatus: null,
			screeningResult: "clear",
			screenedAt: new Date("2025-01-01"),
			documents: [],
		};
		const prisma = makeMockPrisma(partialPhysical);
		await recalculateKycProgress(prisma, "c-1");
		const updateCall = vi.mocked(prisma.client.update).mock.calls[0][0] as {
			data: {
				documentsComplete: number;
				identificationTier: string;
				identificationRequired: boolean;
			};
		};
		expect(updateCall.data.documentsComplete).toBe(1);
		expect(updateCall.data.identificationTier).toBe("BELOW_THRESHOLD");
		expect(updateCall.data.identificationRequired).toBe(false);
	});

	it("when ABOVE threshold and no docs, documentsComplete is 0 and tier persisted", async () => {
		mockComputeTier.mockResolvedValue(ABOVE_TIER);
		const partialPhysical = {
			...BASE_CLIENT,
			secondLastName: "López",
			birthDate: "1990-01-15",
			curp: "PELJ900115HDFRRN01",
			nationality: "MX",
			economicActivityCode: "123",
			gender: "M",
			occupation: "Engineer",
			maritalStatus: "single",
			sourceOfFunds: "employment",
			screeningResult: "clear",
			screenedAt: new Date("2025-01-01"),
			documents: [],
		};
		const prisma = makeMockPrisma(partialPhysical);
		await recalculateKycProgress(prisma, "c-1");
		const updateCall = vi.mocked(prisma.client.update).mock.calls[0][0] as {
			data: { documentsComplete: number; identificationTier: string };
		};
		expect(updateCall.data.documentsComplete).toBe(0);
		expect(updateCall.data.identificationTier).toBe("ABOVE_THRESHOLD");
	});
});
