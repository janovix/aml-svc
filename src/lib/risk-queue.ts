/**
 * Risk Assessment Queue Service
 *
 * Handles queueing of risk assessment jobs consumed by aml-svc itself.
 * Risk calculations run asynchronously because they touch multiple tables
 * and reference data, and batch re-assessments can affect thousands of clients.
 */

import * as Sentry from "@sentry/cloudflare";

export type RiskJobType =
	| "client.assess"
	| "client.reassess"
	| "client.batch_assess"
	| "org.assess"
	| "screening.risk_update"
	| "operation.risk_check";

export interface RiskJob {
	type: RiskJobType;
	organizationId: string;
	clientId?: string;
	operationId?: string;
	triggerReason: string;
	timestamp: string;
}

export class RiskQueueService {
	constructor(private queue: Queue<RiskJob> | undefined) {}

	isAvailable(): boolean {
		return this.queue !== undefined;
	}

	async queueClientAssess(
		organizationId: string,
		clientId: string,
		triggerReason: string,
	): Promise<void> {
		await this.sendJob({
			type: "client.assess",
			organizationId,
			clientId,
			triggerReason,
			timestamp: new Date().toISOString(),
		});
	}

	async queueClientReassess(
		organizationId: string,
		clientId: string,
		triggerReason: string,
	): Promise<void> {
		await this.sendJob({
			type: "client.reassess",
			organizationId,
			clientId,
			triggerReason,
			timestamp: new Date().toISOString(),
		});
	}

	async queueClientBatchAssess(
		organizationId: string,
		triggerReason: string,
	): Promise<void> {
		await this.sendJob({
			type: "client.batch_assess",
			organizationId,
			triggerReason,
			timestamp: new Date().toISOString(),
		});
	}

	async queueOrgAssess(
		organizationId: string,
		triggerReason: string,
	): Promise<void> {
		await this.sendJob({
			type: "org.assess",
			organizationId,
			triggerReason,
			timestamp: new Date().toISOString(),
		});
	}

	async queueScreeningRiskUpdate(
		organizationId: string,
		clientId: string,
		triggerReason: string,
	): Promise<void> {
		await this.sendJob({
			type: "screening.risk_update",
			organizationId,
			clientId,
			triggerReason,
			timestamp: new Date().toISOString(),
		});
	}

	async queueOperationRiskCheck(
		organizationId: string,
		clientId: string,
		operationId: string,
		triggerReason: string,
	): Promise<void> {
		await this.sendJob({
			type: "operation.risk_check",
			organizationId,
			clientId,
			operationId,
			triggerReason,
			timestamp: new Date().toISOString(),
		});
	}

	private async sendJob(job: RiskJob): Promise<void> {
		if (!this.queue) {
			return;
		}

		try {
			await this.queue.send(job);
		} catch (error) {
			Sentry.captureException(error, {
				tags: { context: "risk-queue-failed" },
				extra: {
					jobType: job.type,
					organizationId: job.organizationId,
					clientId: job.clientId,
				},
			});
		}
	}
}

export function createRiskQueueService(
	queue: Queue<RiskJob> | undefined,
): RiskQueueService {
	return new RiskQueueService(queue);
}
