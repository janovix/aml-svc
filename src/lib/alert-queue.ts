/**
 * Alert Queue Service
 *
 * Handles queueing of alert detection jobs to the aml-alert-worker
 */

import * as Sentry from "@sentry/cloudflare";

export type AlertJobType =
	| "client.created"
	| "client.updated"
	| "transaction.created"
	| "operation.created";

export interface AlertJob {
	type: AlertJobType;
	clientId: string;
	organizationId: string;
	transactionId?: string;
	operationId?: string;
	timestamp: string;
}

/**
 * Service for queueing alert detection jobs
 */
export class AlertQueueService {
	constructor(private queue: Queue<AlertJob> | undefined) {}

	/**
	 * Checks if the queue is available
	 */
	isAvailable(): boolean {
		return this.queue !== undefined;
	}

	async queueClientCreated(
		clientId: string,
		organizationId: string,
	): Promise<void> {
		await this.sendJob({
			type: "client.created",
			clientId,
			organizationId,
			timestamp: new Date().toISOString(),
		});
	}

	async queueClientUpdated(
		clientId: string,
		organizationId: string,
	): Promise<void> {
		await this.sendJob({
			type: "client.updated",
			clientId,
			organizationId,
			timestamp: new Date().toISOString(),
		});
	}

	/**
	 * @deprecated Use queueOperationCreated instead
	 */
	async queueTransactionCreated(
		clientId: string,
		transactionId: string,
		organizationId: string,
	): Promise<void> {
		await this.sendJob({
			type: "transaction.created",
			clientId,
			organizationId,
			transactionId,
			timestamp: new Date().toISOString(),
		});
	}

	async queueOperationCreated(
		clientId: string,
		operationId: string,
		organizationId: string,
	): Promise<void> {
		await this.sendJob({
			type: "operation.created",
			clientId,
			organizationId,
			operationId,
			timestamp: new Date().toISOString(),
		});
	}

	/**
	 * Sends a job to the queue
	 */
	private async sendJob(job: AlertJob): Promise<void> {
		if (!this.queue) {
			return;
		}

		try {
			await this.queue.send(job);
		} catch (error) {
			Sentry.captureException(error, {
				tags: { context: "alert-queue-failed" },
				extra: { jobType: job.type, clientId: job.clientId },
			});
			// Don't throw - alert detection is not critical path
		}
	}
}

/**
 * Creates an AlertQueueService from the environment
 */
export function createAlertQueueService(
	queue: Queue<AlertJob> | undefined,
): AlertQueueService {
	return new AlertQueueService(queue);
}
