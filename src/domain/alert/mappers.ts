import type {
	Alert as PrismaAlertModel,
	AlertRule as PrismaAlertRuleModel,
	AlertRuleConfig as PrismaAlertRuleConfigModel,
	AlertSeverity as PrismaAlertSeverity,
	AlertStatus as PrismaAlertStatus,
} from "@prisma/client";

import { generateId } from "../../lib/id-generator";
import type {
	AlertCreateInput,
	AlertPatchInput,
	AlertRuleCreateInput,
	AlertRulePatchInput,
	AlertRuleUpdateInput,
	AlertUpdateInput,
	AlertRuleConfigCreateInput,
	AlertRuleConfigUpdateInput,
} from "./schemas";
import type {
	AlertEntity,
	AlertRuleConfigEntity,
	AlertRuleEntity,
	AlertSeverity,
	AlertStatus,
} from "./types";

const ALERT_STATUS_TO_PRISMA: Record<AlertStatus, PrismaAlertStatus> = {
	DETECTED: "DETECTED",
	FILE_GENERATED: "FILE_GENERATED",
	SUBMITTED: "SUBMITTED",
	OVERDUE: "OVERDUE",
	CANCELLED: "CANCELLED",
};

const ALERT_STATUS_FROM_PRISMA: Record<PrismaAlertStatus, AlertStatus> = {
	DETECTED: "DETECTED",
	FILE_GENERATED: "FILE_GENERATED",
	SUBMITTED: "SUBMITTED",
	OVERDUE: "OVERDUE",
	CANCELLED: "CANCELLED",
};

const ALERT_SEVERITY_TO_PRISMA: Record<AlertSeverity, PrismaAlertSeverity> = {
	LOW: "LOW",
	MEDIUM: "MEDIUM",
	HIGH: "HIGH",
	CRITICAL: "CRITICAL",
};

const ALERT_SEVERITY_FROM_PRISMA: Record<PrismaAlertSeverity, AlertSeverity> = {
	LOW: "LOW",
	MEDIUM: "MEDIUM",
	HIGH: "HIGH",
	CRITICAL: "CRITICAL",
};

function mapDateTime(value: Date | string | null | undefined): string | null {
	if (!value) return null;
	if (value instanceof Date) {
		return value.toISOString();
	}
	return value;
}

function serializeJson(
	value: Record<string, unknown> | null | undefined,
): string | null {
	if (!value) return null;
	return JSON.stringify(value);
}

function parseJson(
	value: string | null | undefined,
): Record<string, unknown> | null {
	if (!value) return null;
	try {
		return JSON.parse(value) as Record<string, unknown>;
	} catch {
		return null;
	}
}

export function mapPrismaAlertRule(
	prisma: PrismaAlertRuleModel,
): AlertRuleEntity {
	return {
		id: prisma.id,
		name: prisma.name,
		description: prisma.description,
		active: Boolean(prisma.active),
		severity: ALERT_SEVERITY_FROM_PRISMA[prisma.severity],
		ruleType: prisma.ruleType,
		isManualOnly: Boolean(prisma.isManualOnly),
		activityCode: prisma.activityCode,
		metadata: parseJson(prisma.metadata ?? null),
		createdAt: mapDateTime(prisma.createdAt) ?? "",
		updatedAt: mapDateTime(prisma.updatedAt) ?? "",
	};
}

export function mapPrismaAlertRuleConfig(
	prisma: PrismaAlertRuleConfigModel,
): AlertRuleConfigEntity {
	return {
		id: prisma.id,
		alertRuleId: prisma.alertRuleId,
		key: prisma.key,
		value: prisma.value,
		isHardcoded: Boolean(prisma.isHardcoded),
		description: prisma.description,
		createdAt: mapDateTime(prisma.createdAt) ?? "",
		updatedAt: mapDateTime(prisma.updatedAt) ?? "",
	};
}

