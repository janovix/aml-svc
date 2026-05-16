import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";

import { purgeAmlOrganizations } from "./e2e-purge-organizations";

function mockPrisma(overrides: Record<string, unknown> = {}) {
	const del = vi.fn().mockResolvedValue({ count: 0 });
	const defaults = {
		chatAbuseEvent: { deleteMany: del },
		chatThread: { deleteMany: del },
		alert: { deleteMany: del },
		notice: { deleteMany: del },
		report: { deleteMany: del },
		import: { deleteMany: del },
		kycSession: {
			findMany: vi.fn().mockResolvedValue([]),
			deleteMany: del,
		},
		kycSessionEvent: { deleteMany: del },
		orgRiskAssessment: { deleteMany: del },
		clientRiskAssessment: { deleteMany: del },
		riskMethodology: { deleteMany: del },
		operation: { deleteMany: del },
		invoice: { deleteMany: del },
		uploadLink: { deleteMany: del },
		client: { deleteMany: del },
		organizationSettings: { deleteMany: del },
	};
	return { ...defaults, ...overrides } as unknown as PrismaClient;
}

describe("purgeAmlOrganizations", () => {
	it("returns immediately when organizationIds is empty", async () => {
		const prisma = mockPrisma();
		await expect(purgeAmlOrganizations(prisma, [])).resolves.toEqual({
			deletedOrgs: 0,
			errors: [],
		});
	});

	it("records errors from failing steps but continues", async () => {
		const prisma = mockPrisma({
			chatAbuseEvent: {
				deleteMany: vi.fn().mockRejectedValue(new Error("constraint")),
			},
		});

		const result = await purgeAmlOrganizations(prisma, ["org-a"]);

		expect(result.deletedOrgs).toBe(1);
		expect(result.errors.some((e) => e.includes("chatAbuseEvent"))).toBe(true);
	});
});
