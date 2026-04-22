import { Hono } from "hono";
import { z } from "zod";
import type { Bindings } from "../types";
import { getPrismaClient } from "../lib/prisma";
import {
	ACTIVITY_THRESHOLDS,
	getNoticeThresholdMxn,
} from "../domain/alert-detection/config/activity-thresholds";
import { UmaValueRepository, UmaValueService } from "../domain/uma";
import { purgeAmlOrganizations } from "../lib/e2e-purge-organizations";

const PurgeBodySchema = z.object({
	organizationIds: z.array(z.string().min(1)),
});

export const internalE2eRouter = new Hono<{ Bindings: Bindings }>();

internalE2eRouter.use("*", async (c, next) => {
	const expected = c.env.E2E_API_KEY;
	if (!expected || c.req.header("x-e2e-api-key") !== expected) {
		return c.json({ error: "Unauthorized" }, 401);
	}
	await next();
});

internalE2eRouter.get("/alert-thresholds", async (c) => {
	const prisma = getPrismaClient(c.env.DB);
	const repo = new UmaValueRepository(prisma);
	const svc = new UmaValueService(repo);
	const active = await svc.getActive().catch(() => null);
	const umaDaily = active?.dailyValue ? Number(active.dailyValue) : 113.14;

	const byActivity: Record<
		string,
		{ noticeThresholdUma: number | "ALWAYS"; noticeThresholdMxn: number | null }
	> = {};
	for (const [code, row] of Object.entries(ACTIVITY_THRESHOLDS)) {
		byActivity[code] = {
			noticeThresholdUma: row.noticeThresholdUma,
			noticeThresholdMxn: getNoticeThresholdMxn(code, umaDaily),
		};
	}

	return c.json({
		umaDailyValue: umaDaily,
		byActivity,
	});
});

internalE2eRouter.post("/purge", async (c) => {
	const body = PurgeBodySchema.safeParse(await c.req.json().catch(() => ({})));
	if (!body.success) {
		return c.json(
			{ error: "Invalid body", details: body.error.flatten() },
			400,
		);
	}
	const prisma = getPrismaClient(c.env.DB);
	const result = await purgeAmlOrganizations(prisma, body.data.organizationIds);
	return c.json(result);
});
