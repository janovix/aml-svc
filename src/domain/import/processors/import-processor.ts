/**
 * Import Processor
 * Main processor that orchestrates the import flow using direct DB access.
 * Replaces the standalone aml-import-worker's ImportProcessor.
 */

import type { PrismaClient } from "@prisma/client";
import type { Bindings, NotificationsRpc } from "../../../types";
import type { ImportJob, ParsedRow, RowProcessingResult } from "../types";
import { ImportRepository } from "../repository";
import {
	parseCSV,
	getCSVHeaders,
	validateHeaders,
	applyColumnMappingToHeaders,
	applyColumnMappingToRow,
} from "../parsers/csv-parser";
import {
	parseExcel,
	getExcelHeaders,
	isExcelFile,
} from "../parsers/excel-parser";
import { processClientRow, getClientRequiredHeaders } from "./client-processor";
import {
	processOperationRow,
	getOperationRequiredHeaders,
} from "./operation-processor";
import { getPrismaClient } from "../../../lib/prisma";

const BATCH_SIZE = 100;

function getAmlFrontendUrl(env: Bindings): string {
	return (
		((env as Record<string, unknown>).AML_FRONTEND_URL as string | undefined) ??
		"https://aml.janovix.workers.dev"
	);
}

export class ImportProcessor {
	private readonly prisma: PrismaClient;
	private readonly importRepo: ImportRepository;
	private readonly notifService: NotificationsRpc | undefined;

	constructor(private readonly env: Bindings) {
		this.prisma = getPrismaClient(env.DB);
		this.importRepo = new ImportRepository(this.prisma);
		this.notifService = env.NOTIFICATIONS_SERVICE;
	}

	async processJob(job: ImportJob): Promise<void> {
		const {
			importId,
			organizationId,
			entityType,
			activityCode,
			fileUrl,
			columnMapping,
		} = job;

		console.log(
			`[ImportProcessor] Starting import ${importId} for ${entityType}`,
		);

		try {
			await this.importRepo.updateStatus(importId, { status: "VALIDATING" });

			const fileContent = await this.downloadFile(fileUrl);
			if (!fileContent) {
				throw new Error(`Failed to download file: ${fileUrl}`);
			}

			const isExcel = isExcelFile(fileUrl);
			let rows: ParsedRow[];
			let headers: string[];

			if (isExcel) {
				rows = parseExcel(fileContent);
				headers = getExcelHeaders(fileContent);
			} else {
				const textContent = new TextDecoder("utf-8").decode(fileContent);
				rows = parseCSV(textContent);
				headers = getCSVHeaders(textContent);
			}

			console.log(
				`[ImportProcessor] Parsed ${rows.length} rows from ${isExcel ? "Excel" : "CSV"} file`,
			);

			const headersToValidate =
				columnMapping && Object.keys(columnMapping).length > 0
					? applyColumnMappingToHeaders(headers, columnMapping)
					: headers;

			const requiredHeaders =
				entityType === "CLIENT"
					? getClientRequiredHeaders()
					: getOperationRequiredHeaders();

			const headerValidation = validateHeaders(
				headersToValidate,
				requiredHeaders,
			);
			if (!headerValidation.valid) {
				throw new Error(
					`Missing required headers: ${headerValidation.missing.join(", ")}`,
				);
			}

			await this.importRepo.updateStatus(importId, {
				status: "VALIDATING",
				totalRows: rows.length,
			});

			for (let i = 0; i < rows.length; i += BATCH_SIZE) {
				const batch = rows.slice(i, i + BATCH_SIZE);
				await this.importRepo.createRowResults(importId, {
					rows: batch.map((row) => ({
						rowNumber: row.rowNumber,
						rawData: JSON.stringify(row.data),
					})),
				});
			}

			await this.importRepo.updateStatus(importId, { status: "PROCESSING" });

			let successCount = 0;
			let warningCount = 0;
			let errorCount = 0;
			let skippedCount = 0;

			const hasMapping = columnMapping && Object.keys(columnMapping).length > 0;

			for (const row of rows) {
				const rowToProcess = hasMapping
					? {
							...row,
							data: applyColumnMappingToRow(row.data, columnMapping),
						}
					: row;

				const result = await this.processRow(
					organizationId,
					entityType,
					activityCode,
					rowToProcess,
					job.createdBy,
				);

				await this.importRepo.updateRowResult(importId, result.rowNumber, {
					status: result.status,
					entityId: result.entityId,
					message: result.message,
					errors: result.errors,
				});

				if (result.status === "SUCCESS") {
					successCount++;
				} else if (result.status === "WARNING") {
					warningCount++;
				} else if (result.status === "SKIPPED") {
					skippedCount++;
				} else {
					errorCount++;
				}
			}

			await this.importRepo.updateStatus(importId, {
				status: "COMPLETED",
				processedRows: rows.length,
				successCount,
				warningCount,
				errorCount,
				skippedCount,
			});

			console.log(
				`[ImportProcessor] Completed import ${importId}: ${successCount} success, ${warningCount} warnings, ${errorCount} errors, ${skippedCount} skipped`,
			);

			await this.sendCompletedNotification(
				organizationId,
				importId,
				entityType,
				{
					success: successCount,
					warnings: warningCount,
					errors: errorCount,
					skipped: skippedCount,
					total: rows.length,
				},
			);
		} catch (error) {
			console.error(`[ImportProcessor] Import ${importId} failed:`, error);

			const errorMessage =
				error instanceof Error ? error.message : "Unknown error";
			await this.importRepo.updateStatus(importId, {
				status: "FAILED",
				errorMessage,
			});

			await this.sendFailedNotification(
				organizationId,
				importId,
				entityType,
				errorMessage,
			);
		}
	}

