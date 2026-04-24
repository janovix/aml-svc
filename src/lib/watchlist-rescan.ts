/**
 * Enqueue watchlist re-screen jobs for orgs (cron): clients & optional BCs past interval.
 */

import { getPrismaClient } from "./prisma";
import { mapPrismaOrganizationSettings } from "../domain/organization-settings/mappers";
import type { Bindings } from "../types";
import type { ScreeningRescanJob } from "./watchlist-rescan-types";

export interface WatchlistRescanCronResult {
	enqueued: number;
	organizationsProcessed: number;
}

/**
 * Selects stale clients and BCs per org (respects daily cap and org toggles) and
 * enqueues rescan messages.
 */
export async function processWatchlistRescan(
	env: Bindings,
	scheduledTime: Date,
): Promise<WatchlistRescanCronResult> {
	const queue = env.AML_SCREENING_REFRESH_QUEUE;
	if (!queue) {
		console.warn(
			"[watchlist-rescan] AML_SCREENING_REFRESH_QUEUE not bound — skip",
		);
		return { enqueued: 0, organizationsProcessed: 0 };
	}

	const prisma = getPrismaClient(env.DB);
	const now = scheduledTime;
	const orgSettingsRows = await prisma.organizationSettings.findMany();

	let enqueued = 0;
	let organizationsProcessed = 0;

	for (const row of orgSettingsRows) {
		const settings = mapPrismaOrganizationSettings(row);
		if (!settings.watchlistRescanEnabled) continue;

		organizationsProcessed++;
		const intervalDays = settings.watchlistRescanIntervalDays;
		const cap = settings.watchlistRescanDailyCap;
		const orgId = settings.organizationId;
		const cutOff = new Date(now);
		cutOff.setDate(cutOff.getDate() - intervalDays);

		const jobs: ScreeningRescanJob[] = [];

		const clientRows = await prisma.client.findMany({
			where: {
				organizationId: orgId,
				environment: "production",
				deletedAt: null,
				OR: [{ screenedAt: null }, { screenedAt: { lt: cutOff } }],
			},
			orderBy: { screenedAt: "asc" },
			take: cap,
			select: { id: true },
		});

		for (const c of clientRows) {
			jobs.push({
				kind: "client",
				organizationId: orgId,
				entityId: c.id,
				triggeredBy: "scheduled",
			});
		}

		const used = jobs.length;
		if (settings.watchlistRescanIncludeBcs && used < cap) {
			const remain = cap - used;
			const bcRows = await prisma.beneficialController.findMany({
				where: {
					client: {
						organizationId: orgId,
						environment: "production",
						deletedAt: null,
					},
					OR: [{ screenedAt: null }, { screenedAt: { lt: cutOff } }],
				},
				orderBy: { screenedAt: "asc" },
				take: remain,
				select: { id: true },
			});
			for (const bc of bcRows) {
				jobs.push({
					kind: "bc",
					organizationId: orgId,
					entityId: bc.id,
					triggeredBy: "scheduled",
				});
			}
		}

		for (const job of jobs) {
			try {
				await queue.send(job);
				enqueued++;
			} catch (e) {
				console.error(
					"[watchlist-rescan] Failed to enqueue job",
					JSON.stringify(job),
					e,
				);
			}
		}
	}

	return { enqueued, organizationsProcessed };
}
