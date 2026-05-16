/**
 * Process a single watchlist re-screen job (queue consumer).
 */

import type { PrismaClient } from "@prisma/client";
import { getPrismaClient } from "./prisma";
import { createRiskQueueService } from "./risk-queue";
import type { RiskJob } from "./risk-queue";
import { createWatchlistSearchService } from "./watchlist-search";
import {
	computeNewPositives,
	hadAnyNegative,
	getLastClientScreeningSnapshot,
	getLastBcScreeningSnapshot,
	newScreeningSnapshotId,
	serializeChangeFlags,
	stateFromClientRow,
	type BooleanScreeningState,
	type ScreeningChangeKey,
} from "./screening-snapshot";
import {
	sendScreeningFlaggedNotification,
	sendScreeningStatusChangedNotification,
} from "./screening-notifications";
import { mapPrismaOrganizationSettings } from "../domain/organization-settings/mappers";
import type {
	OrganizationSettingsEntity,
	WatchlistRescanSource,
} from "../domain/organization-settings/types";
import type { Bindings } from "../types";
import type { ScreeningRescanJob } from "./watchlist-rescan-types";
function buildClientSearchName(c: {
	personType: string;
	firstName: string | null;
	lastName: string | null;
	secondLastName: string | null;
	businessName: string | null;
}): string {
	if (c.personType === "PHYSICAL") {
		return [c.firstName, c.lastName, c.secondLastName]
			.filter(Boolean)
			.join(" ")
			.trim();
	}
	return c.businessName?.trim() || "";
}

function beforeStateFromSnapshot(
	last: Awaited<ReturnType<typeof getLastClientScreeningSnapshot>>,
	fallback: BooleanScreeningState,
	fallbackResult: string,
): { state: BooleanScreeningState; screeningResult: string } {
	if (!last) {
		return { state: fallback, screeningResult: fallbackResult };
	}
	const state: BooleanScreeningState = {
		ofac: last.ofacSanctioned,
		un: last.unscSanctioned,
		sat69b: last.sat69bListed,
		pep: last.isPep,
		adverse: last.adverseMediaFlagged,
	};
	return { state, screeningResult: last.screeningResult };
}

function sourceAllowed(
	key: ScreeningChangeKey,
	sources: WatchlistRescanSource[],
): boolean {
	if (key === "ofac" || key === "un" || key === "sat69b") {
		if (key === "ofac") return sources.includes("ofac");
		if (key === "un") return sources.includes("un");
		return sources.includes("sat69b");
	}
	if (key === "pep") return sources.includes("pep");
	if (key === "adverse_media") return sources.includes("adverse_media");
	return false;
}

/**
 * @throws on hard failures so the queue can retry
 */
export async function processOneRescanJob(
	env: Bindings,
	job: ScreeningRescanJob,
): Promise<void> {
	const prisma: PrismaClient = getPrismaClient(env.DB);
	const settingsRow = await prisma.organizationSettings.findUnique({
		where: { organizationId: job.organizationId },
	});
	if (!settingsRow) {
		console.warn(
			`[rescan] No org settings for ${job.organizationId}, skip entity ${job.entityId}`,
		);
		return;
	}
	const orgSettings: OrganizationSettingsEntity =
		mapPrismaOrganizationSettings(settingsRow);
	if (!orgSettings.watchlistRescanEnabled) return;

	const watchlist = createWatchlistSearchService(env.WATCHLIST_SERVICE);
	if (!env.WATCHLIST_SERVICE) {
		throw new Error("WATCHLIST_SERVICE not configured");
	}

	if (job.kind === "client") {
		await rescanClient(env, prisma, orgSettings, watchlist, job);
	} else {
		await rescanBc(env, prisma, orgSettings, watchlist, job);
	}
}

