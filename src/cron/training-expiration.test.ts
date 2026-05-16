import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../lib/prisma", () => ({
	getPrismaClient: vi.fn(),
}));

import { getPrismaClient } from "../lib/prisma";
import { runTrainingExpiration } from "./training-expiration";

describe("runTrainingExpiration", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("marks expired enrollments and returns count", async () => {
		const updateMany = vi.fn().mockResolvedValue({ count: 7 });
		vi.mocked(getPrismaClient).mockReturnValue({
			trainingEnrollment: { updateMany },
		} as never);

		const env = { DB: {} as D1Database } as Parameters<
			typeof runTrainingExpiration
		>[0];

		const out = await runTrainingExpiration(env);
		expect(out).toEqual({ expiredEnrollments: 7 });
		expect(updateMany).toHaveBeenCalledWith({
			where: {
				validUntil: { lt: expect.any(Date) },
				status: { in: ["COMPLETED", "IN_PROGRESS", "ASSIGNED"] },
			},
			data: { status: "EXPIRED" },
		});
	});
});
