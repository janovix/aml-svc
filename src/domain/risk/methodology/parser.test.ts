import { describe, expect, it } from "vitest";
import { parseMethodology } from "./parser";

describe("parseMethodology", () => {
	it("sorts categories, factors, and score maps by displayOrder", () => {
		const resolved = parseMethodology({
			id: "m1",
			scope: "SYSTEM",
			name: "Test",
			version: 1,
			scaleMax: 9,
			categories: [
				{
					name: "B",
					displayName: "Second",
					weight: 0.5,
					displayOrder: 2,
					factors: [
						{
							name: "f2",
							displayName: "F2",
							weight: 1,
							factorType: "BOOLEAN",
							dataSource: "a",
							displayOrder: 2,
							scoreMaps: [
								{
									conditionType: "BOOLEAN",
									conditionValue: "false",
									score: 0,
									label: null,
									displayOrder: 2,
								},
								{
									conditionType: "BOOLEAN",
									conditionValue: "true",
									score: 1,
									label: "T",
									displayOrder: 1,
								},
							],
						},
						{
							name: "f1",
							displayName: "F1",
							weight: 1,
							factorType: "BOOLEAN",
							dataSource: "b",
							displayOrder: 1,
							scoreMaps: [],
						},
					],
				},
				{
					name: "A",
					displayName: "First",
					weight: 0.5,
					displayOrder: 1,
					factors: [],
				},
			],
			thresholds: [
				{
					riskLevel: "HIGH",
					minScore: 7,
					maxScore: 9,
					ddLevel: "ENHANCED",
					reviewMonths: 1,
					displayOrder: 2,
				},
				{
					riskLevel: "LOW",
					minScore: 0,
					maxScore: 3,
					ddLevel: "SIMPLIFIED",
					reviewMonths: 12,
					displayOrder: 1,
				},
			],
			mitigants: [
				{
					mitigantKey: "m2",
					displayName: "M2",
					maxEffect: 1,
					weight: 1,
					dataSource: "x",
					displayOrder: 2,
				},
				{
					mitigantKey: "m1",
					displayName: "M1",
					maxEffect: 1,
					weight: 1,
					dataSource: "y",
					displayOrder: 1,
				},
			],
		});

		expect(resolved.categories.map((c) => c.name)).toEqual(["A", "B"]);
		expect(resolved.categories[1]?.factors.map((f) => f.name)).toEqual([
			"f1",
			"f2",
		]);
		expect(
			resolved.categories[1]?.factors[1]?.scoreMaps.map(
				(s) => s.conditionValue,
			),
		).toEqual(["true", "false"]);
		expect(resolved.thresholds.map((t) => t.riskLevel)).toEqual([
			"LOW",
			"HIGH",
		]);
		expect(resolved.mitigants.map((m) => m.mitigantKey)).toEqual(["m1", "m2"]);
		expect(resolved.scope).toBe("SYSTEM");
	});
});