export function mapPrismaAlert(prisma: PrismaAlertModel): AlertEntity {
	return {
		id: prisma.id,
		alertRuleId: prisma.alertRuleId,
		clientId: prisma.clientId,
		status: ALERT_STATUS_FROM_PRISMA[prisma.status],
		severity: ALERT_SEVERITY_FROM_PRISMA[prisma.severity],
		idempotencyKey: prisma.idempotencyKey,
		contextHash: prisma.contextHash,
		metadata: parseJson(prisma.metadata) ?? {},
		transactionId: prisma.transactionId,
		isManual: Boolean(prisma.isManual),
		submissionDeadline: mapDateTime(prisma.submissionDeadline),
		fileGeneratedAt: mapDateTime(prisma.fileGeneratedAt),
		submittedAt: mapDateTime(prisma.submittedAt),
		satAcknowledgmentReceipt: prisma.satAcknowledgmentReceipt,
		satFolioNumber: prisma.satFolioNumber,
		isOverdue: Boolean(prisma.isOverdue),
		notes: prisma.notes,
		reviewedAt: mapDateTime(prisma.reviewedAt),
		reviewedBy: prisma.reviewedBy,
		cancelledAt: mapDateTime(prisma.cancelledAt),
		cancelledBy: prisma.cancelledBy,
		cancellationReason: prisma.cancellationReason,
		createdAt: mapDateTime(prisma.createdAt) ?? "",
		updatedAt: mapDateTime(prisma.updatedAt) ?? "",
	};
}

export function mapAlertRuleCreateInputToPrisma(
	input: AlertRuleCreateInput,
): Omit<PrismaAlertRuleModel, "createdAt" | "updatedAt"> {
	return {
		id: input.id ?? generateId("ALERT_RULE"),
		name: input.name,
		description: input.description ?? null,
		active: input.active,
		severity: ALERT_SEVERITY_TO_PRISMA[input.severity],
		ruleType: input.ruleType ?? null,
		isManualOnly: input.isManualOnly ?? false,
		activityCode: input.activityCode ?? "VEH",
		metadata: serializeJson(input.metadata ?? null),
	};
}

export function mapAlertRuleUpdateInputToPrisma(
	input: AlertRuleUpdateInput,
): Partial<Omit<PrismaAlertRuleModel, "id" | "createdAt" | "updatedAt">> {
	return {
		name: input.name,
		description: input.description ?? null,
		active: input.active,
		severity: ALERT_SEVERITY_TO_PRISMA[input.severity],
		ruleType: input.ruleType ?? null,
		isManualOnly: input.isManualOnly ?? false,
		activityCode: input.activityCode ?? "VEH",
		metadata: serializeJson(input.metadata ?? null),
	};
}

export function mapAlertRulePatchInputToPrisma(
	input: AlertRulePatchInput,
): Partial<Omit<PrismaAlertRuleModel, "id" | "createdAt" | "updatedAt">> {
	const result: Partial<
		Omit<PrismaAlertRuleModel, "id" | "createdAt" | "updatedAt">
	> = {};

	if (input.name !== undefined) {
		result.name = input.name;
	}
	if (input.description !== undefined) {
		result.description = input.description ?? null;
	}
	if (input.active !== undefined) {
		result.active = input.active;
	}
	if (input.severity !== undefined) {
		result.severity = ALERT_SEVERITY_TO_PRISMA[input.severity];
	}
	if (input.ruleType !== undefined) {
		result.ruleType = input.ruleType ?? null;
	}
	if (input.isManualOnly !== undefined) {
		result.isManualOnly = input.isManualOnly;
	}
	if (input.activityCode !== undefined) {
		result.activityCode = input.activityCode;
	}
	if (input.metadata !== undefined) {
		result.metadata = serializeJson(input.metadata ?? null);
	}

	return result;
}

export function mapAlertRuleConfigCreateInputToPrisma(
	input: AlertRuleConfigCreateInput,
	alertRuleId: string,
): Omit<PrismaAlertRuleConfigModel, "createdAt" | "updatedAt"> {
	return {
		id: generateId("ALERT_RULE_CONFIG"),
		alertRuleId,
		key: input.key,
		value: input.value,
		isHardcoded: input.isHardcoded ?? false,
		description: input.description ?? null,
	};
}

