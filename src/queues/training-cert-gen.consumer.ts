/**
 * Generate certificate PDF and store under `lms/certs/{organizationId}/{certificationId}.pdf`.
 */

import {
	PDFDocument,
	StandardFonts,
	type PDFFont,
	type PDFPage,
	rgb,
} from "pdf-lib";

import { getPrismaClient } from "../lib/prisma";
import { uploadToR2 } from "../lib/r2-upload";
import type { Bindings } from "../types";
import type { TrainingCertGenJob } from "../lib/training/jobs";

const PAGE_W = 841.89;
const PAGE_H = 595.28;
const INSET = 24;
const BRAND_BAR_W = 60;
const CONTENT_LEFT = BRAND_BAR_W + 16;
const CONTENT_RIGHT_PAD = 40;
/** Brand navy / violet aligned with product tokens (~ #1E1B2E, #7C3AED). */
const COLOR_NAVY = rgb(30 / 255, 27 / 255, 46 / 255);
const COLOR_VIOLET = rgb(124 / 255, 58 / 255, 237 / 255);
const COLOR_TEXT = rgb(26 / 255, 24 / 255, 38 / 255);
const COLOR_MUTED = rgb(90 / 255, 88 / 255, 102 / 255);
const COLOR_BORDER = rgb(0.82, 0.8, 0.88);

function courseTitleEs(titleI18n: unknown): string {
	if (
		typeof titleI18n === "object" &&
		titleI18n !== null &&
		"es" in titleI18n
	) {
		const es = (titleI18n as { es?: string }).es;
		if (typeof es === "string" && es.trim().length > 0) return es.trim();
	}
	return "Capacitación AML";
}

function wrapLines(
	font: PDFFont,
	text: string,
	fontSize: number,
	maxWidth: number,
): string[] {
	const words = text.split(/\s+/).filter(Boolean);
	const lines: string[] = [];
	let line = "";

	const pushLongWord = (word: string) => {
		let chunk = "";
		for (const ch of word) {
			const candidate = chunk + ch;
			if (font.widthOfTextAtSize(candidate, fontSize) <= maxWidth) {
				chunk = candidate;
			} else {
				if (chunk) lines.push(chunk);
				chunk = ch;
			}
		}
		return chunk;
	};

	for (const word of words) {
		const candidate = line ? `${line} ${word}` : word;
		if (font.widthOfTextAtSize(candidate, fontSize) <= maxWidth) {
			line = candidate;
		} else {
			if (line) lines.push(line);
			if (font.widthOfTextAtSize(word, fontSize) > maxWidth) {
				line = pushLongWord(word);
			} else {
				line = word;
			}
		}
	}
	if (line) lines.push(line);
	return lines;
}

function drawCenteredLine(
	page: PDFPage,
	text: string,
	cx: number,
	y: number,
	font: PDFFont,
	size: number,
	color = COLOR_TEXT,
) {
	const w = font.widthOfTextAtSize(text, size);
	page.drawText(text, { x: cx - w / 2, y, size, font, color });
}

