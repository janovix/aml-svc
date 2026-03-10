/**
 * Screening Notifications
 *
 * Sends org-wide notifications when a client or beneficial controller
 * has negative watchlist screening results (sanctions, PEP, or adverse media).
 *
 * Non-blocking: all errors are caught and logged — callers must never await
 * these in a way that would block the main screening update.
 */

import type { Bindings } from "../types";

type ScreeningHitType = "sanctions" | "pep" | "adverse_media";

interface ScreeningNotificationInput {
	organizationId: string;
	entityId: string;
	entityName: string;
	entityKind: "client" | "beneficial_controller";
	hitType: ScreeningHitType;
	/** Absolute base URL of the AML frontend app */
	amlFrontendUrl?: string;
}

function buildNotificationContent(
	entityName: string,
	entityKind: "client" | "beneficial_controller",
	hitType: ScreeningHitType,
): { title: string; body: string } {
	const label =
		entityKind === "beneficial_controller" ? "Beneficial controller" : "Client";

	switch (hitType) {
		case "sanctions":
			return {
				title: "Watchlist Match: Sanctions",
				body: `${label} ${entityName} matched on a sanctions list (OFAC, UNSC, or SAT 69-B).`,
			};
		case "pep":
			return {
				title: "Watchlist Match: PEP",
				body: `${label} ${entityName} has been identified as a Politically Exposed Person (PEP).`,
			};
		case "adverse_media":
			return {
				title: "Watchlist Match: Adverse Media",
				body: `${label} ${entityName} has been flagged for adverse media findings.`,
			};
	}
}

/**
 * Sends an org-wide notification when a client or BC has a negative watchlist result.
 *
 * Designed to be called inside a fire-and-forget pattern:
 *   ctx.waitUntil(sendScreeningFlaggedNotification(...))
 * or directly with a try/catch that swallows errors.
 */
export async function sendScreeningFlaggedNotification(
	env: Bindings,
	input: ScreeningNotificationInput,
): Promise<void> {
	const notifService = env.NOTIFICATIONS_SERVICE;
	if (!notifService) {
		console.warn(
			"[screening-notifications] NOTIFICATIONS_SERVICE not configured — skipping notification",
		);
		return;
	}

	const amlFrontendUrl =
		input.amlFrontendUrl?.replace(/\/$/, "") ??
		"https://aml.janovix.workers.dev";

	const callbackUrl =
		input.entityKind === "client"
			? `${amlFrontendUrl}/clients/${input.entityId}`
			: `${amlFrontendUrl}/clients?bc=${input.entityId}`;

	const { title, body } = buildNotificationContent(
		input.entityName,
		input.entityKind,
		input.hitType,
	);

	try {
		console.log(
			`[screening-notifications] Sending ${input.hitType} hit notification for ${input.entityKind} ${input.entityId} in org ${input.organizationId}`,
		);

		await notifService.notify({
			tenantId: input.organizationId,
			target: { kind: "org" },
			channelSlug: "system",
			type: "aml.screening.flagged",
			title,
			body,
			payload: {
				entityId: input.entityId,
				entityName: input.entityName,
				entityKind: input.entityKind,
				hitType: input.hitType,
			},
			severity: "warn",
			callbackUrl,
			sendEmail: false,
			sourceService: "aml-svc",
			sourceEvent: "screening.flagged",
		});

		console.log(
			`[screening-notifications] Notification sent for ${input.hitType} hit on ${input.entityKind} ${input.entityId}`,
		);
	} catch (err) {
		console.error(
			"[screening-notifications] Failed to send screening flagged notification:",
			err,
		);
	}
}
