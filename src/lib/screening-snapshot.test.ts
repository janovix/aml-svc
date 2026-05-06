import { describe, expect, it, vi } from "vitest";

import {
	computeNewPositives,
	getLastBcScreeningSnapshot,
	getLastClientScreeningSnapshot,
	hadAnyNegative,
	newScreeningSnapshotId,
	serializeChangeFlags,
	stateFromClientRow,
} from "./screening-snapshot";

const baseState = {
	ofac: false,
	un: false,
	sat69b: false,
	pep: false,
	adverse: false,
};

describe("screening-snapshot pure helpers", () => {
	it("computeNewPositives detects false to true transitions", () => {
		expect(
			computeNewPositives(baseState, {
				...baseState,
				ofac: true,
				pep: true,
			}),
		).toEqual({ ofac: "new", pep: "new" });
	});

	it("serializeChangeFlags returns null for empty flags", () => {
		expect(serializeChangeFlags({})).toBeNull();
		expect(serializeChangeFlags({ ofac: "new" })).toBe('{"ofac":"new"}');
	});

	it("hadAnyNegative combines screeningResult and state flags", () => {
		expect(hadAnyNegative(baseState, "clear")).toBe(false);
		expect(hadAnyNegative(baseState, "flagged")).toBe(true);
		expect(hadAnyNegative({ ...baseState, ofac: true }, "clear")).toBe(true);
	});

	it("stateFromClientRow maps columns", () => {
		expect(
			stateFromClientRow({
				ofacSanctioned: true,
				unscSanctioned: false,
				sat69bListed: true,
				isPEP: false,
				adverseMediaFlagged: false,
			}),
		).toEqual({
			ofac: true,
			un: false,
			sat69b: true,
			pep: false,
			adverse: false,
		});
	});

	it("newScreeningSnapshotId returns a UUID-shaped string", () => {
		expect(newScreeningSnapshotId()).toHaveLength(36);
	});
});

describe("getLastClientScreeningSnapshot", () => {
	it("returns null when no rows", async () => {
		const findFirst = vi.fn().mockResolvedValue(null);
		const prisma = {
			clientWatchlistScreening: { findFirst },
		} as never;

		await expect(
			getLastClientScreeningSnapshot(prisma, "c1"),
		).resolves.toBeNull();
		expect(findFirst).toHaveBeenCalledWith({
			where: { clientId: "c1", screeningResult: { not: "error" } },
			orderBy: { screenedAt: "desc" },
		});
	});

	it("maps last row", async () => {
		const row = {
			id: "s1",
			ofacSanctioned: true,
			unscSanctioned: false,
			sat69bListed: false,
			isPep: false,
			adverseMediaFlagged: false,
			screeningResult: "clear",
		};
		const prisma = {
			clientWatchlistScreening: {
				findFirst: vi.fn().mockResolvedValue(row),
			},
		} as never;

		await expect(getLastClientScreeningSnapshot(prisma, "c1")).resolves.toEqual(
			{
				id: "s1",
				ofacSanctioned: true,
				unscSanctioned: false,
				sat69bListed: false,
				isPep: false,
				adverseMediaFlagged: false,
				screeningResult: "clear",
			},
		);
	});
});

describe("getLastBcScreeningSnapshot", () => {
	it("returns null when no rows", async () => {
		const prisma = {
			beneficialControllerWatchlistScreening: {
				findFirst: vi.fn().mockResolvedValue(null),
			},
		} as never;

		await expect(getLastBcScreeningSnapshot(prisma, "bc1")).resolves.toBeNull();
	});
});
