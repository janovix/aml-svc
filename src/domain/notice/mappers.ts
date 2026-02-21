import type {
	Notice as PrismaNoticeModel,
	NoticeEvent as PrismaNoticeEventModel,
	NoticeStatus as PrismaNoticeStatus,
} from "@prisma/client";

import { generateId } from "../../lib/id-generator";
import type { NoticeCreateInput, NoticePatchInput } from "./schemas";
import type {
	NoticeEntity,
	NoticeEventEntity,
	NoticeEventType,
	NoticeStatus,
} from "./types";
import { calculateNoticePeriod } from "./types";

const _NOTICE_STATUS_TO_PRISMA: Record<NoticeStatus, PrismaNoticeStatus> = {
	DRAFT: "DRAFT",
	GENERATED: "GENERATED",
	SUBMITTED: "SUBMITTED",
	ACKNOWLEDGED: "ACKNOWLEDGED",
	REBUKED: "REBUKED",
};

const NOTICE_STATUS_FROM_PRISMA: Record<PrismaNoticeStatus, NoticeStatus> = {
	DRAFT: "DRAFT",
	GENERATED: "GENERATED",
	SUBMITTED: "SUBMITTED",
	ACKNOWLEDGED: "ACKNOWLEDGED",
	REBUKED: "REBUKED",
};

function mapDateTime(value: Date | string | null | undefined): string | null {
	if (!value) return null;
	if (value instanceof Date) {
		return value.toISOString();
	}
	return value;
}

/**
 * Map Prisma Notice model to NoticeEntity
 */
export function mapPrismaNotice(prisma: PrismaNoticeModel): NoticeEntity {
	return {
		id: prisma.id,
		organizationId: prisma.organizationId,
		name: prisma.name,
		status: NOTICE_STATUS_FROM_PRISMA[prisma.status],
		periodStart: mapDateTime(prisma.periodStart) ?? "",
		periodEnd: mapDateTime(prisma.periodEnd) ?? "",
		reportedMonth: prisma.reportedMonth,
		recordCount: prisma.recordCount,
		xmlFileUrl: prisma.xmlFileUrl,
		fileSize: prisma.fileSize,
		generatedAt: mapDateTime(prisma.generatedAt),
		submittedAt: mapDateTime(prisma.submittedAt),
		amendmentCycle: prisma.amendmentCycle,
		createdBy: prisma.createdBy,
		notes: prisma.notes,
		createdAt: mapDateTime(prisma.createdAt) ?? "",
		updatedAt: mapDateTime(prisma.updatedAt) ?? "",
	};
}

export function mapPrismaNoticeEvent(
	prisma: PrismaNoticeEventModel,
): NoticeEventEntity {
	return {
		id: prisma.id,
		noticeId: prisma.noticeId,
		organizationId: prisma.organizationId,
		eventType: prisma.eventType as NoticeEventType,
		fromStatus: prisma.fromStatus,
		toStatus: prisma.toStatus,
		cycle: prisma.cycle,
		pdfDocumentId: prisma.pdfDocumentId,
		xmlFileUrl: prisma.xmlFileUrl,
		fileSize: prisma.fileSize,
		notes: prisma.notes,
		createdBy: prisma.createdBy,
		createdAt: mapDateTime(prisma.createdAt) ?? "",
	};
}

/**
 * Map NoticeCreateInput to Prisma create data
 * Calculates the 17-17 period from year/month
 */
export function mapNoticeCreateInputToPrisma(
	input: NoticeCreateInput,
	organizationId: string,
	createdBy?: string,
): {
	id: string;
	organizationId: string;
	name: string;
	status: PrismaNoticeStatus;
	periodStart: Date;
	periodEnd: Date;
	reportedMonth: string;
	recordCount: number;
	createdBy: string | null;
	notes: string | null;
} {
	const period = calculateNoticePeriod(input.year, input.month);

	return {
		id: generateId("NOTICE"),
		organizationId,
		name: input.name,
		status: "DRAFT",
		periodStart: period.start,
		periodEnd: period.end,
		reportedMonth: period.reportedMonth,
		recordCount: 0,
		createdBy: createdBy ?? null,
		notes: input.notes ?? null,
	};
}

/**
 * Map NoticePatchInput to Prisma update data
 */
export function mapNoticePatchInputToPrisma(input: NoticePatchInput): Partial<{
	name: string;
	notes: string | null;
}> {
	const result: Partial<{
		name: string;
		notes: string | null;
	}> = {};

	if (input.name !== undefined) {
		result.name = input.name;
	}
	if (input.notes !== undefined) {
		result.notes = input.notes;
	}

	return result;
}

/**
 * Get display name for a reported month
 */
export function getNoticeDisplayName(reportedMonth: string): string {
	const MONTH_NAMES_ES = [
		"Enero",
		"Febrero",
		"Marzo",
		"Abril",
		"Mayo",
		"Junio",
		"Julio",
		"Agosto",
		"Septiembre",
		"Octubre",
		"Noviembre",
		"Diciembre",
	];

	const year = parseInt(reportedMonth.substring(0, 4), 10);
	const month = parseInt(reportedMonth.substring(4, 6), 10);

	return `${MONTH_NAMES_ES[month - 1]} ${year}`;
}