async function rescanClient(
	env: Bindings,
	prisma: PrismaClient,
	orgSettings: OrganizationSettingsEntity,
	watchlist: ReturnType<typeof createWatchlistSearchService>,
	job: ScreeningRescanJob,
): Promise<void> {
	const client = await prisma.client.findFirst({
		where: {
			id: job.entityId,
			organizationId: job.organizationId,
			deletedAt: null,
		},
	});
	if (!client) {
		console.warn(`[rescan] Client not found ${job.entityId}`);
		return;
	}

	const fullName = buildClientSearchName(client);
	if (!fullName) {
		console.warn(`[rescan] Client ${client.id} has no name, skip`);
		return;
	}

	const lastSn = await getLastClientScreeningSnapshot(prisma, client.id);
	const beforeCombined = beforeStateFromSnapshot(
		lastSn,
		stateFromClientRow(client),
		client.screeningResult,
	);
	const before = beforeCombined.state;
	const hadNeg = hadAnyNegative(before, beforeCombined.screeningResult);

	const result = await watchlist.triggerSearch({
		query: fullName,
		entityType: client.personType === "PHYSICAL" ? "person" : "organization",
		organizationId: client.organizationId,
		userId: "system:watchlist-rescan",
		source: "aml:rescan",
		birthDate: client.birthDate?.toISOString().split("T")[0],
		identifiers: client.rfc ? [client.rfc] : undefined,
		countries: client.nationality ? [client.nationality] : undefined,
		entityId: client.id,
		entityKind: "client",
		environment: "production",
	});
	if (!result) {
		await insertClientErrorSnapshot(
			prisma,
			client,
			lastSn?.id,
			"search_failed",
		);
		throw new Error("Watchlist search returned null");
	}

	const ofac = result.ofacCount > 0;
	const un = result.unscCount > 0;
	const sat = result.sat69bCount > 0;
	const after: BooleanScreeningState = {
		ofac,
		un,
		sat69b: sat,
		pep: client.isPEP,
		adverse: client.adverseMediaFlagged,
	};

	const changeFlags = computeNewPositives(before, after);
	const isSyncFlagged = ofac || un || sat;
	const screeningResult: string = isSyncFlagged ? "flagged" : "pending";

	const screenedAt = new Date();
	const snapId = newScreeningSnapshotId();

	await prisma.$transaction(async (tx) => {
		await tx.clientWatchlistScreening.create({
			data: {
				id: snapId,
				organizationId: client.organizationId,
				clientId: client.id,
				watchlistQueryId: result.queryId,
				screenedAt,
				triggeredBy: job.triggeredBy,
				screeningResult,
				ofacSanctioned: ofac,
				unscSanctioned: un,
				sat69bListed: sat,
				isPep: client.isPEP,
				adverseMediaFlagged: client.adverseMediaFlagged,
				changeFlags: serializeChangeFlags(changeFlags),
				prevSnapshotId: lastSn?.id ?? null,
			},
		});
		await tx.client.update({
			where: { id: client.id },
			data: {
				watchlistQueryId: result.queryId,
				ofacSanctioned: ofac,
				unscSanctioned: un,
				sat69bListed: sat,
				screeningResult,
				screenedAt,
			},
		});
	});

	const clientName =
		client.businessName ||
		[client.firstName, client.lastName].filter(Boolean).join(" ") ||
		client.id;
	await dispatchNotifications(env, orgSettings, {
		organizationId: client.organizationId,
		entityId: client.id,
		entityKind: "client",
		entityName: clientName,
		before,
		after: { ...after },
		beforeResult: beforeCombined.screeningResult,
		afterResult: screeningResult,
		changeFlags,
		hadNeg,
	});

	const riskQ = createRiskQueueService(
		env.RISK_ASSESSMENT_QUEUE as Queue<RiskJob> | undefined,
	);
	await riskQ.queueScreeningRiskUpdate(
		client.organizationId,
		client.id,
		"scheduled_rescan",
	);
}

async function rescanBc(
	env: Bindings,
	prisma: PrismaClient,
	orgSettings: OrganizationSettingsEntity,
	watchlist: ReturnType<typeof createWatchlistSearchService>,
	job: ScreeningRescanJob,
): Promise<void> {
	const bc = await prisma.beneficialController.findFirst({
		where: { id: job.entityId },
		include: { client: true },
	});
	if (!bc || !bc.client || bc.client.organizationId !== job.organizationId) {
		console.warn(`[rescan] BC not found or org mismatch ${job.entityId}`);
		return;
	}

	const fullName = [bc.firstName, bc.lastName, bc.secondLastName]
		.filter(Boolean)
		.join(" ")
		.trim();
	if (!fullName) return;

	const lastSn = await getLastBcScreeningSnapshot(prisma, bc.id);
	const beforeRaw = stateFromClientRow({
		...bc,
		isPEP: bc.isPEP,
	});
	const beforeWrapped = beforeStateFromSnapshot(
		lastSn,
		beforeRaw,
		bc.screeningResult,
	);
	const before = beforeWrapped.state;
	const hadNeg = hadAnyNegative(before, beforeWrapped.screeningResult);

	const result = await watchlist.triggerSearch({
		query: fullName,
		entityType: "person",
		organizationId: job.organizationId,
		userId: "system:watchlist-rescan",
		source: "aml:rescan:bc",
		birthDate: bc.birthDate?.toISOString().split("T")[0],
		identifiers: bc.rfc ? [bc.rfc] : undefined,
		countries: bc.nationality ? [bc.nationality] : undefined,
		entityId: bc.id,
		entityKind: "beneficial_controller",
		environment: "production",
	});
	if (!result) {
		throw new Error("Watchlist search returned null");
	}

	const ofac = result.ofacCount > 0;
	const un = result.unscCount > 0;
	const sat = result.sat69bCount > 0;
	const after: BooleanScreeningState = {
		ofac,
		un,
		sat69b: sat,
		pep: bc.isPEP,
		adverse: bc.adverseMediaFlagged,
	};
	const changeFlags = computeNewPositives(before, after);
	const isSyncFlagged = ofac || un || sat;
	const screeningResult = isSyncFlagged ? "flagged" : "pending";
	const screenedAt = new Date();
	const snapId = newScreeningSnapshotId();

	await prisma.$transaction(async (tx) => {
		await tx.beneficialControllerWatchlistScreening.create({
			data: {
				id: snapId,
				organizationId: job.organizationId,
				beneficialControllerId: bc.id,
				clientId: bc.clientId,
				watchlistQueryId: result.queryId,
				screenedAt,
				triggeredBy: job.triggeredBy,
				screeningResult,
				ofacSanctioned: ofac,
				unscSanctioned: un,
				sat69bListed: sat,
				isPep: bc.isPEP,
				adverseMediaFlagged: bc.adverseMediaFlagged,
				changeFlags: serializeChangeFlags(changeFlags),
				prevSnapshotId: lastSn?.id ?? null,
			},
		});
		await tx.beneficialController.update({
			where: { id: bc.id },
			data: {
				watchlistQueryId: result.queryId,
				ofacSanctioned: ofac,
				unscSanctioned: un,
				sat69bListed: sat,
				screeningResult,
				screenedAt,
			},
		});
	});

	const bcName = fullName || bc.id;
	await dispatchNotifications(env, orgSettings, {
		organizationId: job.organizationId,
		entityId: bc.id,
		entityKind: "beneficial_controller",
		entityName: bcName,
		before,
		after: { ...after },
		beforeResult: beforeWrapped.screeningResult,
		afterResult: screeningResult,
		changeFlags,
		hadNeg,
	});

	const riskQ = createRiskQueueService(
		env.RISK_ASSESSMENT_QUEUE as Queue<RiskJob> | undefined,
	);
	await riskQ.queueScreeningRiskUpdate(
		bc.client.organizationId,
		bc.clientId,
		"scheduled_rescan_bc",
	);
}

