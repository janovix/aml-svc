/**
 * Notice Deadline Notifications
 *
 * Checks for organizations with pending (unsubmitted) alerts whose
 * SAT submission deadline is approaching and sends email + in-app
 * notifications at 3 days, 2 days, and 1 day before the deadline.
 *
 * Designed to run as a daily cron job (once per day, e.g. 14:00 UTC).
 * Uses KV for deduplication so the same reminder is never sent twice.
 */

import type { Bindings } from "../types";
import { getPrismaClient } from "./prisma";
import { getNoticeSubmissionDeadline } from "../domain/notice/types";

const LOG_TAG = "[notice-deadline]";

type Severity = "info" | "warn" | "critical";

interface PendingOrgInfo {
	organizationId: string;
	pendingAlertCount: number;
	year: number;
	month: number;
	deadline: Date;
	daysUntilDeadline: number;
}

function getReportableMonth(now: Date): { year: number; month: number } {
	const day = now.getUTCDate();

	// Deadline is the 17th of the reported month.
	// Before/on the 17th → current month is the reportable period.
	// After the 17th → next month's period is open (deadline is next month's 17th).
	if (day <= 17) {
		return { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 };
	}

	let m = now.getUTCMonth() + 2; // next month (1-indexed)
	let y = now.getUTCFullYear();
	if (m > 12) {
		m = 1;
		y += 1;
	}
	return { year: y, month: m };
}

function daysBetween(a: Date, b: Date): number {
	const msPerDay = 86_400_000;
	return Math.ceil((b.getTime() - a.getTime()) / msPerDay);
}

function kvDedupeKey(
	orgId: string,
	year: number,
	month: number,
	daysLeft: number,
): string {
	return `notice-deadline:${orgId}:${year}-${String(month).padStart(2, "0")}:d${daysLeft}`;
}

function severityForDays(daysLeft: number): Severity {
	if (daysLeft <= 1) return "critical";
	if (daysLeft <= 2) return "warn";
	return "info";
}

/**
 * Main entry point — called by the scheduled handler.
 */
export async function processNoticeDeadlineNotifications(
	env: Bindings,
	now = new Date(),
): Promise<{ checked: number; notified: number }> {
	const prisma = getPrismaClient(env.DB);
	const notifService = env.NOTIFICATIONS_SERVICE;
	const kv = env.CACHE;

	if (!notifService) {
		console.warn(`${LOG_TAG} NOTIFICATIONS_SERVICE not bound — skipping`);
		return { checked: 0, notified: 0 };
	}

	const { year, month } = getReportableMonth(now);
	const deadline = getNoticeSubmissionDeadline(year, month);
	const daysLeft = daysBetween(now, deadline);

	if (daysLeft > 3 || daysLeft < 0) {
		console.log(
			`${LOG_TAG} Deadline for ${year}-${month} is ${daysLeft} days away — no reminders needed`,
		);
		return { checked: 0, notified: 0 };
	}

	const orgsWithPending = await prisma.alert.groupBy({
		by: ["organizationId"],
		where: {
			status: { in: ["DETECTED", "OVERDUE"] },
			noticeId: null,
		},
		_count: { id: true },
	});

	if (orgsWithPending.length === 0) {
		console.log(`${LOG_TAG} No orgs with pending alerts`);
		return { checked: 0, notified: 0 };
	}

	const pending: PendingOrgInfo[] = orgsWithPending.map((row) => ({
		organizationId: row.organizationId,
		pendingAlertCount: row._count.id,
		year,
		month,
		deadline,
		daysUntilDeadline: daysLeft,
	}));

	let notified = 0;

	for (const info of pending) {
		const key = kvDedupeKey(info.organizationId, year, month, daysLeft);

		if (kv) {
			const already = await kv.get(key);
			if (already) {
				console.log(
					`${LOG_TAG} Already notified ${info.organizationId} for d-${daysLeft}`,
				);
				continue;
			}
		}

		try {
			await sendDeadlineNotification(env, notifService, info);
			notified++;

			if (kv) {
				await kv.put(key, "1", { expirationTtl: 30 * 86_400 });
			}
		} catch (err) {
			console.error(`${LOG_TAG} Failed for org ${info.organizationId}:`, err);
		}
	}

	console.log(
		`${LOG_TAG} Checked ${pending.length} orgs, notified ${notified}`,
	);
	return { checked: pending.length, notified };
}

async function sendDeadlineNotification(
	env: Bindings,
	notifService: Fetcher,
	info: PendingOrgInfo,
): Promise<void> {
	const severity = severityForDays(info.daysUntilDeadline);
	const deadlineStr = info.deadline.toISOString().slice(0, 10);

	const title =
		info.daysUntilDeadline <= 1
			? `Vencimiento mañana: ${info.pendingAlertCount} alertas sin reportar`
			: `${info.daysUntilDeadline} días para el vencimiento: ${info.pendingAlertCount} alertas pendientes`;

	const body =
		`Tiene ${info.pendingAlertCount} alerta(s) pendiente(s) de incluir en un aviso SAT ` +
		`para el periodo ${info.year}-${String(info.month).padStart(2, "0")}. ` +
		`La fecha límite de presentación es el ${deadlineStr}. ` +
		`Ingrese a la plataforma para generar y enviar su aviso antes del vencimiento.`;

	const response = await notifService.fetch(
		new Request("https://notifications-svc/internal/notify", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${env.INTERNAL_SERVICE_SECRET ?? "service-token"}`,
			},
			body: JSON.stringify({
				tenantId: info.organizationId,
				target: { kind: "org" },
				channelSlug: "system",
				type: "aml.notice.deadline_reminder",
				title,
				body,
				payload: {
					year: info.year,
					month: info.month,
					pendingAlertCount: info.pendingAlertCount,
					daysUntilDeadline: info.daysUntilDeadline,
					deadline: deadlineStr,
				},
				severity,
				sendEmail: true,
				sourceService: "aml-svc",
				sourceEvent: "notice.deadline_reminder",
			}),
		}),
	);

	if (!response.ok) {
		const text = await response.text();
		console.error(`${LOG_TAG} notifications-svc ${response.status}: ${text}`);
	}
}
