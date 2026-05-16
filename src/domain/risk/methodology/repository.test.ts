import { describe, it, expect, vi, beforeEach } from "vitest";
import { productionTenant } from "../../../lib/tenant-context";
import { RiskMethodologyRepository } from "./repository";

function minimalDbMethodology(
	id: string,
	scope: "ORGANIZATION" | "ACTIVITY" | "SYSTEM",
) {
	return {
		id,
		scope,
		name: "Test methodology",
		version: 1,
		scaleMax: 9,
		categories: [
			{
				name: "CAT",
				displayName: "Cat",
				weight: 1,
				displayOrder: 0,
				factors: [
					{
						name: "F",
						displayName: "F",
						weight: 1,
						factorType: "BOOLEAN",
						dataSource: "client.isPep",
						displayOrder: 0,
						scoreMaps: [
							{
								conditionType: "BOOLEAN",
								conditionValue: "true",
								score: 1,
								label: null,
								displayOrder: 0,
							},
						],
					},
				],
			},
		],
		thresholds: [
			{
				riskLevel: "LOW",
				minScore: 0,
				maxScore: 3,
				ddLevel: "SIMPLIFIED",
				reviewMonths: 12,
				displayOrder: 0,
			},
		],
		mitigants: [
			{
				mitigantKey: "m1",
				displayName: "M",
				maxEffect: 0.5,
				weight: 1,
				dataSource: "manual",
				displayOrder: 0,
			},
		],
	};
}

describe("RiskMethodologyRepository", () => {
	const tenant = productionTenant("org-1");

	beforeEach(() => {
		vi.restoreAllMocks();
	});

	it("resolve returns ORGANIZATION scope when org methodology exists", async () => {
		const row = minimalDbMethodology("m-org", "ORGANIZATION");
		const prisma = {
			riskMethodology: {
				findFirst: vi.fn().mockResolvedValueOnce(row),
			},
		} as never;
		const repo = new RiskMethodologyRepository(prisma);
		const out = await repo.resolve(tenant, "VEH");
		expect(out.sourceScope).toBe("ORGANIZATION");
		expect(out.name).toBe("Test methodology");
	});

	it("resolve falls through to ACTIVITY then SYSTEM", async () => {
		const sysRow = minimalDbMethodology("m-sys", "SYSTEM");
		const prisma = {
			riskMethodology: {
				findFirst: vi
					.fn()
					.mockResolvedValueOnce(null)
					.mockResolvedValueOnce(null)
					.mockResolvedValueOnce(sysRow),
			},
		} as never;
		const repo = new RiskMethodologyRepository(prisma);
		const out = await repo.resolve(tenant, "VEH");
		expect(out.sourceScope).toBe("SYSTEM");
	});

	it("getById returns null when missing", async () => {
		const prisma = {
			riskMethodology: {
				findUnique: vi.fn().mockResolvedValue(null),
			},
		} as never;
		const repo = new RiskMethodologyRepository(prisma);
		await expect(repo.getById("x")).resolves.toBeNull();
	});

	it("listAll respects scope filter", async () => {
		const row = minimalDbMethodology("m1", "SYSTEM");
		const findMany = vi.fn().mockResolvedValue([row]);
		const prisma = { riskMethodology: { findMany } } as never;
		const repo = new RiskMethodologyRepository(prisma);
		await repo.listAll("SYSTEM");
		expect(findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { scope: "SYSTEM", status: { not: "ARCHIVED" } },
			}),
		);
	});

	it("archive writes audit log", async () => {
		const update = vi.fn().mockResolvedValue(undefined);
		const create = vi.fn().mockResolvedValue(undefined);
		const prisma = {
			riskMethodology: { update },
			methodologyAuditLog: { create },
		} as never;
		const repo = new RiskMethodologyRepository(prisma);
		await repo.archive("mid", "u1", "because");
		expect(update).toHaveBeenCalled();
		expect(create).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					changeType: "ARCHIVED",
					justification: "because",
				}),
			}),
		);
	});

	it("resetOrgToDefault archives active org methodology when present", async () => {
		const archive = vi
			.spyOn(RiskMethodologyRepository.prototype, "archive")
			.mockResolvedValue(undefined);
		const prisma = {
			riskMethodology: {
				findFirst: vi.fn().mockResolvedValue({ id: "existing" }),
			},
		} as never;
		const repo = new RiskMethodologyRepository(prisma);
		await repo.resetOrgToDefault(tenant, "u1");
		expect(archive).toHaveBeenCalledWith(
			"existing",
			"u1",
			"Reset to default methodology",
		);
	});
});
