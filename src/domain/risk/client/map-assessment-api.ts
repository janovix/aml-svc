/**
 * Maps stored ClientRiskAssessment rows to the wire shape expected by aml (ClientRiskAssessment).
 */

/** Row shape from `client_risk_assessments` (matches Prisma model). */
export interface ClientRiskAssessmentRow {
	id: string;
	clientId: string;
	organizationId: string;
	methodologyId: string | null;
	inherentRiskScore: number;
	residualRiskScore: number;
	riskLevel: string;
	dueDiligenceLevel: string;
	clientFactors: string;
	geographicFactors: string;
	activityFactors: string;
	transactionFactors: string;
	mitigantFactors: string;
	assessedAt: Date;
	nextReviewAt: Date;
	assessedBy: string;
	triggerReason: string | null;
	version: number;
	createdAt: Date;
	updatedAt: Date;
}

type StoredFactor = {
	name: string;
	score: number;
	weight: number;
	detail?: string;
};

type StoredElement = {
	elementType: string;
	score: number;
	level: string;
	factors: StoredFactor[];
};

/** Stored shape from engine (ClientDDProfile) */
type StoredDDProfile = {
	overall?: string;
	acceptance?: string;
	ongoingMonitoring?: string;
	reviewFrequency?: string;
	reporting?: string;
};

const ELEMENT_TYPE_TO_API: Record<string, string> = {
	CLIENTS: "CLIENT",
	GEOGRAPHY: "GEOGRAPHIC",
	PRODUCTS: "PRODUCT_SERVICE",
	TRANSACTIONS: "TRANSACTION_CHANNEL",
};

function mapFactors(factors: StoredFactor[]) {
	return factors.map((f) => ({
		name: f.name,
		score: f.score,
		weight: f.weight,
		weightedScore: f.score * f.weight,
	}));
}

function mapStoredElement(el: StoredElement) {
	const apiType = ELEMENT_TYPE_TO_API[el.elementType] ?? el.elementType;
	return {
		elementType: apiType,
		factors: mapFactors(el.factors ?? []),
		rawScore: el.score,
		riskLevel: el.level,
	};
}

function parseJson<T>(raw: string, fallback: T): T {
	try {
		return JSON.parse(raw) as T;
	} catch {
		return fallback;
	}
}

function normalizeStoredElement(
	el: Partial<StoredElement>,
	defaultType: string,
): StoredElement {
	return {
		elementType: el.elementType ?? defaultType,
		score: typeof el.score === "number" ? el.score : 0,
		level: el.level ?? "LOW",
		factors: Array.isArray(el.factors) ? el.factors : [],
	};
}

function splitClientFactors(raw: string): {
	element: StoredElement;
	ddProfile: StoredDDProfile | null;
} {
	const parsed = parseJson<Record<string, unknown>>(raw, {});
	const { ddProfile, ...rest } = parsed;
	const element = normalizeStoredElement(
		rest as Partial<StoredElement>,
		"CLIENTS",
	);
	return {
		element,
		ddProfile: (ddProfile as StoredDDProfile | null) ?? null,
	};
}

function normalizeDdProfile(
	stored: StoredDDProfile | null,
	fallbackDdLevel: string,
): Record<string, string> {
	const fb = fallbackDdLevel;
	if (!stored) {
		return {
			clientAcceptance: fb,
			identificationVerification: fb,
			ongoingMonitoring: fb,
			transactionScrutiny: fb,
			reportingObligations: fb,
		};
	}
	const pick = (v: string | undefined) => v ?? fb;
	return {
		clientAcceptance: pick(stored.acceptance),
		identificationVerification: pick(stored.overall),
		ongoingMonitoring: pick(stored.ongoingMonitoring),
		transactionScrutiny: pick(stored.reviewFrequency),
		reportingObligations: pick(stored.reporting),
	};
}

export function mapPrismaAssessmentToApi(row: ClientRiskAssessmentRow) {
	const { element: clientEl, ddProfile } = splitClientFactors(
		row.clientFactors,
	);
	const geographic = normalizeStoredElement(
		parseJson<Partial<StoredElement>>(row.geographicFactors, {}),
		"GEOGRAPHY",
	);
	const activity = normalizeStoredElement(
		parseJson<Partial<StoredElement>>(row.activityFactors, {}),
		"PRODUCTS",
	);
	const transaction = normalizeStoredElement(
		parseJson<Partial<StoredElement>>(row.transactionFactors, {}),
		"TRANSACTIONS",
	);
	const mitigant = parseJson<{ effect: number; factors: StoredFactor[] }>(
		row.mitigantFactors,
		{ effect: 0, factors: [] },
	);

	const elements = [
		mapStoredElement(clientEl),
		mapStoredElement(geographic),
		mapStoredElement(activity),
		mapStoredElement(transaction),
	];

	return {
		id: row.id,
		clientId: row.clientId,
		organizationId: row.organizationId,
		version: row.version,
		riskLevel: row.riskLevel,
		riskScore: row.residualRiskScore,
		inherentRiskScore: row.inherentRiskScore,
		residualRiskScore: row.residualRiskScore,
		mitigantEffect: mitigant.effect,
		ddLevel: row.dueDiligenceLevel,
		ddProfile: normalizeDdProfile(ddProfile, row.dueDiligenceLevel),
		elements,
		triggerReason: row.triggerReason ?? "",
		createdAt: row.assessedAt.toISOString(),
	};
}
