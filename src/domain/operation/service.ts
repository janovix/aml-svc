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
import {
	ACTIVITY_THRESHOLDS,
	DEFAULT_UMA_DAILY_VALUE,
	getIdentificationThresholdUma as getIdentificationThresholdUmaFromConfig,
	getNoticeThresholdUma as getNoticeThresholdUmaFromConfig,
} from "../alert-detection/config/activity-thresholds";

export class DuplicateOperationError extends Error {
	constructor(importHash: string) {
		super(
			`Operation with identical content already exists (hash: ${importHash})`,
		);
		this.name = "DuplicateOperationError";
	}
}

/** Single source of truth: [activity-thresholds.ts](../alert-detection/config/activity-thresholds.ts) */
const CURRENT_UMA = DEFAULT_UMA_DAILY_VALUE;
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
		const t = getNoticeThresholdUmaFromConfig(activityCode);
		if (t === null) return 0;
		return t === "ALWAYS" ? 0 : t;
	}

	getIdentificationThresholdUma(activityCode: ActivityCode): number {
		const t = getIdentificationThresholdUmaFromConfig(activityCode);
		if (t === null) return 0;
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
		for (const [code, t] of Object.entries(ACTIVITY_THRESHOLDS)) {
			thresholds[code] = {
				identificationUma: t.identificationThresholdUma,
				noticeUma: t.noticeThresholdUma,
				identificationMxn:
					(t.identificationThresholdUma === "ALWAYS"
						? 0
						: t.identificationThresholdUma) * CURRENT_UMA,
				noticeMxn:
					(t.noticeThresholdUma === "ALWAYS" ? 0 : t.noticeThresholdUma) *
					CURRENT_UMA,
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
