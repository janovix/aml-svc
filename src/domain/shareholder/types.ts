/**
 * Shareholder Domain Types
 * Represents the cap table with 2-level depth support for company ownership chains
 */

export type ShareholderEntityType = "PERSON" | "COMPANY";

export interface ShareholderEntity {
	id: string;
	clientId: string;
	parentShareholderId?: string | null;
	entityType: ShareholderEntityType;
	// PERSON fields
	firstName?: string | null;
	lastName?: string | null;
	secondLastName?: string | null;
	rfc?: string | null;
	// COMPANY fields
	businessName?: string | null;
	taxId?: string | null;
	incorporationDate?: string | null;
	nationality?: string | null;
	// COMPANY Anexo 4: representative of the moral entity
	representativeName?: string | null;
	representativeCurp?: string | null;
	representativeRfc?: string | null;
	// COMPANY Anexo 4: document references
	actaConstitutivaDocId?: string | null;
	cedulaFiscalDocId?: string | null;
	addressProofDocId?: string | null;
	powerOfAttorneyDocId?: string | null;
	// Ownership (required)
	ownershipPercentage: number;
	// Contact
	email?: string | null;
	phone?: string | null;
	// Timestamps
	createdAt: string;
	updatedAt: string;
}

export interface ShareholderFilters {
	clientId: string;
	parentShareholderId?: string | null;
	entityType?: ShareholderEntityType;
}

export interface ShareholderListResult {
	data: ShareholderEntity[];
	total: number;
}
