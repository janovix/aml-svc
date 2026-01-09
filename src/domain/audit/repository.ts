/**
 * Audit Trail Repository
 *
 * Handles database operations for the audit log.
 * This is an append-only log - no updates or deletes are allowed.
 */

import { Prisma } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";

import { generateId } from "../../lib/id-generator";
import {
	computeDataHash,
	computeSignature,
	DEFAULT_AUDIT_SECRET_KEY,
} from "../../lib/audit-crypto";
import { mapPrismaAuditLog, mapPrismaAuditLogParsed } from "./mappers";
import type { AuditLogFilters } from "./schemas";
import type {
	AuditLogEntity,
	AuditLogEntityParsed,
	AuditLogCreateInput,
	ListResult,
	AuditLogStats,
} from "./types";

export class AuditLogRepository {
	constructor(
		private readonly prisma: PrismaClient,
		private readonly secretKey: string = DEFAULT_AUDIT_SECRET_KEY,
	) {}

	/**
	 * List audit logs with filtering and pagination
	 */
	async list(
		organizationId: string,
		filters: AuditLogFilters,
	): Promise<ListResult<AuditLogEntityParsed>> {
		const {
			page,
			limit,
			entityType,
			entityId,
			action,
			actorId,
			actorType,
			startDate,
			endDate,
		} = filters;

		const where: Prisma.AuditLogWhereInput = {
			organizationId,
		};

		if (entityType) {
			where.entityType = entityType;
		}

		if (entityId) {
			where.entityId = entityId;
		}

		if (action) {
			where.action = action;
		}

		if (actorId) {
			where.actorId = actorId;
		}

		if (actorType) {
			where.actorType = actorType;
		}

		if (startDate || endDate) {
			const dateRange: Prisma.DateTimeFilter = {};
			if (startDate) {
				dateRange.gte = new Date(startDate + "T00:00:00.000Z");
			}
			if (endDate) {
				dateRange.lte = new Date(endDate + "T23:59:59.999Z");
			}
			where.timestamp = dateRange;
		}

		const [total, records] = await Promise.all([
			this.prisma.auditLog.count({ where }),
			this.prisma.auditLog.findMany({
				where,
				skip: (page - 1) * limit,
				take: limit,
				orderBy: { sequenceNumber: "desc" },
			}),
		]);

		const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

		return {
			data: records.map(mapPrismaAuditLogParsed),
			pagination: {
				page,
				limit,
				total,
				totalPages,
			},
		};
	}

	/**
	 * Get a single audit log entry by ID
	 */
	async getById(
		organizationId: string,
		id: string,
	): Promise<AuditLogEntityParsed | null> {
		const record = await this.prisma.auditLog.findFirst({
			where: { id, organizationId },
		});

		if (!record) {
			return null;
		}

		return mapPrismaAuditLogParsed(record);
	}

	/**
	 * Get audit history for a specific entity
	 */
	async getEntityHistory(
		organizationId: string,
		entityType: string,
		entityId: string,
		page: number = 1,
		limit: number = 20,
	): Promise<ListResult<AuditLogEntityParsed>> {
		const where: Prisma.AuditLogWhereInput = {
			organizationId,
			entityType,
			entityId,
		};

		const [total, records] = await Promise.all([
			this.prisma.auditLog.count({ where }),
			this.prisma.auditLog.findMany({
				where,
				skip: (page - 1) * limit,
				take: limit,
				orderBy: { sequenceNumber: "desc" },
			}),
		]);

		const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

		return {
			data: records.map(mapPrismaAuditLogParsed),
			pagination: {
				page,
				limit,
				total,
				totalPages,
			},
		};
	}

