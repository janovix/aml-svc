/**
 * Risk Methodology Types
 *
 * Defines the resolved methodology shape consumed by the risk engines.
 * The raw DB models (Prisma) are parsed into these types by the parser module.
 */

export type MethodologyScope = "SYSTEM" | "ACTIVITY" | "ORGANIZATION";
export type MethodologyStatus = "ACTIVE" | "DRAFT" | "ARCHIVED";
export type FactorType = "BOOLEAN" | "ENUM" | "NUMERIC_RANGE" | "LOOKUP";
export type ConditionType = "EQUALS" | "RANGE" | "BOOLEAN" | "FORMULA";

export interface ResolvedThreshold {
	riskLevel: string;
	minScore: number;
	maxScore: number;
	ddLevel: string;
	reviewMonths: number;
}

export interface ResolvedScoreMap {
	conditionType: ConditionType;
	conditionValue: string;
	score: number;
	label?: string;
}

export interface ResolvedFactor {
	name: string;
	displayName: string;
	weight: number;
	factorType: FactorType;
	dataSource: string;
	scoreMaps: ResolvedScoreMap[];
}

export interface ResolvedCategory {
	name: string;
	displayName: string;
	weight: number;
	factors: ResolvedFactor[];
}

export interface ResolvedMitigant {
	mitigantKey: string;
	displayName: string;
	maxEffect: number;
	weight: number;
	dataSource: string;
}

export interface ResolvedMethodology {
	id: string;
	scope: MethodologyScope;
	name: string;
	version: number;
	scaleMax: number;
	categories: ResolvedCategory[];
	thresholds: ResolvedThreshold[];
	mitigants: ResolvedMitigant[];
}

export interface MethodologyWithSource extends ResolvedMethodology {
	sourceScope: MethodologyScope;
}

export interface MethodologyCreateInput {
	scope: MethodologyScope;
	activityKey?: string;
	organizationId?: string;
	name: string;
	description?: string;
	createdBy: string;
	categories: Array<{
		name: string;
		displayName: string;
		weight: number;
		factors: Array<{
			name: string;
			displayName: string;
			weight: number;
			factorType: FactorType;
			dataSource: string;
			description?: string;
			scoreMaps: Array<{
				conditionType: ConditionType;
				conditionValue: string;
				score: number;
				label?: string;
			}>;
		}>;
	}>;
	thresholds: Array<{
		riskLevel: string;
		minScore: number;
		maxScore: number;
		ddLevel: string;
		reviewMonths: number;
	}>;
	mitigants: Array<{
		mitigantKey: string;
		displayName: string;
		maxEffect: number;
		weight: number;
		dataSource: string;
	}>;
}
