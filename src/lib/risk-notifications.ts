/**
 * Risk Notifications
 *
 * Sends org-wide notifications for risk assessment events via NOTIFICATIONS_SERVICE.
 * Non-blocking: all errors are caught and logged — callers use ctx.waitUntil().
 */

import type { Bindings } from "../types";

type _RiskNotificationType =
	| "aml.risk.client_high"
	| "aml.risk.client_changed"
	| "aml.risk.client_critical"
	| "aml.risk.review_due"
	| "aml.risk.org_changed"
	| "aml.risk.audit_escalated"
	| "aml.risk.batch_complete"
	| "aml.risk.simplified_dd";

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

function buildContent(input: RiskNotificationInput): {
	title: string;
	body: string;
	severity: string;
	sendEmail: boolean;
	callbackPath?: string;
	payload: Record<string, unknown>;
} {
	switch (input.type) {
		case "aml.risk.client_high":
			return {
				title: "Cliente clasificado como Alto Riesgo",
				body: `El cliente ${input.clientName} ha sido clasificado como Alto Riesgo. Se requiere debida diligencia reforzada y monitoreo intensificado (Art. 18-X LFPIORPI).`,
				severity: "warn",
				sendEmail: false,
				callbackPath: `/clients/${input.clientId}`,
				payload: {
					clientId: input.clientId,
					riskLevel: input.riskLevel,
					previousLevel: input.previousLevel,
					factors: input.factors,
				},
			};
		case "aml.risk.client_changed":
			return {
				title: "Cambio en nivel de riesgo de cliente",
				body: `El cliente ${input.clientName} cambió de ${input.previousLevel} a ${input.newLevel}.`,
				severity: "info",
				sendEmail: false,
				callbackPath: `/clients/${input.clientId}`,
				payload: {
					clientId: input.clientId,
					previousLevel: input.previousLevel,
					newLevel: input.newLevel,
				},
			};
		case "aml.risk.client_critical":
			return {
				title: "Cliente en riesgo CRITICO",
				body: `El cliente ${input.clientName} combina PEP + coincidencia en listas + Alto Riesgo. Requiere revisión inmediata.`,
				severity: "critical",
				sendEmail: true,
				callbackPath: `/clients/${input.clientId}`,
				payload: {
					clientId: input.clientId,
					riskLevel: input.riskLevel,
					isPep: input.isPep,
					hasWatchlistHit: input.hasWatchlistHit,
				},
			};
		case "aml.risk.review_due":
			return {
				title: "Clientes pendientes de revisión de riesgo",
				body: `Hay ${input.clientsDueCount} cliente(s) con revisión de riesgo vencida.`,
				severity: "info",
				sendEmail: true,
				callbackPath: "/risk",
				payload: { clientsDueCount: input.clientsDueCount },
			};
		case "aml.risk.org_changed":
			return {
				title: "Cambio en nivel de riesgo organizacional",
				body: `El nivel de riesgo de la entidad cambió de ${input.previousLevel} a ${input.newLevel}. Revise las implicaciones en tipo de auditoría (Art. 18-XI).`,
				severity: "warn",
				sendEmail: true,
				payload: {
					previousLevel: input.previousLevel,
					newLevel: input.newLevel,
				},
			};
		case "aml.risk.audit_escalated":
			return {
				title: "Escalamiento de tipo de auditoría requerida",
				body: `El tipo de auditoría requerida cambió de ${input.previousAuditType} a ${input.newAuditType} debido a riesgo ${input.riskLevel} (Art. 18-XI LFPIORPI).`,
				severity: "critical",
				sendEmail: true,
				callbackPath: "/risk/org-assessment",
				payload: {
					previousAuditType: input.previousAuditType,
					newAuditType: input.newAuditType,
					riskLevel: input.riskLevel,
				},
			};
		case "aml.risk.batch_complete":
			return {
				title: "Evaluación masiva de riesgo completada",
				body: `Se evaluaron ${input.totalAssessed} clientes: ${input.highRiskCount} alto, ${input.mediumRiskCount} medio, ${input.lowRiskCount} bajo.`,
				severity: "info",
				sendEmail: false,
				callbackPath: "/risk",
				payload: {
					totalAssessed: input.totalAssessed,
					highRiskCount: input.highRiskCount,
					mediumRiskCount: input.mediumRiskCount,
					lowRiskCount: input.lowRiskCount,
				},
			};
		case "aml.risk.simplified_dd":
			return {
				title: "Cliente elegible para debida diligencia simplificada",
				body: `El cliente ${input.clientName} fue clasificado como Bajo Riesgo y es elegible para DD simplificada (Art. 19 LFPIORPI).`,
				severity: "info",
				sendEmail: false,
				callbackPath: `/clients/${input.clientId}`,
				payload: { clientId: input.clientId },
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

	const content = buildContent(input);
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
			sourceService: "aml-svc",
			sourceEvent: input.type.replace("aml.", ""),
		});

		console.log(`[risk-notifications] Sent ${input.type} successfully`);
	} catch (err) {
		console.error(`[risk-notifications] Failed to send ${input.type}:`, err);
	}
}
