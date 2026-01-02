import type { Prisma, PrismaClient } from "@prisma/client";

import {
	mapAlertCreateInputToPrisma,
	mapAlertPatchInputToPrisma,
	mapAlertUpdateInputToPrisma,
	mapAlertRuleCreateInputToPrisma,
	mapAlertRulePatchInputToPrisma,
	mapAlertRuleUpdateInputToPrisma,
	mapAlertRuleConfigCreateInputToPrisma,
	mapAlertRuleConfigUpdateInputToPrisma,
	mapPrismaAlert,
	mapPrismaAlertRule,
	mapPrismaAlertRuleConfig,
} from "./mappers";
import type {
	AlertCreateInput,
	AlertFilters,
	AlertPatchInput,
	AlertRuleCreateInput,
	AlertRuleFilters,
	AlertRulePatchInput,
	AlertRuleUpdateInput,
	AlertUpdateInput,
	AlertRuleConfigCreateInput,
	AlertRuleConfigUpdateInput,
} from "./schemas";
import type {
	AlertEntity,
	AlertRuleEntity,
	AlertRuleConfigEntity,
	ListResult,
} from "./types";

/**
 * AlertRuleRepository - Global alert rules (no organizationId filtering)
 */
export class AlertRuleRepository {
	constructor(private readonly prisma: PrismaClient) {}

	async list(filters: AlertRuleFilters): Promise<ListResult<AlertRuleEntity>> {
		const {
			page,
			limit,
			search,
			active,
			severity,
			activityCode,
			isManualOnly,
		} = filters;

		const where: Prisma.AlertRuleWhereInput = {};

		if (active !== undefined) {
			where.active = active;
		}

		if (severity) {
			where.severity = severity;
		}

		if (activityCode) {
			where.activityCode = activityCode;
		}

		if (isManualOnly !== undefined) {
			where.isManualOnly = isManualOnly;
		}

		if (search) {
			const likeFilter = { contains: search };
			where.OR = [{ name: likeFilter }, { description: likeFilter }];
		}

		const [total, records] = await Promise.all([
			this.prisma.alertRule.count({ where }),
			this.prisma.alertRule.findMany({
				where,
				skip: (page - 1) * limit,
				take: limit,
				orderBy: { createdAt: "desc" },
			}),
		]);

		const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

		return {
			data: records.map(mapPrismaAlertRule),
			pagination: {
				page,
				limit,
				total,
				totalPages,
			},
		};
	}

	async getById(id: string): Promise<AlertRuleEntity | null> {
		const record = await this.prisma.alertRule.findUnique({
			where: { id },
		});
		return record ? mapPrismaAlertRule(record) : null;
	}

	async getByRuleType(ruleType: string): Promise<AlertRuleEntity | null> {
		const record = await this.prisma.alertRule.findFirst({
			where: { ruleType, active: true },
		});
		return record ? mapPrismaAlertRule(record) : null;
	}

	async create(input: AlertRuleCreateInput): Promise<AlertRuleEntity> {
		const created = await this.prisma.alertRule.create({
			data: mapAlertRuleCreateInputToPrisma(input),
		});
		return mapPrismaAlertRule(created);
	}

	async update(
		id: string,
		input: AlertRuleUpdateInput,
	): Promise<AlertRuleEntity> {
		await this.ensureExists(id);

		const updated = await this.prisma.alertRule.update({
			where: { id },
			data: mapAlertRuleUpdateInputToPrisma(input),
		});

		return mapPrismaAlertRule(updated);
	}

	async patch(
		id: string,
		input: AlertRulePatchInput,
	): Promise<AlertRuleEntity> {
		await this.ensureExists(id);

		const payload = mapAlertRulePatchInputToPrisma(
			input,
		) as Prisma.AlertRuleUpdateInput;

		const updated = await this.prisma.alertRule.update({
			where: { id },
			data: payload,
		});

		return mapPrismaAlertRule(updated);
	}