async function insertClientErrorSnapshot(
	prisma: PrismaClient,
	client: {
		id: string;
		organizationId: string;
		isPEP: boolean;
		adverseMediaFlagged: boolean;
	},
	prevSnapshotId: string | null | undefined,
	err: string,
): Promise<void> {
	const id = newScreeningSnapshotId();
	await prisma.clientWatchlistScreening.create({
		data: {
			id,
			organizationId: client.organizationId,
			clientId: client.id,
			watchlistQueryId: null,
			screenedAt: new Date(),
			triggeredBy: "scheduled",
			screeningResult: "error",
			ofacSanctioned: false,
			unscSanctioned: false,
			sat69bListed: false,
			isPep: client.isPEP,
			adverseMediaFlagged: client.adverseMediaFlagged,
			errorMessage: err,
			prevSnapshotId: prevSnapshotId ?? null,
		},
	});
}

type DispatchInput = {
	organizationId: string;
	entityId: string;
	entityKind: "client" | "beneficial_controller";
	entityName: string;
	before: BooleanScreeningState;
	after: BooleanScreeningState;
	beforeResult: string;
	afterResult: string;
	changeFlags: import("./screening-snapshot").ScreeningChangeFlags;
	hadNeg: boolean;
};

async function dispatchNotifications(
	env: Bindings,
	org: OrganizationSettingsEntity,
	d: DispatchInput,
): Promise<void> {
	const newKeys = Object.keys(d.changeFlags) as ScreeningChangeKey[];

	// New positives while entity was already in a bad state (incremental) → status_changed
	if (
		org.watchlistRescanNotifyOnStatusChange &&
		d.hadNeg &&
		newKeys.length > 0
	) {
		const changedSources = newKeys.filter((k) =>
			sourceAllowed(k, org.watchlistRescanSources),
		);
		if (changedSources.length > 0) {
			const ch = new Set<"in_app" | "email">();
			for (const c of org.watchlistRescanNotifyChannels) {
				if (c === "in_app" || c === "email") ch.add(c);
			}
			if (ch.size === 0) ch.add("in_app");
			void sendScreeningStatusChangedNotification(env, {
				organizationId: d.organizationId,
				entityId: d.entityId,
				entityName: d.entityName,
				entityKind: d.entityKind,
				changedSources: changedSources.map(mapChangeKeyToNotifySource),
				channels: [...ch],
			});
		}
		return;
	}

	// First time crossing into flagged (was not in a bad state) → am.screening.flagged
	if (newKeys.length > 0 && d.afterResult === "flagged" && !d.hadNeg) {
		const hit = pickHitTypeForFlagged(d.after);
		if (hit) {
			void sendScreeningFlaggedNotification(env, {
				organizationId: d.organizationId,
				entityId: d.entityId,
				entityName: d.entityName,
				entityKind: d.entityKind,
				hitType: hit,
			});
		}
	}
}

type Hit = "sanctions" | "pep" | "adverse_media";

function pickHitTypeForFlagged(a: BooleanScreeningState): Hit | null {
	if (a.ofac || a.un || a.sat69b) return "sanctions";
	if (a.pep) return "pep";
	if (a.adverse) return "adverse_media";
	return null;
}

function mapChangeKeyToNotifySource(
	k: ScreeningChangeKey,
): "ofac" | "un" | "sat69b" | "pep" | "adverse_media" {
	return k;
}
