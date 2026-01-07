import type { PrismaClient, Prisma } from "@prisma/client";
import type {
	NoticeCreateInput,
	NoticePatchInput,
	NoticeFilterInput,
} from "./schemas";
import type { NoticeEntity, ListResult, NoticeWithAlertSummary } from "./types";
import {
	mapPrismaNotice,
	mapNoticeCreateInputToPrisma,
	mapNoticePatchInputToPrisma,
} from "./mappers";

export class NoticeRepository {
	constructor(private readonly prisma: PrismaClient) {}

	/**
	 * List notices with pagination and filters
	 */
	async list(
		organizationId: string,
		filters: NoticeFilterInput,
	): Promise<ListResult<NoticeEntity>> {
		const { page, limit, status, periodStart, periodEnd, year } = filters;
		const skip = (page - 1) * limit;

		const where: Prisma.NoticeWhereInput = {
			organizationId,
		};

		if (status) {
			where.status = status;
		}
		if (periodStart) {
			where.periodStart = { gte: new Date(periodStart) };
		}
		if (periodEnd) {
			where.periodEnd = { lte: new Date(periodEnd) };
		}
		if (year) {
			// Filter by year in reportedMonth (YYYYMM format)
			where.reportedMonth = { startsWith: String(year) };
		}

		const [notices, total] = await Promise.all([
			this.prisma.notice.findMany({
				where,
				orderBy: { createdAt: "desc" },
				skip,
				take: limit,
			}),
			this.prisma.notice.count({ where }),
		]);

		return {
			data: notices.map(mapPrismaNotice),
			pagination: {
				page,
				limit,
				total,
				totalPages: Math.ceil(total / limit),
			},
		};
	}

	/**
	 * Get a single notice by ID
	 */
	async get(organizationId: string, id: string): Promise<NoticeEntity> {
		const notice = await this.prisma.notice.findFirst({
			where: { id, organizationId },
		});

		if (!notice) {
			throw new Error("NOTICE_NOT_FOUND");
		}

		return mapPrismaNotice(notice);
	}

	/**
	 * Get a notice with alert summary
	 */
	async getWithAlertSummary(
		organizationId: string,
		id: string,
	): Promise<NoticeWithAlertSummary> {
		const notice = await this.get(organizationId, id);

		// Get alert statistics for this notice
		const alerts = await this.prisma.alert.findMany({
			where: { noticeId: id, organizationId },
			include: { alertRule: true },
		});

		const bySeverity: Record<string, number> = {};
		const byStatus: Record<string, number> = {};
		const byRuleMap: Map<string, { ruleName: string; count: number }> =
			new Map();

		for (const alert of alerts) {
			// Count by severity
			bySeverity[alert.severity] = (bySeverity[alert.severity] || 0) + 1;

			// Count by status
			byStatus[alert.status] = (byStatus[alert.status] || 0) + 1;

			// Count by rule
			const existing = byRuleMap.get(alert.alertRuleId);
			if (existing) {
				existing.count++;
			} else {
				byRuleMap.set(alert.alertRuleId, {
					ruleName: alert.alertRule?.name || alert.alertRuleId,
					count: 1,
				});
			}
		}

		const byRule = Array.from(byRuleMap.entries()).map(
			([ruleId, { ruleName, count }]) => ({
				ruleId,
				ruleName,
				count,
			}),
		);

		return {
			...notice,
			alertSummary: {
				total: alerts.length,
				bySeverity,
				byStatus,
				byRule,
			},
		};
	}

	/**
	 * Create a new notice
	 */
	async create(
		input: NoticeCreateInput,
		organizationId: string,
		createdBy?: string,
	): Promise<NoticeEntity> {
		const data = mapNoticeCreateInputToPrisma(input, organizationId, createdBy);

		const notice = await this.prisma.notice.create({
			data,
		});

		return mapPrismaNotice(notice);
	}

	/**
	 * Update a notice (partial)
	 */
	async patch(
		organizationId: string,
		id: string,
		input: NoticePatchInput,
	): Promise<NoticeEntity> {
		await this.ensureExists(organizationId, id);

		const data = mapNoticePatchInputToPrisma(input);

		const notice = await this.prisma.notice.update({
			where: { id },
			data,
		});

		return mapPrismaNotice(notice);
	}