	async delete(id: string): Promise<void> {
		await this.ensureExists(id);
		await this.prisma.alertRule.delete({ where: { id } });
	}

	async listActive(): Promise<AlertRuleEntity[]> {
		const records = await this.prisma.alertRule.findMany({
			where: { active: true },
			orderBy: { createdAt: "desc" },
		});
		return records.map(mapPrismaAlertRule);
	}

	async listActiveForSeeker(): Promise<AlertRuleEntity[]> {
		// Return only rules that have seekers (not manual-only)
		const records = await this.prisma.alertRule.findMany({
			where: { active: true, isManualOnly: false },
			orderBy: { createdAt: "desc" },
		});
		return records.map(mapPrismaAlertRule);
	}

	private async ensureExists(id: string): Promise<void> {
		const exists = await this.prisma.alertRule.findUnique({
			where: { id },
			select: { id: true },
		});

		if (!exists) {
			throw new Error("ALERT_RULE_NOT_FOUND");
		}
	}
}

/**
 * AlertRuleConfigRepository - Configuration values for alert rules
 */
export class AlertRuleConfigRepository {
	constructor(private readonly prisma: PrismaClient) {}

	async listByAlertRuleId(
		alertRuleId: string,
	): Promise<AlertRuleConfigEntity[]> {
		const records = await this.prisma.alertRuleConfig.findMany({
			where: { alertRuleId },
			orderBy: { key: "asc" },
		});
		return records.map(mapPrismaAlertRuleConfig);
	}

	async getByKey(
		alertRuleId: string,
		key: string,
	): Promise<AlertRuleConfigEntity | null> {
		const record = await this.prisma.alertRuleConfig.findFirst({
			where: { alertRuleId, key },
		});
		return record ? mapPrismaAlertRuleConfig(record) : null;
	}

	async create(
		alertRuleId: string,
		input: AlertRuleConfigCreateInput,
	): Promise<AlertRuleConfigEntity> {
		const created = await this.prisma.alertRuleConfig.create({
			data: mapAlertRuleConfigCreateInputToPrisma(input, alertRuleId),
		});
		return mapPrismaAlertRuleConfig(created);
	}

	async update(
		alertRuleId: string,
		key: string,
		input: AlertRuleConfigUpdateInput,
	): Promise<AlertRuleConfigEntity> {
		const existing = await this.prisma.alertRuleConfig.findFirst({
			where: { alertRuleId, key },
		});

		if (!existing) {
			throw new Error("ALERT_RULE_CONFIG_NOT_FOUND");
		}

		if (existing.isHardcoded) {
			throw new Error("ALERT_RULE_CONFIG_IS_HARDCODED");
		}

		const updateData = mapAlertRuleConfigUpdateInputToPrisma(input);

		const updated = await this.prisma.alertRuleConfig.update({
			where: { id: existing.id },
			data: updateData,
		});

		return mapPrismaAlertRuleConfig(updated);
	}

	async delete(alertRuleId: string, key: string): Promise<void> {
		const existing = await this.prisma.alertRuleConfig.findFirst({
			where: { alertRuleId, key },
		});

		if (!existing) {
			throw new Error("ALERT_RULE_CONFIG_NOT_FOUND");
		}

		if (existing.isHardcoded) {
			throw new Error("ALERT_RULE_CONFIG_IS_HARDCODED");
		}

		await this.prisma.alertRuleConfig.delete({ where: { id: existing.id } });
	}
}

/**
 * AlertRepository - Organization-specific alerts
 */
export class AlertRepository {
	constructor(private readonly prisma: PrismaClient) {}

