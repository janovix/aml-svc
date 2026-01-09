/**
 * Audit Trail Service
 *
 * Business logic layer for audit logging operations.
 * Provides high-level methods for logging events and verifying chain integrity.
 */

import type { AuditLogRepository } from "./repository";
import type {
	AuditLogFilters,
	ChainVerifyRequest,
	AuditExportRequest,
} from "./schemas";
import type {
	AuditLogEntity,
	AuditLogEntityParsed,
	AuditLogCreateInput,
	ListResult,
	ChainVerificationResult,
	AuditLogStats,
	AuditAction,
	AuditActorType,
} from "./types";
import { verifyChain, DEFAULT_AUDIT_SECRET_KEY } from "../../lib/audit-crypto";

export class AuditLogService {
	constructor(
		private readonly repository: AuditLogRepository,
		private readonly secretKey: string = DEFAULT_AUDIT_SECRET_KEY,
	) {}

	/**
	 * List audit logs with filtering and pagination
	 */
	list(
		organizationId: string,
		filters: AuditLogFilters,
	): Promise<ListResult<AuditLogEntityParsed>> {
		return this.repository.list(organizationId, filters);
	}

	/**
	 * Get a single audit log entry
	 */
	async get(organizationId: string, id: string): Promise<AuditLogEntityParsed> {
		const entry = await this.repository.getById(organizationId, id);
		if (!entry) {
			throw new Error("AUDIT_LOG_NOT_FOUND");
		}
		return entry;
	}

	/**
	 * Get audit history for a specific entity
	 */
	getEntityHistory(
		organizationId: string,
		entityType: string,
		entityId: string,
		page: number = 1,
		limit: number = 20,
	): Promise<ListResult<AuditLogEntityParsed>> {
		return this.repository.getEntityHistory(
			organizationId,
			entityType,
			entityId,
			page,
			limit,
		);
	}

	/**
	 * Log an audit event
	 *
	 * This is the main method to create audit entries.
	 * It handles all the cryptographic chaining internally.
	 */
	log(input: AuditLogCreateInput): Promise<AuditLogEntity> {
		return this.repository.create(input);
	}

	/**
	 * Log an entity creation event
	 */
	logCreate(
		organizationId: string,
		entityType: string,
		entityId: string,
		newData: Record<string, unknown>,
		context: {
			actorId?: string;
			actorType?: AuditActorType;
			ipAddress?: string;
			userAgent?: string;
			metadata?: Record<string, unknown>;
		} = {},
	): Promise<AuditLogEntity> {
		return this.log({
			organizationId,
			entityType,
			entityId,
			action: "CREATE",
			actorId: context.actorId,
			actorType: context.actorType ?? "SYSTEM",
			newData,
			ipAddress: context.ipAddress,
			userAgent: context.userAgent,
			metadata: context.metadata,
		});
	}

	/**
	 * Log an entity update event
	 */
	logUpdate(
		organizationId: string,
		entityType: string,
		entityId: string,
		oldData: Record<string, unknown>,
		newData: Record<string, unknown>,
		context: {
			actorId?: string;
			actorType?: AuditActorType;
			ipAddress?: string;
			userAgent?: string;
			metadata?: Record<string, unknown>;
		} = {},
	): Promise<AuditLogEntity> {
		return this.log({
			organizationId,
			entityType,
			entityId,
			action: "UPDATE",
			actorId: context.actorId,
			actorType: context.actorType ?? "SYSTEM",
			oldData,
			newData,
			ipAddress: context.ipAddress,
			userAgent: context.userAgent,
			metadata: context.metadata,
		});
	}

	/**
	 * Log an entity deletion event
	 */
	logDelete(
		organizationId: string,
		entityType: string,
		entityId: string,
		oldData: Record<string, unknown>,
		context: {
			actorId?: string;
			actorType?: AuditActorType;
			ipAddress?: string;
			userAgent?: string;
			metadata?: Record<string, unknown>;
		} = {},
	): Promise<AuditLogEntity> {
		return this.log({
			organizationId,
			entityType,
			entityId,
			action: "DELETE",
			actorId: context.actorId,
			actorType: context.actorType ?? "SYSTEM",
			oldData,
			ipAddress: context.ipAddress,
			userAgent: context.userAgent,
			metadata: context.metadata,
		});
	}