	/**
	 * Delete a notice (only DRAFT status)
	 */
	async delete(organizationId: string, id: string): Promise<void> {
		const notice = await this.get(organizationId, id);

		if (notice.status !== "DRAFT") {
			throw new Error("CANNOT_DELETE_NON_DRAFT_NOTICE");
		}

		// First, remove the noticeId from all alerts linked to this notice
		await this.prisma.alert.updateMany({
			where: { noticeId: id, organizationId },
			data: { noticeId: null },
		});

		await this.prisma.notice.delete({
			where: { id },
		});
	}

	/**
	 * Count alerts in a period that can be included in a notice
	 * Uses the SAT 17-17 period cycle
	 */
	async countAlertsForPeriod(
		organizationId: string,
		periodStart: Date,
		periodEnd: Date,
	): Promise<{
		total: number;
		bySeverity: Record<string, number>;
		byStatus: Record<string, number>;
	}> {
		const alerts = await this.prisma.alert.findMany({
			where: {
				organizationId,
				createdAt: {
					gte: periodStart,
					lte: periodEnd,
				},
				status: {
					notIn: ["CANCELLED", "SUBMITTED"],
				},
				noticeId: null, // Not already in a notice
			},
			select: {
				severity: true,
				status: true,
			},
		});

		const bySeverity: Record<string, number> = {};
		const byStatus: Record<string, number> = {};

		for (const alert of alerts) {
			bySeverity[alert.severity] = (bySeverity[alert.severity] || 0) + 1;
			byStatus[alert.status] = (byStatus[alert.status] || 0) + 1;
		}

		return {
			total: alerts.length,
			bySeverity,
			byStatus,
		};
	}

	/**
	 * Assign alerts to a notice
	 */
	async assignAlertsToNotice(
		organizationId: string,
		noticeId: string,
		periodStart: Date,
		periodEnd: Date,
	): Promise<number> {
		const result = await this.prisma.alert.updateMany({
			where: {
				organizationId,
				createdAt: {
					gte: periodStart,
					lte: periodEnd,
				},
				status: {
					notIn: ["CANCELLED", "SUBMITTED"],
				},
				noticeId: null,
			},
			data: { noticeId },
		});

		// Update notice record count
		await this.prisma.notice.update({
			where: { id: noticeId },
			data: { recordCount: result.count },
		});

		return result.count;
	}

	/**
	 * Get all alerts for a notice (for XML generation)
	 * Returns alerts with their associated client and alertRule
	 */
	async getAlertsForNotice(organizationId: string, noticeId: string) {
		return this.prisma.alert.findMany({
			where: { noticeId, organizationId },
			include: {
				alertRule: true,
				client: true,
			},
			orderBy: { createdAt: "asc" },
		});
	}

	/**
	 * Get all alerts for a notice with their transactions (for XML generation)
	 * Fetches alerts with client, alertRule, and their linked transactions
	 */
	async getAlertsWithTransactionsForNotice(
		organizationId: string,
		noticeId: string,
	) {
		// Get alerts with client and alertRule
		const alerts = await this.prisma.alert.findMany({
			where: { noticeId, organizationId },
			include: {
				alertRule: true,
				client: true,
			},
			orderBy: { createdAt: "asc" },
		});

		// Get transaction IDs from alerts (filter out null/undefined)
		const transactionIds = alerts
			.map((a) => a.transactionId)
			.filter((id): id is string => id != null);

		// Fetch transactions in batch
		const transactions = await this.prisma.transaction.findMany({
			where: {
				id: { in: transactionIds },
				organizationId,
			},
			include: {
				paymentMethods: true,
			},
		});

		// Create a map for quick lookup
		const transactionMap = new Map(transactions.map((t) => [t.id, t]));

		// Attach transactions to alerts
		return alerts.map((alert) => ({
			...alert,
			transaction: alert.transactionId
				? (transactionMap.get(alert.transactionId) ?? null)
				: null,
		}));
	}

