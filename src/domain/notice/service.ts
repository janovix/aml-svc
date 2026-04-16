import type { NoticeRepository } from "./repository";
import type {
	NoticeCreateInput,
	NoticePatchInput,
	NoticeFilterInput,
	NoticePreviewInput,
} from "./schemas";
import type {
	NoticeEntity,
	NoticeAlertDetail,
	ListResultWithMeta,
	NoticeWithAlertSummary,
	NoticePeriod,
} from "./types";
import { calculateNoticePeriod, getNoticeSubmissionDeadline } from "./types";
import type { TenantContext } from "../../lib/tenant-context";

/**
 * Month names in Spanish for notice naming
 */
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

export class NoticeService {
	constructor(private readonly repository: NoticeRepository) {}

	/**
	 * List notices with filters
	 */
	async list(
		tenant: TenantContext,
		filters: NoticeFilterInput,
	): Promise<ListResultWithMeta<NoticeEntity>> {
		return this.repository.list(tenant, filters);
	}

	/**
	 * Get a single notice
	 */
	async get(tenant: TenantContext, id: string): Promise<NoticeEntity> {
		return this.repository.get(tenant, id);
	}

	/**
	 * Get a notice with alert summary
	 */
	async getWithSummary(
		tenant: TenantContext,
		id: string,
	): Promise<NoticeWithAlertSummary> {
		return this.repository.getWithAlertSummary(tenant, id);
	}

	/**
	 * Preview alerts that would be included in a notice for a given month.
	 * Returns both aggregate stats and individual alert details for selection.
	 */
	async preview(
		tenant: TenantContext,
		input: NoticePreviewInput,
	): Promise<{
		total: number;
		bySeverity: Record<string, number>;
		byStatus: Record<string, number>;
		alerts: NoticeAlertDetail[];
		periodStart: string;
		periodEnd: string;
		reportedMonth: string;
		displayName: string;
		submissionDeadline: string;
	}> {
		const period = calculateNoticePeriod(input.year, input.month);
		const deadline = getNoticeSubmissionDeadline(input.year, input.month);

		const [stats, alerts] = await Promise.all([
			this.repository.countAlertsForPeriod(tenant, period.start, period.end),
			this.repository.getAlertsForPeriodDetailed(
				tenant,
				period.start,
				period.end,
			),
		]);

		return {
			...stats,
			alerts,
			periodStart: period.start.toISOString(),
			periodEnd: period.end.toISOString(),
			reportedMonth: period.reportedMonth,
			displayName: period.displayName,
			submissionDeadline: deadline.toISOString(),
		};
	}

	/**
	 * Create a new notice.
	 *
	 * Alert assignment modes based on `alertIds`:
	 *   - `undefined`: assign ALL eligible alerts in the period (backward-compatible)
	 *   - `[...ids]`: assign only the specified alerts
	 *   - `[]`: empty notice (zero-activity)
	 */
	async create(
		input: NoticeCreateInput,
		tenant: TenantContext,
		createdBy?: string,
	): Promise<NoticeEntity> {
		const period = calculateNoticePeriod(input.year, input.month);
		const { organizationId, environment } = tenant;

		const hasPending = await this.repository.hasPendingNoticeForPeriod(
			tenant,
			period.reportedMonth,
		);

		if (hasPending) {
			throw new Error("NOTICE_ALREADY_EXISTS_FOR_PERIOD");
		}

		const notice = await this.repository.create(input, tenant, createdBy);

		let alertCount: number;
		if (input.alertIds === undefined) {
			alertCount = await this.repository.assignAlertsToNotice(
				tenant,
				notice.id,
				period.start,
				period.end,
			);
		} else if (input.alertIds.length > 0) {
			alertCount = await this.repository.assignSpecificAlertsToNotice(
				tenant,
				notice.id,
				input.alertIds,
			);
		} else {
			alertCount = 0;
		}

		await this.repository.createEvent({
			noticeId: notice.id,
			organizationId,
			environment,
			eventType: "CREATED",
			toStatus: "DRAFT",
			createdBy,
		});

		return {
			...notice,
			recordCount: alertCount,
		};
	}

	/**
	 * Update a notice
	 */
	async patch(
		tenant: TenantContext,
		id: string,
		input: NoticePatchInput,
	): Promise<NoticeEntity> {
		return this.repository.patch(tenant, id, input);
	}

	/**
	 * Delete a notice (only if DRAFT status)
	 */
	async delete(tenant: TenantContext, id: string): Promise<void> {
		return this.repository.delete(tenant, id);
	}

	/**
	 * Get alerts for a notice (for XML generation)
	 */
	async getAlertsForNotice(tenant: TenantContext, noticeId: string) {
		return this.repository.getAlertsForNotice(tenant, noticeId);
	}

