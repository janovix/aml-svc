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
import type { TenantContext } from "../../lib/tenant-context";

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
	JYS: { identification: 325, notice: 645 },
	TSC: { identification: 805, notice: 1285 },
	TPP: { identification: 645, notice: 645 },
	TDR: { identification: 645, notice: 645 },
	CHV: { identification: "ALWAYS", notice: 645 },
	MPC: { identification: "ALWAYS", notice: 1605 },
	INM: { identification: "ALWAYS", notice: 8025 },
	DIN: { identification: "ALWAYS", notice: 8025 },
	MJR: { identification: 805, notice: 1605 },
	OBA: { identification: 2410, notice: 4815 },
	VEH: { identification: 3210, notice: 6420 },
	BLI: { identification: 2410, notice: 4815 },
	TCV: { identification: "ALWAYS", notice: 3210 },
	SPR: { identification: "ALWAYS", notice: "ALWAYS" },
	FEP: { identification: "ALWAYS", notice: 8000 },
	FES: { identification: "ALWAYS", notice: "ALWAYS" },
	DON: { identification: 1605, notice: 3210 },
	ARI: { identification: 1605, notice: 3210 },
	AVI: { identification: "ALWAYS", notice: 210 },
};

const CURRENT_UMA = 117.31;
const CURRENT_UMA_DAILY = CURRENT_UMA;

export class OperationService {
	private repository: OperationRepository;

	constructor(prisma: PrismaClient) {
		this.repository = new OperationRepository(prisma);
	}

	async create(
		tenant: TenantContext,
		input: OperationCreateInput,
	): Promise<OperationEntity> {
		if (input.importHash) {
			const exists = await this.repository.existsByImportHash(
				tenant,
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

		const operation = await this.repository.create(tenant, input, umaInfo);

		return operation;
	}

	async getById(
		tenant: TenantContext,
		id: string,
	): Promise<OperationEntity | null> {
		return this.repository.findById(tenant, id);
	}

	async list(
		tenant: TenantContext,
		filters: OperationFilters,
	): Promise<ListResultWithMeta<OperationEntity>> {
		return this.repository.list(tenant, filters);
	}

	async update(
		tenant: TenantContext,
		id: string,
		input: OperationUpdateInput,
	): Promise<OperationEntity | null> {
		const umaInfo = {
			umaValue: CURRENT_UMA,
			umaDailyValue: CURRENT_UMA_DAILY,
		};

		return this.repository.update(tenant, id, input, umaInfo);
	}

	async delete(tenant: TenantContext, id: string): Promise<boolean> {
		return this.repository.softDelete(tenant, id);
	}

	async getStats(tenant: TenantContext): Promise<{
		totalOperations: number;
		operationsToday: number;
		totalAmountMxn: string;
	}> {
		return this.repository.getStats(tenant);
	}

	async getByClientId(
		tenant: TenantContext,
		clientId: string,
		options?: { activityCode?: ActivityCode; startDate?: Date; endDate?: Date },
	): Promise<OperationEntity[]> {
		return this.repository.findByClientId(tenant, clientId, options);
	}

	getNoticeThresholdUma(activityCode: ActivityCode): number {
		const t = UMA_THRESHOLDS[activityCode].notice;
		return t === "ALWAYS" ? 0 : t;
	}

	getIdentificationThresholdUma(activityCode: ActivityCode): number {
		const t = UMA_THRESHOLDS[activityCode].identification;
		return t === "ALWAYS" ? 0 : t;
	}

	getNoticeThresholdMxn(activityCode: ActivityCode): number {
		return this.getNoticeThresholdUma(activityCode) * CURRENT_UMA;
	}

	getIdentificationThresholdMxn(activityCode: ActivityCode): number {
		return this.getIdentificationThresholdUma(activityCode) * CURRENT_UMA;
	}

	exceedsNoticeThreshold(
		activityCode: ActivityCode,
		amountMxn: number,
	): boolean {
		const threshold = this.getNoticeThresholdMxn(activityCode);
		return amountMxn >= threshold;
	}

	exceedsIdentificationThreshold(
		activityCode: ActivityCode,
		amountMxn: number,
	): boolean {
		const threshold = this.getIdentificationThresholdMxn(activityCode);
		return amountMxn >= threshold;
	}

	/** @deprecated Use getNoticeThresholdUma() instead */
	getUmaThreshold(activityCode: ActivityCode): number {
		return this.getNoticeThresholdUma(activityCode);
	}

	/** @deprecated Use getNoticeThresholdMxn() instead */
	getThresholdMxn(activityCode: ActivityCode): number {
		return this.getNoticeThresholdMxn(activityCode);
	}

	/** @deprecated Use exceedsNoticeThreshold() instead */
	exceedsThreshold(activityCode: ActivityCode, amountMxn: number): boolean {
		return this.exceedsNoticeThreshold(activityCode, amountMxn);
	}

	async calculateAccumulatedAmount(
		tenant: TenantContext,
		clientId: string,
		activityCode: ActivityCode,
		startDate: Date,
		endDate: Date,
	): Promise<{
		totalMxn: number;
		operationCount: number;
		exceedsThreshold: boolean;
	}> {
		const operations = await this.repository.findByClientId(tenant, clientId, {
			activityCode,
			startDate,
			endDate,
		});

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

	getCurrentUmaValue(): number {
		return CURRENT_UMA;
	}

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