	async list(
		organizationId: string,
		filters: AlertFilters,
	): Promise<ListResult<AlertEntity>> {
		const {
			page,
			limit,
			alertRuleId,
			clientId,
			status,
			severity,
			isOverdue,
			isManual,
		} = filters;

		const where: Prisma.AlertWhereInput = {
			organizationId,
		};

		if (alertRuleId) {
			where.alertRuleId = alertRuleId;
		}

		if (clientId) {
			where.clientId = clientId;
		}

		if (status) {
			where.status = status;
		}

		if (severity) {
			where.severity = severity;
		}

		if (isOverdue !== undefined) {
			where.isOverdue = isOverdue;
		}

		if (isManual !== undefined) {
			where.isManual = isManual;
		}

		// Update overdue status for alerts that have passed their deadline
		// This ensures we always have current overdue status
		await this.updateOverdueStatus(organizationId);

		const [total, records] = await Promise.all([
			this.prisma.alert.count({ where }),
			this.prisma.alert.findMany({
				where,
				skip: (page - 1) * limit,
				take: limit,
				orderBy: { createdAt: "desc" },
				include: {
					alertRule: true,
				},
			}),
		]);

		const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

		return {
			data: records.map(
				(
					record: Parameters<typeof mapPrismaAlert>[0] & {
						alertRule: Parameters<typeof mapPrismaAlertRule>[0];
					},
				) => ({
					...mapPrismaAlert(record),
					alertRule: mapPrismaAlertRule(record.alertRule),
				}),
			),
			pagination: {
				page,
				limit,
				total,
				totalPages,
			},
		};
	}

	/**
	 * Update overdue status for alerts that have passed their submission deadline
	 * This should be called periodically or before listing alerts
	 */
	private async updateOverdueStatus(organizationId: string): Promise<void> {
		const now = new Date();
		await this.prisma.alert.updateMany({
			where: {
				organizationId,
				submissionDeadline: { lte: now },
				status: { notIn: ["SUBMITTED", "CANCELLED", "OVERDUE"] },
				isOverdue: false,
			},
			data: {
				status: "OVERDUE",
				isOverdue: true,
			},
		});
	}

	async getById(
		organizationId: string,
		id: string,
	): Promise<AlertEntity | null> {
		const record = await this.prisma.alert.findFirst({
			where: { id, organizationId },
			include: {
				alertRule: true,
			},
		});
		if (!record) return null;
		return {
			...mapPrismaAlert(record),
			alertRule: mapPrismaAlertRule(record.alertRule),
		};
	}

	async create(
		input: AlertCreateInput,
		organizationId: string,
	): Promise<AlertEntity> {
		// Check if alert with same idempotency key already exists
		const existing = await this.prisma.alert.findUnique({
			where: { idempotencyKey: input.idempotencyKey },
			include: {
				alertRule: true,
			},
		});

		if (existing) {
			// Return existing alert (idempotent behavior)
			return {
				...mapPrismaAlert(existing),
				alertRule: mapPrismaAlertRule(existing.alertRule),
			};
		}

		// Validate alert rule exists and check if manual creation is allowed
		const alertRule = await this.prisma.alertRule.findUnique({
			where: { id: input.alertRuleId },
		});

		if (!alertRule) {
			throw new Error("ALERT_RULE_NOT_FOUND");
		}

		// If not manual creation but rule is manual-only, reject
		if (!input.isManual && alertRule.isManualOnly) {
			throw new Error("ALERT_RULE_IS_MANUAL_ONLY");
		}

		const prismaData = mapAlertCreateInputToPrisma(input, organizationId);

		// Calculate isOverdue if submissionDeadline is provided
		if (prismaData.submissionDeadline) {
			prismaData.isOverdue =
				new Date() > prismaData.submissionDeadline &&
				prismaData.status !== "SUBMITTED";
		}

		const created = await this.prisma.alert.create({
			data: prismaData,
			include: {
				alertRule: true,
			},
		});

		return {
			...mapPrismaAlert(created),
			alertRule: mapPrismaAlertRule(created.alertRule),
		};
	}

	async updateSatFileUrl(
		organizationId: string,
		id: string,
		satFileUrl: string,
	): Promise<AlertEntity> {
		await this.ensureExists(organizationId, id);

		const updated = await this.prisma.alert.update({
			where: { id },
			data: {
				satFileUrl,
				fileGeneratedAt: new Date(),
				status: "FILE_GENERATED",
			},
			include: {
				alertRule: true,
			},
		});

		return {
			...mapPrismaAlert(updated),
			alertRule: mapPrismaAlertRule(updated.alertRule),
		};
	}

