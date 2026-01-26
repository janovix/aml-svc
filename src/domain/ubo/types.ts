/**
 * Ultimate Beneficial Owner (UBO) Domain Types
 */

export type UBORelationshipType =
	| "SHAREHOLDER"
	| "DIRECTOR"
	| "LEGAL_REP"
	| "TRUSTEE"
	| "SETTLOR"
	| "BENEFICIARY"
	| "CONTROLLER";

export type PEPStatus = "PENDING" | "CONFIRMED" | "NOT_PEP" | "ERROR";

export interface UBOEntity {
	id: string;
	clientId: string;
	// Personal information
	firstName: string;
	lastName: string;
	secondLastName?: string | null;
	birthDate?: string | null;
	nationality?: string | null;
	curp?: string | null;
	rfc?: string | null;
	// Ownership/relationship details
	ownershipPercentage?: number | null;
	relationshipType: UBORelationshipType;
	position?: string | null;
	// Contact information
	email?: string | null;
	phone?: string | null;
	// Address
	country?: string | null;
	stateCode?: string | null;
	city?: string | null;
	street?: string | null;
	postalCode?: string | null;
	// Document references
	idDocumentId?: string | null;
	addressProofId?: string | null;
	// PEP status
	isPEP: boolean;
	pepStatus: PEPStatus;
	pepDetails?: string | null;
	pepMatchConfidence?: string | null;
	pepCheckedAt?: string | null;
	// Verification
	verifiedAt?: string | null;
	verifiedBy?: string | null;
	notes?: string | null;
	// Timestamps
	createdAt: string;
	updatedAt: string;
}

export interface UBOFilters {
	clientId: string;
	relationshipType?: UBORelationshipType;
}

export interface UBOListResult {
	data: UBOEntity[];
	total: number;
}
