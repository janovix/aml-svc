export const EXCEPTION_TYPES = ["FIRST_SALE_REAL_ESTATE"] as const;
export type ExceptionType = (typeof EXCEPTION_TYPES)[number];

export const EXCEPTION_STATUSES = [
	"INCOMPLETE",
	"VALIDATED",
	"INVALIDATED",
] as const;
export type ExceptionStatus = (typeof EXCEPTION_STATUSES)[number];

export const DEVELOPMENT_BANK_CODES = [
	"INFONAVIT",
	"FOVISSSTE",
	"SHF",
	"BANCA_DESARROLLO",
	"OTHER",
] as const;
export type DevelopmentBankCode = (typeof DEVELOPMENT_BANK_CODES)[number];

export const EVIDENCE_TYPES = [
	"DEED",
	"CONTRACT",
	"FIRST_SALE_CERTIFICATE",
	"BANK_INSTRUCTION_LETTER",
	"PAYMENT_RECEIPT",
	"DEVELOPER_STATEMENT",
	"BENEFICIAL_CONTROLLER_FILE",
	"OTHER",
] as const;
export type EvidenceType = (typeof EVIDENCE_TYPES)[number];

export const EXCEPTION_ELIGIBLE_ACTIVITIES = ["INM", "DIN"] as const;

export const PRIMERA_VENTA_OPERATION_TYPE_CODES = ["503", "1603"] as const;

export interface OperationExceptionEntity {
	id: string;
	operationId: string;
	organizationId: string;
	environment: string;
	exceptionType: ExceptionType;
	status: ExceptionStatus;
	legalReference: string | null;
	isFirstSale: boolean | null;
	hasDevelopmentBankFunding: boolean | null;
	developmentBankCode: string | null;
	developmentBankName: string | null;
	paidThroughFinancialSystem: boolean | null;
	hasDocumentaryEvidence: boolean | null;
	notes: string | null;
	validatedAt: string | null;
	validatedBy: string | null;
	createdAt: string;
	updatedAt: string;
	evidence: OperationExceptionEvidenceEntity[];
}

export interface OperationExceptionEvidenceEntity {
	id: string;
	exceptionId: string;
	evidenceType: EvidenceType;
	description: string | null;
	docSvcDocumentId: string | null;
	uploadedBy: string | null;
	createdAt: string;
}
