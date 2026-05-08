import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../lib/prisma", () => ({
	getPrismaClient: vi.fn(),
}));

import { getPrismaClient } from "../lib/prisma";
import { runTrainingReminders } from "./training-reminders";

describe("runTrainingReminders", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns 0 when TRAINING_NOTIFICATION_QUEUE is not bound", async () => {
		const env = {} as Parameters<typeof runTrainingReminders>[0];
		const out = await runTrainingReminders(env);
		expect(out).toEqual({ enqueued: 0 });
		expect(getPrismaClient).not.toHaveBeenCalled();
	});

	it("enqueues reminder jobs for matching enrollments", async () => {
		const send = vi.fn().mockResolvedValue(undefined);
		const findMany = vi.fn().mockResolvedValue([
			{
				id: "e1",
				organizationId: "o1",
				userId: "u1",
				courseId: "c1",
				course: {
					titleI18n: { es: "Curso AML", en: "AML Course" },
				},
			},
		]);
		vi.mocked(getPrismaClient).mockReturnValue({
			trainingEnrollment: { findMany },
		} as never);

		const env = {
			TRAINING_NOTIFICATION_QUEUE: { send },
		} as unknown as Parameters<typeof runTrainingReminders>[0];

		const out = await runTrainingReminders(env);
		expect(out.enqueued).toBe(1);
		expect(send).toHaveBeenCalledWith(
			expect.objectContaining({
				kind: "reminder_due",
				organizationId: "o1",
				userId: "u1",
				courseTitle: "Curso AML",
				extra: { enrollmentId: "e1" },
			}),
		);
	});

	it("uses Training fallback title when course has no Spanish title", async () => {
		const send = vi.fn().mockResolvedValue(undefined);
		const findMany = vi.fn().mockResolvedValue([
			{
				id: "e1",
				organizationId: "o1",
				userId: "u1",
				courseId: "c1",
				course: {
					titleI18n: { en: "Only English" },
				},
			},
		]);
		vi.mocked(getPrismaClient).mockReturnValue({
			trainingEnrollment: { findMany },
		} as never);

		const env = {
			TRAINING_NOTIFICATION_QUEUE: { send },
		} as unknown as Parameters<typeof runTrainingReminders>[0];

		await runTrainingReminders(env);
		expect(send).toHaveBeenCalledWith(
			expect.objectContaining({
				courseTitle: "Training",
			}),
		);
	});
});
