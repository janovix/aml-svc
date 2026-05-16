/**
 * Watchlist screening snapshot helpers (Client + BeneficialController history rows).
 */

import type { PrismaClient } from "@prisma/client";

export type ScreeningChangeKey =
	| "ofac"
	| "un"
	| "sat69b"
	| "pep"
	| "adverse_media";

export type ScreeningChangeFlags = Partial<Record<ScreeningChangeKey, "new">>;

export interface BooleanScreeningState {
	ofac: boolean;
	un: boolean;
	sat69b: boolean;
	pep: boolean;
	adverse: boolean;
}

/**
 * New positives: false → true compared to `before`.
 */
export function computeNewPositives(
	before: BooleanScreeningState,
	after: BooleanScreeningState,
): ScreeningChangeFlags {
	const out: ScreeningChangeFlags = {};
	if (!before.ofac && after.ofac) out.ofac = "new";
	if (!before.un && after.un) out.un = "new";
	if (!before.sat69b && after.sat69b) out.sat69b = "new";
	if (!before.pep && after.pep) out.pep = "new";
	if (!before.adverse && after.adverse) out.adverse_media = "new";
	return out;
}

export function stateFromClientRow(row: {
	ofacSanctioned: boolean;
	unscSanctioned: boolean;
	sat69bListed: boolean;
	isPEP: boolean;
	adverseMediaFlagged: boolean;
}): BooleanScreeningState {
	return {
		ofac: row.ofacSanctioned,
		un: row.unscSanctioned,
		sat69b: row.sat69bListed,
		pep: row.isPEP,
		adverse: row.adverseMediaFlagged,
	};
}

export function serializeChangeFlags(
	flags: ScreeningChangeFlags,
): string | null {
	if (Object.keys(flags).length === 0) return null;
	return JSON.stringify(flags);
}

/**
 * True if the entity was already in a negative state (any list flag) before the new run.
 */
export function hadAnyNegative(
	state: BooleanScreeningState,
	screeningResult: string,
): boolean {
	return (
		screeningResult === "flagged" ||
		state.ofac ||
		state.un ||
		state.sat69b ||
		state.pep ||
		state.adverse
	);
}

export async function getLastClientScreeningSnapshot(
	prisma: PrismaClient,
	clientId: string,
): Promise<{
	id: string;
	ofacSanctioned: boolean;
	unscSanctioned: boolean;
	sat69bListed: boolean;
	isPep: boolean;
	adverseMediaFlagged: boolean;
	screeningResult: string;
} | null> {
	const last = await prisma.clientWatchlistScreening.findFirst({
		where: { clientId, screeningResult: { not: "error" } },
		orderBy: { screenedAt: "desc" },
	});
	if (!last) return null;
	return {
		id: last.id,
		ofacSanctioned: last.ofacSanctioned,
		unscSanctioned: last.unscSanctioned,
		sat69bListed: last.sat69bListed,
		isPep: last.isPep,
		adverseMediaFlagged: last.adverseMediaFlagged,
		screeningResult: last.screeningResult,
	};
}

export async function getLastBcScreeningSnapshot(
	prisma: PrismaClient,
	bcId: string,
): Promise<{
	id: string;
	ofacSanctioned: boolean;
	unscSanctioned: boolean;
	sat69bListed: boolean;
	isPep: boolean;
	adverseMediaFlagged: boolean;
	screeningResult: string;
} | null> {
	const last = await prisma.beneficialControllerWatchlistScreening.findFirst({
		where: { beneficialControllerId: bcId, screeningResult: { not: "error" } },
		orderBy: { screenedAt: "desc" },
	});
	if (!last) return null;
	return {
		id: last.id,
		ofacSanctioned: last.ofacSanctioned,
		unscSanctioned: last.unscSanctioned,
		sat69bListed: last.sat69bListed,
		isPep: last.isPep,
		adverseMediaFlagged: last.adverseMediaFlagged,
		screeningResult: last.screeningResult,
	};
}

export function newScreeningSnapshotId(): string {
	return crypto.randomUUID();
}
