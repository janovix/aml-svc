/**
 * Audit Trail Mappers
 *
 * Functions to map between Prisma entities and domain entities.
 */

import type { AuditLog } from "@prisma/client";
import type {
	AuditLogEntity,
	AuditLogEntityParsed,
	AuditAction,
	AuditActorType,
} from "./types";

/**
 * Map Prisma AuditLog to domain entity (raw JSON strings)
 */
export function mapPrismaAuditLog(record: AuditLog): AuditLogEntity {
	return {
		id: record.id,
		organizationId: record.organizationId,
		entityType: record.entityType,
		entityId: record.entityId,
		action: record.action as AuditAction,
		actorId: record.actorId,
		actorType: record.actorType as AuditActorType,
		timestamp: record.timestamp.toISOString(),
		oldData: record.oldData,
		newData: record.newData,
		sequenceNumber: record.sequenceNumber,
		dataHash: record.dataHash,
		previousSignature: record.previousSignature,
		signature: record.signature,
		ipAddress: record.ipAddress,
		userAgent: record.userAgent,
		metadata: record.metadata,
		createdAt: record.createdAt.toISOString(),
	};
}

/**
 * Map Prisma AuditLog to parsed domain entity (deserialized JSON)
 */
export function mapPrismaAuditLogParsed(
	record: AuditLog,
): AuditLogEntityParsed {
	const parseJson = (str: string | null): Record<string, unknown> | null => {
		if (!str) return null;
		try {
			return JSON.parse(str);
		} catch {
			return null;
		}
	};

	return {
		id: record.id,
		organizationId: record.organizationId,
		entityType: record.entityType,
		entityId: record.entityId,
		action: record.action as AuditAction,
		actorId: record.actorId,
		actorType: record.actorType as AuditActorType,
		timestamp: record.timestamp.toISOString(),
		oldData: parseJson(record.oldData),
		newData: parseJson(record.newData),
		sequenceNumber: record.sequenceNumber,
		dataHash: record.dataHash,
		previousSignature: record.previousSignature,
		signature: record.signature,
		ipAddress: record.ipAddress,
		userAgent: record.userAgent,
		metadata: parseJson(record.metadata),
		createdAt: record.createdAt.toISOString(),
	};
}

/**
 * Convert AuditAction to Prisma enum value
 */
export function toPrismaAuditAction(action: AuditAction): string {
	return action;
}

/**
 * Convert AuditActorType to Prisma enum value
 */
export function toPrismaAuditActorType(actorType: AuditActorType): string {
	return actorType;
}
