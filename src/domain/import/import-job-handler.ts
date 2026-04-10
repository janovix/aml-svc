/**
 * Import Job Handler
 *
 * Processes individual import jobs using the refactored ImportProcessor
 * which uses direct Prisma/service calls instead of HTTP fetch.
 */

import type { Bindings } from "../../types";
import type { ImportJob } from "./types";
import { ImportProcessor } from "./processors/import-processor";

export async function processImportJob(
	env: Bindings,
	job: ImportJob,
): Promise<void> {
	const processor = new ImportProcessor(env);
	await processor.processJob(job);
}
