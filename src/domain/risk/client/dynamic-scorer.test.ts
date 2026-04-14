import { describe, expect, it } from "vitest";
import { scoreCategoryDynamic } from "./dynamic-scorer";
import type { RiskLookups } from "./engine";
import type { ResolvedCategory, ResolvedFactor } from "../methodology/types";

const lookups: RiskLookups = {
	geo: {
		getByStateCode: (code: string) =>
			code === "CMX" ? { riskScore: 4 } : { riskScore: 2 },
	},
	jurisdiction: {
		getByCountryCode: (code: string) =>
			code === "US" ? { riskScore: 5 } : { riskScore: 1 },
	},
	activity: {
		getByKey: (key: string) =>
			key === "VEH" ? { riskScore: 8 } : { riskScore: 3 },
	},
};

const scoreToLevel = (score: number) => (score >= 5 ? "HIGH" : "LOW");

describe("scoreCategoryDynamic", () => {
	it("scores BOOLEAN factor from data bag", () => {
		const category: ResolvedCategory = {
			name: "TEST",
			displayName: "Test",
			weight: 1,
			factors: [
				{
					name: "flag",
					displayName: "Flag",
					weight: 1,
					factorType: "BOOLEAN",
					dataSource: "x.enabled",
					scoreMaps: [
						{ conditionType: "BOOLEAN", conditionValue: "true", score: 9 },
						{ conditionType: "BOOLEAN", conditionValue: "false", score: 1 },
					],
				},
			],
		};
		const out = scoreCategoryDynamic(
			category,
			{ "x.enabled": true },
			lookups,
			scoreToLevel,
		);
		expect(out.factors[0]?.score).toBe(9);
	});

	it("scores ENUM factor with string match", () => {
		const category: ResolvedCategory = {
			name: "ENUM",
			displayName: "Enum",
			weight: 1,
			factors: [
				{
					name: "t",
					displayName: "T",
					weight: 1,
					factorType: "ENUM",
					dataSource: "client.personType",
					scoreMaps: [
						{ conditionType: "EQUALS", conditionValue: "TRUST", score: 7 },
						{ conditionType: "EQUALS", conditionValue: "MORAL", score: 3 },
					],
				},
			],
		};
		const out = scoreCategoryDynamic(
			category,
			{ "client.personType": "MORAL" },
			lookups,
			scoreToLevel,
		);
		expect(out.factors[0]?.score).toBe(3);
	});

	it("scores screening via sat69b, adverse media, and flagged branches", () => {
		const screeningCategory: ResolvedCategory = {
			name: "SCR",
			displayName: "Scr",
			weight: 1,
			factors: [
				{
					name: "s",
					displayName: "S",
					weight: 1,
					factorType: "ENUM",
					dataSource: "client.screeningResult",
					scoreMaps: [
						{
							conditionType: "EQUALS",
							conditionValue: "ofac_sanctioned",
							score: 9,
						},
						{
							conditionType: "EQUALS",
							conditionValue: "sat69b_listed",
							score: 8,
						},
						{
							conditionType: "EQUALS",
							conditionValue: "adverse_media",
							score: 6,
						},
						{ conditionType: "EQUALS", conditionValue: "flagged", score: 5 },
						{ conditionType: "EQUALS", conditionValue: "clear", score: 0 },
					],
				},
			],
		};

		expect(
			scoreCategoryDynamic(
				screeningCategory,
				{
					"client.screeningResult": "clear",
					"client.sat69bListed": true,
				},
				lookups,
				scoreToLevel,
			).factors[0]?.score,
		).toBe(8);

		expect(
			scoreCategoryDynamic(
				screeningCategory,
				{
					"client.screeningResult": "clear",
					"client.adverseMediaFlagged": true,
				},
				lookups,
				scoreToLevel,
			).factors[0]?.score,
		).toBe(6);

		expect(
			scoreCategoryDynamic(
				screeningCategory,
				{
					"client.screeningResult": "flagged",
					"client.ofacSanctioned": false,
					"client.unscSanctioned": false,
					"client.sat69bListed": false,
					"client.adverseMediaFlagged": false,
				},
				lookups,
				scoreToLevel,
			).factors[0]?.score,
		).toBe(5);
	});

	it("scores client.screeningResult from OFAC flags", () => {
		const category: ResolvedCategory = {
			name: "SCR",
			displayName: "Scr",
			weight: 1,
			factors: [
				{
					name: "s",
					displayName: "S",
					weight: 1,
					factorType: "ENUM",
					dataSource: "client.screeningResult",
					scoreMaps: [
						{
							conditionType: "EQUALS",
							conditionValue: "ofac_sanctioned",
							score: 9,
						},
						{ conditionType: "EQUALS", conditionValue: "clear", score: 0 },
					],
				},
			],
		};
		const out = scoreCategoryDynamic(
			category,
			{
				"client.screeningResult": "clear",
				"client.ofacSanctioned": true,
			},
			lookups,
			scoreToLevel,
		);
		expect(out.factors[0]?.score).toBe(9);
	});

	it("scores NUMERIC_RANGE and uses last map when out of range", () => {
		const category: ResolvedCategory = {
			name: "NUM",
			displayName: "Num",
			weight: 1,
			factors: [
				{
					name: "n",
					displayName: "N",
					weight: 1,
					factorType: "NUMERIC_RANGE",
					dataSource: "v",
					scoreMaps: [
						{ conditionType: "RANGE", conditionValue: "0-1", score: 1 },
						{ conditionType: "RANGE", conditionValue: "2-3", score: 3 },
					],
				},
			],
		};
		const low = scoreCategoryDynamic(category, { v: 1 }, lookups, scoreToLevel);
		expect(low.factors[0]?.score).toBe(1);
		const high = scoreCategoryDynamic(
			category,
			{ v: 99 },
			lookups,
			scoreToLevel,
		);
		expect(high.factors[0]?.score).toBe(3);
	});

	it("LOOKUP single state uses geo lookup", () => {
		const category: ResolvedCategory = {
			name: "GEO",
			displayName: "Geo",
			weight: 1,
			factors: [
				{
					name: "st",
					displayName: "St",
					weight: 1,
					factorType: "LOOKUP",
					dataSource: "geographic.clientStateCode",
					scoreMaps: [
						{
							conditionType: "FORMULA",
							conditionValue: "lookup:geo",
							score: 9,
						},
					],
				},
			],
		};
		const out = scoreCategoryDynamic(
			category,
			{ "geographic.clientStateCode": "CMX" },
			lookups,
			scoreToLevel,
		);
		expect(out.factors[0]?.score).toBe(4);
	});

	it("LOOKUP operationStateCodes averages scores", () => {
		const category: ResolvedCategory = {
			name: "G2",
			displayName: "G2",
			weight: 1,
			factors: [
				{
					name: "ops",
					displayName: "Ops",
					weight: 1,
					factorType: "LOOKUP",
					dataSource: "geographic.operationStateCodes",
					scoreMaps: [
						{ conditionType: "FORMULA", conditionValue: "x", score: 9 },
					],
				},
			],
		};
		const out = scoreCategoryDynamic(
			category,
			{ "geographic.operationStateCodes": ["CMX", "AGU"] },
			lookups,
			scoreToLevel,
		);
		expect(out.factors[0]?.score).toBe(3);
	});

	it("LOOKUP countryCode uses jurisdiction", () => {
		const category: ResolvedCategory = {
			name: "J",
			displayName: "J",
			weight: 1,
			factors: [
				{
					name: "c",
					displayName: "C",
					weight: 1,
					factorType: "LOOKUP",
					dataSource: "client.countryCode",
					scoreMaps: [
						{ conditionType: "FORMULA", conditionValue: "x", score: 9 },
					],
				},
			],
		};
		const out = scoreCategoryDynamic(
			category,
			{ "client.countryCode": "US" },
			lookups,
			scoreToLevel,
		);
		expect(out.factors[0]?.score).toBe(5);
	});

	it("LOOKUP activityCodes averages activity scores", () => {
		const category: ResolvedCategory = {
			name: "A",
			displayName: "A",
			weight: 1,
			factors: [
				{
					name: "ac",
					displayName: "Ac",
					weight: 1,
					factorType: "LOOKUP",
					dataSource: "activity.activityCodes",
					scoreMaps: [
						{ conditionType: "FORMULA", conditionValue: "x", score: 9 },
					],
				},
			],
		};
		const out = scoreCategoryDynamic(
			category,
			{ "activity.activityCodes": ["VEH", "INM"] },
			lookups,
			scoreToLevel,
		);
		expect(out.factors[0]?.score).toBe(5.5);
	});

	it("ENUM with no score map match returns 0", () => {
		const category: ResolvedCategory = {
			name: "E2",
			displayName: "E2",
			weight: 1,
			factors: [
				{
					name: "e",
					displayName: "E",
					weight: 1,
					factorType: "ENUM",
					dataSource: "client.personType",
					scoreMaps: [
						{ conditionType: "EQUALS", conditionValue: "OTHER", score: 1 },
					],
				},
			],
		};
		const out = scoreCategoryDynamic(
			category,
			{ "client.personType": "UNKNOWN" },
			lookups,
			scoreToLevel,
		);
		expect(out.factors[0]?.score).toBe(0);
	});

	it("BOOLEAN with no score map match returns 0", () => {
		const category: ResolvedCategory = {
			name: "B2",
			displayName: "B2",
			weight: 1,
			factors: [
				{
					name: "b",
					displayName: "B",
					weight: 1,
					factorType: "BOOLEAN",
					dataSource: "flag",
					scoreMaps: [],
				},
			],
		};
		const out = scoreCategoryDynamic(
			category,
			{ flag: true },
			lookups,
			scoreToLevel,
		);
		expect(out.factors[0]?.score).toBe(0);
	});

	it("NUMERIC_RANGE with empty scoreMaps returns 0", () => {
		const category: ResolvedCategory = {
			name: "N0",
			displayName: "N0",
			weight: 1,
			factors: [
				{
					name: "n",
					displayName: "N",
					weight: 1,
					factorType: "NUMERIC_RANGE",
					dataSource: "v",
					scoreMaps: [],
				},
			],
		};
		expect(
			scoreCategoryDynamic(category, { v: 5 }, lookups, scoreToLevel).factors[0]
				?.score,
		).toBe(0);
	});

	it("LOOKUP returns defaultScore for unmatched dataSource", () => {
		const category: ResolvedCategory = {
			name: "L",
			displayName: "L",
			weight: 1,
			factors: [
				{
					name: "x",
					displayName: "X",
					weight: 1,
					factorType: "LOOKUP",
					dataSource: "custom.unknownField",
					scoreMaps: [
						{ conditionType: "FORMULA", conditionValue: "x", score: 2.5 },
					],
				},
			],
		};
		const out = scoreCategoryDynamic(
			category,
			{ "custom.unknownField": "anything" },
			lookups,
			scoreToLevel,
		);
		expect(out.factors[0]?.score).toBe(2.5);
	});

	it("LOOKUP StateCodes with empty array returns default", () => {
		const category: ResolvedCategory = {
			name: "L2",
			displayName: "L2",
			weight: 1,
			factors: [
				{
					name: "g",
					displayName: "G",
					weight: 1,
					factorType: "LOOKUP",
					dataSource: "geographic.operationStateCodes",
					scoreMaps: [
						{ conditionType: "FORMULA", conditionValue: "x", score: 9 },
					],
				},
			],
		};
		const out = scoreCategoryDynamic(
			category,
			{ "geographic.operationStateCodes": [] },
			lookups,
			scoreToLevel,
		);
		expect(out.factors[0]?.score).toBe(9);
	});

	it("LOOKUP activityCodes with empty array returns default", () => {
		const category: ResolvedCategory = {
			name: "L3",
			displayName: "L3",
			weight: 1,
			factors: [
				{
					name: "a",
					displayName: "A",
					weight: 1,
					factorType: "LOOKUP",
					dataSource: "activity.activityCodes",
					scoreMaps: [
						{ conditionType: "FORMULA", conditionValue: "x", score: 7 },
					],
				},
			],
		};
		const out = scoreCategoryDynamic(
			category,
			{ "activity.activityCodes": [] },
			lookups,
			scoreToLevel,
		);
		expect(out.factors[0]?.score).toBe(7);
	});

	it("unknown factor type scores 0", () => {
		const badFactor = {
			name: "bad",
			displayName: "Bad",
			weight: 1,
			factorType: "BOOLEAN",
			dataSource: "x",
			scoreMaps: [
				{ conditionType: "BOOLEAN", conditionValue: "true", score: 5 },
			],
		} as ResolvedFactor;
		(badFactor as { factorType: string }).factorType = "WEIRD";

		const category: ResolvedCategory = {
			name: "W",
			displayName: "W",
			weight: 1,
			factors: [badFactor],
		};
		const out = scoreCategoryDynamic(
			category,
			{ x: true },
			lookups,
			scoreToLevel,
		);
		expect(out.factors[0]?.score).toBe(0);
	});

	it("returns zero element score when all factor weights are zero", () => {
		const category: ResolvedCategory = {
			name: "Z",
			displayName: "Z",
			weight: 1,
			factors: [
				{
					name: "b",
					displayName: "B",
					weight: 0,
					factorType: "BOOLEAN",
					dataSource: "x",
					scoreMaps: [
						{ conditionType: "BOOLEAN", conditionValue: "true", score: 9 },
					],
				},
			],
		};
		const out = scoreCategoryDynamic(
			category,
			{ x: true },
			lookups,
			scoreToLevel,
		);
		expect(out.score).toBe(0);
	});
});
