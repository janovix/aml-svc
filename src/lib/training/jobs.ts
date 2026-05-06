/**
 * Queue message payloads for AML training (cert PDF generation + notifications).
 */

export interface TrainingCertGenJob {
	certificationId: string;
}

export type TrainingNotificationKind =
	| "enrollment_assigned"
	| "reminder_due"
	| "expiring_soon"
	| "certified"
	| "failed_max_attempts"
	| "cert_pdf_ready";

export interface TrainingNotificationJob {
	kind: TrainingNotificationKind;
	organizationId: string;
	userId: string;
	courseId: string;
	courseTitle?: string;
	extra?: Record<string, unknown>;
}
