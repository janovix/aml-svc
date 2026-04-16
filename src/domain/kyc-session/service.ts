import type { PrismaClient } from "@prisma/client";

import type { KycSessionEntity, KycSessionEventEntity } from "./types";
import { KycSessionRepository } from "./repository";
import { OrganizationSettingsRepository } from "../organization-settings/repository";
import { UmaValueRepository } from "../uma/repository";
import {
	getIdentificationThresholdUma,
	getNoticeThresholdUma,
} from "../operation/activities/registry";
import type { ActivityCode } from "../operation/types";
import type { KycSessionCreateInput, KycSessionRejectInput } from "./schemas";
import { APIError } from "../../middleware/error";
import type { TenantContext } from "../../lib/tenant-context";

/**
 * Generates a cryptographically secure random token for KYC session URLs.
 * Uses base64url encoding for URL safety.
 */
function generateSessionToken(): string {
	const bytes = new Uint8Array(32);
	crypto.getRandomValues(bytes);
	return btoa(String.fromCharCode(...bytes))
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=/g, "");
}

export class KycSessionService {
	private readonly sessionRepo: KycSessionRepository;
	private readonly orgSettingsRepo: OrganizationSettingsRepository;
	private readonly umaRepo: UmaValueRepository;

	constructor(prisma: PrismaClient) {
		this.sessionRepo = new KycSessionRepository(prisma);
		this.orgSettingsRepo = new OrganizationSettingsRepository(prisma);
		this.umaRepo = new UmaValueRepository(prisma);
	}

	/**
	 * Computes the client's max single-operation amount from the DB.
	 * Returns 0 if no operations found.
	 */
	private async getMaxOperationAmount(
		prisma: PrismaClient,
		clientId: string,
	): Promise<number> {
		const result = await prisma.operation.aggregate({
			where: { clientId, deletedAt: null },
			_max: { amount: true },
		});
		const val = result._max.amount;
		if (val === null || val === undefined) return 0;
		return typeof val === "number" ? val : parseFloat(val.toString());
	}

	/**
	 * Computes the client's 6-month cumulative operation total.
	 * Returns 0 if no operations found.
	 */
	private async getSixMonthCumulativeAmount(
		prisma: PrismaClient,
		clientId: string,
	): Promise<number> {
		const sixMonthsAgo = new Date();
		sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

		const result = await prisma.operation.aggregate({
			where: {
				clientId,
				deletedAt: null,
				operationDate: { gte: sixMonthsAgo },
			},
			_sum: { amount: true },
		});
		const val = result._sum.amount;
		if (val === null || val === undefined) return 0;
		return typeof val === "number" ? val : parseFloat(val.toString());
	}

