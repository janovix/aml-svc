import { describe, it, expect, vi, beforeEach } from "vitest";
import {
	sendScreeningFlaggedNotification,
	sendScreeningStatusChangedNotification,
} from "./screening-notifications";
import type { Bindings } from "../types";

vi.mock("./org-language", () => ({
	getOrganizationLanguageForTenant: vi.fn().mockResolvedValue("en"),
}));

describe("screening-notifications", () => {
	const notify = vi.fn().mockResolvedValue(undefined);

	beforeEach(() => {
		vi.clearAllMocks();
		vi.spyOn(console, "log").mockImplementation(() => {});
		vi.spyOn(console, "warn").mockImplementation(() => {});
		vi.spyOn(console, "error").mockImplementation(() => {});
	});

	it("skips flagged notification when NOTIFICATIONS_SERVICE missing", async () => {
		const env = {} as Bindings;
		await sendScreeningFlaggedNotification(env, {
			organizationId: "o1",
			entityId: "e1",
			entityName: "Acme",
			entityKind: "client",
			hitType: "sanctions",
		});
		expect(notify).not.toHaveBeenCalled();
	});

	it("sends flagged notification for client sanctions hit", async () => {
		const env = {
			NOTIFICATIONS_SERVICE: { notify },
			AML_FRONTEND_URL: "https://aml.example.com/",
		} as unknown as Bindings;

		await sendScreeningFlaggedNotification(env, {
			organizationId: "o1",
			entityId: "e1",
			entityName: "Acme",
			entityKind: "client",
			hitType: "pep",
			amlFrontendUrl: "https://custom/",
		});

		expect(notify).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "aml.screening.flagged",
				callbackUrl: "https://custom/clients/e1",
				sendEmail: false,
			}),
		);
	});

	it("uses BC callback URL for beneficial_controller", async () => {
		const env = {
			NOTIFICATIONS_SERVICE: { notify },
		} as unknown as Bindings;

		await sendScreeningFlaggedNotification(env, {
			organizationId: "o1",
			entityId: "bc1",
			entityName: "UBO",
			entityKind: "beneficial_controller",
			hitType: "adverse_media",
		});

		expect(notify.mock.calls[0][0]).toMatchObject({
			payload: expect.objectContaining({ entityKind: "beneficial_controller" }),
		});
		const arg = notify.mock.calls[0][0] as { callbackUrl: string };
		expect(arg.callbackUrl).toContain("bc=bc1");
	});

	it("sends status_changed with email when channel includes email", async () => {
		const env = { NOTIFICATIONS_SERVICE: { notify } } as unknown as Bindings;
		await sendScreeningStatusChangedNotification(env, {
			organizationId: "o1",
			entityId: "e1",
			entityName: "X",
			entityKind: "client",
			changedSources: ["ofac", "pep"],
			channels: ["in_app", "email"],
		});
		expect(notify).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "aml.screening.status_changed",
				sendEmail: true,
			}),
		);
	});

	it("swallows notify errors for status_changed", async () => {
		const env = {
			NOTIFICATIONS_SERVICE: {
				notify: vi.fn().mockRejectedValue(new Error("down")),
			},
		} as unknown as Bindings;
		await expect(
			sendScreeningStatusChangedNotification(env, {
				organizationId: "o1",
				entityId: "e1",
				entityName: "X",
				entityKind: "client",
				changedSources: ["ofac"],
				channels: ["in_app"],
			}),
		).resolves.toBeUndefined();
	});
});