export function mapAlertRuleConfigUpdateInputToPrisma(
	input: AlertRuleConfigUpdateInput,
): Partial<
	Omit<
		PrismaAlertRuleConfigModel,
		"id" | "alertRuleId" | "createdAt" | "updatedAt"
	>
> {
	const result: Partial<
		Omit<
			PrismaAlertRuleConfigModel,
			"id" | "alertRuleId" | "createdAt" | "updatedAt"
		>
	> = {};

	if (input.value !== undefined) {
		result.value = input.value;
	}
	if (input.description !== undefined) {
		result.description = input.description ?? null;
	}

	return result;
}

export function mapAlertCreateInputToPrisma(
	input: AlertCreateInput,
	organizationId: string,
): Omit<PrismaAlertModel, "createdAt" | "updatedAt"> {
	return {
		id: generateId("ALERT"),
		organizationId,
		alertRuleId: input.alertRuleId,
		clientId: input.clientId,
		status: "DETECTED",
		severity: ALERT_SEVERITY_TO_PRISMA[input.severity],
		idempotencyKey: input.idempotencyKey,
		contextHash: input.contextHash,
		metadata: serializeJson(input.metadata) ?? "{}",
		transactionId: input.transactionId ?? null,
		isManual: input.isManual ?? false,
		reportId: null, // Reports are assigned later
		noticeId: null, // Notices are assigned later
		submissionDeadline: input.submissionDeadline
			? new Date(input.submissionDeadline)
			: null,
		fileGeneratedAt: null,
		submittedAt: null,
		satAcknowledgmentReceipt: null,
		satFolioNumber: null,
		isOverdue: false,
		notes: input.notes ?? null,
		reviewedAt: null,
		reviewedBy: null,
		cancelledAt: null,
		cancelledBy: null,
		cancellationReason: null,
	};
}

export function mapAlertUpdateInputToPrisma(
	input: AlertUpdateInput,
): Partial<
	Omit<
		PrismaAlertModel,
		| "id"
		| "createdAt"
		| "updatedAt"
		| "alertRuleId"
		| "clientId"
		| "idempotencyKey"
		| "contextHash"
		| "metadata"
		| "severity"
		| "transactionId"
		| "isManual"
	>
> {
	const result: Partial<
		Omit<
			PrismaAlertModel,
			| "id"
			| "createdAt"
			| "updatedAt"
			| "alertRuleId"
			| "clientId"
			| "idempotencyKey"
			| "contextHash"
			| "metadata"
			| "severity"
			| "transactionId"
			| "isManual"
		>
	> = {};

	result.status = ALERT_STATUS_TO_PRISMA[input.status];

	// Handle status transitions
	if (input.status === "FILE_GENERATED" && input.fileGeneratedAt) {
		result.fileGeneratedAt = new Date(input.fileGeneratedAt);
	} else if (input.status === "FILE_GENERATED" && !input.fileGeneratedAt) {
		result.fileGeneratedAt = new Date();
	}

	if (input.status === "SUBMITTED" && input.submittedAt) {
		result.submittedAt = new Date(input.submittedAt);
	} else if (input.status === "SUBMITTED" && !input.submittedAt) {
		result.submittedAt = new Date();
	}

	if (input.status === "CANCELLED" && input.cancelledBy) {
		result.cancelledAt = new Date();
		result.cancelledBy = input.cancelledBy;
	}

	// Check if overdue (deadline passed and not submitted)
	if (input.status !== "SUBMITTED" && input.status !== "CANCELLED") {
		// This will be calculated in the repository/service layer
		result.isOverdue = false; // Will be recalculated based on submissionDeadline
	} else if (input.status === "SUBMITTED") {
		result.isOverdue = false;
	}

	if (input.notes !== undefined) {
		result.notes = input.notes ?? null;
	}
	if (input.reviewedBy !== undefined) {
		result.reviewedBy = input.reviewedBy ?? null;
		if (input.reviewedBy) {
			result.reviewedAt = new Date();
		}
	}
	if (input.fileGeneratedAt !== undefined) {
		result.fileGeneratedAt = input.fileGeneratedAt
			? new Date(input.fileGeneratedAt)
			: null;
	}
	if (input.submittedAt !== undefined) {
		result.submittedAt = input.submittedAt ? new Date(input.submittedAt) : null;
	}
	if (input.satAcknowledgmentReceipt !== undefined) {
		result.satAcknowledgmentReceipt = input.satAcknowledgmentReceipt ?? null;
	}
	if (input.satFolioNumber !== undefined) {
		result.satFolioNumber = input.satFolioNumber ?? null;
	}
	if (input.cancelledBy !== undefined) {
		result.cancelledBy = input.cancelledBy ?? null;
		if (input.cancelledBy) {
			result.cancelledAt = new Date();
		}
	}
	if (input.cancellationReason !== undefined) {
		result.cancellationReason = input.cancellationReason ?? null;
	}

	return result;
}

