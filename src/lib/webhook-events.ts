/**
 * Webhook event emitter.
 *
 * Domain services call `emitWebhookEvent()` after mutations. Events are
 * placed onto a Cloudflare Queue (WEBHOOK_QUEUE) for asynchronous delivery
 * by the webhook-delivery-worker.
 */

export interface WebhookEvent {
	organizationId: string;
	environment: string;
	eventType: string;
	data: Record<string, unknown>;
	timestamp: string;
}

export const WEBHOOK_EVENT_TYPES = {
	CLIENT_CREATED: "client.created",
	CLIENT_UPDATED: "client.updated",
	CLIENT_KYC_STATUS_CHANGED: "client.kyc_status_changed",
	OPERATION_CREATED: "operation.created",
	ALERT_CREATED: "alert.created",
	ALERT_STATUS_CHANGED: "alert.status_changed",
	NOTICE_GENERATED: "notice.generated",
	NOTICE_SUBMITTED: "notice.submitted",
	KYC_SESSION_SUBMITTED: "kyc_session.submitted",
	KYC_SESSION_STATUS_CHANGED: "kyc_session.status_changed",
	WATCHLIST_SCREENING_COMPLETE: "client.watchlist_screening_complete",
} as const;

/**
 * Emit a webhook event to the queue. Fire-and-forget — errors are logged
 * but never propagated to the caller.
 */
export async function emitWebhookEvent(
	queue: Queue<WebhookEvent> | undefined,
	event: Omit<WebhookEvent, "timestamp">,
): Promise<void> {
	if (!queue) return;

	try {
		await queue.send({
			...event,
			timestamp: new Date().toISOString(),
		});
	} catch (err) {
		console.error(`[WebhookEvent] Failed to enqueue ${event.eventType}:`, err);
	}
}
