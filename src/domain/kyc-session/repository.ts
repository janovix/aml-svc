import type { PrismaClient } from "@prisma/client";

import { generateId } from "../../lib/id-generator";
import type {
	KycSessionEntity,
	KycSessionEventEntity,
	KycSessionStatus,
	KycIdentificationTier,
	KycEditableSection,
	KycSessionEventType,
} from "./types";
import { mapPrismaKycSession, mapPrismaKycSessionEvent } from "./mappers";

export interface KycSessionCreateData {
	organizationId: string;
	clientId: string;
	token: string;
	createdBy: string;
	expiresAt: Date;
	editableSections?: KycEditableSection[];
	identificationTier?: KycIdentificationTier;
	thresholdAmountMxn?: number | null;
	clientCumulativeMxn?: number | null;
}

export interface KycSessionEventCreateData {
	sessionId: string;
	eventType: KycSessionEventType;
	actorIp?: string | null;
	actorType?: "client" | "admin" | "system";
	actorId?: string | null;
	payload?: Record<string, unknown> | null;
}

export class KycSessionRepository {
	constructor(private readonly prisma: PrismaClient) {}

	async create(data: KycSessionCreateData): Promise<KycSessionEntity> {
		const record = await this.prisma.kycSession.create({
			data: {
				id: generateId("KYC_SESSION"),
				organizationId: data.organizationId,
				clientId: data.clientId,
				token: data.token,
				createdBy: data.createdBy,
				expiresAt: data.expiresAt,
				editableSections: data.editableSections
					? JSON.stringify(data.editableSections)
					: null,
				identificationTier: data.identificationTier ?? "ALWAYS",
				thresholdAmountMxn: data.thresholdAmountMxn ?? null,
				clientCumulativeMxn: data.clientCumulativeMxn ?? null,
			},
		});
		return mapPrismaKycSession(record);
	}

	async findById(id: string): Promise<KycSessionEntity | null> {
		const record = await this.prisma.kycSession.findUnique({ where: { id } });
		return record ? mapPrismaKycSession(record) : null;
	}

	async findByToken(token: string): Promise<KycSessionEntity | null> {
		const record = await this.prisma.kycSession.findUnique({
			where: { token },
		});
		return record ? mapPrismaKycSession(record) : null;
	}

	async list(filters: {
		organizationId: string;
		clientId?: string;
		status?: KycSessionStatus;
		page?: number;
		limit?: number;
	}): Promise<{ data: KycSessionEntity[]; total: number }> {
		const { organizationId, clientId, status, page = 1, limit = 20 } = filters;

		const where = {
			organizationId,
			...(clientId && { clientId }),
			...(status && { status }),
		};

		const [total, records] = await Promise.all([
			this.prisma.kycSession.count({ where }),
			this.prisma.kycSession.findMany({
				where,
				skip: (page - 1) * limit,
				take: limit,
				orderBy: { createdAt: "desc" },
			}),
		]);

		return { data: records.map(mapPrismaKycSession), total };
	}

	async updateStatus(
		id: string,
		status: KycSessionStatus,
		extra?: {
			reviewedBy?: string;
			rejectionReason?: string;
			emailSentAt?: Date;
			startedAt?: Date;
			submittedAt?: Date;
			reviewedAt?: Date;
		},
	): Promise<KycSessionEntity> {
		const record = await this.prisma.kycSession.update({
			where: { id },
			data: {
				status,
				...(extra?.reviewedBy && { reviewedBy: extra.reviewedBy }),
				...(extra?.rejectionReason !== undefined && {
					rejectionReason: extra.rejectionReason,
				}),
				...(extra?.emailSentAt && { emailSentAt: extra.emailSentAt }),
				...(extra?.startedAt && { startedAt: extra.startedAt }),
				...(extra?.submittedAt && { submittedAt: extra.submittedAt }),
				...(extra?.reviewedAt && { reviewedAt: extra.reviewedAt }),
			},
		});
		return mapPrismaKycSession(record);
	}

	async updateActivity(
		id: string,
		completedSections: KycEditableSection[],
	): Promise<KycSessionEntity> {
		const record = await this.prisma.kycSession.update({
			where: { id },
			data: {
				completedSections: JSON.stringify(completedSections),
				lastActivityAt: new Date(),
			},
		});
		return mapPrismaKycSession(record);
	}

	async setEmailSent(id: string): Promise<KycSessionEntity> {
		const record = await this.prisma.kycSession.update({
			where: { id },
			data: { emailSentAt: new Date() },
		});
		return mapPrismaKycSession(record);
	}

	// Expire sessions whose expiresAt is in the past and status is still ACTIVE or IN_PROGRESS
	async expireStale(): Promise<number> {
		const result = await this.prisma.kycSession.updateMany({
			where: {
				status: { in: ["ACTIVE", "IN_PROGRESS"] },
				expiresAt: { lt: new Date() },
			},
			data: { status: "EXPIRED" },
		});
		return result.count;
	}

	// Events
	async createEvent(
		data: KycSessionEventCreateData,
	): Promise<KycSessionEventEntity> {
		const record = await this.prisma.kycSessionEvent.create({
			data: {
				id: generateId("KYC_SESSION_EVENT"),
				sessionId: data.sessionId,
				eventType: data.eventType,
				actorIp: data.actorIp ?? null,
				actorType: data.actorType ?? "client",
				actorId: data.actorId ?? null,
				payload: data.payload ? JSON.stringify(data.payload) : null,
			},
		});
		return mapPrismaKycSessionEvent(record);
	}

	async listEvents(sessionId: string): Promise<KycSessionEventEntity[]> {
		const records = await this.prisma.kycSessionEvent.findMany({
			where: { sessionId },
			orderBy: { createdAt: "asc" },
		});
		return records.map(mapPrismaKycSessionEvent);
	}
}
