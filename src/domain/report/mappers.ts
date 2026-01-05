import type {
	Report as PrismaReportModel,
	ReportType as PrismaReportType,
	ReportStatus as PrismaReportStatus,
} from "@prisma/client";

import { generateId } from "../../lib/id-generator";
import type { ReportCreateInput, ReportPatchInput } from "./schemas";
import type { ReportEntity, ReportStatus, ReportType } from "./types";

const REPORT_TYPE_TO_PRISMA: Record<ReportType, PrismaReportType> = {
	MONTHLY: "MONTHLY",
	QUARTERLY: "QUARTERLY",
	ANNUAL: "ANNUAL",
	CUSTOM: "CUSTOM",
};

const REPORT_TYPE_FROM_PRISMA: Record<PrismaReportType, ReportType> = {
	MONTHLY: "MONTHLY",
	QUARTERLY: "QUARTERLY",
	ANNUAL: "ANNUAL",
	CUSTOM: "CUSTOM",
};

const REPORT_STATUS_TO_PRISMA: Record<ReportStatus, PrismaReportStatus> = {
	DRAFT: "DRAFT",
	GENERATED: "GENERATED",
	SUBMITTED: "SUBMITTED",
	ACKNOWLEDGED: "ACKNOWLEDGED",
};

const REPORT_STATUS_FROM_PRISMA: Record<PrismaReportStatus, ReportStatus> = {
	DRAFT: "DRAFT",
	GENERATED: "GENERATED",
	SUBMITTED: "SUBMITTED",
	ACKNOWLEDGED: "ACKNOWLEDGED",
};

function mapDateTime(value: Date | string | null | undefined): string | null {
	if (!value) return null;
	if (value instanceof Date) {
		return value.toISOString();
	}
	return value;
}

/**
 * Map Prisma Report model to ReportEntity
 */
export function mapPrismaReport(prisma: PrismaReportModel): ReportEntity {
	return {
		id: prisma.id,
		organizationId: prisma.organizationId,
		name: prisma.name,
		type: REPORT_TYPE_FROM_PRISMA[prisma.type],
		status: REPORT_STATUS_FROM_PRISMA[prisma.status],
		periodStart: mapDateTime(prisma.periodStart) ?? "",
		periodEnd: mapDateTime(prisma.periodEnd) ?? "",
		reportedMonth: prisma.reportedMonth,
		recordCount: prisma.recordCount,
		xmlFileUrl: prisma.xmlFileUrl,
		pdfFileUrl: prisma.pdfFileUrl,
		fileSize: prisma.fileSize,
		pdfFileSize: prisma.pdfFileSize,
		generatedAt: mapDateTime(prisma.generatedAt),
		submittedAt: mapDateTime(prisma.submittedAt),
		satFolioNumber: prisma.satFolioNumber,
		createdBy: prisma.createdBy,
		notes: prisma.notes,
		createdAt: mapDateTime(prisma.createdAt) ?? "",
		updatedAt: mapDateTime(prisma.updatedAt) ?? "",
	};
}

/**
 * Map ReportCreateInput to Prisma create data
 */
export function mapReportCreateInputToPrisma(
	input: ReportCreateInput,
	organizationId: string,
	createdBy?: string,
): {
	id: string;
	organizationId: string;
	name: string;
	type: PrismaReportType;
	status: PrismaReportStatus;
	periodStart: Date;
	periodEnd: Date;
	reportedMonth: string;
	recordCount: number;
	createdBy: string | null;
	notes: string | null;
} {
	return {
		id: generateId("REPORT"),
		organizationId,
		name: input.name,
		type: REPORT_TYPE_TO_PRISMA[input.type ?? "MONTHLY"],
		status: "DRAFT",
		periodStart: new Date(input.periodStart),
		periodEnd: new Date(input.periodEnd),
		reportedMonth: input.reportedMonth,
		recordCount: 0,
		createdBy: createdBy ?? null,
		notes: input.notes ?? null,
	};
}

/**
 * Map ReportPatchInput to Prisma update data
 */
export function mapReportPatchInputToPrisma(input: ReportPatchInput): Partial<{
	name: string;
	status: PrismaReportStatus;
	notes: string | null;
	satFolioNumber: string | null;
	submittedAt: Date | null;
}> {
	const result: Partial<{
		name: string;
		status: PrismaReportStatus;
		notes: string | null;
		satFolioNumber: string | null;
		submittedAt: Date | null;
	}> = {};

	if (input.name !== undefined) {
		result.name = input.name;
	}
	if (input.status !== undefined) {
		result.status = REPORT_STATUS_TO_PRISMA[input.status];
	}
	if (input.notes !== undefined) {
		result.notes = input.notes;
	}
	if (input.satFolioNumber !== undefined) {
		result.satFolioNumber = input.satFolioNumber;
	}
	if (input.submittedAt !== undefined) {
		result.submittedAt = input.submittedAt ? new Date(input.submittedAt) : null;
	}

	return result;
}
