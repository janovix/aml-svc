/**
 * KYC Self-Service Email Helper
 *
 * Sends KYC invite emails to clients via the notifications-svc service binding.
 */

import { t, type LanguageCode } from "./i18n";
import type { Bindings } from "../types";
import type { KycSessionEntity } from "../domain/kyc-session";
import { getOrganizationLanguageForTenant } from "./org-language";

export interface KYCEmailOptions {
	/** Human-readable client name (or business name) */
	clientName: string;
	/** Optional organization name for branding */
	organizationName?: string;
	/** Optional expiry timestamp to show in email */
	expiresAt?: string;
}

/**
 * Builds the KYC self-service URL for the client.
 */
function buildKycUrl(env: Bindings, token: string): string {
	const baseUrl = env.KYC_SELF_SERVICE_URL ?? "https://kyc.janovix.com";
	return `${baseUrl}/kyc/${token}`;
}

/**
 * Sends a KYC invite email to a client.
 */
export async function sendKYCInviteEmail(
	env: Bindings,
	clientEmail: string,
	session: KycSessionEntity,
	options: KYCEmailOptions,
): Promise<boolean> {
	const notifService = env.NOTIFICATIONS_SERVICE;
	if (!notifService) {
		console.warn(
			"[kyc-email] NOTIFICATIONS_SERVICE binding not available. Skipping email.",
		);
		return false;
	}

	const kycUrl = buildKycUrl(env, session.token);
	const orgName = options.organizationName ?? "Janovix";
	const lang: LanguageCode = await getOrganizationLanguageForTenant(
		env,
		session.organizationId,
	);

	const expiryDate = options.expiresAt
		? new Date(options.expiresAt).toLocaleDateString(
				lang === "es" ? "es-MX" : "en-US",
			)
		: lang === "es"
			? "la fecha configurada"
			: "the configured date";

	try {
		const result = await notifService.sendEmail({
			to: {
				email: clientEmail,
				name: options.clientName,
			},
			subject: t(lang, "kyc.invite.subject", { orgName }),
			content: {
				title: t(lang, "kyc.invite.title"),
				body: t(lang, "kyc.invite.body", {
					clientName: options.clientName,
					orgName,
					expiryDate,
				}),
				callbackUrl: kycUrl,
			},
			tags: ["kyc_invite"],
			sourceService: "aml-svc",
			sourceEvent: "kyc_invite",
			language: lang,
		});

		if (!result.success) {
			console.error(
				`[kyc-email] notifications-svc sendEmail failed: ${result.error}`,
			);
			return false;
		}

		return true;
	} catch (err) {
		console.error("[kyc-email] Failed to send KYC invite email:", err);
		return false;
	}
}

/**
 * Sends a KYC submission notification to the org (compliance officer alert).
 */
export async function sendKYCSubmissionNotification(
	env: Bindings,
	session: KycSessionEntity,
	clientName: string,
): Promise<boolean> {
	const notifService = env.NOTIFICATIONS_SERVICE;
	if (!notifService) {
		console.warn(
			"[kyc-email] NOTIFICATIONS_SERVICE binding not available. Skipping submission notification.",
		);
		return false;
	}

	const lang = await getOrganizationLanguageForTenant(
		env,
		session.organizationId,
	);

	try {
		await notifService.notify({
			tenantId: session.organizationId,
			type: "kyc_submitted",
			title: t(lang, "kyc.submitted.title"),
			body: t(lang, "kyc.submitted.body", { clientName }),
			severity: "warning",
			target: { kind: "org" },
			payload: {
				sessionId: session.id,
				clientId: session.clientId,
				clientName,
				submittedAt: session.submittedAt,
				identificationTier: session.identificationTier,
			},
			callbackUrl: undefined,
			sourceService: "aml-svc",
			sourceEvent: "kyc_submitted",
			emailI18n: {
				titleKey: "kyc.submitted.title",
				bodyKey: "kyc.submitted.body",
				bodyParams: { clientName },
			},
		});

		return true;
	} catch (err) {
		console.error(
			"[kyc-email] Failed to send KYC submission notification:",
			err,
		);
		return false;
	}
}
