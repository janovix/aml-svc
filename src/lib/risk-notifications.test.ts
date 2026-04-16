import { describe, it, expect, vi, beforeEach } from "vitest";
import { sendRiskNotification } from "./risk-notifications";
import type { Bindings } from "../types";

const mockNotify = vi.fn().mockResolvedValue(undefined);
const mockGetOrgLanguage = vi.fn().mockResolvedValue("es");
const mockEnv = {
	NOTIFICATIONS_SERVICE: { notify: mockNotify },
	AUTH_SERVICE: { getOrganizationLanguage: mockGetOrgLanguage },
} as unknown as Bindings;

describe("sendRiskNotification", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("logs warn and returns when NOTIFICATIONS_SERVICE is missing", async () => {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
		const env = {} as unknown as Bindings;

		await sendRiskNotification(env, {
			type: "aml.risk.client_high",
			organizationId: "org-1",
			clientId: "c1",
			clientName: "X",
			riskLevel: "high",
			factors: {},
		});

		expect(warn).toHaveBeenCalledWith(
			"[risk-notifications] NOTIFICATIONS_SERVICE not configured — skipping",
		);
		expect(mockNotify).not.toHaveBeenCalled();
		warn.mockRestore();
	});

	it("client_high: notify with correct title, body, severity, payload", async () => {
		await sendRiskNotification(mockEnv, {
			type: "aml.risk.client_high",
			organizationId: "org-1",
			clientId: "c1",
			clientName: "Acme SA",
			riskLevel: "high",
			previousLevel: "medium",
			factors: { score: 9 },
		});

		expect(mockNotify).toHaveBeenCalledWith(
			expect.objectContaining({
				tenantId: "org-1",
				target: { kind: "org" },
				channelSlug: "system",
				type: "aml.risk.client_high",
				title: "Cliente clasificado como Alto Riesgo",
				body: expect.stringContaining("Acme SA"),
				severity: "warn",
				sendEmail: false,
				payload: {
					clientId: "c1",
					riskLevel: "high",
					previousLevel: "medium",
					factors: { score: 9 },
				},
				sourceService: "aml-svc",
				sourceEvent: "risk.client_high",
				emailI18n: expect.objectContaining({
					titleKey: "risk.client_high.title",
					bodyKey: "risk.client_high.body",
				}),
			}),
		);
	});

	it("uses English copy when org language is en", async () => {
		mockGetOrgLanguage.mockResolvedValueOnce("en");
		await sendRiskNotification(mockEnv, {
			type: "aml.risk.client_high",
			organizationId: "org-en",
			clientId: "c1",
			clientName: "Acme",
			riskLevel: "high",
			factors: {},
		});

		expect(mockNotify).toHaveBeenCalledWith(
			expect.objectContaining({
				title: "Client classified as High Risk",
				body: expect.stringContaining("Acme"),
				emailI18n: expect.objectContaining({
					titleKey: "risk.client_high.title",
				}),
			}),
		);
	});

	it("client_changed: correct content", async () => {
		await sendRiskNotification(mockEnv, {
			type: "aml.risk.client_changed",
			organizationId: "org-2",
			clientId: "c2",
			clientName: "Beta",
			previousLevel: "low",
			newLevel: "medium",
		});

		expect(mockNotify).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "aml.risk.client_changed",
				title: "Cambio en nivel de riesgo de cliente",
				body: "El cliente Beta cambió de low a medium.",
				severity: "info",
				sendEmail: false,
				payload: {
					clientId: "c2",
					previousLevel: "low",
					newLevel: "medium",
				},
				sourceEvent: "risk.client_changed",
			}),
		);
	});

	it("client_critical: severity critical and sendEmail true", async () => {
		await sendRiskNotification(mockEnv, {
			type: "aml.risk.client_critical",
			organizationId: "org-3",
			clientId: "c3",
			clientName: "Gamma",
			riskLevel: "high",
			isPep: true,
			hasWatchlistHit: true,
		});

		expect(mockNotify).toHaveBeenCalledWith(
			expect.objectContaining({
				title: "Cliente en riesgo CRITICO",
				body: expect.stringContaining("Gamma"),
				severity: "critical",
				sendEmail: true,
				payload: {
					clientId: "c3",
					riskLevel: "high",
					isPep: true,
					hasWatchlistHit: true,
				},
				sourceEvent: "risk.client_critical",
			}),
		);
	});

	it("review_due: sendEmail true and count in body", async () => {
		await sendRiskNotification(mockEnv, {
			type: "aml.risk.review_due",
			organizationId: "org-4",
			clientsDueCount: 7,
		});

		expect(mockNotify).toHaveBeenCalledWith(
			expect.objectContaining({
				body: "Hay 7 cliente(s) con revisión de riesgo vencida.",
				severity: "info",
				sendEmail: true,
				payload: { clientsDueCount: 7 },
				sourceEvent: "risk.review_due",
			}),
		);
	});

	it("org_changed: sendEmail true and levels in body", async () => {
		await sendRiskNotification(mockEnv, {
			type: "aml.risk.org_changed",
			organizationId: "org-5",
			previousLevel: "bajo",
			newLevel: "alto",
		});

		expect(mockNotify).toHaveBeenCalledWith(
			expect.objectContaining({
				title: "Cambio en nivel de riesgo organizacional",
				body: expect.stringContaining("bajo"),
				severity: "warn",
				sendEmail: true,
				payload: { previousLevel: "bajo", newLevel: "alto" },
				sourceEvent: "risk.org_changed",
			}),
		);
		expect(mockNotify.mock.calls[0][0].body).toContain("alto");
	});

	it("audit_escalated: severity critical", async () => {
		await sendRiskNotification(mockEnv, {
			type: "aml.risk.audit_escalated",
			organizationId: "org-6",
			previousAuditType: "A",
			newAuditType: "B",
			riskLevel: "high",
		});

		expect(mockNotify).toHaveBeenCalledWith(
			expect.objectContaining({
				severity: "critical",
				sendEmail: true,
				body: expect.stringContaining("A"),
				payload: {
					previousAuditType: "A",
					newAuditType: "B",
					riskLevel: "high",
				},
				sourceEvent: "risk.audit_escalated",
			}),
		);
		expect(mockNotify.mock.calls[0][0].body).toContain("B");
	});

	it("batch_complete: counts in body", async () => {
		await sendRiskNotification(mockEnv, {
			type: "aml.risk.batch_complete",
			organizationId: "org-7",
			totalAssessed: 100,
			highRiskCount: 5,
			mediumRiskCount: 20,
			lowRiskCount: 75,
		});

		expect(mockNotify).toHaveBeenCalledWith(
			expect.objectContaining({
				body: "Se evaluaron 100 clientes: 5 alto, 20 medio, 75 bajo.",
				payload: {
					totalAssessed: 100,
					highRiskCount: 5,
					mediumRiskCount: 20,
					lowRiskCount: 75,
				},
				sourceEvent: "risk.batch_complete",
			}),
		);
	});

	it("simplified_dd: correct client info", async () => {
		await sendRiskNotification(mockEnv, {
			type: "aml.risk.simplified_dd",
			organizationId: "org-8",
			clientId: "c8",
			clientName: "Delta LLC",
		});

		expect(mockNotify).toHaveBeenCalledWith(
			expect.objectContaining({
				body: expect.stringContaining("Delta LLC"),
				payload: { clientId: "c8" },
				sourceEvent: "risk.simplified_dd",
			}),
		);
	});

	it("callbackUrl combines amlFrontendUrl with callbackPath", async () => {
		await sendRiskNotification(mockEnv, {
			type: "aml.risk.client_high",
			organizationId: "org-9",
			clientId: "c9",
			clientName: "E",
			riskLevel: "high",
			factors: {},
			amlFrontendUrl: "https://app.example.com/",
		});

		expect(mockNotify).toHaveBeenCalledWith(
			expect.objectContaining({
				callbackUrl: "https://app.example.com/clients/c9",
			}),
		);
	});

	it("uses default aml base URL when amlFrontendUrl is omitted", async () => {
		await sendRiskNotification(mockEnv, {
			type: "aml.risk.client_changed",
			organizationId: "org-10",
			clientId: "c10",
			clientName: "F",
			previousLevel: "a",
			newLevel: "b",
		});

		expect(mockNotify).toHaveBeenCalledWith(
			expect.objectContaining({
				callbackUrl: "https://aml.janovix.workers.dev/clients/c10",
			}),
		);
	});

	it("logs error and does not throw when notify rejects", async () => {
		const err = new Error("notify failed");
		mockNotify.mockRejectedValueOnce(err);
		const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});

		await expect(
			sendRiskNotification(mockEnv, {
				type: "aml.risk.simplified_dd",
				organizationId: "org-11",
				clientId: "c11",
				clientName: "G",
			}),
		).resolves.toBeUndefined();

		expect(errorLog).toHaveBeenCalledWith(
			"[risk-notifications] Failed to send aml.risk.simplified_dd:",
			err,
		);
		errorLog.mockRestore();
	});
});