	/**
	 * Mark a notice as generated with XML file URL
	 * Also updates all alerts in the notice to FILE_GENERATED status
	 */
	async markAsGenerated(
		organizationId: string,
		id: string,
		options: {
			xmlFileUrl?: string | null;
			fileSize?: number | null;
		},
	): Promise<NoticeEntity> {
		await this.ensureExists(organizationId, id);

		const now = new Date();

		// Update the notice status
		const notice = await this.prisma.notice.update({
			where: { id },
			data: {
				...(options.xmlFileUrl !== undefined && {
					xmlFileUrl: options.xmlFileUrl,
				}),
				...(options.fileSize !== undefined && { fileSize: options.fileSize }),
				generatedAt: now,
				status: "GENERATED",
			},
		});

		// Update all alerts in this notice to FILE_GENERATED status
		await this.prisma.alert.updateMany({
			where: {
				noticeId: id,
				organizationId,
				status: { notIn: ["CANCELLED", "SUBMITTED"] },
			},
			data: {
				status: "FILE_GENERATED",
				fileGeneratedAt: now,
			},
		});

		return mapPrismaNotice(notice);
	}

	/**
	 * Mark a notice as submitted to SAT
	 */
	async markAsSubmitted(
		organizationId: string,
		id: string,
		satFolioNumber?: string,
	): Promise<NoticeEntity> {
		const notice = await this.get(organizationId, id);

		if (notice.status === "DRAFT") {
			throw new Error("NOTICE_MUST_BE_GENERATED_BEFORE_SUBMISSION");
		}

		const now = new Date();

		const updated = await this.prisma.notice.update({
			where: { id },
			data: {
				status: "SUBMITTED",
				submittedAt: now,
				...(satFolioNumber && { satFolioNumber }),
			},
		});

		// Update all alerts in this notice to SUBMITTED status
		await this.prisma.alert.updateMany({
			where: {
				noticeId: id,
				organizationId,
				status: { notIn: ["CANCELLED"] },
			},
			data: {
				status: "SUBMITTED",
				submittedAt: now,
				...(satFolioNumber && { satFolioNumber }),
			},
		});

		return mapPrismaNotice(updated);
	}

	/**
	 * Mark a notice as acknowledged by SAT
	 */
	async markAsAcknowledged(
		organizationId: string,
		id: string,
		satFolioNumber: string,
	): Promise<NoticeEntity> {
		const notice = await this.get(organizationId, id);

		if (notice.status !== "SUBMITTED") {
			throw new Error("NOTICE_MUST_BE_SUBMITTED_BEFORE_ACKNOWLEDGMENT");
		}

		const updated = await this.prisma.notice.update({
			where: { id },
			data: {
				status: "ACKNOWLEDGED",
				satFolioNumber,
			},
		});

		// Update all alerts with the folio number
		await this.prisma.alert.updateMany({
			where: {
				noticeId: id,
				organizationId,
			},
			data: {
				satFolioNumber,
			},
		});

		return mapPrismaNotice(updated);
	}

	/**
	 * Check if a pending (DRAFT or GENERATED) notice exists for the given period
	 * Only pending notices block creation of new notices for the same period
	 */
	async hasPendingNoticeForPeriod(
		organizationId: string,
		reportedMonth: string,
	): Promise<boolean> {
		const count = await this.prisma.notice.count({
			where: {
				organizationId,
				reportedMonth,
				status: { in: ["DRAFT", "GENERATED"] },
			},
		});
		return count > 0;
	}

	/**
	 * Get notice statistics for a given period
	 * Returns counts of notices by status for UI display
	 */
	async getNoticeStatsForPeriod(
		organizationId: string,
		reportedMonth: string,
	): Promise<{
		hasPendingNotice: boolean;
		hasSubmittedNotice: boolean;
		noticeCount: number;
	}> {
		const notices = await this.prisma.notice.findMany({
			where: {
				organizationId,
				reportedMonth,
			},
			select: {
				status: true,
			},
		});

		const hasPendingNotice = notices.some(
			(n) => n.status === "DRAFT" || n.status === "GENERATED",
		);
		const hasSubmittedNotice = notices.some(
			(n) => n.status === "SUBMITTED" || n.status === "ACKNOWLEDGED",
		);

		return {
			hasPendingNotice,
			hasSubmittedNotice,
			noticeCount: notices.length,
		};
	}

	private async ensureExists(
		organizationId: string,
		id: string,
	): Promise<void> {
		const notice = await this.prisma.notice.findFirst({
			where: { id, organizationId },
		});
		if (!notice) {
			throw new Error("NOTICE_NOT_FOUND");
		}
	}
}
