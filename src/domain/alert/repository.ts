import type { Prisma, PrismaClient } from "@prisma/client";

import {
	mapAlertCreateInputToPrisma,
	mapAlertPatchInputToPrisma,
	mapAlertUpdateInputToPrisma,
	mapAlertRuleCreateInputToPrisma,
	mapAlertRulePatchInputToPrisma,
	mapAlertRuleUpdateInputToPrisma,
	mapPrismaAlert,
	mapPrismaAlertRule,
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
} from "./schemas";
import type { AlertEntity, AlertRuleEntity, ListResult } from "./types";

export class AlertRuleRepository {
	constructor(private readonly prisma: PrismaClient) {}

	async list(filters: AlertRuleFilters): Promise<ListResult<AlertRuleEntity>> {
		const { page, limit, search, active, severity } = filters;

		const where: Prisma.AlertRuleWhereInput = {};

		if (active !== undefined) {
			where.active = active;
		}

		if (severity) {
			where.severity = severity;
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

export class AlertRepository {
	constructor(private readonly prisma: PrismaClient) {}

	async list(filters: AlertFilters): Promise<ListResult<AlertEntity>> {
		const { page, limit, alertRuleId, clientId, status, severity, isOverdue } =
			filters;

		const where: Prisma.AlertWhereInput = {};

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

		// Update overdue status for alerts that have passed their deadline
		// This ensures we always have current overdue status
		await this.updateOverdueStatus();

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
			data: records.map((record) => ({
				...mapPrismaAlert(record),
				alertRule: mapPrismaAlertRule(record.alertRule),
			})),
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
	private async updateOverdueStatus(): Promise<void> {
		const now = new Date();
		await this.prisma.alert.updateMany({
			where: {
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

	async getById(id: string): Promise<AlertEntity | null> {
		const record = await this.prisma.alert.findUnique({
			where: { id },
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

	async create(input: AlertCreateInput): Promise<AlertEntity> {
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

		const prismaData = mapAlertCreateInputToPrisma(input);

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

	async updateSatFileUrl(id: string, satFileUrl: string): Promise<AlertEntity> {
		await this.ensureExists(id);

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

	async update(id: string, input: AlertUpdateInput): Promise<AlertEntity> {
		await this.ensureExists(id);

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

	async patch(id: string, input: AlertPatchInput): Promise<AlertEntity> {
		await this.ensureExists(id);

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

	async delete(id: string): Promise<void> {
		await this.ensureExists(id);
		await this.prisma.alert.delete({ where: { id } });
	}

	async findByIdempotencyKey(
		idempotencyKey: string,
	): Promise<AlertEntity | null> {
		const record = await this.prisma.alert.findUnique({
			where: { idempotencyKey },
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

	private async ensureExists(id: string): Promise<void> {
		const exists = await this.prisma.alert.findUnique({
			where: { id },
			select: { id: true },
		});

		if (!exists) {
			throw new Error("ALERT_NOT_FOUND");
		}
	}
}
