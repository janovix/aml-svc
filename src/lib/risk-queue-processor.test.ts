import { describe, it, expect, vi, beforeEach } from "vitest";

const mockAssessClient = vi.fn();
const mockAssessOrganization = vi.fn();
const mockLoadRiskLookups = vi.fn();
const mockSendRiskNotification = vi.fn();

vi.mock("./prisma", () => ({
	getPrismaClient: vi.fn(),
}));

vi.mock("./risk-notifications", () => ({
	sendRiskNotification: (...args: unknown[]) =>
		mockSendRiskNotification(...args),
}));

vi.mock("../domain/risk", () => ({
	loadRiskLookups: (...args: unknown[]) => mockLoadRiskLookups(...args),
	ClientRiskService: class {
		assessClient = mockAssessClient;
	},
	OrgRiskService: class {
		assessOrganization = mockAssessOrganization;
	},
}));

import { getPrismaClient } from "./prisma";
import { processRiskJob } from "./risk-queue-processor";

describe("processRiskJob", () => {
	const env = { DB: {} as D1Database } as Parameters<typeof processRiskJob>[0];

	beforeEach(() => {
		vi.clearAllMocks();
		mockLoadRiskLookups.mockResolvedValue({});
		mockAssessClient.mockResolvedValue({
			result: {
				clientId: "c1",
				organizationId: "o1",
				riskLevel: "MEDIUM",
				residualRiskScore: 2.5,
				elements: {},
			},
			previousLevel: null,
		});
		mockAssessOrganization.mockResolvedValue({
			result: {
				riskLevel: "LOW",
				requiredAuditType: "INTERNAL",
			},
			previousLevel: null,
			previousAuditType: null,
		});
		vi.mocked(getPrismaClient).mockReturnValue({
			client: {
				findUnique: vi.fn().mockResolvedValue({
					personType: "PHYSICAL",
					firstName: "A",
					lastName: "B",
					businessName: null,
					isPEP: false,
					ofacSanctioned: false,
					unscSanctioned: false,
				}),
			},
		} as never);
	});

	it("no-ops client job when clientId missing", async () => {
		vi.mocked(getPrismaClient).mockReturnValue({} as never);
		await processRiskJob(env, {
			type: "client.assess",
			organizationId: "o1",
			triggerReason: "test",
		} as never);
		expect(mockAssessClient).not.toHaveBeenCalled();
	});

	it("runs client assess and loads lookups", async () => {
		vi.mocked(getPrismaClient).mockReturnValue({
			client: {
				findUnique: vi.fn().mockResolvedValue({
					personType: "LEGAL",
					firstName: null,
					lastName: null,
					businessName: "Co",
					isPEP: false,
					ofacSanctioned: false,
					unscSanctioned: false,
				}),
			},
		} as never);
		await processRiskJob(env, {
			type: "client.assess",
			organizationId: "o1",
			clientId: "c1",
			triggerReason: "manual",
		} as never);
		expect(mockLoadRiskLookups).toHaveBeenCalled();
		expect(mockAssessClient).toHaveBeenCalled();
	});

	it("batch assess iterates clients", async () => {
		const findMany = vi.fn().mockResolvedValue([{ id: "c1" }, { id: "c2" }]);
		vi.mocked(getPrismaClient).mockReturnValue({
			client: { findMany },
		} as never);
		mockAssessClient
			.mockResolvedValueOnce({
				result: {
					clientId: "c1",
					organizationId: "o1",
					riskLevel: "HIGH",
					residualRiskScore: 9,
					elements: {},
				},
				previousLevel: null,
			})
			.mockResolvedValueOnce({
				result: {
					clientId: "c2",
					organizationId: "o1",
					riskLevel: "LOW",
					residualRiskScore: 1,
					elements: {},
				},
				previousLevel: null,
			});

		await processRiskJob(env, {
			type: "client.batch_assess",
			organizationId: "o1",
			triggerReason: "cron",
		} as never);

		expect(findMany).toHaveBeenCalled();
		expect(mockSendRiskNotification).toHaveBeenCalledWith(
			env,
			expect.objectContaining({ type: "aml.risk.batch_complete" }),
		);
	});

	it("org assess sends notification on level change", async () => {
		mockAssessOrganization.mockResolvedValueOnce({
			result: {
				riskLevel: "HIGH",
				requiredAuditType: "INTERNAL",
			},
			previousLevel: "LOW",
			previousAuditType: null,
		});
		vi.mocked(getPrismaClient).mockReturnValue({} as never);

		await processRiskJob(env, {
			type: "org.assess",
			organizationId: "o1",
			triggerReason: "manual",
		} as never);

		expect(mockAssessOrganization).toHaveBeenCalled();
		expect(mockSendRiskNotification).toHaveBeenCalledWith(
			env,
			expect.objectContaining({ type: "aml.risk.org_changed" }),
		);
	});

	it("client HIGH emits high-risk notification", async () => {
		mockAssessClient.mockResolvedValueOnce({
			result: {
				clientId: "c1",
				organizationId: "o1",
				riskLevel: "HIGH",
				residualRiskScore: 9,
				elements: { x: 1 },
			},
			previousLevel: null,
		});
		vi.mocked(getPrismaClient).mockReturnValue({
			client: {
				findUnique: vi.fn().mockResolvedValue({
					personType: "PHYSICAL",
					firstName: "A",
					lastName: "B",
					businessName: null,
					isPEP: false,
					ofacSanctioned: false,
					unscSanctioned: false,
				}),
			},
		} as never);

		await processRiskJob(env, {
			type: "client.assess",
			organizationId: "o1",
			clientId: "c1",
			triggerReason: "manual",
		} as never);

		expect(mockSendRiskNotification).toHaveBeenCalledWith(
			env,
			expect.objectContaining({ type: "aml.risk.client_high" }),
		);
	});

	it("client PEP plus sanctions emits critical notification", async () => {
		mockAssessClient.mockResolvedValueOnce({
			result: {
				clientId: "c1",
				organizationId: "o1",
				riskLevel: "HIGH",
				residualRiskScore: 9,
				elements: {},
			},
			previousLevel: null,
		});
		vi.mocked(getPrismaClient).mockReturnValue({
			client: {
				findUnique: vi.fn().mockResolvedValue({
					personType: "PHYSICAL",
					firstName: "A",
					lastName: "B",
					businessName: null,
					isPEP: true,
					ofacSanctioned: true,
					unscSanctioned: false,
				}),
			},
		} as never);

		await processRiskJob(env, {
			type: "client.assess",
			organizationId: "o1",
			clientId: "c1",
			triggerReason: "manual",
		} as never);

		expect(mockSendRiskNotification).toHaveBeenCalledWith(
			env,
			expect.objectContaining({ type: "aml.risk.client_critical" }),
		);
	});

	it("client_changed when previousLevel differs", async () => {
		mockAssessClient.mockResolvedValueOnce({
			result: {
				clientId: "c1",
				organizationId: "o1",
				riskLevel: "MEDIUM",
				residualRiskScore: 5,
				elements: {},
			},
			previousLevel: "LOW",
		});
		vi.mocked(getPrismaClient).mockReturnValue({
			client: {
				findUnique: vi.fn().mockResolvedValue({
					personType: "PHYSICAL",
					firstName: "A",
					lastName: "B",
					businessName: null,
					isPEP: false,
					ofacSanctioned: false,
					unscSanctioned: false,
				}),
			},
		} as never);

		await processRiskJob(env, {
			type: "client.reassess",
			organizationId: "o1",
			clientId: "c1",
			triggerReason: "manual",
		} as never);

		expect(mockSendRiskNotification).toHaveBeenCalledWith(
			env,
			expect.objectContaining({ type: "aml.risk.client_changed" }),
		);
	});

	it("LOW risk emits simplified_dd notification", async () => {
		mockAssessClient.mockResolvedValueOnce({
			result: {
				clientId: "c1",
				organizationId: "o1",
				riskLevel: "LOW",
				residualRiskScore: 0.5,
				elements: {},
			},
			previousLevel: null,
		});
		vi.mocked(getPrismaClient).mockReturnValue({
			client: {
				findUnique: vi.fn().mockResolvedValue({
					personType: "LEGAL",
					firstName: null,
					lastName: null,
					businessName: "Co",
					isPEP: false,
					ofacSanctioned: false,
					unscSanctioned: false,
				}),
			},
		} as never);

		await processRiskJob(env, {
			type: "client.assess",
			organizationId: "o1",
			clientId: "c1",
			triggerReason: "manual",
		} as never);

		expect(mockSendRiskNotification).toHaveBeenCalledWith(
			env,
			expect.objectContaining({ type: "aml.risk.simplified_dd" }),
		);
	});

	it("audit escalation sends aml.risk.audit_escalated", async () => {
		mockAssessOrganization.mockResolvedValueOnce({
			result: {
				riskLevel: "HIGH",
				requiredAuditType: "EXTERNAL_INDEPENDENT",
			},
			previousLevel: "HIGH",
			previousAuditType: "INTERNAL",
		});
		vi.mocked(getPrismaClient).mockReturnValue({} as never);

		await processRiskJob(env, {
			type: "org.assess",
			organizationId: "o1",
			triggerReason: "manual",
		} as never);

		expect(mockSendRiskNotification).toHaveBeenCalledWith(
			env,
			expect.objectContaining({ type: "aml.risk.audit_escalated" }),
		);
	});
});
