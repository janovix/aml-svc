import type { AuditType, ElementWeights, RiskLevel } from "../types";

export interface OrgElementEvaluation {
	elementType: string;
	weight: number;
	riskScore: number;
	riskLevel: RiskLevel;
	factorBreakdown: Record<string, unknown>;
	justification?: string;
}

export interface OrgMitigantEvaluation {
	mitigantKey: string;
	mitigantName: string;
	exists: boolean;
	effectivenessScore: number;
	riskEffect: number;
	justification?: string;
}

export interface OrgAssessmentResult {
	organizationId: string;
	inherentRiskScore: number;
	residualRiskScore: number;
	riskLevel: RiskLevel;
	requiredAuditType: AuditType;
	fpRiskLevel: RiskLevel;
	fpRiskJustification: string;
	elements: OrgElementEvaluation[];
	mitigants: OrgMitigantEvaluation[];
}

export interface OrgRiskInput {
	organizationId: string;
	weights?: ElementWeights;
	clientStats: {
		totalClients: number;
		pepCount: number;
		highRiskNationalityCount: number;
		moralEntityCount: number;
		trustCount: number;
		newClientCount: number;
		avgBcLayers: number;
	};
	geoStats: {
		highRiskStateOperationPct: number;
		borderAreaExposure: boolean;
		crossBorderPct: number;
		locationMismatchPct: number;
	};
	productStats: {
		primaryActivityCode: string;
		primaryActivityRiskScore: number;
		cashIntensity: number;
		anonymityEnabling: boolean;
		nonPresentialChannelUsage: number;
	};
	transactionStats: {
		cashOperationPct: number;
		nearThresholdPct: number;
		highFrequencyPct: number;
		thirdPartyPct: number;
	};
	fpStats: {
		sanctionsScreeningCoverage: number;
		crossBorderExposure: number;
		sanctionsListRecency: number;
	};
	mitigantInputs: {
		kycCompletenessRate: number;
		screeningCoverage: number;
		monitoringQuality: number;
		complianceStructure: number;
		trainingProgram: number;
		auditFindings: number;
	};
}
