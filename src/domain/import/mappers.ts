/**
 * Import Domain Mappers
 * Functions to map between Prisma types and domain types
 */

import type {
	Import as PrismaImport,
	ImportRowResult as PrismaImportRowResult,
} from "@prisma/client";

import type {
	ImportEntity,
	ImportRowResultEntity,
	ImportEntityType,
	ImportStatus,
	ImportRowStatus,
} from "./types";

/**
 * Maps Prisma Import to domain ImportEntity
 */
export function mapPrismaImport(prisma: PrismaImport): ImportEntity {
	return {
		id: prisma.id,
		organizationId: prisma.organizationId,
		entityType: prisma.entityType as ImportEntityType,
		fileName: prisma.fileName,
		fileUrl: prisma.fileUrl,
		fileSize: prisma.fileSize,
		status: prisma.status as ImportStatus,
		totalRows: prisma.totalRows,
		processedRows: prisma.processedRows,
		successCount: prisma.successCount,
		warningCount: prisma.warningCount,
		errorCount: prisma.errorCount,
		errorMessage: prisma.errorMessage,
		createdBy: prisma.createdBy,
		startedAt: prisma.startedAt?.toISOString() ?? null,
		completedAt: prisma.completedAt?.toISOString() ?? null,
		createdAt: prisma.createdAt.toISOString(),
		updatedAt: prisma.updatedAt.toISOString(),
	};
}

/**
 * Maps Prisma ImportRowResult to domain ImportRowResultEntity
 */
export function mapPrismaImportRowResult(
	prisma: PrismaImportRowResult,
): ImportRowResultEntity {
	return {
		id: prisma.id,
		importId: prisma.importId,
		rowNumber: prisma.rowNumber,
		status: prisma.status as ImportRowStatus,
		rawData: prisma.rawData,
		entityId: prisma.entityId,
		message: prisma.message,
		errors: prisma.errors,
		createdAt: prisma.createdAt.toISOString(),
		updatedAt: prisma.updatedAt.toISOString(),
	};
}

/**
 * Maps ImportEntityType string to Prisma enum value
 */
export function toPrismaEntityType(
	entityType: string,
): "CLIENT" | "TRANSACTION" {
	const upper = entityType.toUpperCase();
	if (upper === "CLIENT" || upper === "TRANSACTION") {
		return upper;
	}
	throw new Error(`Invalid entity type: ${entityType}`);
}

/**
 * Maps ImportStatus string to Prisma enum value
 */
export function toPrismaImportStatus(
	status: string,
): "PENDING" | "VALIDATING" | "PROCESSING" | "COMPLETED" | "FAILED" {
	const upper = status.toUpperCase();
	if (
		upper === "PENDING" ||
		upper === "VALIDATING" ||
		upper === "PROCESSING" ||
		upper === "COMPLETED" ||
		upper === "FAILED"
	) {
		return upper;
	}
	throw new Error(`Invalid import status: ${status}`);
}

/**
 * Maps ImportRowStatus string to Prisma enum value
 */
export function toPrismaRowStatus(
	status: string,
): "PENDING" | "SUCCESS" | "WARNING" | "ERROR" | "SKIPPED" {
	const upper = status.toUpperCase();
	if (
		upper === "PENDING" ||
		upper === "SUCCESS" ||
		upper === "WARNING" ||
		upper === "ERROR" ||
		upper === "SKIPPED"
	) {
		return upper;
	}
	throw new Error(`Invalid row status: ${status}`);
}
