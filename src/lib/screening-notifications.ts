/**
 * Screening Notifications
 *
 * Sends org-wide notifications when a client or beneficial controller
 * has negative watchlist screening results (sanctions, PEP, or adverse media).
 */

import {
	t,
	type EmailI18nPayload,
	type LanguageCode,
	type MessageKey,
} from "./i18n";
import type { Bindings } from "../types";
import { getOrganizationLanguageForTenant } from "./org-language";

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

function hitKeys(hitType: ScreeningHitType): {
	titleKey: MessageKey;
	bodyKey: MessageKey;
} {
	switch (hitType) {
		case "sanctions":
			return {
				titleKey: "screening.sanctions.title",
				bodyKey: "screening.sanctions.body",
			};
		case "pep":
			return { titleKey: "screening.pep.title", bodyKey: "screening.pep.body" };
		case "adverse_media":
			return {
				titleKey: "screening.adverse_media.title",
				bodyKey: "screening.adverse_media.body",
			};
	}
}

function buildContent(
	lang: LanguageCode,
	entityName: string,
	entityKind: "client" | "beneficial_controller",
	hitType: ScreeningHitType,
): { title: string; body: string; emailI18n: EmailI18nPayload } {
	const labelKey =
		entityKind === "beneficial_controller"
			? "screening.label.beneficial_controller"
			: "screening.label.client";
	const entityLabel = t(lang, labelKey);
	const { titleKey, bodyKey } = hitKeys(hitType);
	const title = t(lang, titleKey);
	const body = t(lang, bodyKey, { entityLabel, entityName });
	return {
		title,
		body,
		emailI18n: {
			titleKey,
			bodyKey,
			bodyParams: { entityLabel, entityName },
		},
	};
}

/**
 * Sends an org-wide notification when a client or BC has a negative watchlist result.
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

	const lang = await getOrganizationLanguageForTenant(
		env,
		input.organizationId,
	);
	const { title, body, emailI18n } = buildContent(
		lang,
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
			emailI18n,
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
