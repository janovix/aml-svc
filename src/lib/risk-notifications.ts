/**
 * Risk Notifications
 *
 * Sends org-wide notifications for risk assessment events via NOTIFICATIONS_SERVICE.
 * Non-blocking: all errors are caught and logged — callers use ctx.waitUntil().
 */

import { t, type EmailI18nPayload, type LanguageCode } from "./i18n";
import type { Bindings } from "../types";
import { getOrganizationLanguageForTenant } from "./org-language";

interface RiskNotificationBase {
	organizationId: string;
	amlFrontendUrl?: string;
}

interface ClientHighRiskInput extends RiskNotificationBase {
	type: "aml.risk.client_high";
	clientId: string;
	clientName: string;
	riskLevel: string;
	previousLevel?: string;
	factors: Record<string, unknown>;
}

interface ClientRiskChangedInput extends RiskNotificationBase {
	type: "aml.risk.client_changed";
	clientId: string;
	clientName: string;
	previousLevel: string;
	newLevel: string;
}

interface ClientCriticalInput extends RiskNotificationBase {
	type: "aml.risk.client_critical";
	clientId: string;
	clientName: string;
	riskLevel: string;
	isPep: boolean;
	hasWatchlistHit: boolean;
}

interface ReviewDueInput extends RiskNotificationBase {
	type: "aml.risk.review_due";
	clientsDueCount: number;
}

interface OrgRiskChangedInput extends RiskNotificationBase {
	type: "aml.risk.org_changed";
	previousLevel: string;
	newLevel: string;
}

interface AuditEscalatedInput extends RiskNotificationBase {
	type: "aml.risk.audit_escalated";
	previousAuditType: string;
	newAuditType: string;
	riskLevel: string;
}

interface BatchCompleteInput extends RiskNotificationBase {
	type: "aml.risk.batch_complete";
	totalAssessed: number;
	highRiskCount: number;
	mediumRiskCount: number;
	lowRiskCount: number;
}

interface SimplifiedDDInput extends RiskNotificationBase {
	type: "aml.risk.simplified_dd";
	clientId: string;
	clientName: string;
}

type RiskNotificationInput =
	| ClientHighRiskInput
	| ClientRiskChangedInput
	| ClientCriticalInput
	| ReviewDueInput
	| OrgRiskChangedInput
	| AuditEscalatedInput
	| BatchCompleteInput
	| SimplifiedDDInput;

