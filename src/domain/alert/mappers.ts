import type {
	Alert as PrismaAlertModel,
	AlertRule as PrismaAlertRuleModel,
	AlertSeverity as PrismaAlertSeverity,
	AlertStatus as PrismaAlertStatus,
} from "@prisma/client";

import type {
	AlertCreateInput,
	AlertPatchInput,
	AlertRuleCreateInput,
	AlertRulePatchInput,
	AlertRuleUpdateInput,
	AlertUpdateInput,
} from "./schemas";
import type {
	AlertEntity,
	AlertRuleEntity,
	AlertSeverity,
	AlertStatus,
} from "./types";

const ALERT_STATUS_TO_PRISMA: Record<AlertStatus, PrismaAlertStatus> = {
	PENDING: "PENDING",
	REVIEWED: "REVIEWED",
	RESOLVED: "RESOLVED",
	DISMISSED: "DISMISSED",
};

const ALERT_STATUS_FROM_PRISMA: Record<PrismaAlertStatus, AlertStatus> = {
	PENDING: "PENDING",
	REVIEWED: "REVIEWED",
	RESOLVED: "RESOLVED",
	DISMISSED: "DISMISSED",
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
		ruleConfig: parseJson(prisma.ruleConfig) ?? {},
		metadata: parseJson(prisma.metadata ?? null),
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
		alertData: parseJson(prisma.alertData) ?? {},
		triggerTransactionId: prisma.triggerTransactionId,
		notes: prisma.notes,
		reviewedAt: mapDateTime(prisma.reviewedAt),
		reviewedBy: prisma.reviewedBy,
		resolvedAt: mapDateTime(prisma.resolvedAt),
		resolvedBy: prisma.resolvedBy,
		createdAt: mapDateTime(prisma.createdAt) ?? "",
		updatedAt: mapDateTime(prisma.updatedAt) ?? "",
	};
}

export function mapAlertRuleCreateInputToPrisma(
	input: AlertRuleCreateInput,
): Omit<PrismaAlertRuleModel, "id" | "createdAt" | "updatedAt"> {
	return {
		name: input.name,
		description: input.description ?? null,
		active: input.active,
		severity: ALERT_SEVERITY_TO_PRISMA[input.severity],
		ruleConfig: serializeJson(input.ruleConfig) ?? "{}",
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
		ruleConfig: serializeJson(input.ruleConfig) ?? "{}",
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
	if (input.ruleConfig !== undefined) {
		result.ruleConfig = serializeJson(input.ruleConfig) ?? "{}";
	}
	if (input.metadata !== undefined) {
		result.metadata = serializeJson(input.metadata ?? null);
	}

	return result;
}

export function mapAlertCreateInputToPrisma(
	input: AlertCreateInput,
): Omit<
	PrismaAlertModel,
	"id" | "createdAt" | "updatedAt" | "reviewedAt" | "resolvedAt"
> {
	return {
		alertRuleId: input.alertRuleId,
		clientId: input.clientId,
		status: "PENDING",
		severity: ALERT_SEVERITY_TO_PRISMA[input.severity],
		idempotencyKey: input.idempotencyKey,
		contextHash: input.contextHash,
		alertData: serializeJson(input.alertData) ?? "{}",
		triggerTransactionId: input.triggerTransactionId ?? null,
		notes: input.notes ?? null,
		reviewedBy: null,
		resolvedBy: null,
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
		| "alertData"
		| "severity"
		| "triggerTransactionId"
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
			| "alertData"
			| "severity"
			| "triggerTransactionId"
		>
	> = {};

	result.status = ALERT_STATUS_TO_PRISMA[input.status];
	if (input.notes !== undefined) {
		result.notes = input.notes ?? null;
	}
	if (input.reviewedBy !== undefined) {
		result.reviewedBy = input.reviewedBy ?? null;
		if (input.status === "REVIEWED" && input.reviewedBy) {
			result.reviewedAt = new Date();
		}
	}
	if (input.resolvedBy !== undefined) {
		result.resolvedBy = input.resolvedBy ?? null;
		if (input.status === "RESOLVED" && input.resolvedBy) {
			result.resolvedAt = new Date();
		}
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
		| "alertData"
		| "severity"
		| "triggerTransactionId"
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
			| "alertData"
			| "severity"
			| "triggerTransactionId"
		>
	> = {};

	if (input.status !== undefined) {
		result.status = ALERT_STATUS_TO_PRISMA[input.status];
		if (input.status === "REVIEWED" && input.reviewedBy) {
			result.reviewedAt = new Date();
		}
		if (input.status === "RESOLVED" && input.resolvedBy) {
			result.resolvedAt = new Date();
		}
	}
	if (input.notes !== undefined) {
		result.notes = input.notes ?? null;
	}
	if (input.reviewedBy !== undefined) {
		result.reviewedBy = input.reviewedBy ?? null;
		if (input.status === "REVIEWED" && input.reviewedBy) {
			result.reviewedAt = new Date();
		}
	}
	if (input.resolvedBy !== undefined) {
		result.resolvedBy = input.resolvedBy ?? null;
		if (input.status === "RESOLVED" && input.resolvedBy) {
			result.resolvedAt = new Date();
		}
	}

	return result;
}
