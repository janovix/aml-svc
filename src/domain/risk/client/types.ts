import type {
	ClientDDProfile,
	DDLevel,
	ElementWeights,
	RiskLevel,
} from "../types";

export interface ClientFactorInput {
	personType: "PHYSICAL" | "MORAL" | "TRUST";
	nationality: string | null;
	countryCode: string | null;
	isPep: boolean;
	bcCount: number;
	screeningResult: string;
	ofacSanctioned: boolean;
	unscSanctioned: boolean;
	sat69bListed: boolean;
	adverseMediaFlagged: boolean;
	economicActivityCode: string | null;
	createdAt: string;
}

export interface GeographicFactorInput {
	clientStateCode: string | null;
	operationStateCodes: string[];
	clientCountryCode: string | null;
	hasCrossBorderOps: boolean;
}

export interface ActivityFactorInput {
	activityCodes: string[];
}

export interface TransactionFactorInput {
	totalOperations: number;
	cashOperations: number;
	totalAmountMxn: number;
	nearThresholdCount: number;
	thirdPartyCount: number;
	avgFrequencyPerMonth: number;
}

export interface ClientMitigantInput {
	kycComplete: boolean;
	documentsVerified: boolean;
	relationshipMonths: number;
	regulatedCounterparty: boolean;
}

export interface ClientRiskInput {
	clientId: string;
	organizationId: string;
	client: ClientFactorInput;
	geographic: GeographicFactorInput;
	activity: ActivityFactorInput;
	transaction: TransactionFactorInput;
	mitigants: ClientMitigantInput;
	weights?: ElementWeights;
}

export interface FactorScore {
	name: string;
	score: number;
	weight: number;
	detail?: string;
}

export interface ElementScore {
	elementType: string;
	score: number;
	level: RiskLevel;
	factors: FactorScore[];
}

export interface ClientRiskResult {
	clientId: string;
	organizationId: string;
	inherentRiskScore: number;
	residualRiskScore: number;
	riskLevel: RiskLevel;
	dueDiligenceLevel: DDLevel;
	ddProfile: ClientDDProfile;
	elements: {
		client: ElementScore;
		geographic: ElementScore;
		activity: ElementScore;
		transaction: ElementScore;
	};
	mitigantEffect: number;
	mitigantFactors: FactorScore[];
	nextReviewMonths: number;
}