	private async downloadFile(fileUrl: string): Promise<ArrayBuffer | null> {
		const object = await this.env.R2_BUCKET.get(fileUrl);
		if (!object) {
			return null;
		}
		return object.arrayBuffer();
	}

	private async processRow(
		organizationId: string,
		entityType: string,
		activityCode: string | undefined,
		row: ParsedRow,
		createdBy: string,
	): Promise<RowProcessingResult> {
		try {
			if (entityType === "CLIENT") {
				return await processClientRow(
					this.prisma,
					this.env,
					organizationId,
					row,
					createdBy,
				);
			} else if (entityType === "OPERATION") {
				if (!activityCode) {
					throw new Error("Activity code is required for OPERATION imports");
				}
				return await processOperationRow(
					this.prisma,
					this.env,
					organizationId,
					activityCode,
					row,
				);
			} else {
				return {
					rowNumber: row.rowNumber,
					status: "ERROR",
					errors: [`Unknown entity type: ${entityType}`],
					message: `Unknown entity type: ${entityType}`,
				};
			}
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : "Unknown error";
			return {
				rowNumber: row.rowNumber,
				status: "ERROR",
				errors: [errorMessage],
				message: `Processing error: ${errorMessage}`,
			};
		}
	}

	private async sendCompletedNotification(
		organizationId: string,
		importId: string,
		entityType: string,
		counts: {
			success: number;
			warnings: number;
			errors: number;
			skipped: number;
			total: number;
		},
	): Promise<void> {
		if (!this.notifService) return;

		try {
			const entityLabel = entityType === "CLIENT" ? "clients" : "operations";
			const amlFrontendUrl = getAmlFrontendUrl(this.env);
			const callbackUrl = `${amlFrontendUrl.replace(/\/$/, "")}/imports/${importId}`;

			const bodyParts = [
				`${counts.total} row${counts.total !== 1 ? "s" : ""} processed:`,
				`${counts.success} succeeded`,
			];
			if (counts.warnings > 0) bodyParts.push(`${counts.warnings} warnings`);
			if (counts.errors > 0) bodyParts.push(`${counts.errors} errors`);
			if (counts.skipped > 0) bodyParts.push(`${counts.skipped} skipped`);

			await this.notifService.notify({
				tenantId: organizationId,
				target: { kind: "org" },
				channelSlug: "system",
				type: "aml.import.completed",
				title: `Import Completed: ${entityLabel}`,
				body: bodyParts.join(", ") + ".",
				payload: {
					importId,
					entityType,
					successCount: counts.success,
					warningCount: counts.warnings,
					errorCount: counts.errors,
					totalRows: counts.total,
				},
				severity: counts.errors > 0 ? "warn" : "info",
				callbackUrl,
				sendEmail: false,
				sourceService: "aml-svc",
				sourceEvent: "import.completed",
			});
		} catch (err) {
			console.error(
				"[ImportProcessor] Failed to send completed notification:",
				err,
			);
		}
	}

	private async sendFailedNotification(
		organizationId: string,
		importId: string,
		entityType: string,
		errorMessage: string,
	): Promise<void> {
		if (!this.notifService) return;

		try {
			const entityLabel = entityType === "CLIENT" ? "clients" : "operations";
			const amlFrontendUrl = getAmlFrontendUrl(this.env);
			const callbackUrl = `${amlFrontendUrl.replace(/\/$/, "")}/imports/${importId}`;

			await this.notifService.notify({
				tenantId: organizationId,
				target: { kind: "org" },
				channelSlug: "system",
				type: "aml.import.failed",
				title: `Import Failed: ${entityLabel}`,
				body: `The import could not be completed. Reason: ${errorMessage}`,
				payload: { importId, entityType, errorMessage },
				severity: "error",
				callbackUrl,
				sendEmail: false,
				sourceService: "aml-svc",
				sourceEvent: "import.failed",
			});
		} catch (err) {
			console.error(
				"[ImportProcessor] Failed to send failed notification:",
				err,
			);
		}
	}
}