	/**
	 * Get alerts with operations for a notice (for multi-activity XML generation)
	 * Includes client, alertRule, and operation data with activity extensions
	 * needed for SAT XML generation using the new multi-activity system
	 */
	async getAlertsWithOperationsForNotice(
		tenant: TenantContext,
		noticeId: string,
	) {
		return this.repository.getAlertsWithOperationsForNotice(tenant, noticeId);
	}

	async markAsGenerated(
		tenant: TenantContext,
		id: string,
		options: {
			xmlFileUrl?: string | null;
			fileSize?: number | null;
		},
		createdBy?: string,
	): Promise<NoticeEntity> {
		return this.repository.markAsGenerated(tenant, id, options, createdBy);
	}

	async markAsSubmitted(
		tenant: TenantContext,
		id: string,
		docSvcDocumentId: string,
		createdBy?: string,
	): Promise<NoticeEntity> {
		return this.repository.markAsSubmitted(
			tenant,
			id,
			docSvcDocumentId,
			createdBy,
		);
	}

	async markAsAcknowledged(
		tenant: TenantContext,
		id: string,
		docSvcDocumentId: string,
		createdBy?: string,
	): Promise<NoticeEntity> {
		return this.repository.markAsAcknowledged(
			tenant,
			id,
			docSvcDocumentId,
			createdBy,
		);
	}

	async markAsRebuked(
		tenant: TenantContext,
		id: string,
		docSvcDocumentId: string,
		notes?: string | null,
		createdBy?: string,
	): Promise<NoticeEntity> {
		return this.repository.markAsRebuked(
			tenant,
			id,
			docSvcDocumentId,
			notes,
			createdBy,
		);
	}

	async revertToDraft(
		tenant: TenantContext,
		id: string,
		createdBy?: string,
	): Promise<NoticeEntity> {
		return this.repository.revertToDraft(tenant, id, createdBy);
	}

	async addAlerts(
		tenant: TenantContext,
		noticeId: string,
		alertIds: string[],
		createdBy?: string,
	): Promise<number> {
		return this.repository.addAlertsToNotice(
			tenant,
			noticeId,
			alertIds,
			createdBy,
		);
	}

	async removeAlerts(
		tenant: TenantContext,
		noticeId: string,
		alertIds: string[],
		createdBy?: string,
	): Promise<number> {
		return this.repository.removeAlertsFromNotice(
			tenant,
			noticeId,
			alertIds,
			createdBy,
		);
	}

	/**
	 * Get the period information for a notice
	 */
	getPeriodInfo(
		year: number,
		month: number,
	): NoticePeriod & { submissionDeadline: Date } {
		const period = calculateNoticePeriod(year, month);
		const submissionDeadline = getNoticeSubmissionDeadline(year, month);

		return {
			...period,
			submissionDeadline,
		};
	}

	/**
	 * Get available months for creating notices
	 * Returns months with status information:
	 * - hasPendingNotice: true if there's a DRAFT/GENERATED notice (blocks creation)
	 * - hasSubmittedNotice: true if there's a SUBMITTED/ACKNOWLEDGED notice
	 * - noticeCount: total number of notices for this period
	 * - hasNotice: kept for backward compatibility (true if hasPendingNotice)
	 *
	 * SAT periods use a 17-17 cycle (day 17 of previous month to day 16 of current month).
	 * If we're past day 16 of the current month, alerts created now belong to the next
	 * month's period, so we include the next month in the available options.
	 */
	async getAvailableMonths(tenant: TenantContext): Promise<
		Array<{
			year: number;
			month: number;
			displayName: string;
			hasNotice: boolean;
			hasPendingNotice: boolean;
			hasSubmittedNotice: boolean;
			noticeCount: number;
			availableAlertCount: number;
		}>
	> {
		const now = new Date();
		const currentDay = now.getDate();
		const months: Array<{
			year: number;
			month: number;
			displayName: string;
			hasNotice: boolean;
			hasPendingNotice: boolean;
			hasSubmittedNotice: boolean;
			noticeCount: number;
			availableAlertCount: number;
		}> = [];

		const startOffset = currentDay > 16 ? -1 : 0;

		for (let i = startOffset; i < 12; i++) {
			const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
			const year = date.getFullYear();
			const month = date.getMonth() + 1;
			const reportedMonth = `${year}${String(month).padStart(2, "0")}`;
			const displayName = `${MONTH_NAMES_ES[month - 1]} ${year}`;

			const period = calculateNoticePeriod(year, month);

			const [stats, alertStats] = await Promise.all([
				this.repository.getNoticeStatsForPeriod(tenant, reportedMonth),
				this.repository.countAlertsForPeriod(tenant, period.start, period.end),
			]);

			const blockCreation = stats.hasPendingNotice && alertStats.total === 0;

			months.push({
				year,
				month,
				displayName,
				hasNotice: blockCreation,
				hasPendingNotice: blockCreation,
				hasSubmittedNotice: stats.hasSubmittedNotice,
				noticeCount: stats.noticeCount,
				availableAlertCount: alertStats.total,
			});
		}

		return months;
	}
}
