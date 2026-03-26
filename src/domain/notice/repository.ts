import type { PrismaClient, Prisma } from "@prisma/client";
import type {
	NoticeCreateInput,
	NoticePatchInput,
	NoticeFilterInput,
} from "./schemas";
import type {
	NoticeEntity,
	NoticeEventEntity,
	NoticeEventType,
	NoticeAlertDetail,
	ListResultWithMeta,
	NoticeWithAlertSummary,
} from "./types";
import {
	mapPrismaNotice,
	mapPrismaNoticeEvent,
	mapNoticeCreateInputToPrisma,
	mapNoticePatchInputToPrisma,
} from "./mappers";
import {
	buildEnumFilterMeta,
	fromPrismaGroupBy,
} from "../../lib/filter-metadata";
import { generateId } from "../../lib/id-generator";

export class NoticeRepository {
	constructor(private readonly prisma: PrismaClient) {}

	/**
	 * List notices with pagination and filters
	 */
	async list(
		organizationId: string,
		filters: NoticeFilterInput,
	): Promise<ListResultWithMeta<NoticeEntity>> {
		const { page, limit, status, periodStart, periodEnd, year } = filters;
		const skip = (page - 1) * limit;

		const baseWhere: Prisma.NoticeWhereInput = { organizationId };

		if (periodStart) baseWhere.periodStart = { gte: new Date(periodStart) };
		if (periodEnd) baseWhere.periodEnd = { lte: new Date(periodEnd) };
		if (year) baseWhere.reportedMonth = { startsWith: String(year) };

		const where: Prisma.NoticeWhereInput = { ...baseWhere };
		if (status?.length) where.status = { in: status };

		// status counts: apply date/year filters but not status
		const statusCountWhere: Prisma.NoticeWhereInput = { ...baseWhere };

		// year counts: apply status but not year
		const yearCountWhere: Prisma.NoticeWhereInput = { organizationId };
		if (status?.length) yearCountWhere.status = { in: status };
		if (periodStart)
			yearCountWhere.periodStart = { gte: new Date(periodStart) };
		if (periodEnd) yearCountWhere.periodEnd = { lte: new Date(periodEnd) };

		const [notices, total, statusGroups, yearGroups] = await Promise.all([
			this.prisma.notice.findMany({
				where,
				orderBy: { createdAt: "desc" },
				skip,
				take: limit,
			}),
			this.prisma.notice.count({ where }),
			this.prisma.notice.groupBy({
				by: ["status"],
				where: statusCountWhere,
				_count: { status: true },
			}),
			this.prisma.notice.groupBy({
				by: ["reportedMonth"],
				where: yearCountWhere,
				_count: { reportedMonth: true },
			}),
		]);

		const STATUS_LABELS: Record<string, string> = {
			DRAFT: "Borrador",
			GENERATED: "Generado",
			SUBMITTED: "Enviado",
			ACKNOWLEDGED: "Acusado",
			REBUKED: "Rechazado",
		};

		// Build year options from reportedMonth (YYYYMM → YYYY)
		const yearMap = new Map<string, number>();
		for (const row of yearGroups) {
			if (row.reportedMonth) {
				const y = row.reportedMonth.slice(0, 4);
				yearMap.set(y, (yearMap.get(y) ?? 0) + (row._count.reportedMonth ?? 0));
			}
		}
		const yearOptions = Array.from(yearMap.entries())
			.sort((a, b) => b[0].localeCompare(a[0]))
			.map(([y, count]) => ({ value: y, label: y, count }));

		return {
			data: notices.map(mapPrismaNotice),
			pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
			filterMeta: [
				buildEnumFilterMeta(
					{ id: "status", label: "Estado", labelMap: STATUS_LABELS },
					fromPrismaGroupBy(statusGroups, "status", "status"),
				),
				{
					id: "year",
					label: "Año",
					type: "enum",
					options: yearOptions,
				},
			],
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
	 * Get a notice with alert summary, events, and individual alert details
	 */
	async getWithAlertSummary(
		organizationId: string,
		id: string,
	): Promise<NoticeWithAlertSummary> {
		const notice = await this.get(organizationId, id);

		const [alertRows, eventRows] = await Promise.all([
			this.prisma.alert.findMany({
				where: { noticeId: id, organizationId },
				include: { alertRule: true, client: true },
				orderBy: { createdAt: "asc" },
			}),
			this.prisma.noticeEvent.findMany({
				where: { noticeId: id, organizationId },
				orderBy: { createdAt: "asc" },
			}),
		]);

		const bySeverity: Record<string, number> = {};
		const byStatus: Record<string, number> = {};
		const byRuleMap: Map<string, { ruleName: string; count: number }> =
			new Map();
		const alertDetails: NoticeAlertDetail[] = [];

		for (const alert of alertRows) {
			bySeverity[alert.severity] = (bySeverity[alert.severity] || 0) + 1;
			byStatus[alert.status] = (byStatus[alert.status] || 0) + 1;

			const existing = byRuleMap.get(alert.alertRuleId);
			if (existing) {
				existing.count++;
			} else {
				byRuleMap.set(alert.alertRuleId, {
					ruleName: alert.alertRule?.name || alert.alertRuleId,
					count: 1,
				});
			}

			const clientName =
				String(alert.client?.personType).toLowerCase() === "moral"
					? (alert.client?.businessName ?? alert.client?.lastName ?? "")
					: `${alert.client?.firstName ?? ""} ${alert.client?.lastName ?? ""}`.trim();

			alertDetails.push({
				id: alert.id,
				clientId: alert.clientId,
				clientName: clientName || alert.clientId,
				operationId: alert.operationId,
				alertRuleName: alert.alertRule?.name || alert.alertRuleId,
				severity: alert.severity,
				status: alert.status,
				createdAt:
					alert.createdAt instanceof Date
						? alert.createdAt.toISOString()
						: String(alert.createdAt),
				activityCode: alert.activityCode,
			});
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
				total: alertRows.length,
				bySeverity,
				byStatus,
				byRule,
			},
			events: eventRows.map(mapPrismaNoticeEvent),
			alerts: alertDetails,
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
	 * Delete a notice (only DRAFT or GENERATED status)
	 */
	async delete(organizationId: string, id: string): Promise<void> {
		const notice = await this.get(organizationId, id);

		if (notice.status !== "DRAFT" && notice.status !== "GENERATED") {
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
	 * Get all alerts for a notice with their operations (for XML generation)
	 * Fetches alerts with client, alertRule, and their linked operations
	 *
	 * Uses batch fetching to avoid D1/SQLite's ~999 variable limit in IN clauses.
	 * Instead of using Prisma includes (which generate large IN queries), we:
	 * 1. Fetch alerts without includes
	 * 2. Batch fetch related entities (clients, alertRules, operations) separately
	 * 3. Manually join the data
	 */
	async getAlertsWithOperationsForNotice(
		organizationId: string,
		noticeId: string,
	) {
		// D1/SQLite limit is ~999 variables, use a safe batch size
		const BATCH_SIZE = 500;

		// Get alerts without includes to avoid Prisma generating large IN queries
		const alerts = await this.prisma.alert.findMany({
			where: { noticeId, organizationId },
			orderBy: { createdAt: "asc" },
		});

		if (alerts.length === 0) {
			return [];
		}

		// Collect unique IDs for batch fetching
		const clientIds = [...new Set(alerts.map((a) => a.clientId))];
		const alertRuleIds = [
			...new Set(
				alerts
					.map((a) => a.alertRuleId)
					.filter((id): id is string => id != null),
			),
		];
		const operationIds = alerts
			.map((a) => a.operationId)
			.filter((id): id is string => id != null);

		// Batch fetch clients
		const clients: Awaited<ReturnType<typeof this.prisma.client.findMany>> = [];
		for (let i = 0; i < clientIds.length; i += BATCH_SIZE) {
			const batchIds = clientIds.slice(i, i + BATCH_SIZE);
			const batchClients = await this.prisma.client.findMany({
				where: { id: { in: batchIds }, organizationId },
			});
			clients.push(...batchClients);
		}
		const clientMap = new Map(clients.map((c) => [c.id, c]));

		// Batch fetch alert rules (alert rules are global, not per-organization)
		const alertRules: Awaited<
			ReturnType<typeof this.prisma.alertRule.findMany>
		> = [];
		for (let i = 0; i < alertRuleIds.length; i += BATCH_SIZE) {
			const batchIds = alertRuleIds.slice(i, i + BATCH_SIZE);
			const batchRules = await this.prisma.alertRule.findMany({
				where: { id: { in: batchIds } },
			});
			alertRules.push(...batchRules);
		}
		const alertRuleMap = new Map(alertRules.map((r) => [r.id, r]));

		// Batch fetch operations with payments and activity-specific extensions
		const operations: Awaited<
			ReturnType<typeof this.prisma.operation.findMany>
		> = [];
		for (let i = 0; i < operationIds.length; i += BATCH_SIZE) {
			const batchIds = operationIds.slice(i, i + BATCH_SIZE);
			const batchOperations = await this.prisma.operation.findMany({
				where: {
					id: { in: batchIds },
					organizationId,
				},
				include: {
					payments: true,
					vehicle: true,
					realEstate: true,
					jewelry: true,
					virtualAsset: true,
					gambling: true,
					rental: true,
					armoring: true,
					donation: true,
					loan: true,
					official: true,
					notary: true,
					professional: true,
					travelerCheck: true,
					card: true,
					prepaid: true,
					reward: true,
					valuable: true,
					art: true,
					development: true,
				},
			});
			operations.push(...batchOperations);
		}
		const operationMap = new Map(operations.map((o) => [o.id, o]));

		// Manually join all the data
		return alerts.map((alert) => ({
			...alert,
			client: clientMap.get(alert.clientId) ?? null,
			alertRule: alert.alertRuleId
				? (alertRuleMap.get(alert.alertRuleId) ?? null)
				: null,
			operation: alert.operationId
				? (operationMap.get(alert.operationId) ?? null)
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
		createdBy?: string,
	): Promise<NoticeEntity> {
		const existing = await this.get(organizationId, id);

		const now = new Date();

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

		await this.createEvent({
			noticeId: id,
			organizationId,
			eventType: "GENERATED",
			fromStatus: existing.status,
			toStatus: "GENERATED",
			cycle: existing.amendmentCycle,
			xmlFileUrl: options.xmlFileUrl ?? undefined,
			fileSize: options.fileSize ?? undefined,
			createdBy,
		});

		return mapPrismaNotice(notice);
	}

	/**
	 * Mark a notice as submitted to SAT
	 */
	async markAsSubmitted(
		organizationId: string,
		id: string,
		docSvcDocumentId: string,
		createdBy?: string,
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
			},
		});

		await this.prisma.alert.updateMany({
			where: {
				noticeId: id,
				organizationId,
				status: { notIn: ["CANCELLED"] },
			},
			data: {
				status: "SUBMITTED",
				submittedAt: now,
			},
		});

		await this.createEvent({
			noticeId: id,
			organizationId,
			eventType: "SUBMITTED",
			fromStatus: notice.status,
			toStatus: "SUBMITTED",
			cycle: notice.amendmentCycle,
			pdfDocumentId: docSvcDocumentId,
			createdBy,
		});

		return mapPrismaNotice(updated);
	}

	/**
	 * Mark a notice as acknowledged by SAT
	 */
	async markAsAcknowledged(
		organizationId: string,
		id: string,
		docSvcDocumentId: string,
		createdBy?: string,
	): Promise<NoticeEntity> {
		const notice = await this.get(organizationId, id);

		if (notice.status !== "SUBMITTED") {
			throw new Error("NOTICE_MUST_BE_SUBMITTED_BEFORE_ACKNOWLEDGMENT");
		}

		const updated = await this.prisma.notice.update({
			where: { id },
			data: {
				status: "ACKNOWLEDGED",
			},
		});

		await this.createEvent({
			noticeId: id,
			organizationId,
			eventType: "ACKNOWLEDGED",
			fromStatus: "SUBMITTED",
			toStatus: "ACKNOWLEDGED",
			cycle: notice.amendmentCycle,
			pdfDocumentId: docSvcDocumentId,
			createdBy,
		});

		return mapPrismaNotice(updated);
	}

	/**
	 * Mark a notice as rebuked (rejected) by SAT.
	 * Does NOT change alert statuses -- alerts remain SUBMITTED.
	 */
	async markAsRebuked(
		organizationId: string,
		id: string,
		docSvcDocumentId: string,
		notes?: string | null,
		createdBy?: string,
	): Promise<NoticeEntity> {
		const notice = await this.get(organizationId, id);

		if (notice.status !== "SUBMITTED") {
			throw new Error("NOTICE_MUST_BE_SUBMITTED_BEFORE_REBUKE");
		}

		const updated = await this.prisma.notice.update({
			where: { id },
			data: { status: "REBUKED" },
		});

		await this.createEvent({
			noticeId: id,
			organizationId,
			eventType: "REBUKED",
			fromStatus: "SUBMITTED",
			toStatus: "REBUKED",
			cycle: notice.amendmentCycle,
			pdfDocumentId: docSvcDocumentId,
			notes: notes ?? undefined,
			createdBy,
		});

		return mapPrismaNotice(updated);
	}

	/**
	 * Revert a rebuked notice back to DRAFT for amendment.
	 * Reverts alert statuses to DETECTED and clears timestamps (history in events).
	 * Keeps noticeId set on alerts so they remain assigned.
	 */
	async revertToDraft(
		organizationId: string,
		id: string,
		createdBy?: string,
	): Promise<NoticeEntity> {
		const notice = await this.get(organizationId, id);

		if (notice.status !== "REBUKED") {
			throw new Error("NOTICE_MUST_BE_REBUKED_BEFORE_REVERT");
		}

		await this.prisma.alert.updateMany({
			where: {
				noticeId: id,
				organizationId,
				status: { notIn: ["CANCELLED"] },
			},
			data: {
				status: "DETECTED",
				fileGeneratedAt: null,
				submittedAt: null,
			},
		});

		const updated = await this.prisma.notice.update({
			where: { id },
			data: {
				status: "DRAFT",
				xmlFileUrl: null,
				fileSize: null,
				generatedAt: null,
				submittedAt: null,
				amendmentCycle: { increment: 1 },
			},
		});

		await this.createEvent({
			noticeId: id,
			organizationId,
			eventType: "REVERTED",
			fromStatus: "REBUKED",
			toStatus: "DRAFT",
			cycle: updated.amendmentCycle,
			createdBy,
		});

		return mapPrismaNotice(updated);
	}

	/**
	 * Add specific alerts to a DRAFT notice.
	 */
	async addAlertsToNotice(
		organizationId: string,
		noticeId: string,
		alertIds: string[],
		createdBy?: string,
	): Promise<number> {
		const notice = await this.get(organizationId, noticeId);
		if (notice.status !== "DRAFT") {
			throw new Error("NOTICE_MUST_BE_DRAFT_TO_MODIFY_ALERTS");
		}

		const result = await this.prisma.alert.updateMany({
			where: {
				id: { in: alertIds },
				organizationId,
				noticeId: null,
				status: { notIn: ["CANCELLED", "SUBMITTED"] },
			},
			data: { noticeId },
		});

		if (result.count > 0) {
			await this.prisma.notice.update({
				where: { id: noticeId },
				data: { recordCount: { increment: result.count } },
			});

			await this.createEvent({
				noticeId,
				organizationId,
				eventType: "ALERTS_MODIFIED",
				fromStatus: "DRAFT",
				toStatus: "DRAFT",
				cycle: notice.amendmentCycle,
				notes: `Added ${result.count} alert(s)`,
				createdBy,
			});
		}

		return result.count;
	}

	/**
	 * Remove specific alerts from a DRAFT notice.
	 * Reverts alert status to DETECTED and clears noticeId.
	 */
	async removeAlertsFromNotice(
		organizationId: string,
		noticeId: string,
		alertIds: string[],
		createdBy?: string,
	): Promise<number> {
		const notice = await this.get(organizationId, noticeId);
		if (notice.status !== "DRAFT") {
			throw new Error("NOTICE_MUST_BE_DRAFT_TO_MODIFY_ALERTS");
		}

		const result = await this.prisma.alert.updateMany({
			where: {
				id: { in: alertIds },
				organizationId,
				noticeId,
			},
			data: {
				noticeId: null,
				status: "DETECTED",
				fileGeneratedAt: null,
			},
		});

		if (result.count > 0) {
			await this.prisma.notice.update({
				where: { id: noticeId },
				data: { recordCount: { decrement: result.count } },
			});

			await this.createEvent({
				noticeId,
				organizationId,
				eventType: "ALERTS_MODIFIED",
				fromStatus: "DRAFT",
				toStatus: "DRAFT",
				cycle: notice.amendmentCycle,
				notes: `Removed ${result.count} alert(s)`,
				createdBy,
			});
		}

		return result.count;
	}

	/**
	 * Get detailed alert info for a period (for notice preview with selection).
	 */
	async getAlertsForPeriodDetailed(
		organizationId: string,
		periodStart: Date,
		periodEnd: Date,
	): Promise<NoticeAlertDetail[]> {
		const alerts = await this.prisma.alert.findMany({
			where: {
				organizationId,
				createdAt: { gte: periodStart, lte: periodEnd },
				status: { notIn: ["CANCELLED", "SUBMITTED"] },
				noticeId: null,
			},
			include: { alertRule: true, client: true },
			orderBy: { createdAt: "asc" },
		});

		return alerts.map((alert) => {
			const clientName =
				String(alert.client?.personType).toLowerCase() === "moral"
					? (alert.client?.businessName ?? alert.client?.lastName ?? "")
					: `${alert.client?.firstName ?? ""} ${alert.client?.lastName ?? ""}`.trim();

			return {
				id: alert.id,
				clientId: alert.clientId,
				clientName: clientName || alert.clientId,
				operationId: alert.operationId,
				alertRuleName: alert.alertRule?.name || alert.alertRuleId,
				severity: alert.severity,
				status: alert.status,
				createdAt:
					alert.createdAt instanceof Date
						? alert.createdAt.toISOString()
						: String(alert.createdAt),
				activityCode: alert.activityCode,
			};
		});
	}

	/**
	 * Assign only specific alerts (by ID) to a notice.
	 */
	async assignSpecificAlertsToNotice(
		organizationId: string,
		noticeId: string,
		alertIds: string[],
	): Promise<number> {
		const result = await this.prisma.alert.updateMany({
			where: {
				id: { in: alertIds },
				organizationId,
				status: { notIn: ["CANCELLED", "SUBMITTED"] },
				noticeId: null,
			},
			data: { noticeId },
		});

		await this.prisma.notice.update({
			where: { id: noticeId },
			data: { recordCount: result.count },
		});

		return result.count;
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

	// ---- Event helpers ----

	async createEvent(input: {
		noticeId: string;
		organizationId: string;
		eventType: NoticeEventType;
		fromStatus?: string;
		toStatus: string;
		cycle?: number;
		pdfDocumentId?: string;
		xmlFileUrl?: string;
		fileSize?: number;
		notes?: string;
		createdBy?: string;
	}): Promise<NoticeEventEntity> {
		const event = await this.prisma.noticeEvent.create({
			data: {
				id: generateId("NOTICE_EVENT"),
				noticeId: input.noticeId,
				organizationId: input.organizationId,
				eventType: input.eventType,
				fromStatus: input.fromStatus ?? null,
				toStatus: input.toStatus,
				cycle: input.cycle ?? 0,
				pdfDocumentId: input.pdfDocumentId ?? null,
				xmlFileUrl: input.xmlFileUrl ?? null,
				fileSize: input.fileSize ?? null,
				notes: input.notes ?? null,
				createdBy: input.createdBy ?? null,
			},
		});
		return mapPrismaNoticeEvent(event);
	}

	async getEventsForNotice(
		organizationId: string,
		noticeId: string,
	): Promise<NoticeEventEntity[]> {
		const events = await this.prisma.noticeEvent.findMany({
			where: { noticeId, organizationId },
			orderBy: { createdAt: "asc" },
		});
		return events.map(mapPrismaNoticeEvent);
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
