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
	economicActivityCode?: string | null; // Reference to economic activity catalog (7-digit code)
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
export interface Pagination {
	page: number;
	limit: number;
	total: number;
	totalPages: number;
}

export interface ListResult<T> {
	data: T[];
	pagination: Pagination;
}
