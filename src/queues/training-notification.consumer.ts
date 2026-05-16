/**
 * Dispatch training notifications via notifications-svc (email optional).
 */

import type { Bindings } from "../types";
import type { TrainingNotificationJob } from "../lib/training/jobs";

export async function processTrainingNotificationJob(
	env: Bindings,
	job: TrainingNotificationJob,
): Promise<void> {
	const notifications = env.NOTIFICATIONS_SERVICE;
	if (!notifications?.notify) return;

	const title =
		job.kind === "cert_pdf_ready"
			? "Training certificate ready"
			: job.kind === "failed_max_attempts"
				? "Training quiz — attempts exhausted"
				: "Training reminder";

	const body =
		job.courseTitle != null
			? `${title}: ${job.courseTitle}`
			: `${title} (course ${job.courseId})`;

	await notifications.notify({
		tenantId: job.organizationId,
		target: { kind: "user", userId: job.userId },
		type: `aml.training.${job.kind}`,
		title,
		body,
		payload: job.extra ?? {},
		sendEmail:
			job.kind === "cert_pdf_ready" || job.kind === "failed_max_attempts",
		sourceService: "aml-svc",
		sourceEvent: job.kind,
	});
}