/** @returns Y coordinate below the name block (descending layout). */
function drawRecipientName(
	page: PDFPage,
	text: string,
	cx: number,
	yTop: number,
	font: PDFFont,
	maxWidth: number,
): number {
	let size = 32;
	const minSize = 18;
	while (size >= minSize) {
		const w = font.widthOfTextAtSize(text, size);
		if (w <= maxWidth) {
			page.drawText(text, {
				x: cx - w / 2,
				y: yTop,
				size,
				font,
				color: COLOR_NAVY,
			});
			return yTop - size - 12;
		}
		size -= 2;
	}
	const lines = wrapLines(font, text, minSize, maxWidth);
	let lineY = yTop;
	for (const ln of lines) {
		drawCenteredLine(page, ln, cx, lineY, font, minSize, COLOR_NAVY);
		lineY -= minSize + 6;
	}
	return lineY - 8;
}

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
	const page = doc.addPage([PAGE_W, PAGE_H]);

	const helvetica = await doc.embedFont(StandardFonts.Helvetica);
	const helveticaBold = await doc.embedFont(StandardFonts.HelveticaBold);
	const timesBold = await doc.embedFont(StandardFonts.TimesRomanBold);
	const timesItalic = await doc.embedFont(StandardFonts.TimesRomanItalic);

	const dateFmt = new Intl.DateTimeFormat("es-MX", { dateStyle: "long" });

	const courseTitle = courseTitleEs(cert.enrollment.course.titleI18n);
	const recipientRaw =
		cert.userName != null && cert.userName.trim().length > 0
			? cert.userName.trim()
			: "Usuario";
	const recipientLine = `c. ${recipientRaw}`;
	const orgLine =
		cert.organizationName != null && cert.organizationName.trim().length > 0
			? cert.organizationName.trim()
			: "su organización";

	const maxTextWidth = PAGE_W - CONTENT_LEFT - CONTENT_RIGHT_PAD;
	const contentCx = CONTENT_LEFT + maxTextWidth / 2;

	page.drawRectangle({
		x: 0,
		y: 0,
		width: BRAND_BAR_W,
		height: PAGE_H,
		color: COLOR_NAVY,
	});

	page.drawRectangle({
		x: BRAND_BAR_W - 3,
		y: 0,
		width: 3,
		height: PAGE_H,
		color: COLOR_VIOLET,
	});

	page.drawRectangle({
		x: INSET,
		y: INSET,
		width: PAGE_W - INSET * 2,
		height: PAGE_H - INSET * 2,
		borderColor: COLOR_BORDER,
		borderWidth: 1,
	});

	let y = PAGE_H - INSET - 28;

	const folio = `Folio: ${cert.certificateNumber}`;
	const folioW = helvetica.widthOfTextAtSize(folio, 10);
	page.drawText(folio, {
		x: PAGE_W - INSET - folioW,
		y,
		size: 10,
		font: helvetica,
		color: COLOR_MUTED,
	});

	page.drawText("JANOVIX", {
		x: CONTENT_LEFT,
		y,
		size: 14,
		font: helveticaBold,
		color: COLOR_VIOLET,
	});

	y -= 52;
	drawCenteredLine(
		page,
		"CERTIFICADO",
		contentCx,
		y,
		timesBold,
		44,
		COLOR_VIOLET,
	);
	y -= 28;
	drawCenteredLine(
		page,
		"de finalización de capacitación",
		contentCx,
		y,
		timesItalic,
		15,
		COLOR_MUTED,
	);
	y -= 18;
	page.drawLine({
		start: { x: contentCx - 72, y: y + 6 },
		end: { x: contentCx + 72, y: y + 6 },
		thickness: 0.75,
		color: COLOR_VIOLET,
	});
	y -= 36;
	drawCenteredLine(page, "Janovix certifica que", contentCx, y, helvetica, 13);
	y -= 40;
	y = drawRecipientName(
		page,
		recipientLine,
		contentCx,
		y,
		timesItalic,
		maxTextWidth,
	);
	y -= 16;

	const bodyLead =
		"ha completado satisfactoriamente el curso de formación en materia de prevención de lavado de dinero.";
	const leadLines = wrapLines(helvetica, bodyLead, 13, maxTextWidth);
	for (const ln of leadLines) {
		drawCenteredLine(page, ln, contentCx, y, helvetica, 13);
		y -= 16;
	}
	y -= 8;

	const quotedTitle = `«${courseTitle}»`;
	const titleLines = wrapLines(helveticaBold, quotedTitle, 15, maxTextWidth);
	for (const ln of titleLines) {
		drawCenteredLine(page, ln, contentCx, y, helveticaBold, 15, COLOR_NAVY);
		y -= 20;
	}
	y -= 6;

	const scoreLine = `Calificación obtenida: ${cert.score}%.`;
	drawCenteredLine(page, scoreLine, contentCx, y, helvetica, 13);
	y -= 22;

	const orgText = `Organización: ${orgLine}`;
	const orgLines = wrapLines(helvetica, orgText, 11, maxTextWidth);
	for (const ln of orgLines) {
		drawCenteredLine(page, ln, contentCx, y, helvetica, 11, COLOR_MUTED);
		y -= 14;
	}

	const FOOTER_Y = INSET + 56;
	const issuedLabel = `Emitido: ${dateFmt.format(cert.issuedAt)}`;
	const expiresLabel = `Vigencia: ${dateFmt.format(cert.expiresAt)}`;

	const sigX = CONTENT_LEFT;
	const sigLineW = 200;
	page.drawLine({
		start: { x: sigX, y: FOOTER_Y },
		end: { x: sigX + sigLineW, y: FOOTER_Y },
		thickness: 0.6,
		color: COLOR_MUTED,
	});
	page.drawText("Equipo Janovix", {
		x: sigX,
		y: FOOTER_Y - 14,
		size: 10,
		font: helvetica,
		color: COLOR_MUTED,
	});

	const labelSize = 10;
	const issuedW = helvetica.widthOfTextAtSize(issuedLabel, labelSize);
	const expiresW = helvetica.widthOfTextAtSize(expiresLabel, labelSize);
	const blockX = PAGE_W - INSET - Math.max(issuedW, expiresW);
	page.drawText(issuedLabel, {
		x: blockX,
		y: FOOTER_Y + 2,
		size: labelSize,
		font: helvetica,
		color: COLOR_MUTED,
	});
	page.drawText(expiresLabel, {
		x: blockX,
		y: FOOTER_Y - 14,
		size: labelSize,
		font: helvetica,
		color: COLOR_MUTED,
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
