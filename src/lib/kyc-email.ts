/**
 * KYC Self-Service Email Helper
 *
 * Sends KYC invite emails to clients via the notifications-svc service binding.
 * Uses the same pattern as watchlist-search.ts for service binding communication.
 */

import type { Bindings } from "../types";
import type { KycSessionEntity } from "../domain/kyc-session";

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
 * Requires the KYC_SELF_SERVICE_URL env variable to be set.
 */
function buildKycUrl(env: Bindings, token: string): string {
	const baseUrl = env.KYC_SELF_SERVICE_URL ?? "https://kyc.janovix.com";
	return `${baseUrl}/kyc/${token}`;
}

/**
 * Sends a KYC invite email to a client.
 *
 * Uses the /internal/email endpoint (email-only, no notification record created).
 * External clients have no notification inbox, so a pure transactional email is correct here.
 *
 * This function is designed to be called inside `waitUntil()` for non-blocking delivery.
 * It will silently fail if notifications-svc is not available (logs error for observability).
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

	try {
		const result = await notifService.sendEmail({
			to: {
				email: clientEmail,
				name: options.clientName,
			},
			subject: `${orgName} - Complete your KYC information`,
			content: {
				title: "Complete your KYC information",
				body: `Hello ${options.clientName}, you have been invited to complete your identification information for ${orgName}. Click the button below to begin. This link will expire on ${options.expiresAt ? new Date(options.expiresAt).toLocaleDateString() : "the configured date"}.`,
				callbackUrl: kycUrl,
			},
			tags: ["kyc_invite"],
			sourceService: "aml-svc",
			sourceEvent: "kyc_invite",
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
 * Called after a client submits their KYC session.
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

	try {
		await notifService.notify({
			tenantId: session.organizationId,
			type: "kyc_submitted",
			title: "KYC Session Submitted for Review",
			body: `${clientName} has submitted their KYC information and it is ready for your review.`,
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
