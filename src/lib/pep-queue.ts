/**
 * PEP Check Queue Service
 *
 * Handles queueing of PEP (Politically Exposed Person) check jobs
 * to the pep-check-worker for async processing via watchlist-svc
 */

export type PEPJobType = "client.check" | "ubo.check" | "batch.refresh";

export type PEPEntityType = "client" | "ubo";

export interface PEPJob {
	type: PEPJobType;
	entityId: string; // clientId or uboId
	entityType: PEPEntityType;
	name: string; // Full name for PEP lookup
	timestamp: string;
	// Optional context for tracking
	organizationId?: string;
	triggeredBy?: string; // "create", "update", "cron"
}

/**
 * Service for queueing PEP check jobs
 */
export class PEPQueueService {
	constructor(private queue: Queue<PEPJob> | undefined) {}

	/**
	 * Checks if the queue is available
	 */
	isAvailable(): boolean {
		return this.queue !== undefined;
	}

	/**
	 * Queues a PEP check for a client
	 */
	async queueClientPEPCheck(
		clientId: string,
		fullName: string,
		options?: { organizationId?: string; triggeredBy?: string },
	): Promise<void> {
		await this.sendJob({
			type: "client.check",
			entityId: clientId,
			entityType: "client",
			name: fullName,
			timestamp: new Date().toISOString(),
			organizationId: options?.organizationId,
			triggeredBy: options?.triggeredBy ?? "manual",
		});
	}

	/**
	 * Queues a PEP check for a UBO
	 */
	async queueUBOPEPCheck(
		uboId: string,
		fullName: string,
		options?: { organizationId?: string; triggeredBy?: string },
	): Promise<void> {
		await this.sendJob({
			type: "ubo.check",
			entityId: uboId,
			entityType: "ubo",
			name: fullName,
			timestamp: new Date().toISOString(),
			organizationId: options?.organizationId,
			triggeredBy: options?.triggeredBy ?? "manual",
		});
	}

	/**
	 * Queues a batch refresh job (triggered by cron)
	 * The worker will fetch stale entities and process them
	 */
	async queueBatchRefresh(): Promise<void> {
		await this.sendJob({
			type: "batch.refresh",
			entityId: "batch",
			entityType: "client", // Will process both clients and UBOs
			name: "batch-refresh",
			timestamp: new Date().toISOString(),
			triggeredBy: "cron",
		});
	}

	/**
	 * Sends a job to the queue
	 */
	private async sendJob(job: PEPJob): Promise<void> {
		if (!this.queue) {
			console.log(
				`[PEP Queue] Queue not configured, skipping job: ${job.type} for ${job.entityType} ${job.entityId}`,
			);
			return;
		}

		try {
			await this.queue.send(job);
			console.log(
				`[PEP Queue] Queued PEP check job: ${job.type} for ${job.entityType} ${job.entityId} (name: ${job.name})`,
			);
		} catch (error) {
			console.error("[PEP Queue] Failed to queue PEP check job:", error);
			// Don't throw - PEP checking is not critical path
		}
	}
}

/**
 * Creates a PEPQueueService from the environment
 */
export function createPEPQueueService(
	queue: Queue<PEPJob> | undefined,
): PEPQueueService {
	return new PEPQueueService(queue);
}