	/**
	 * Create a new audit log entry with cryptographic chaining
	 *
	 * This is the core append operation that:
	 * 1. Gets the next sequence number
	 * 2. Gets the previous entry's signature
	 * 3. Computes the data hash
	 * 4. Computes the signature (chained with previous)
	 * 5. Inserts the new entry
	 */
	async create(input: AuditLogCreateInput): Promise<AuditLogEntity> {
		const timestamp = new Date();
		const id = generateId("AUDIT_LOG");

		// Get the next sequence number and previous signature atomically
		// Using a transaction to ensure consistency
		const result = await this.prisma.$transaction(async (tx) => {
			// Get the last entry for this organization
			const lastEntry = await tx.auditLog.findFirst({
				where: { organizationId: input.organizationId },
				orderBy: { sequenceNumber: "desc" },
				select: { sequenceNumber: true, signature: true },
			});

			const sequenceNumber = lastEntry ? lastEntry.sequenceNumber + 1 : 1;
			const previousSignature = lastEntry?.signature ?? null;

			// Serialize JSON data
			const oldData = input.oldData ? JSON.stringify(input.oldData) : null;
			const newData = input.newData ? JSON.stringify(input.newData) : null;
			const metadata = input.metadata ? JSON.stringify(input.metadata) : null;

			// Compute data hash
			const dataHash = await computeDataHash({
				entityType: input.entityType,
				entityId: input.entityId,
				action: input.action,
				actorId: input.actorId ?? null,
				actorType: input.actorType,
				timestamp: timestamp.toISOString(),
				oldData,
				newData,
				sequenceNumber,
				metadata,
			});

			// Compute signature (chained with previous)
			const signature = await computeSignature(
				dataHash,
				previousSignature,
				this.secretKey,
			);

			// Create the entry
			const created = await tx.auditLog.create({
				data: {
					id,
					organizationId: input.organizationId,
					entityType: input.entityType,
					entityId: input.entityId,
					action: input.action,
					actorId: input.actorId ?? null,
					actorType: input.actorType,
					timestamp,
					oldData,
					newData,
					sequenceNumber,
					dataHash,
					previousSignature,
					signature,
					ipAddress: input.ipAddress ?? null,
					userAgent: input.userAgent ?? null,
					metadata,
				},
			});

			return created;
		});

		return mapPrismaAuditLog(result);
	}

	/**
	 * Get entries for chain verification
	 */
	async getEntriesForVerification(
		organizationId: string,
		startSequence?: number,
		endSequence?: number,
		limit: number = 1000,
	): Promise<AuditLogEntity[]> {
		const where: Prisma.AuditLogWhereInput = {
			organizationId,
		};

		if (startSequence !== undefined || endSequence !== undefined) {
			const sequenceFilter: Prisma.IntFilter = {};
			if (startSequence !== undefined) {
				sequenceFilter.gte = startSequence;
			}
			if (endSequence !== undefined) {
				sequenceFilter.lte = endSequence;
			}
			where.sequenceNumber = sequenceFilter;
		}

		const records = await this.prisma.auditLog.findMany({
			where,
			orderBy: { sequenceNumber: "asc" },
			take: limit,
		});

		return records.map(mapPrismaAuditLog);
	}

	/**
	 * Get statistics for audit logs
	 */
	async getStats(organizationId: string): Promise<AuditLogStats> {
		const [totalEntries, firstEntry, lastEntry, allEntries] = await Promise.all(
			[
				this.prisma.auditLog.count({
					where: { organizationId },
				}),
				this.prisma.auditLog.findFirst({
					where: { organizationId },
					orderBy: { sequenceNumber: "asc" },
					select: { timestamp: true },
				}),
				this.prisma.auditLog.findFirst({
					where: { organizationId },
					orderBy: { sequenceNumber: "desc" },
					select: { timestamp: true },
				}),
				this.prisma.auditLog.findMany({
					where: { organizationId },
					select: { action: true, entityType: true, actorType: true },
				}),
			],
		);

		// Compute aggregations
		const entriesByAction: Record<string, number> = {};
		const entriesByEntityType: Record<string, number> = {};
		const entriesByActorType: Record<string, number> = {};

		for (const entry of allEntries) {
			entriesByAction[entry.action] = (entriesByAction[entry.action] || 0) + 1;
			entriesByEntityType[entry.entityType] =
				(entriesByEntityType[entry.entityType] || 0) + 1;
			entriesByActorType[entry.actorType] =
				(entriesByActorType[entry.actorType] || 0) + 1;
		}

		return {
			totalEntries,
			firstEntry: firstEntry?.timestamp.toISOString() ?? null,
			lastEntry: lastEntry?.timestamp.toISOString() ?? null,
			entriesByAction,
			entriesByEntityType,
			entriesByActorType,
		};
	}

	/**
	 * Get the latest sequence number for an organization
	 */
	async getLatestSequenceNumber(organizationId: string): Promise<number> {
		const lastEntry = await this.prisma.auditLog.findFirst({
			where: { organizationId },
			orderBy: { sequenceNumber: "desc" },
			select: { sequenceNumber: true },
		});

		return lastEntry?.sequenceNumber ?? 0;
	}
}
