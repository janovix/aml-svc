/**
 * Audit logging client via service binding
 *
 * This module provides helpers for logging audit events to auth-svc
 * via Cloudflare service binding.
 */

import * as Sentry from "@sentry/cloudflare";
import type { Bindings } from "../types";

/**
 * Event types for audit logging
 */
export type AuditEventType =
	| "CREATE"
	| "UPDATE"
	| "DELETE"
	| "LOGIN"
	| "LOGOUT"
	| "PASSWORD_RESET"
	| "EMAIL_VERIFIED"
	| "ROLE_CHANGE"
	| "PERMISSION_CHANGE"
	| "EXPORT"
	| "IMPORT"
	| "SYSTEM";

/**
 * Input for creating an audit log entry
 */
export interface AuditLogInput {
	eventType: AuditEventType | string;
	entityType: string;
	entityId?: string | null;
	actorUserId?: string | null;
	actorOrganizationId?: string | null;
	actorIp?: string | null;
	actorUserAgent?: string | null;
	previousState?: Record<string, unknown> | null;
	newState?: Record<string, unknown> | null;
	changeSummary?: Record<string, unknown> | null;
	requestId?: string | null;
	metadata?: Record<string, unknown> | null;
}

/**
 * Result from creating an audit log
 */
export interface AuditLogResult {
	id: string;
	signature: string;
}

/**
 * Audit client for logging events to auth-svc
 */
export class AuditClient {
	private env: Bindings;
	private sourceService: string;

	constructor(env: Bindings, sourceService = "aml-svc") {
		this.env = env;
		this.sourceService = sourceService;
	}

	/**
	 * Log an audit event
	 *
	 * @param input - Audit log input
	 * @returns Audit log result with ID and signature, or null if failed
	 *
	 * @example
	 * ```typescript
	 * const audit = new AuditClient(c.env);
	 *
	 * // Log a create event
	 * await audit.log({
	 *   eventType: "CREATE",
	 *   entityType: "operation",
	 *   entityId: operation.id,
	 *   actorUserId: user.id,
	 *   actorOrganizationId: org.id,
	 *   newState: operation,
	 *   metadata: { source: "manual_entry" },
	 * });
	 * ```
	 */
	async log(input: AuditLogInput): Promise<AuditLogResult | null> {
		const authService = this.env.AUTH_SERVICE;
		if (!authService) {
			return null;
		}

		try {
			const result = await authService.logAuditEvent({
				...input,
				sourceService: this.sourceService,
			});
			return result;
		} catch (error) {
			Sentry.captureException(error, {
				tags: { context: "audit-log-exception" },
			});
			return null;
		}
	}

	/**
	 * Log a CREATE event
	 */
	async logCreate(
		entityType: string,
		entityId: string,
		newState: Record<string, unknown>,
		options: Partial<AuditLogInput> = {},
	): Promise<AuditLogResult | null> {
		return this.log({
			eventType: "CREATE",
			entityType,
			entityId,
			newState,
			...options,
		});
	}

	/**
	 * Log an UPDATE event
	 */
	async logUpdate(
		entityType: string,
		entityId: string,
		previousState: Record<string, unknown>,
		newState: Record<string, unknown>,
		options: Partial<AuditLogInput> = {},
	): Promise<AuditLogResult | null> {
		return this.log({
			eventType: "UPDATE",
			entityType,
			entityId,
			previousState,
			newState,
			...options,
		});
	}

	/**
	 * Log a DELETE event
	 */
	async logDelete(
		entityType: string,
		entityId: string,
		previousState: Record<string, unknown>,
		options: Partial<AuditLogInput> = {},
	): Promise<AuditLogResult | null> {
		return this.log({
			eventType: "DELETE",
			entityType,
			entityId,
			previousState,
			...options,
		});
	}

	/**
	 * Log an EXPORT event
	 */
	async logExport(
		entityType: string,
		metadata: Record<string, unknown>,
		options: Partial<AuditLogInput> = {},
	): Promise<AuditLogResult | null> {
		return this.log({
			eventType: "EXPORT",
			entityType,
			metadata,
			...options,
		});
	}

	/**
	 * Log an IMPORT event
	 */
	async logImport(
		entityType: string,
		metadata: Record<string, unknown>,
		options: Partial<AuditLogInput> = {},
	): Promise<AuditLogResult | null> {
		return this.log({
			eventType: "IMPORT",
			entityType,
			metadata,
			...options,
		});
	}
}

/**
 * Create an audit client instance
 */
export function createAuditClient(
	env: Bindings,
	sourceService = "aml-svc",
): AuditClient {
	return new AuditClient(env, sourceService);
}
