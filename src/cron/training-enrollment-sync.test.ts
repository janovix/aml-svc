import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../lib/prisma", () => ({
	getPrismaClient: vi.fn(),
}));

import { getPrismaClient } from "../lib/prisma";
import { runTrainingEnrollmentSync } from "./training-enrollment-sync";

describe("runTrainingEnrollmentSync", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns 0 upserts when AUTH_SERVICE has no listActiveMembers", async () => {
		const env = { AUTH_SERVICE: {} } as Parameters<
			typeof runTrainingEnrollmentSync
		>[0];

		const out = await runTrainingEnrollmentSync(env);
		expect(out).toEqual({ upserts: 0 });
		expect(getPrismaClient).not.toHaveBeenCalled();
	});

	it("returns 0 when no mandatory published courses exist", async () => {
		const upsert = vi.fn();
		vi.mocked(getPrismaClient).mockReturnValue({
			trainingCourse: {
				findMany: vi.fn().mockResolvedValue([]),
			},
			trainingEnrollment: { upsert },
		} as never);

		const env = {
			AUTH_SERVICE: {
				listActiveMembers: vi
					.fn()
					.mockResolvedValue({ items: [], nextCursor: null }),
			},
		} as unknown as Parameters<typeof runTrainingEnrollmentSync>[0];

		const out = await runTrainingEnrollmentSync(env);
		expect(out).toEqual({ upserts: 0 });
		expect(upsert).not.toHaveBeenCalled();
	});

	it("upserts enrollments for each member times course across pages", async () => {
		const upsert = vi.fn().mockResolvedValue({});
		vi.mocked(getPrismaClient).mockReturnValue({
			trainingCourse: {
				findMany: vi.fn().mockResolvedValue([{ id: "c1", version: 2 }]),
			},
			trainingEnrollment: { upsert },
		} as never);

		const listActiveMembers = vi
			.fn()
			.mockResolvedValueOnce({
				items: [
					{ organizationId: "o1", userId: "u1" },
					{ organizationId: "o1", userId: "u2" },
				],
				nextCursor: "cur2",
			})
			.mockResolvedValueOnce({
				items: [{ organizationId: "o2", userId: "u3" }],
				nextCursor: null,
			});

		const env = {
			AUTH_SERVICE: { listActiveMembers },
		} as unknown as Parameters<typeof runTrainingEnrollmentSync>[0];

		const out = await runTrainingEnrollmentSync(env);
		expect(out.upserts).toBe(3);
		expect(upsert).toHaveBeenCalledTimes(3);
		expect(listActiveMembers).toHaveBeenCalledTimes(2);
	});
});