export function mapAlertPatchInputToPrisma(
	input: AlertPatchInput,
): Partial<
	Omit<
		PrismaAlertModel,
		| "id"
		| "createdAt"
		| "updatedAt"
		| "alertRuleId"
		| "clientId"
		| "idempotencyKey"
		| "contextHash"
		| "metadata"
		| "severity"
		| "transactionId"
		| "isManual"
	>
> {
	const result: Partial<
		Omit<
			PrismaAlertModel,
			| "id"
			| "createdAt"
			| "updatedAt"
			| "alertRuleId"
			| "clientId"
			| "idempotencyKey"
			| "contextHash"
			| "metadata"
			| "severity"
			| "transactionId"
			| "isManual"
		>
	> = {};

	if (input.status !== undefined) {
		result.status = ALERT_STATUS_TO_PRISMA[input.status];

		// Handle status transitions
		if (input.status === "FILE_GENERATED") {
			result.fileGeneratedAt = input.fileGeneratedAt
				? new Date(input.fileGeneratedAt)
				: new Date();
		}

		if (input.status === "SUBMITTED") {
			result.submittedAt = input.submittedAt
				? new Date(input.submittedAt)
				: new Date();
			result.isOverdue = false; // No longer overdue once submitted
		}

		if (input.status === "CANCELLED") {
			result.cancelledAt = input.cancelledBy ? new Date() : null;
		}

		if (input.status === "OVERDUE") {
			result.isOverdue = true;
		}
	}

	if (input.notes !== undefined) {
		result.notes = input.notes ?? null;
	}
	if (input.reviewedBy !== undefined) {
		result.reviewedBy = input.reviewedBy ?? null;
		if (input.reviewedBy) {
			result.reviewedAt = new Date();
		}
	}
	if (input.fileGeneratedAt !== undefined) {
		result.fileGeneratedAt = input.fileGeneratedAt
			? new Date(input.fileGeneratedAt)
			: null;
	}
	if (input.submittedAt !== undefined) {
		result.submittedAt = input.submittedAt ? new Date(input.submittedAt) : null;
		if (input.submittedAt) {
			result.isOverdue = false;
		}
	}
	if (input.satAcknowledgmentReceipt !== undefined) {
		result.satAcknowledgmentReceipt = input.satAcknowledgmentReceipt ?? null;
	}
	if (input.satFolioNumber !== undefined) {
		result.satFolioNumber = input.satFolioNumber ?? null;
	}
	if (input.cancelledBy !== undefined) {
		result.cancelledBy = input.cancelledBy ?? null;
		if (input.cancelledBy) {
			result.cancelledAt = new Date();
		}
	}
	if (input.cancellationReason !== undefined) {
		result.cancellationReason = input.cancellationReason ?? null;
	}

	return result;
}
