/**
 * Beneficial Controller Domain Types
 * Represents Beneficiarios Controladores per LFPIORPI/CFF requirements
 * BCs are always natural persons
 */

export type BCType =
	| "SHAREHOLDER"
	| "LEGAL_REP"
	| "TRUSTEE"
	| "SETTLOR"
	| "TRUST_BENEFICIARY"
	| "DIRECTOR";

export type IdentificationCriteria = "BENEFIT" | "CONTROL" | "FALLBACK";

export type IdDocumentType = "INE" | "PASSPORT" | "OTHER";

export interface BeneficialControllerEntity {
	id: string;
	clientId: string;
	shareholderId?: string | null;
	// BC classification
	bcType: BCType;
	identificationCriteria: IdentificationCriteria;
	controlMechanism?: string | null;
	isLegalRepresentative: boolean;
	// Anexo 3: personal data (all BCs are natural persons)
	firstName: string;
	lastName: string;
	secondLastName?: string | null;
	birthDate?: string | null;
	birthCountry?: string | null;
	nationality?: string | null;
	occupation?: string | null;
	curp?: string | null;
	rfc?: string | null;
	// Anexo 3: identification document
	idDocumentType?: string | null;
	idDocumentNumber?: string | null;
	idDocumentAuthority?: string | null;
	// Anexo 3: document copy references
	idCopyDocId?: string | null;
	curpCopyDocId?: string | null;
	cedulaFiscalDocId?: string | null;
	addressProofDocId?: string | null;
	constanciaBcDocId?: string | null;
	powerOfAttorneyDocId?: string | null;
	// Contact
	email?: string | null;
	phone?: string | null;
	// Address (Anexo 3 requires full address)
	country?: string | null;
	stateCode?: string | null;
	city?: string | null;
	street?: string | null;
	postalCode?: string | null;
	// Watchlist screening
	isPEP?: boolean;
	watchlistQueryId?: string | null;
	ofacSanctioned?: boolean;
	unscSanctioned?: boolean;
	sat69bListed?: boolean;
	adverseMediaFlagged?: boolean;
	screeningResult?: string;
	screenedAt?: string | null;
	// Verification
	verifiedAt?: string | null;
	verifiedBy?: string | null;
	notes?: string | null;
	// Timestamps
	createdAt: string;
	updatedAt: string;
}

export interface BeneficialControllerFilters {
	clientId: string;
	bcType?: BCType;
	identificationCriteria?: IdentificationCriteria;
	shareholderId?: string;
}

export interface BeneficialControllerListResult {
	data: BeneficialControllerEntity[];
	total: number;
}