	async update(
		organizationId: string,
		id: string,
		input: AlertUpdateInput,
	): Promise<AlertEntity> {
		await this.ensureExists(organizationId, id);

		// Get current alert to check submissionDeadline
		const current = await this.prisma.alert.findUnique({
			where: { id },
			select: { submissionDeadline: true, status: true },
		});

		const updateData = mapAlertUpdateInputToPrisma(input);

		// Recalculate isOverdue based on status and deadline
		if (current?.submissionDeadline) {
			const now = new Date();
			const deadline = current.submissionDeadline;
			const newStatus = updateData.status;

			// Overdue if deadline passed and not submitted/cancelled
			updateData.isOverdue =
				now > deadline &&
				newStatus !== "SUBMITTED" &&
				newStatus !== "CANCELLED";

			// Auto-set status to OVERDUE if deadline passed
			if (
				now > deadline &&
				newStatus !== "SUBMITTED" &&
				newStatus !== "CANCELLED" &&
				newStatus !== "OVERDUE"
			) {
				updateData.status = "OVERDUE";
			}
		}

		const updated = await this.prisma.alert.update({
			where: { id },
			data: updateData,
			include: {
				alertRule: true,
			},
		});

		return {
			...mapPrismaAlert(updated),
			alertRule: mapPrismaAlertRule(updated.alertRule),
		};
	}

	async patch(
		organizationId: string,
		id: string,
		input: AlertPatchInput,
	): Promise<AlertEntity> {
		await this.ensureExists(organizationId, id);

		// Get current alert to check submissionDeadline
		const current = await this.prisma.alert.findUnique({
			where: { id },
			select: { submissionDeadline: true, status: true },
		});

		const payload = mapAlertPatchInputToPrisma(
			input,
		) as Prisma.AlertUpdateInput;

		// Recalculate isOverdue based on status and deadline
		if (current?.submissionDeadline) {
			const now = new Date();
			const deadline = current.submissionDeadline;
			const newStatus = (payload.status as string) || current.status;

			// Overdue if deadline passed and not submitted/cancelled
			payload.isOverdue =
				now > deadline &&
				newStatus !== "SUBMITTED" &&
				newStatus !== "CANCELLED";

			// Auto-set status to OVERDUE if deadline passed and status is being changed
			if (
				input.status !== undefined &&
				now > deadline &&
				newStatus !== "SUBMITTED" &&
				newStatus !== "CANCELLED" &&
				newStatus !== "OVERDUE"
			) {
				payload.status = "OVERDUE";
				payload.isOverdue = true;
			}
		}

		const updated = await this.prisma.alert.update({
			where: { id },
			data: payload,
			include: {
				alertRule: true,
			},
		});

		return {
			...mapPrismaAlert(updated),
			alertRule: mapPrismaAlertRule(updated.alertRule),
		};
	}

	async delete(organizationId: string, id: string): Promise<void> {
		await this.ensureExists(organizationId, id);
		await this.prisma.alert.delete({ where: { id } });
	}

	async findByIdempotencyKey(
		organizationId: string,
		idempotencyKey: string,
	): Promise<AlertEntity | null> {
		const record = await this.prisma.alert.findFirst({
			where: { idempotencyKey, organizationId },
			include: {
				alertRule: true,
			},
		});
		if (!record) return null;
		return {
			...mapPrismaAlert(record),
			alertRule: mapPrismaAlertRule(record.alertRule),
		};
	}

	private async ensureExists(
		organizationId: string,
		id: string,
	): Promise<void> {
		const exists = await this.prisma.alert.findFirst({
			where: { id, organizationId },
			select: { id: true },
		});

		if (!exists) {
			throw new Error("ALERT_NOT_FOUND");
		}
	}
}
