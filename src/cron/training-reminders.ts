/**
 * Daily cron: enqueue reminder notifications for overdue / expiring training (best-effort).
 */

import type { Bindings } from "../types";
import type { TrainingNotificationJob } from "../lib/training/jobs";

export async function runTrainingReminders(env: Bindings): Promise<{
	enqueued: number;
}> {
	const queue = env.TRAINING_NOTIFICATION_QUEUE;
	if (!queue) {
		return { enqueued: 0 };
	}

	const { getPrismaClient } = await import("../lib/prisma");
	const prisma = getPrismaClient(env.DB);

	const soon = new Date();
	soon.setDate(soon.getDate() + 30);

	const enrollments = await prisma.trainingEnrollment.findMany({
		where: {
			status: { in: ["ASSIGNED", "IN_PROGRESS"] },
			validUntil: { lte: soon, gt: new Date() },
		},
		take: 50,
		include: { course: { select: { titleI18n: true } } },
	});

	let enqueued = 0;
	for (const e of enrollments) {
		const title =
			typeof e.course.titleI18n === "object" &&
			e.course.titleI18n !== null &&
			"es" in e.course.titleI18n
				? String((e.course.titleI18n as { es?: string }).es ?? "Training")
				: "Training";

		const job: TrainingNotificationJob = {
			kind: "reminder_due",
			organizationId: e.organizationId,
			userId: e.userId,
			courseId: e.courseId,
			courseTitle: title,
			extra: { enrollmentId: e.id },
		};
		await queue.send(job);
		enqueued++;
	}

	return { enqueued };
}
