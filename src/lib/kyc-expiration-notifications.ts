/**
 * KYC Session Expiration Notifications
 *
 * Checks for ACTIVE or IN_PROGRESS KYC sessions whose `expires_at` falls
 * within the next 24 hours and notifies the owning organization plus the
 * client (if an email was previously sent).
 *
 * Also calls `KycSessionRepository.expireStale()` to bulk-expire sessions
 * that are already past their deadline.
 *
 * Uses KV deduplication to avoid duplicate notifications on successive cron runs.
 */

import type { Bindings } from "../types";
import { getPrismaClient } from "./prisma";
import { KycSessionRepository } from "../domain/kyc-session";

const LOG_TAG = "[kyc-expiry]";

const EXPIRY_WINDOW_HOURS = 24;

interface ExpiringSessions {
	id: string;
	organizationId: string;
	clientId: string;
	expiresAt: Date;
	emailSentAt: Date | null;
	token: string;
}

function kvDedupeKey(sessionId: string): string {
	return `kyc-expiry-notified:${sessionId}`;
}

export async function processKycExpirationNotifications(
	env: Bindings,
	now = new Date(),
): Promise<{ expiredCount: number; notifiedCount: number }> {
	const prisma = getPrismaClient(env.DB);
	const notifService = env.NOTIFICATIONS_SERVICE;
	const kv = env.CACHE;

	const repo = new KycSessionRepository(prisma);
	const expiredCount = await repo.expireStale();
	if (expiredCount > 0) {
		console.log(`${LOG_TAG} Bulk-expired ${expiredCount} stale sessions`);
	}

	if (!notifService) {
		console.warn(`${LOG_TAG} NOTIFICATIONS_SERVICE not bound — skipping`);
		return { expiredCount, notifiedCount: 0 };
	}

	const windowEnd = new Date(now.getTime() + EXPIRY_WINDOW_HOURS * 3_600_000);

	const sessions: ExpiringSessions[] = (
		await prisma.kycSession.findMany({
			where: {
				status: { in: ["ACTIVE", "IN_PROGRESS"] },
				expiresAt: { gt: now, lte: windowEnd },
			},
			select: {
				id: true,
				organizationId: true,
				clientId: true,
				expiresAt: true,
				emailSentAt: true,
				token: true,
			},
		})
	).map((s) => ({
		...s,
		expiresAt: new Date(s.expiresAt),
		emailSentAt: s.emailSentAt ? new Date(s.emailSentAt) : null,
	}));

	if (sessions.length === 0) {
		console.log(
			`${LOG_TAG} No sessions expiring within ${EXPIRY_WINDOW_HOURS}h`,
		);
		return { expiredCount, notifiedCount: 0 };
	}

	let notifiedCount = 0;

	for (const session of sessions) {
		const dedupeKey = kvDedupeKey(session.id);

		if (kv) {
			const already = await kv.get(dedupeKey);
			if (already) {
				continue;
			}
		}

		try {
			const hoursLeft = Math.max(
				0,
				Math.round((session.expiresAt.getTime() - now.getTime()) / 3_600_000),
			);

			await notifService.notify({
				tenantId: session.organizationId,
				target: { kind: "org" },
				channelSlug: "system",
				type: "aml.kyc.session_expiring",
				title:
					hoursLeft <= 6
						? `Sesión KYC por expirar en ${hoursLeft}h`
						: `Sesión KYC expira en ${hoursLeft} horas`,
				body:
					`La sesión KYC para el cliente ${session.clientId} expira el ` +
					`${session.expiresAt.toISOString().slice(0, 16).replace("T", " ")} UTC. ` +
					`El cliente aún no ha completado el proceso.`,
				payload: {
					sessionId: session.id,
					clientId: session.clientId,
					expiresAt: session.expiresAt.toISOString(),
					hoursLeft,
				},
				severity: hoursLeft <= 6 ? "warning" : "info",
				sourceService: "aml-svc",
				sourceEvent: "kyc.session_expiring",
			});

			if (session.emailSentAt) {
				const client = await prisma.client.findUnique({
					where: { id: session.clientId },
					select: {
						email: true,
						firstName: true,
						lastName: true,
						businessName: true,
					},
				});

				if (client?.email) {
					const name =
						client.businessName ||
						[client.firstName, client.lastName].filter(Boolean).join(" ") ||
						"Cliente";

					const kycUrl = `${env.KYC_SELF_SERVICE_URL ?? "https://kyc.janovix.com"}/kyc/${session.token}`;

					await notifService.sendEmail({
						to: { email: client.email, name },
						subject:
							"Su sesión KYC está por expirar / Your KYC session is expiring",
						content: {
							title: "Complete su información KYC",
							body:
								`Estimado(a) ${name}, su sesión de identificación expira en aproximadamente ${hoursLeft} horas. ` +
								`Por favor complete el proceso antes de que expire el enlace.`,
							callbackUrl: kycUrl,
						},
						tags: ["kyc_expiry_reminder"],
						sourceService: "aml-svc",
						sourceEvent: "kyc.session_expiry_reminder",
					});
				}
			}

			notifiedCount++;

			if (kv) {
				await kv.put(dedupeKey, "1", {
					expirationTtl: EXPIRY_WINDOW_HOURS * 3_600,
				});
			}
		} catch (err) {
			console.error(`${LOG_TAG} Failed for session ${session.id}:`, err);
		}
	}

	console.log(
		`${LOG_TAG} ${sessions.length} sessions checked, ${notifiedCount} notified, ${expiredCount} expired`,
	);
	return { expiredCount, notifiedCount };
}
