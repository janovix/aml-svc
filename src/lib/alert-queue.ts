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

	/**
	 * Queues a client.created job
	 */
	async queueClientCreated(clientId: string): Promise<void> {
		await this.sendJob({
			type: "client.created",
			clientId,
			timestamp: new Date().toISOString(),
		});
	}

	/**
	 * Queues a client.updated job
	 */
	async queueClientUpdated(clientId: string): Promise<void> {
		await this.sendJob({
			type: "client.updated",
			clientId,
			timestamp: new Date().toISOString(),
		});
	}

	/**
	 * Queues a transaction.created job
	 * @deprecated Use queueOperationCreated instead
	 */
	async queueTransactionCreated(
		clientId: string,
		transactionId: string,
	): Promise<void> {
		await this.sendJob({
			type: "transaction.created",
			clientId,
			transactionId,
			timestamp: new Date().toISOString(),
		});
	}

	/**
	 * Queues an operation.created job
	 */
	async queueOperationCreated(
		clientId: string,
		operationId: string,
	): Promise<void> {
		await this.sendJob({
			type: "operation.created",
			clientId,
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
