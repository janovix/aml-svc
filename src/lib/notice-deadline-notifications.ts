/**
 * Notice Deadline Notifications
 */

import { t, type EmailI18nPayload, type LanguageCode } from "./i18n";
import type { Bindings } from "../types";
import { getPrismaClient } from "./prisma";
import { getNoticeSubmissionDeadline } from "../domain/notice/types";
import { getOrganizationLanguageForTenant } from "./org-language";

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

	if (day <= 17) {
		return { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 };
	}

	let m = now.getUTCMonth() + 2;
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
	notifService: import("../types").NotificationsRpc,
	info: PendingOrgInfo,
): Promise<void> {
	const severity = severityForDays(info.daysUntilDeadline);
	const deadlineStr = info.deadline.toISOString().slice(0, 10);
	const period = `${info.year}-${String(info.month).padStart(2, "0")}`;

	const lang: LanguageCode = await getOrganizationLanguageForTenant(
		env,
		info.organizationId,
	);

	const title =
		info.daysUntilDeadline <= 1
			? t(lang, "notice.deadline.title_tomorrow", {
					pendingAlertCount: info.pendingAlertCount,
				})
			: t(lang, "notice.deadline.title_days", {
					daysUntilDeadline: info.daysUntilDeadline,
					pendingAlertCount: info.pendingAlertCount,
				});

	const body = t(lang, "notice.deadline.body", {
		pendingAlertCount: info.pendingAlertCount,
		period,
		deadlineStr,
	});

	const titleKey: EmailI18nPayload["titleKey"] =
		info.daysUntilDeadline <= 1
			? "notice.deadline.title_tomorrow"
			: "notice.deadline.title_days";

	const emailI18n: EmailI18nPayload = {
		titleKey,
		bodyKey: "notice.deadline.body",
		titleParams:
			info.daysUntilDeadline <= 1
				? { pendingAlertCount: info.pendingAlertCount }
				: {
						daysUntilDeadline: info.daysUntilDeadline,
						pendingAlertCount: info.pendingAlertCount,
					},
		bodyParams: {
			pendingAlertCount: info.pendingAlertCount,
			period,
			deadlineStr,
		},
	};

	await notifService.notify({
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
		emailI18n,
	});
}
