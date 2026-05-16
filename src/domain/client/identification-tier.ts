import type { PrismaClient } from "@prisma/client";

import {
	getIdentificationThresholdUma,
	getNoticeThresholdUma,
} from "../operation/activities/registry";
import type { ActivityCode } from "../operation/types";
import { OrganizationSettingsRepository } from "../organization-settings/repository";
import { UmaValueRepository } from "../uma/repository";
import { productionTenant } from "../../lib/tenant-context";

export type IdentificationTier =
	| "ALWAYS"
	| "ABOVE_THRESHOLD"
	| "BELOW_THRESHOLD";

export type ClientIdentificationTierResult = {
	identificationTier: IdentificationTier;
	identificationRequired: boolean;
	identificationThresholdMxn: number | null;
	noticeThresholdMxn: number | null;
	maxSingleOperationMxn: number;
	sixMonthCumulativeMxn: number;
	singleOpExceedsThreshold: boolean;
	cumulativeExceedsNoticeThreshold: boolean;
	identificationThresholdPct: number;
	noticeThresholdPct: number;
};

const DEFAULT_TIER: ClientIdentificationTierResult = {
	identificationTier: "ALWAYS",
	identificationRequired: true,
	identificationThresholdMxn: null,
	noticeThresholdMxn: null,
	maxSingleOperationMxn: 0,
	sixMonthCumulativeMxn: 0,
	singleOpExceedsThreshold: false,
	cumulativeExceedsNoticeThreshold: false,
	identificationThresholdPct: 100,
	noticeThresholdPct: 100,
};

/**
 * Art. 17 LFPIORPI: identification tier from org activity + UMA + client operations.
 * Falls back to ALWAYS (identification always required) when org settings / UMA are missing
 * or when threshold computation throws.
 */
export async function computeClientIdentificationTier(
	prisma: PrismaClient,
	organizationId: string,
	clientId: string,
): Promise<ClientIdentificationTierResult> {
	const orgSettingsRepo = new OrganizationSettingsRepository(prisma);
	const umaRepo = new UmaValueRepository(prisma);
	const tenant = productionTenant(organizationId);

	try {
		const [orgSettings, umaValue] = await Promise.all([
			orgSettingsRepo.findByOrganizationId(tenant),
			umaRepo.getActive(),
		]);

		if (!orgSettings || !umaValue) {
			return { ...DEFAULT_TIER };
		}

		const activityCode = orgSettings.activityKey as ActivityCode;
		const idThresholdUma = getIdentificationThresholdUma(activityCode);
		const noticeThresholdUma = getNoticeThresholdUma(activityCode);
		const dailyValue = parseFloat(umaValue.dailyValue);

		if (idThresholdUma === "ALWAYS") {
			return {
				...DEFAULT_TIER,
				identificationTier: "ALWAYS",
				identificationRequired: true,
			};
		}

		const idMxn = idThresholdUma * dailyValue;
		const noticeMxn =
			noticeThresholdUma === "ALWAYS"
				? 0
				: (noticeThresholdUma as number) * dailyValue;

		const identificationThresholdMxn = idMxn;
		const noticeThresholdMxn = noticeMxn > 0 ? noticeMxn : null;

		const maxOpResult = await prisma.operation.aggregate({
			where: { clientId, deletedAt: null },
			_max: { amount: true },
		});
		const maxOp = maxOpResult._max.amount;
		const maxSingleOperationMxn =
			maxOp === null
				? 0
				: typeof maxOp === "number"
					? maxOp
					: parseFloat(maxOp.toString());

		const sixMonthsAgo = new Date();
		sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
		const cumulativeResult = await prisma.operation.aggregate({
			where: {
				clientId,
				deletedAt: null,
				operationDate: { gte: sixMonthsAgo },
			},
			_sum: { amount: true },
		});
		const cumulativeOp = cumulativeResult._sum.amount;
		const sixMonthCumulativeMxn =
			cumulativeOp === null
				? 0
				: typeof cumulativeOp === "number"
					? cumulativeOp
					: parseFloat(cumulativeOp.toString());

		const singleOpExceedsThreshold = maxSingleOperationMxn >= idMxn;
		const cumulativeExceedsNoticeThreshold =
			noticeMxn > 0 && sixMonthCumulativeMxn >= noticeMxn;

		const identificationRequired =
			singleOpExceedsThreshold || cumulativeExceedsNoticeThreshold;
		const identificationTier: IdentificationTier = identificationRequired
			? "ABOVE_THRESHOLD"
			: "BELOW_THRESHOLD";

		const identificationThresholdPct =
			idMxn > 0 ? Math.round((maxSingleOperationMxn / idMxn) * 100) : 0;
		const noticeThresholdPct =
			noticeMxn > 0 ? Math.round((sixMonthCumulativeMxn / noticeMxn) * 100) : 0;

		return {
			identificationTier,
			identificationRequired,
			identificationThresholdMxn,
			noticeThresholdMxn,
			maxSingleOperationMxn,
			sixMonthCumulativeMxn,
			singleOpExceedsThreshold,
			cumulativeExceedsNoticeThreshold,
			identificationThresholdPct,
			noticeThresholdPct,
		};
	} catch (err) {
		console.warn(
			"[computeClientIdentificationTier] Could not compute threshold:",
			err,
		);
		return { ...DEFAULT_TIER };
	}
}
