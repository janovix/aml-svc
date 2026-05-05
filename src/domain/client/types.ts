// Import types from schemas.ts (inferred from Zod schemas)
import type { KYCStatus, Gender, MaritalStatus } from "./schemas";

export interface ClientEntity {
	id: string; // RFC is now the ID
	rfc: string; // Keep RFC field for backward compatibility/API clarity
	organizationId: string; // Organization this client belongs to
	personType: "physical" | "moral" | "trust";
	firstName?: string;
	lastName?: string;
	secondLastName?: string | null;
	birthDate?: string | null;
	curp?: string | null;
	businessName?: string | null;
	incorporationDate?: string | null;
	nationality?: string | null;
	email: string;
	phone: string;
	country: string;
	stateCode: string;
	city: string;
	municipality: string;
	neighborhood: string;
	street: string;
	externalNumber: string;
	internalNumber?: string | null;
	postalCode: string;
	reference?: string | null;
	notes?: string | null;
	countryCode?: string | null; // Reference to countries catalog (metadata.code)
	economicActivityCode?: string | null; // Persona física: economic-activities catalog (7-digit)
	commercialActivityCode?: string | null; // Persona moral: business-activities / giro mercantil (7-digit)
	// Enhanced KYC fields
	gender?: Gender | null;
	occupation?: string | null;
	maritalStatus?: MaritalStatus | null;
	sourceOfFunds?: string | null;
	sourceOfWealth?: string | null;
	// KYC status tracking
	kycStatus: KYCStatus;
	kycCompletedAt?: string | null;
	// Completeness tracking
	completenessStatus: "COMPLETE" | "INCOMPLETE" | "MINIMUM";
	missingFields: string[] | null;
	// KYC progress (persisted fields)
	kycCompletionPct: number;
	documentsComplete: number; // 0 or 1
	documentsCount: number;
	documentsRequired: number;
	shareholdersCount: number;
	beneficialControllersCount: number;
	// Threshold-aware KYC (Art. 17 LFPIORPI)
	identificationRequired: boolean;
	identificationTier: "ALWAYS" | "ABOVE_THRESHOLD" | "BELOW_THRESHOLD";
	identificationThresholdMxn?: number | null;
	noticeThresholdMxn?: number | null;
	// Watchlist screening status
	isPEP?: boolean;
	watchlistQueryId?: string | null;
	ofacSanctioned?: boolean;
	unscSanctioned?: boolean;
	sat69bListed?: boolean;
	adverseMediaFlagged?: boolean;
	screeningResult?: "pending" | "clear" | "flagged";
	screenedAt?: string | null;
	// Risk classification (Art. 18-VII LFPIORPI) — mirrored from latest assessment
	riskLevel?: string | null;
	lastRiskAssessment?: string | null;
	// Resolved catalog names for *Code fields
	resolvedNames?: Record<string, string> | null;
	// Timestamps
	createdAt: string;
	updatedAt: string;
	deletedAt?: string | null;
	documents?: ClientDocumentEntity[];
	addresses?: ClientAddressEntity[];
}

export interface ClientDocumentEntity {
	id: string;
	clientId: string;
	documentType: string;
	documentNumber: string;
	issuingCountry?: string | null;
	issueDate?: string | null;
	expiryDate?: string | null;
	status: string;
	fileUrl?: string | null;
	metadata?: Record<string, unknown> | null;
	// doc-svc integration fields (simplified MVP)
	docSvcDocumentId?: string | null;
	uploadLinkId?: string | null;
	verifiedAt?: string | null;
	verifiedBy?: string | null;
	// Timestamps
	createdAt: string;
	updatedAt: string;
}

export interface ClientAddressEntity {
	id: string;
	clientId: string;
	addressType: string;
	street1: string;
	street2?: string | null;
	city: string;
	state?: string | null;
	postalCode?: string | null;
	country: string;
	isPrimary: boolean;
	verifiedAt?: string | null;
	reference?: string | null;
	createdAt: string;
	updatedAt: string;
}
export type {
	Pagination,
	ListResult,
	ListResultWithMeta,
	FilterMetaDef,
	FilterMetaOption,
	FilterType,
} from "../../lib/list-result";