	async create(
		tenant: TenantContext,
		input: KycSessionCreateInput,
		prisma: PrismaClient,
	): Promise<KycSessionEntity> {
		const settings = await this.orgSettingsRepo.findByOrganizationId(tenant);

		if (!settings) {
			throw new APIError(
				404,
				"NOT_FOUND",
				"Organization settings not configured",
			);
		}

		if (settings.selfServiceMode === "disabled") {
			throw new APIError(
				400,
				"SELF_SERVICE_DISABLED",
				"KYC self-service is not enabled for this organization",
			);
		}

		// Compute expiry
		const expiryHours =
			input.expiryHours ?? settings.selfServiceExpiryHours ?? 72;
		const expiresAt = new Date();
		expiresAt.setHours(expiresAt.getHours() + expiryHours);

		// Compute identification tier from activity thresholds (Art. 17 LFPIORPI)
		let identificationTier: "ALWAYS" | "ABOVE_THRESHOLD" | "BELOW_THRESHOLD" =
			"ALWAYS";
		let thresholdAmountMxn: number | null = null;
		let clientCumulativeMxn: number | null = null;

		try {
			const activityCode = settings.activityKey as ActivityCode;
			const idThresholdUma = getIdentificationThresholdUma(activityCode);
			const noticeThresholdUma = getNoticeThresholdUma(activityCode);
			const umaValue = await this.umaRepo.getActive();

			if (idThresholdUma === "ALWAYS") {
				identificationTier = "ALWAYS";
			} else if (umaValue) {
				const dailyValueNum = parseFloat(umaValue.dailyValue);
				const idThresholdMxn = idThresholdUma * dailyValueNum;
				const noticeThresholdMxn =
					noticeThresholdUma === "ALWAYS"
						? 0
						: (noticeThresholdUma as number) * dailyValueNum;

				const maxSingleOp = await this.getMaxOperationAmount(
					prisma,
					input.clientId,
				);
				const sixMonthCumulative = await this.getSixMonthCumulativeAmount(
					prisma,
					input.clientId,
				);

				const singleOpTriggered = maxSingleOp >= idThresholdMxn;
				const cumulativeTriggered =
					noticeThresholdUma !== "ALWAYS" &&
					sixMonthCumulative >= noticeThresholdMxn;

				identificationTier =
					singleOpTriggered || cumulativeTriggered
						? "ABOVE_THRESHOLD"
						: "BELOW_THRESHOLD";
				thresholdAmountMxn = idThresholdMxn;
				clientCumulativeMxn = sixMonthCumulative;
			}
		} catch {
			// If threshold computation fails (unknown activity code), default to ALWAYS for safety
			identificationTier = "ALWAYS";
		}

		const token = generateSessionToken();

		const session = await this.sessionRepo.create(tenant, {
			clientId: input.clientId,
			token,
			createdBy: input.createdBy ?? "system",
			expiresAt,
			editableSections:
				input.editableSections ??
				(settings.selfServiceRequiredSections as
					| (
							| "personal_info"
							| "documents"
							| "shareholders"
							| "beneficial_controllers"
							| "addresses"
					  )[]
					| null
					| undefined) ??
				undefined,
			identificationTier,
			thresholdAmountMxn,
			clientCumulativeMxn,
		});

		// Log session creation event
		await this.sessionRepo.createEvent({
			sessionId: session.id,
			eventType: "session_created",
			actorType: "system",
			actorId: input.createdBy,
		});

		return session;
	}

	async getById(id: string, organizationId: string): Promise<KycSessionEntity> {
		const session = await this.sessionRepo.findById(id);
		if (!session || session.organizationId !== organizationId) {
			throw new APIError(404, "NOT_FOUND", "KYC session not found");
		}
		return session;
	}

	async getByToken(token: string): Promise<KycSessionEntity> {
		const session = await this.sessionRepo.findByToken(token);
		if (!session) {
			throw new APIError(404, "NOT_FOUND", "KYC session not found");
		}
		// Auto-expire
		if (
			(session.status === "ACTIVE" || session.status === "IN_PROGRESS") &&
			new Date() > new Date(session.expiresAt)
		) {
			return this.sessionRepo.updateStatus(session.id, "EXPIRED");
		}
		return session;
	}

	async list(
		tenant: TenantContext,
		filters: {
			clientId?: string;
			status?: string;
			page?: number;
			limit?: number;
		},
	): Promise<{
		data: KycSessionEntity[];
		total: number;
		page: number;
		limit: number;
	}> {
		const page = filters.page ?? 1;
		const limit = filters.limit ?? 20;
		const { data, total } = await this.sessionRepo.list(tenant, {
			clientId: filters.clientId,
			status: filters.status as KycSessionEntity["status"] | undefined,
			page,
			limit,
		});
		return { data, total, page, limit };
	}

	async markStarted(token: string, ip?: string): Promise<KycSessionEntity> {
		const session = await this.getByToken(token);

		if (session.status === "EXPIRED" || session.status === "REVOKED") {
			throw new APIError(
				410,
				"SESSION_INACTIVE",
				"This KYC session is no longer active",
			);
		}

		if (
			session.status === "SUBMITTED" ||
			session.status === "PENDING_REVIEW" ||
			session.status === "APPROVED"
		) {
			// Already submitted - return as-is
			return session;
		}

		const updated = await this.sessionRepo.updateStatus(
			session.id,
			"IN_PROGRESS",
			{
				startedAt: session.startedAt ? undefined : new Date(),
			},
		);

		await this.sessionRepo.createEvent({
			sessionId: session.id,
			eventType: "session_accessed",
			actorIp: ip,
			actorType: "client",
		});

		return updated;
	}

