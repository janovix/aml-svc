import type { NoticeRepository } from "./repository";
import type {
	NoticeCreateInput,
	NoticePatchInput,
	NoticeFilterInput,
	NoticePreviewInput,
} from "./schemas";
import type {
	NoticeEntity,
	ListResult,
	NoticeWithAlertSummary,
	NoticePeriod,
} from "./types";
import { calculateNoticePeriod, getNoticeSubmissionDeadline } from "./types";

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
		organizationId: string,
		filters: NoticeFilterInput,
	): Promise<ListResult<NoticeEntity>> {
		return this.repository.list(organizationId, filters);
	}

	/**
	 * Get a single notice
	 */
	async get(organizationId: string, id: string): Promise<NoticeEntity> {
		return this.repository.get(organizationId, id);
	}

	/**
	 * Get a notice with alert summary
	 */
	async getWithSummary(
		organizationId: string,
		id: string,
	): Promise<NoticeWithAlertSummary> {
		return this.repository.getWithAlertSummary(organizationId, id);
	}

	/**
	 * Preview alerts that would be included in a notice for a given month
	 * Uses the SAT 17-17 period cycle
	 */
	async preview(
		organizationId: string,
		input: NoticePreviewInput,
	): Promise<{
		total: number;
		bySeverity: Record<string, number>;
		byStatus: Record<string, number>;
		periodStart: string;
		periodEnd: string;
		reportedMonth: string;
		displayName: string;
		submissionDeadline: string;
	}> {
		const period = calculateNoticePeriod(input.year, input.month);
		const deadline = getNoticeSubmissionDeadline(input.year, input.month);

		const stats = await this.repository.countAlertsForPeriod(
			organizationId,
			period.start,
			period.end,
		);

		return {
			...stats,
			periodStart: period.start.toISOString(),
			periodEnd: period.end.toISOString(),
			reportedMonth: period.reportedMonth,
			displayName: period.displayName,
			submissionDeadline: deadline.toISOString(),
		};
	}

	/**
	 * Create a new notice
	 * Automatically calculates the 17-17 period from year/month
	 * Allows creating multiple notices for the same period as long as
	 * there is no pending (DRAFT/GENERATED) notice
	 */
	async create(
		input: NoticeCreateInput,
		organizationId: string,
		createdBy?: string,
	): Promise<NoticeEntity> {
		const period = calculateNoticePeriod(input.year, input.month);

		// Check if a pending notice exists for this period
		// Only block if there's a DRAFT or GENERATED notice in progress
		const hasPending = await this.repository.hasPendingNoticeForPeriod(
			organizationId,
			period.reportedMonth,
		);

		if (hasPending) {
			throw new Error("NOTICE_ALREADY_EXISTS_FOR_PERIOD");
		}

		// Create the notice
		const notice = await this.repository.create(
			input,
			organizationId,
			createdBy,
		);

		// Assign alerts to the notice
		const alertCount = await this.repository.assignAlertsToNotice(
			organizationId,
			notice.id,
			period.start,
			period.end,
		);

		// Return updated notice with correct count
		return {
			...notice,
			recordCount: alertCount,
		};
	}

	/**
	 * Update a notice
	 */
	async patch(
		organizationId: string,
		id: string,
		input: NoticePatchInput,
	): Promise<NoticeEntity> {
		return this.repository.patch(organizationId, id, input);
	}

	/**
	 * Delete a notice (only if DRAFT status)
	 */
	async delete(organizationId: string, id: string): Promise<void> {
		return this.repository.delete(organizationId, id);
	}

	/**
	 * Get alerts for a notice (for XML generation)
	 */
	async getAlertsForNotice(organizationId: string, noticeId: string) {
		return this.repository.getAlertsForNotice(organizationId, noticeId);
	}

	/**
	 * Get alerts with transactions for a notice (for XML generation)
	 * Includes client, alertRule, and transaction data needed for SAT XML
	 */
	async getAlertsWithTransactionsForNotice(
		organizationId: string,
		noticeId: string,
	) {
		return this.repository.getAlertsWithTransactionsForNotice(
			organizationId,
			noticeId,
		);
	}

	/**
	 * Mark a notice as generated with XML file URL
	 */
	async markAsGenerated(
		organizationId: string,
		id: string,
		options: {
			xmlFileUrl?: string | null;
			fileSize?: number | null;
		},
	): Promise<NoticeEntity> {
		return this.repository.markAsGenerated(organizationId, id, options);
	}

	/**
	 * Mark notice as submitted to SAT
	 */
	async markAsSubmitted(
		organizationId: string,
		id: string,
		satFolioNumber?: string,
	): Promise<NoticeEntity> {
		return this.repository.markAsSubmitted(organizationId, id, satFolioNumber);
	}

	/**
	 * Mark notice as acknowledged by SAT
	 */
	async markAsAcknowledged(
		organizationId: string,
		id: string,
		satFolioNumber: string,
	): Promise<NoticeEntity> {
		return this.repository.markAsAcknowledged(
			organizationId,
			id,
			satFolioNumber,
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
	async getAvailableMonths(organizationId: string): Promise<
		Array<{
			year: number;
			month: number;
			displayName: string;
			hasNotice: boolean;
			hasPendingNotice: boolean;
			hasSubmittedNotice: boolean;
			noticeCount: number;
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
		}> = [];

		// Determine starting offset: if we're past day 16, include next month (i = -1)
		// This accounts for the SAT 17-17 period cycle where alerts created after
		// day 16 belong to the next month's reporting period
		const startOffset = currentDay > 16 ? -1 : 0;

		for (let i = startOffset; i < 12; i++) {
			const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
			const year = date.getFullYear();
			const month = date.getMonth() + 1;
			const reportedMonth = `${year}${String(month).padStart(2, "0")}`;
			const displayName = `${MONTH_NAMES_ES[month - 1]} ${year}`;

			const stats = await this.repository.getNoticeStatsForPeriod(
				organizationId,
				reportedMonth,
			);

			months.push({
				year,
				month,
				displayName,
				// hasNotice now means "blocks creation" - only pending notices block
				hasNotice: stats.hasPendingNotice,
				hasPendingNotice: stats.hasPendingNotice,
				hasSubmittedNotice: stats.hasSubmittedNotice,
				noticeCount: stats.noticeCount,
			});
		}

		return months;
	}
}
