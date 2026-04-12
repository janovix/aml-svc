/**
 * Methodology Parser
 *
 * Transforms normalized Prisma relations into the ResolvedMethodology
 * shape consumed by the risk engines.
 */

import type {
	ConditionType,
	FactorType,
	MethodologyScope,
	ResolvedCategory,
	ResolvedFactor,
	ResolvedMethodology,
	ResolvedMitigant,
	ResolvedScoreMap,
	ResolvedThreshold,
} from "./types";

interface DbMethodologyWithRelations {
	id: string;
	scope: string;
	name: string;
	version: number;
	scaleMax: number;
	categories: Array<{
		name: string;
		displayName: string;
		weight: number;
		displayOrder: number;
		factors: Array<{
			name: string;
			displayName: string;
			weight: number;
			factorType: string;
			dataSource: string;
			displayOrder: number;
			scoreMaps: Array<{
				conditionType: string;
				conditionValue: string;
				score: number;
				label: string | null;
				displayOrder: number;
			}>;
		}>;
	}>;
	thresholds: Array<{
		riskLevel: string;
		minScore: number;
		maxScore: number;
		ddLevel: string;
		reviewMonths: number;
		displayOrder: number;
	}>;
	mitigants: Array<{
		mitigantKey: string;
		displayName: string;
		maxEffect: number;
		weight: number;
		dataSource: string;
		displayOrder: number;
	}>;
}

export function parseMethodology(
	db: DbMethodologyWithRelations,
): ResolvedMethodology {
	const categories: ResolvedCategory[] = db.categories
		.sort((a, b) => a.displayOrder - b.displayOrder)
		.map((cat) => ({
			name: cat.name,
			displayName: cat.displayName,
			weight: cat.weight,
			factors: cat.factors
				.sort((a, b) => a.displayOrder - b.displayOrder)
				.map(
					(f): ResolvedFactor => ({
						name: f.name,
						displayName: f.displayName,
						weight: f.weight,
						factorType: f.factorType as FactorType,
						dataSource: f.dataSource,
						scoreMaps: f.scoreMaps
							.sort((a, b) => a.displayOrder - b.displayOrder)
							.map(
								(sm): ResolvedScoreMap => ({
									conditionType: sm.conditionType as ConditionType,
									conditionValue: sm.conditionValue,
									score: sm.score,
									label: sm.label ?? undefined,
								}),
							),
					}),
				),
		}));

	const thresholds: ResolvedThreshold[] = db.thresholds
		.sort((a, b) => a.displayOrder - b.displayOrder)
		.map((t) => ({
			riskLevel: t.riskLevel,
			minScore: t.minScore,
			maxScore: t.maxScore,
			ddLevel: t.ddLevel,
			reviewMonths: t.reviewMonths,
		}));

	const mitigants: ResolvedMitigant[] = db.mitigants
		.sort((a, b) => a.displayOrder - b.displayOrder)
		.map((m) => ({
			mitigantKey: m.mitigantKey,
			displayName: m.displayName,
			maxEffect: m.maxEffect,
			weight: m.weight,
			dataSource: m.dataSource,
		}));

	return {
		id: db.id,
		scope: db.scope as MethodologyScope,
		name: db.name,
		version: db.version,
		scaleMax: db.scaleMax,
		categories,
		thresholds,
		mitigants,
	};
}
