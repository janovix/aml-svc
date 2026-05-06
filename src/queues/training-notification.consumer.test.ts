import { describe, expect, it, vi } from "vitest";

import type { TrainingNotificationJob } from "../lib/training/jobs";
import type { Bindings } from "../types";
import { processTrainingNotificationJob } from "./training-notification.consumer";

describe("processTrainingNotificationJob", () => {
	it("returns early when notifications binding is missing", async () => {
		await expect(
			processTrainingNotificationJob(
				{} as Bindings,
				{
					kind: "reminder_due",
					organizationId: "o1",
					userId: "u1",
					courseId: "c1",
				} as TrainingNotificationJob,
			),
		).resolves.toBeUndefined();
	});

	it("sends notify with expected shape for cert_pdf_ready", async () => {
		const notify = vi.fn().mockResolvedValue(undefined);
		const job: TrainingNotificationJob = {
			kind: "cert_pdf_ready",
			organizationId: "o1",
			userId: "u1",
			courseId: "c1",
			courseTitle: "Course A",
			extra: { certificationId: "cert1" },
		};

		await processTrainingNotificationJob(
			{
				NOTIFICATIONS_SERVICE: { notify },
			} as unknown as Bindings,
			job,
		);

		expect(notify).toHaveBeenCalledWith(
			expect.objectContaining({
				title: "Training certificate ready",
				sendEmail: true,
				type: "aml.training.cert_pdf_ready",
			}),
		);
	});

	it("uses default titles for reminder and failed_max_attempts", async () => {
		const notify = vi.fn().mockResolvedValue(undefined);
		const env = {
			NOTIFICATIONS_SERVICE: { notify },
		} as unknown as Bindings;

		await processTrainingNotificationJob(env, {
			kind: "reminder_due",
			organizationId: "o1",
			userId: "u1",
			courseId: "c9",
		} as TrainingNotificationJob);

		await processTrainingNotificationJob(env, {
			kind: "failed_max_attempts",
			organizationId: "o1",
			userId: "u1",
			courseId: "c9",
		} as TrainingNotificationJob);

		expect(notify.mock.calls[0][0].title).toBe("Training reminder");
		expect(notify.mock.calls[1][0].title).toBe(
			"Training quiz — attempts exhausted",
		);
	});

	it("falls back to course id in body when title missing", async () => {
		const notify = vi.fn().mockResolvedValue(undefined);
		await processTrainingNotificationJob(
			{
				NOTIFICATIONS_SERVICE: { notify },
			} as unknown as Bindings,
			{
				kind: "reminder_due",
				organizationId: "o1",
				userId: "u1",
				courseId: "course-xyz",
			} as TrainingNotificationJob,
		);

		expect(notify.mock.calls[0][0].body).toContain("course-xyz");
	});
});
