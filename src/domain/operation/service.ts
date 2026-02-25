import type { PrismaClient } from "@prisma/client";
import { OperationRepository } from "./repository";
import type {
	OperationEntity,
	ActivityCode,
	ListResultWithMeta,
} from "./types";
import type {
	OperationFilters,
	OperationCreateInput,
	OperationUpdateInput,
} from "./schemas";

export class DuplicateOperationError extends Error {
	constructor(importHash: string) {
		super(
			`Operation with identical content already exists (hash: ${importHash})`,
		);
		this.name = "DuplicateOperationError";
	}
}

/**
 * UMA thresholds by activity code (in UMAs) — LFPIORPI Art. 17
 *
 * Each activity has TWO thresholds:
 * - identification: operations >= this must capture client identity
 * - notice: operations >= this must file a SAT notice
 *
 * "ALWAYS" means the obligation applies regardless of amount.
 */
const UMA_THRESHOLDS: Record<
	ActivityCode,
	{ identification: number | "ALWAYS"; notice: number | "ALWAYS" }
> = {
	JYS: { identification: 325, notice: 645 }, // Fracción I - Gambling
	TSC: { identification: 805, notice: 1285 }, // Fracción II-a - Cards
	TPP: { identification: 645, notice: 645 }, // Fracción II-b,c - Prepaid
	TDR: { identification: 645, notice: 645 }, // Fracción II-c - Rewards
	CHV: { identification: "ALWAYS", notice: 645 }, // Fracción III - Traveler checks
	MPC: { identification: "ALWAYS", notice: 1605 }, // Fracción IV - Loans
	INM: { identification: "ALWAYS", notice: 8025 }, // Fracción V - Real estate
	DIN: { identification: "ALWAYS", notice: 8025 }, // Fracción V Bis - Development
	MJR: { identification: 805, notice: 1605 }, // Fracción VI - Jewelry
	OBA: { identification: 2410, notice: 4815 }, // Fracción VII - Art
	VEH: { identification: 3210, notice: 6420 }, // Fracción VIII - Vehicles
	BLI: { identification: 2410, notice: 4815 }, // Fracción IX - Armoring
	TCV: { identification: "ALWAYS", notice: 3210 }, // Fracción X - Custody
	SPR: { identification: "ALWAYS", notice: "ALWAYS" }, // Fracción XI - Professional
	FEP: { identification: "ALWAYS", notice: 8000 }, // Fracción XII-A - Notaries
	FES: { identification: "ALWAYS", notice: "ALWAYS" }, // Fracción XII-B - Brokers
	DON: { identification: 1605, notice: 3210 }, // Fracción XIII - Donations
	ARI: { identification: 1605, notice: 3210 }, // Fracción XV - Rental
	AVI: { identification: "ALWAYS", notice: 210 }, // Fracción XVI - Virtual assets
};

// Current UMA value (updated Feb 1, 2026)
const CURRENT_UMA = 117.31;
const CURRENT_UMA_DAILY = CURRENT_UMA; // Same for daily value

export class OperationService {
	private repository: OperationRepository;

	constructor(prisma: PrismaClient) {
		this.repository = new OperationRepository(prisma);
	}

	async create(
		organizationId: string,
		input: OperationCreateInput,
	): Promise<OperationEntity> {
		if (input.importHash) {
			const exists = await this.repository.existsByImportHash(
				organizationId,
				input.importHash,
			);
			if (exists) {
				throw new DuplicateOperationError(input.importHash);
			}
		}

		const umaInfo = {
			umaValue: CURRENT_UMA,
			umaDailyValue: CURRENT_UMA_DAILY,
		};

		const operation = await this.repository.create(
			organizationId,
			input,
			umaInfo,
		);

		return operation;
	}

	async getById(
		organizationId: string,
		id: string,
	): Promise<OperationEntity | null> {
		return this.repository.findById(organizationId, id);
	}

	async list(
		organizationId: string,
		filters: OperationFilters,
	): Promise<ListResultWithMeta<OperationEntity>> {
		return this.repository.list(organizationId, filters);
	}

	async update(
		organizationId: string,
		id: string,
		input: OperationUpdateInput,
	): Promise<OperationEntity | null> {
		const umaInfo = {
			umaValue: CURRENT_UMA,
			umaDailyValue: CURRENT_UMA_DAILY,
		};

		return this.repository.update(organizationId, id, input, umaInfo);
	}

	async delete(organizationId: string, id: string): Promise<boolean> {
		return this.repository.softDelete(organizationId, id);
	}

	async getStats(organizationId: string): Promise<{
		totalOperations: number;
		operationsToday: number;
		totalAmountMxn: string;
	}> {
		return this.repository.getStats(organizationId);
	}

	async getByClientId(
		organizationId: string,
		clientId: string,
		options?: { activityCode?: ActivityCode; startDate?: Date; endDate?: Date },
	): Promise<OperationEntity[]> {
		return this.repository.findByClientId(organizationId, clientId, options);
	}

