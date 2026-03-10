import { describe, it, expect, vi } from "vitest";
import type { PrismaClient, PersonType } from "@prisma/client";
import { recalculateKycProgress } from "./kyc-progress";

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
});
