/**
 * Import Queue Processor
 *
 * Processes import jobs from the aml-imports queue.
 * This replaces the standalone aml-import-worker.
 */

import type { Bindings } from "../../types";
import type { ImportJob } from "./types";

const LOG_TAG = "[import-queue]";

export async function processImportBatch(
	batch: MessageBatch<ImportJob>,
	env: Bindings,
): Promise<void> {
	const { processImportJob } = await import("./import-job-handler");

	for (const message of batch.messages) {
		try {
			await processImportJob(env, message.body);
			message.ack();
		} catch (err) {
			console.error(
				`${LOG_TAG} Failed to process import ${message.body.importId}:`,
				err,
			);
			message.retry();
		}
	}
}
