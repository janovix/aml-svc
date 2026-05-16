import { describe, it, expect, vi, beforeEach } from "vitest";
import { sendKYCInviteEmail, sendKYCSubmissionNotification } from "./kyc-email";
import type { Bindings } from "../types";
import type { KycSessionEntity } from "../domain/kyc-session";

vi.mock("./org-language", () => ({
	getOrganizationLanguageForTenant: vi.fn().mockResolvedValue("en"),
}));

describe("kyc-email", () => {
	const baseSession = {
		id: "ks1",
		organizationId: "o1",
		clientId: "c1",
		token: "tok-abc",
		submittedAt: null,
		identificationTier: "ENHANCED",
	} as unknown as KycSessionEntity;

	beforeEach(() => {
		vi.clearAllMocks();
		vi.spyOn(console, "warn").mockImplementation(() => {});
		vi.spyOn(console, "error").mockImplementation(() => {});
	});

	it("returns false when NOTIFICATIONS_SERVICE missing (invite)", async () => {
		const env = {} as Bindings;
		const ok = await sendKYCInviteEmail(env, "a@b.com", baseSession, {
			clientName: "Pat",
		});
		expect(ok).toBe(false);
	});

	it("returns false when sendEmail reports failure", async () => {
		const env = {
			NOTIFICATIONS_SERVICE: {
				sendEmail: vi.fn().mockResolvedValue({ success: false, error: "x" }),
			},
			KYC_SELF_SERVICE_URL: "https://kyc.example",
		} as unknown as Bindings;
		const ok = await sendKYCInviteEmail(env, "a@b.com", baseSession, {
			clientName: "Pat",
			expiresAt: new Date("2030-01-01").toISOString(),
		});
		expect(ok).toBe(false);
	});

	it("returns true on successful invite", async () => {
		const sendEmail = vi.fn().mockResolvedValue({ success: true });
		const env = {
			NOTIFICATIONS_SERVICE: { sendEmail },
			KYC_SELF_SERVICE_URL: "https://kyc.example",
		} as unknown as Bindings;
		const ok = await sendKYCInviteEmail(env, "a@b.com", baseSession, {
			clientName: "Pat",
			organizationName: "OrgCo",
		});
		expect(ok).toBe(true);
		expect(sendEmail.mock.calls[0][0].content.callbackUrl).toBe(
			"https://kyc.example/kyc/tok-abc",
		);
	});

	it("returns false when submission notify missing service", async () => {
		const env = {} as Bindings;
		const ok = await sendKYCSubmissionNotification(env, baseSession, "Pat");
		expect(ok).toBe(false);
	});

	it("returns true on submission notification", async () => {
		const notify = vi.fn().mockResolvedValue(undefined);
		const env = { NOTIFICATIONS_SERVICE: { notify } } as unknown as Bindings;
		const ok = await sendKYCSubmissionNotification(env, baseSession, "Pat");
		expect(ok).toBe(true);
		expect(notify).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "kyc_submitted",
				tenantId: "o1",
			}),
		);
	});
});