	/**
	 * Gets the notice UMA threshold for a specific activity.
	 * Returns 0 for "ALWAYS" activities.
	 */
	getNoticeThresholdUma(activityCode: ActivityCode): number {
		const t = UMA_THRESHOLDS[activityCode].notice;
		return t === "ALWAYS" ? 0 : t;
	}

	/**
	 * Gets the identification UMA threshold for a specific activity.
	 * Returns 0 for "ALWAYS" activities.
	 */
	getIdentificationThresholdUma(activityCode: ActivityCode): number {
		const t = UMA_THRESHOLDS[activityCode].identification;
		return t === "ALWAYS" ? 0 : t;
	}

	/**
	 * Gets the notice monetary threshold in MXN for a specific activity
	 */
	getNoticeThresholdMxn(activityCode: ActivityCode): number {
		return this.getNoticeThresholdUma(activityCode) * CURRENT_UMA;
	}

	/**
	 * Gets the identification monetary threshold in MXN for a specific activity
	 */
	getIdentificationThresholdMxn(activityCode: ActivityCode): number {
		return this.getIdentificationThresholdUma(activityCode) * CURRENT_UMA;
	}

	/**
	 * Checks if an amount exceeds the notice threshold for a given activity
	 */
	exceedsNoticeThreshold(
		activityCode: ActivityCode,
		amountMxn: number,
	): boolean {
		const threshold = this.getNoticeThresholdMxn(activityCode);
		return amountMxn >= threshold;
	}

	/**
	 * Checks if an amount exceeds the identification threshold for a given activity
	 */
	exceedsIdentificationThreshold(
		activityCode: ActivityCode,
		amountMxn: number,
	): boolean {
		const threshold = this.getIdentificationThresholdMxn(activityCode);
		return amountMxn >= threshold;
	}

	/**
	 * @deprecated Use getNoticeThresholdUma() instead
	 */
	getUmaThreshold(activityCode: ActivityCode): number {
		return this.getNoticeThresholdUma(activityCode);
	}

	/**
	 * @deprecated Use getNoticeThresholdMxn() instead
	 */
	getThresholdMxn(activityCode: ActivityCode): number {
		return this.getNoticeThresholdMxn(activityCode);
	}

	/**
	 * @deprecated Use exceedsNoticeThreshold() instead
	 */
	exceedsThreshold(activityCode: ActivityCode, amountMxn: number): boolean {
		return this.exceedsNoticeThreshold(activityCode, amountMxn);
	}

	/**
	 * Calculates accumulated amount for a client within a period
	 * Used for detecting threshold breaches over accumulated operations
	 */
	async calculateAccumulatedAmount(
		organizationId: string,
		clientId: string,
		activityCode: ActivityCode,
		startDate: Date,
		endDate: Date,
	): Promise<{
		totalMxn: number;
		operationCount: number;
		exceedsThreshold: boolean;
	}> {
		const operations = await this.repository.findByClientId(
			organizationId,
			clientId,
			{
				activityCode,
				startDate,
				endDate,
			},
		);

		let totalMxn = 0;
		for (const op of operations) {
			const amountMxn = op.amountMxn ? parseFloat(op.amountMxn) : 0;
			totalMxn += amountMxn;
		}

		const noticeThreshold = this.getNoticeThresholdMxn(activityCode);

		return {
			totalMxn,
			operationCount: operations.length,
			exceedsThreshold: totalMxn >= noticeThreshold,
		};
	}

	/**
	 * Gets the current UMA value
	 */
	getCurrentUmaValue(): number {
		return CURRENT_UMA;
	}

	/**
	 * Gets all UMA thresholds (both identification and notice)
	 */
	getAllThresholds(): Record<
		ActivityCode,
		{
			identificationUma: number | "ALWAYS";
			noticeUma: number | "ALWAYS";
			identificationMxn: number;
			noticeMxn: number;
		}
	> {
		const thresholds: Record<
			string,
			{
				identificationUma: number | "ALWAYS";
				noticeUma: number | "ALWAYS";
				identificationMxn: number;
				noticeMxn: number;
			}
		> = {};
		for (const [code, t] of Object.entries(UMA_THRESHOLDS)) {
			thresholds[code] = {
				identificationUma: t.identification,
				noticeUma: t.notice,
				identificationMxn:
					(t.identification === "ALWAYS" ? 0 : t.identification) * CURRENT_UMA,
				noticeMxn: (t.notice === "ALWAYS" ? 0 : t.notice) * CURRENT_UMA,
			};
		}
		return thresholds as Record<
			ActivityCode,
			{
				identificationUma: number | "ALWAYS";
				noticeUma: number | "ALWAYS";
				identificationMxn: number;
				noticeMxn: number;
			}
		>;
	}
}