	async markSubmitted(token: string, ip?: string): Promise<KycSessionEntity> {
		const session = await this.getByToken(token);

		if (
			session.status !== "ACTIVE" &&
			session.status !== "IN_PROGRESS" &&
			session.status !== "REJECTED"
		) {
			throw new APIError(
				400,
				"INVALID_STATUS",
				`Cannot submit a session in ${session.status} status`,
			);
		}

		const updated = await this.sessionRepo.updateStatus(
			session.id,
			"SUBMITTED",
			{ submittedAt: new Date() },
		);

		await this.sessionRepo.createEvent({
			sessionId: session.id,
			eventType: "session_submitted",
			actorIp: ip,
			actorType: "client",
		});

		return updated;
	}

	async approve(
		id: string,
		organizationId: string,
		reviewedBy: string,
	): Promise<KycSessionEntity> {
		const session = await this.getById(id, organizationId);

		if (session.status !== "SUBMITTED" && session.status !== "PENDING_REVIEW") {
			throw new APIError(
				400,
				"INVALID_STATUS",
				`Cannot approve a session in ${session.status} status`,
			);
		}

		const updated = await this.sessionRepo.updateStatus(
			session.id,
			"APPROVED",
			{
				reviewedBy,
				reviewedAt: new Date(),
				rejectionReason: undefined,
			},
		);

		await this.sessionRepo.createEvent({
			sessionId: session.id,
			eventType: "session_approved",
			actorType: "admin",
			actorId: reviewedBy,
		});

		return updated;
	}

	async reject(
		id: string,
		organizationId: string,
		reviewedBy: string,
		input: KycSessionRejectInput,
	): Promise<KycSessionEntity> {
		const session = await this.getById(id, organizationId);

		if (session.status !== "SUBMITTED" && session.status !== "PENDING_REVIEW") {
			throw new APIError(
				400,
				"INVALID_STATUS",
				`Cannot reject a session in ${session.status} status`,
			);
		}

		// If reopening for corrections, reset to IN_PROGRESS; otherwise REJECTED
		const newStatus = input.reopenForCorrections ? "IN_PROGRESS" : "REJECTED";

		const updated = await this.sessionRepo.updateStatus(session.id, newStatus, {
			reviewedBy,
			reviewedAt: new Date(),
			rejectionReason: input.reason,
		});

		await this.sessionRepo.createEvent({
			sessionId: session.id,
			eventType: "session_rejected",
			actorType: "admin",
			actorId: reviewedBy,
			payload: {
				reason: input.reason,
				reopenForCorrections: input.reopenForCorrections,
			},
		});

		return updated;
	}

	async revoke(
		id: string,
		organizationId: string,
		revokedBy: string,
	): Promise<KycSessionEntity> {
		const session = await this.getById(id, organizationId);

		if (session.status === "APPROVED" || session.status === "REVOKED") {
			throw new APIError(
				400,
				"INVALID_STATUS",
				`Cannot revoke a session in ${session.status} status`,
			);
		}

		const updated = await this.sessionRepo.updateStatus(session.id, "REVOKED");

		await this.sessionRepo.createEvent({
			sessionId: session.id,
			eventType: "session_revoked",
			actorType: "admin",
			actorId: revokedBy,
		});

		return updated;
	}

	async recordEmailSent(id: string): Promise<KycSessionEntity> {
		const session = await this.sessionRepo.findById(id);
		if (!session) {
			throw new APIError(404, "NOT_FOUND", "KYC session not found");
		}

		const updated = await this.sessionRepo.setEmailSent(id);

		await this.sessionRepo.createEvent({
			sessionId: id,
			eventType: "email_sent",
			actorType: "system",
		});

		return updated;
	}

	async getEvents(
		sessionId: string,
		organizationId: string,
	): Promise<KycSessionEventEntity[]> {
		await this.getById(sessionId, organizationId);
		return this.sessionRepo.listEvents(sessionId);
	}

	async logEvent(
		sessionId: string,
		eventType: KycSessionEventEntity["eventType"],
		options?: {
			actorIp?: string;
			actorType?: "client" | "admin" | "system";
			actorId?: string;
			payload?: Record<string, unknown>;
		},
	): Promise<void> {
		await this.sessionRepo.createEvent({
			sessionId,
			eventType,
			actorIp: options?.actorIp,
			actorType: options?.actorType ?? "client",
			actorId: options?.actorId,
			payload: options?.payload,
		});
	}
}
