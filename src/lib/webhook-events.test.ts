import { describe, expect, it, vi } from "vitest";

import {
	emitWebhookEvent,
	WEBHOOK_EVENT_TYPES,
	type WebhookEvent,
} from "./webhook-events";

describe("emitWebhookEvent", () => {
	it("no-ops when queue is undefined", async () => {
		await expect(
			emitWebhookEvent(undefined, {
				organizationId: "org",
				environment: "production",
				eventType: WEBHOOK_EVENT_TYPES.CLIENT_CREATED,
				data: {},
			}),
		).resolves.toBeUndefined();
	});

	it("sends payload with ISO timestamp on success", async () => {
		const send = vi.fn().mockResolvedValue(undefined);
		const queue = { send } as unknown as Queue<WebhookEvent>;

		await emitWebhookEvent(queue, {
			organizationId: "org-1",
			environment: "production",
			eventType: WEBHOOK_EVENT_TYPES.ALERT_CREATED,
			data: { id: "a1" },
		});

		expect(send).toHaveBeenCalledTimes(1);
		const arg = send.mock.calls[0][0] as {
			timestamp: string;
			data: Record<string, unknown>;
		};
		expect(arg.data).toEqual({ id: "a1" });
		expect(arg.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
	});

	it("swallows enqueue errors", async () => {
		const err = new Error("queue full");
		const send = vi.fn().mockRejectedValue(err);
		const spy = vi.spyOn(console, "error").mockImplementation(() => {});

		await emitWebhookEvent({ send } as unknown as Queue<WebhookEvent>, {
			organizationId: "org",
			environment: "production",
			eventType: WEBHOOK_EVENT_TYPES.CLIENT_CREATED,
			data: {},
		});

		expect(spy).toHaveBeenCalled();
		spy.mockRestore();
	});
});
