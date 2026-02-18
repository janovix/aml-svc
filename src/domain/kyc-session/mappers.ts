import type { KycSession, KycSessionEvent } from "@prisma/client";
import type {
	KycSessionEntity,
	KycSessionEventEntity,
	KycSessionStatus,
	KycIdentificationTier,
	KycEditableSection,
	KycSessionEventType,
} from "./types";

function parseJsonArray<T>(json: string | null): T[] | null {
	if (!json) return null;
	try {
		return JSON.parse(json) as T[];
	} catch {
		return null;
	}
}

function parseJsonObject(json: string | null): Record<string, unknown> | null {
	if (!json) return null;
	try {
		return JSON.parse(json) as Record<string, unknown>;
	} catch {
		return null;
	}
}

export function mapPrismaKycSession(prisma: KycSession): KycSessionEntity {
	return {
		id: prisma.id,
		organizationId: prisma.organizationId,
		clientId: prisma.clientId,
		token: prisma.token,
		status: prisma.status as KycSessionStatus,
		expiresAt: prisma.expiresAt.toISOString(),
		createdBy: prisma.createdBy,
		emailSentAt: prisma.emailSentAt?.toISOString() ?? null,
		startedAt: prisma.startedAt?.toISOString() ?? null,
		submittedAt: prisma.submittedAt?.toISOString() ?? null,
		reviewedAt: prisma.reviewedAt?.toISOString() ?? null,
		reviewedBy: prisma.reviewedBy ?? null,
		rejectionReason: prisma.rejectionReason ?? null,
		editableSections: parseJsonArray<KycEditableSection>(
			prisma.editableSections,
		),
		uploadLinkId: prisma.uploadLinkId ?? null,
		identificationTier: prisma.identificationTier as KycIdentificationTier,
		thresholdAmountMxn: prisma.thresholdAmountMxn ?? null,
		clientCumulativeMxn: prisma.clientCumulativeMxn ?? null,
		completedSections: parseJsonArray<KycEditableSection>(
			prisma.completedSections,
		),
		lastActivityAt: prisma.lastActivityAt?.toISOString() ?? null,
		createdAt: prisma.createdAt.toISOString(),
		updatedAt: prisma.updatedAt.toISOString(),
	};
}

export function mapPrismaKycSessionEvent(
	prisma: KycSessionEvent,
): KycSessionEventEntity {
	return {
		id: prisma.id,
		sessionId: prisma.sessionId,
		eventType: prisma.eventType as KycSessionEventType,
		actorIp: prisma.actorIp ?? null,
		actorType: (prisma.actorType as "client" | "admin" | "system") ?? "client",
		actorId: prisma.actorId ?? null,
		payload: parseJsonObject(prisma.payload),
		createdAt: prisma.createdAt.toISOString(),
	};
}