function buildContent(
	lang: LanguageCode,
	input: RiskNotificationInput,
): {
	title: string;
	body: string;
	severity: string;
	sendEmail: boolean;
	callbackPath?: string;
	payload: Record<string, unknown>;
	emailI18n: EmailI18nPayload;
} {
	switch (input.type) {
		case "aml.risk.client_high":
			return {
				title: t(lang, "risk.client_high.title"),
				body: t(lang, "risk.client_high.body", {
					clientName: input.clientName,
				}),
				severity: "warn",
				sendEmail: false,
				callbackPath: `/clients/${input.clientId}`,
				payload: {
					clientId: input.clientId,
					riskLevel: input.riskLevel,
					previousLevel: input.previousLevel,
					factors: input.factors,
				},
				emailI18n: {
					titleKey: "risk.client_high.title",
					bodyKey: "risk.client_high.body",
					bodyParams: { clientName: input.clientName },
				},
			};
		case "aml.risk.client_changed":
			return {
				title: t(lang, "risk.client_changed.title"),
				body: t(lang, "risk.client_changed.body", {
					clientName: input.clientName,
					previousLevel: input.previousLevel,
					newLevel: input.newLevel,
				}),
				severity: "info",
				sendEmail: false,
				callbackPath: `/clients/${input.clientId}`,
				payload: {
					clientId: input.clientId,
					previousLevel: input.previousLevel,
					newLevel: input.newLevel,
				},
				emailI18n: {
					titleKey: "risk.client_changed.title",
					bodyKey: "risk.client_changed.body",
					bodyParams: {
						clientName: input.clientName,
						previousLevel: input.previousLevel,
						newLevel: input.newLevel,
					},
				},
			};
		case "aml.risk.client_critical":
			return {
				title: t(lang, "risk.client_critical.title"),
				body: t(lang, "risk.client_critical.body", {
					clientName: input.clientName,
				}),
				severity: "critical",
				sendEmail: true,
				callbackPath: `/clients/${input.clientId}`,
				payload: {
					clientId: input.clientId,
					riskLevel: input.riskLevel,
					isPep: input.isPep,
					hasWatchlistHit: input.hasWatchlistHit,
				},
				emailI18n: {
					titleKey: "risk.client_critical.title",
					bodyKey: "risk.client_critical.body",
					bodyParams: { clientName: input.clientName },
				},
			};
		case "aml.risk.review_due":
			return {
				title: t(lang, "risk.review_due.title"),
				body: t(lang, "risk.review_due.body", {
					clientsDueCount: input.clientsDueCount,
				}),
				severity: "info",
				sendEmail: true,
				callbackPath: "/risk",
				payload: { clientsDueCount: input.clientsDueCount },
				emailI18n: {
					titleKey: "risk.review_due.title",
					bodyKey: "risk.review_due.body",
					bodyParams: { clientsDueCount: input.clientsDueCount },
				},
			};
		case "aml.risk.org_changed":
			return {
				title: t(lang, "risk.org_changed.title"),
				body: t(lang, "risk.org_changed.body", {
					previousLevel: input.previousLevel,
					newLevel: input.newLevel,
				}),
				severity: "warn",
				sendEmail: true,
				payload: {
					previousLevel: input.previousLevel,
					newLevel: input.newLevel,
				},
				emailI18n: {
					titleKey: "risk.org_changed.title",
					bodyKey: "risk.org_changed.body",
					bodyParams: {
						previousLevel: input.previousLevel,
						newLevel: input.newLevel,
					},
				},
			};
		case "aml.risk.audit_escalated":
			return {
				title: t(lang, "risk.audit_escalated.title"),
				body: t(lang, "risk.audit_escalated.body", {
					previousAuditType: input.previousAuditType,
					newAuditType: input.newAuditType,
					riskLevel: input.riskLevel,
				}),
				severity: "critical",
				sendEmail: true,
				callbackPath: "/risk/org-assessment",
				payload: {
					previousAuditType: input.previousAuditType,
					newAuditType: input.newAuditType,
					riskLevel: input.riskLevel,
				},
				emailI18n: {
					titleKey: "risk.audit_escalated.title",
					bodyKey: "risk.audit_escalated.body",
					bodyParams: {
						previousAuditType: input.previousAuditType,
						newAuditType: input.newAuditType,
						riskLevel: input.riskLevel,
					},
				},
			};
		case "aml.risk.batch_complete":
			return {
				title: t(lang, "risk.batch_complete.title"),
				body: t(lang, "risk.batch_complete.body", {
					totalAssessed: input.totalAssessed,
					highRiskCount: input.highRiskCount,
					mediumRiskCount: input.mediumRiskCount,
					lowRiskCount: input.lowRiskCount,
				}),
				severity: "info",
				sendEmail: false,
				callbackPath: "/risk",
				payload: {
					totalAssessed: input.totalAssessed,
					highRiskCount: input.highRiskCount,
					mediumRiskCount: input.mediumRiskCount,
					lowRiskCount: input.lowRiskCount,
				},
				emailI18n: {
					titleKey: "risk.batch_complete.title",
					bodyKey: "risk.batch_complete.body",
					bodyParams: {
						totalAssessed: input.totalAssessed,
						highRiskCount: input.highRiskCount,
						mediumRiskCount: input.mediumRiskCount,
						lowRiskCount: input.lowRiskCount,
					},
				},
			};
		case "aml.risk.simplified_dd":
			return {
				title: t(lang, "risk.simplified_dd.title"),
				body: t(lang, "risk.simplified_dd.body", {
					clientName: input.clientName,
				}),
				severity: "info",
				sendEmail: false,
				callbackPath: `/clients/${input.clientId}`,
				payload: { clientId: input.clientId },
				emailI18n: {
					titleKey: "risk.simplified_dd.title",
					bodyKey: "risk.simplified_dd.body",
					bodyParams: { clientName: input.clientName },
				},
			};
	}
}

export async function sendRiskNotification(
	env: Bindings,
	input: RiskNotificationInput,
): Promise<void> {
	const notifService = env.NOTIFICATIONS_SERVICE;
	if (!notifService) {
		console.warn(
			"[risk-notifications] NOTIFICATIONS_SERVICE not configured — skipping",
		);
		return;
	}

	const amlFrontendUrl =
		input.amlFrontendUrl?.replace(/\/$/, "") ??
		"https://aml.janovix.workers.dev";

	const lang = await getOrganizationLanguageForTenant(
		env,
		input.organizationId,
	);
	const content = buildContent(lang, input);
	const callbackUrl = content.callbackPath
		? `${amlFrontendUrl}${content.callbackPath}`
		: undefined;

	try {
		console.log(
			`[risk-notifications] Sending ${input.type} for org ${input.organizationId}`,
		);

		await notifService.notify({
			tenantId: input.organizationId,
			target: { kind: "org" },
			channelSlug: "system",
			type: input.type,
			title: content.title,
			body: content.body,
			payload: content.payload,
			severity: content.severity,
			callbackUrl,
			sendEmail: content.sendEmail,
			emailI18n: content.emailI18n,
			sourceService: "aml-svc",
			sourceEvent: input.type.replace("aml.", ""),
		});

		console.log(`[risk-notifications] Sent ${input.type} successfully`);
	} catch (err) {
		console.error(`[risk-notifications] Failed to send ${input.type}:`, err);
	}
}
