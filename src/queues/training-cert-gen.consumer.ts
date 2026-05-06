/**
 * Generate certificate PDF and store under `lms/certs/{organizationId}/{certificationId}.pdf`.
 */

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

import { getPrismaClient } from "../lib/prisma";
import { uploadToR2 } from "../lib/r2-upload";
import type { Bindings } from "../types";
import type { TrainingCertGenJob } from "../lib/training/jobs";

export async function processTrainingCertGenJob(
	env: Bindings,
	job: TrainingCertGenJob,
): Promise<void> {
	const prisma = getPrismaClient(env.DB);

	const cert = await prisma.trainingCertification.findUnique({
		where: { id: job.certificationId },
		include: {
			enrollment: {
				include: {
					course: { select: { titleI18n: true } },
				},
			},
		},
	});

	if (!cert) return;

	const doc = await PDFDocument.create();
	const page = doc.addPage([595.28, 841.89]);
	const font = await doc.embedFont(StandardFonts.Helvetica);
	const title =
		typeof cert.enrollment.course.titleI18n === "object" &&
		cert.enrollment.course.titleI18n !== null &&
		"es" in cert.enrollment.course.titleI18n
			? String(
					(cert.enrollment.course.titleI18n as { es?: string }).es ??
						"AML Training",
				)
			: "AML Training";

	page.drawText("Janovix — AML Training Certificate", {
		x: 50,
		y: 780,
		size: 18,
		font,
		color: rgb(0, 0, 0),
	});

	page.drawText(title, {
		x: 50,
		y: 740,
		size: 14,
		font,
		color: rgb(0, 0, 0),
	});

	page.drawText(`Certificate: ${cert.certificateNumber}`, {
		x: 50,
		y: 700,
		size: 12,
		font,
	});
	page.drawText(`Score: ${cert.score}%`, { x: 50, y: 680, size: 12, font });
	page.drawText(`Issued: ${cert.issuedAt.toISOString()}`, {
		x: 50,
		y: 660,
		size: 12,
		font,
	});
	page.drawText(`Expires: ${cert.expiresAt.toISOString()}`, {
		x: 50,
		y: 640,
		size: 12,
		font,
	});

	const pdfBytes = await doc.save();
	const key = `lms/certs/${cert.organizationId}/${cert.id}.pdf`;

	await uploadToR2({
		bucket: env.R2_BUCKET,
		key,
		content: pdfBytes,
		contentType: "application/pdf",
	});

	await prisma.trainingCertification.update({
		where: { id: cert.id },
		data: { pdfR2Key: key },
	});

	const notif = env.TRAINING_NOTIFICATION_QUEUE;
	if (notif) {
		await notif.send({
			kind: "cert_pdf_ready",
			organizationId: cert.organizationId,
			userId: cert.userId,
			courseId: cert.courseId,
			extra: { certificationId: cert.id },
		});
	}
}