	/**
	 * Log a custom action
	 */
	logAction(
		organizationId: string,
		entityType: string,
		entityId: string,
		action: AuditAction,
		context: {
			actorId?: string;
			actorType?: AuditActorType;
			oldData?: Record<string, unknown>;
			newData?: Record<string, unknown>;
			ipAddress?: string;
			userAgent?: string;
			metadata?: Record<string, unknown>;
		} = {},
	): Promise<AuditLogEntity> {
		return this.log({
			organizationId,
			entityType,
			entityId,
			action,
			actorId: context.actorId,
			actorType: context.actorType ?? "SYSTEM",
			oldData: context.oldData,
			newData: context.newData,
			ipAddress: context.ipAddress,
			userAgent: context.userAgent,
			metadata: context.metadata,
		});
	}

	/**
	 * Verify the integrity of the audit log chain
	 *
	 * This checks that:
	 * 1. Each entry's dataHash matches its content
	 * 2. Each entry's previousSignature matches the previous entry's signature
	 * 3. Each entry's signature is valid
	 */
	async verifyChain(
		organizationId: string,
		request: ChainVerifyRequest,
	): Promise<ChainVerificationResult> {
		const entries = await this.repository.getEntriesForVerification(
			organizationId,
			request.startSequence,
			request.endSequence,
			request.limit,
		);

		if (entries.length === 0) {
			return {
				valid: true,
				organizationId,
				entriesVerified: 0,
				verifiedAt: new Date().toISOString(),
			};
		}

		// Convert entries to verification format
		const verificationEntries = entries.map((entry) => ({
			id: entry.id,
			entityType: entry.entityType,
			entityId: entry.entityId,
			action: entry.action,
			actorId: entry.actorId,
			actorType: entry.actorType,
			timestamp: entry.timestamp,
			oldData: entry.oldData,
			newData: entry.newData,
			sequenceNumber: entry.sequenceNumber,
			metadata: entry.metadata,
			dataHash: entry.dataHash,
			previousSignature: entry.previousSignature,
			signature: entry.signature,
		}));

		const result = await verifyChain(verificationEntries, this.secretKey);

		// Log the verification action
		await this.logAction(
			organizationId,
			"AUDIT_LOG",
			organizationId,
			"VERIFY",
			{
				actorType: "SYSTEM",
				metadata: {
					entriesVerified: result.entriesVerified,
					valid: result.valid,
					startSequence: request.startSequence,
					endSequence: request.endSequence,
				},
			},
		);

		return {
			valid: result.valid,
			organizationId,
			entriesVerified: result.entriesVerified,
			verifiedAt: new Date().toISOString(),
			firstInvalidEntry: result.firstInvalidEntry,
		};
	}

	/**
	 * Get audit log statistics
	 */
	getStats(organizationId: string): Promise<AuditLogStats> {
		return this.repository.getStats(organizationId);
	}

	/**
	 * Export audit logs for compliance
	 */
	async export(
		organizationId: string,
		request: AuditExportRequest,
	): Promise<{
		data: AuditLogEntityParsed[];
		format: string;
		exportedAt: string;
		totalRecords: number;
	}> {
		const filters: AuditLogFilters = {
			page: 1,
			limit: request.limit,
			startDate: request.startDate,
			endDate: request.endDate,
			entityType: request.entityType,
		};

		const result = await this.repository.list(organizationId, filters);

		// Log the export action
		await this.logAction(
			organizationId,
			"AUDIT_LOG",
			organizationId,
			"EXPORT",
			{
				actorType: "SYSTEM",
				metadata: {
					format: request.format,
					totalRecords: result.pagination.total,
					startDate: request.startDate,
					endDate: request.endDate,
					entityType: request.entityType,
				},
			},
		);

		return {
			data: result.data,
			format: request.format,
			exportedAt: new Date().toISOString(),
			totalRecords: result.pagination.total,
		};
	}
}
