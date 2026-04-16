import { describe, expect, it, vi, beforeEach } from "vitest";
import { productionTenant } from "../../../lib/tenant-context";
import { ClientRiskService } from "./service";

describe("ClientRiskService", () => {
	let prisma: {
		clientRiskAssessment: {
			findFirst: ReturnType<typeof vi.fn>;
			findMany: ReturnType<typeof vi.fn>;
		};
		client: { findMany: ReturnType<typeof vi.fn> };
	};
	let service: ClientRiskService;

	beforeEach(() => {
		prisma = {
			clientRiskAssessment: {
				findFirst: vi.fn(),
				findMany: vi.fn(),
			},
			client: {
				findMany: vi.fn(),
			},
		};
		service = new ClientRiskService(prisma as never);
	});

	const orgTenant = productionTenant("org-1");

	it("getLatestAssessment delegates to repository", async () => {
		const row = { id: "r1", version: 1 };
		prisma.clientRiskAssessment.findFirst.mockResolvedValue(row);

		const result = await service.getLatestAssessment("cli-1", orgTenant);

		expect(result).toEqual(row);
		expect(prisma.clientRiskAssessment.findFirst).toHaveBeenCalledWith({
			where: {
				clientId: "cli-1",
				organizationId: "org-1",
				environment: "production",
			},
			orderBy: { version: "desc" },
		});
	});

	it("getAssessmentHistory delegates to repository", async () => {
		prisma.clientRiskAssessment.findMany.mockResolvedValue([]);

		await service.getAssessmentHistory("cli-1", orgTenant);

		expect(prisma.clientRiskAssessment.findMany).toHaveBeenCalledWith({
			where: {
				clientId: "cli-1",
				organizationId: "org-1",
				environment: "production",
			},
			orderBy: { version: "desc" },
		});
	});

	it("getClientsDueForReview uses repository with review date", async () => {
		prisma.client.findMany.mockResolvedValue([
			{ id: "c1", organizationId: "org-1" },
		]);

		const list = await service.getClientsDueForReview(orgTenant);

		expect(list).toHaveLength(1);
		expect(prisma.client.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({
					organizationId: "org-1",
					environment: "production",
					deletedAt: null,
				}),
			}),
		);
	});

	it("getRiskDistribution delegates to repository", async () => {
		prisma.client.findMany.mockResolvedValue([{ riskLevel: "LOW" }]);

		const dist = await service.getRiskDistribution(orgTenant);

		expect(dist.total).toBe(1);
		expect(dist.distribution.LOW).toBe(1);
	});
});
