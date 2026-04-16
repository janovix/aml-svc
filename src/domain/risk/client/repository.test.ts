import { describe, expect, it, vi } from "vitest";
import { productionTenant } from "../../../lib/tenant-context";
import { ClientRiskRepository } from "./repository";
import type { ClientRiskResult } from "./types";

function minimalResult(
	overrides: Partial<ClientRiskResult> = {},
): ClientRiskResult {
	const el = {
		elementType: "CLIENT",
		score: 2,
		level: "LOW" as const,
		factors: [] as ClientRiskResult["elements"]["client"]["factors"],
	};
	return {
		clientId: "cli-1",
		organizationId: "org-1",
		inherentRiskScore: 3,
		residualRiskScore: 2.5,
		riskLevel: "LOW",
		dueDiligenceLevel: "SIMPLIFIED",
		ddProfile: {
			overall: "SIMPLIFIED",
			acceptance: "SIMPLIFIED",
			ongoingMonitoring: "SIMPLIFIED",
			reviewFrequency: "SIMPLIFIED",
			reporting: "SIMPLIFIED",
		},
		elements: {
			client: { ...el, elementType: "CLIENT" },
			geographic: { ...el, elementType: "GEO" },
			activity: { ...el, elementType: "ACT" },
			transaction: { ...el, elementType: "TX" },
		},
		mitigantEffect: 0.5,
		mitigantFactors: [],
		nextReviewMonths: 12,
		...overrides,
	};
}

describe("ClientRiskRepository", () => {
	it("saveAssessment creates version 1 when no prior assessment", async () => {
		const create = vi.fn().mockResolvedValue({ id: "assess-1" });
		const update = vi.fn().mockResolvedValue({});
		const prisma = {
			clientRiskAssessment: {
				findFirst: vi.fn().mockResolvedValue(null),
				create,
			},
			client: { update },
		};

		const repo = new ClientRiskRepository(prisma as never);
		const result = minimalResult();

		await repo.saveAssessment(result, "admin", "manual");

		expect(create).toHaveBeenCalled();
		const data = create.mock.calls[0][0].data;
		expect(data.version).toBe(1);
		expect(data.clientId).toBe("cli-1");
		expect(update).toHaveBeenCalledWith({
			where: { id: "cli-1" },
			data: expect.objectContaining({
				riskLevel: "LOW",
				dueDiligenceLevel: "SIMPLIFIED",
			}),
		});
	});

	it("saveAssessment increments version and sets previousLevel", async () => {
		const create = vi.fn().mockResolvedValue({ id: "assess-2" });
		const prisma = {
			clientRiskAssessment: {
				findFirst: vi.fn().mockResolvedValue({
					version: 2,
					riskLevel: "MEDIUM",
				}),
				create,
			},
			client: { update: vi.fn() },
		};

		const repo = new ClientRiskRepository(prisma as never);
		const out = await repo.saveAssessment(minimalResult(), "sys");

		expect(out.previousLevel).toBe("MEDIUM");
		expect(create.mock.calls[0][0].data.version).toBe(3);
	});

	it("getLatest orders by version desc", async () => {
		const findFirst = vi.fn().mockResolvedValue({ id: "a1" });
		const prisma = { clientRiskAssessment: { findFirst } };
		const repo = new ClientRiskRepository(prisma as never);

		await repo.getLatest("cli-1", productionTenant("org-1"));

		expect(findFirst).toHaveBeenCalledWith({
			where: {
				clientId: "cli-1",
				organizationId: "org-1",
				environment: "production",
			},
			orderBy: { version: "desc" },
		});
	});

	it("getRiskDistribution counts UNASSESSED for unknown levels", async () => {
		const prisma = {
			client: {
				findMany: vi
					.fn()
					.mockResolvedValue([
						{ riskLevel: "LOW" },
						{ riskLevel: null },
						{ riskLevel: "INVALID" },
					]),
			},
		};
		const repo = new ClientRiskRepository(prisma as never);

		const dist = await repo.getRiskDistribution(productionTenant("org-1"));

		expect(dist.total).toBe(3);
		expect(dist.distribution.LOW).toBe(1);
		expect(dist.distribution.UNASSESSED).toBe(2);
	});
});
