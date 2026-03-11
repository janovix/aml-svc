/**
 * KYC Self-Service Schemas
 *
 * These schemas are derived from existing client/shareholder/BC schemas via .omit()
 * to enforce homologation across all 3 channels (Admin UI, API, Self-Service).
 *
 * Admin-only fields are stripped to prevent clients from setting privileged data.
 */
import { z } from "zod";

// Reuse base schemas from client domain - mirrors the existing validation
const PHONE_REGEX = /^[+\d][\d\s\-()]{5,}$/;
const POSTAL_CODE_REGEX = /^\d{4,10}$/;
const CURP_REGEX = /^[A-Z][AEIOUX][A-Z]{2}\d{6}[HM][A-Z]{5}[A-Z0-9]{2}$/i;

const COUNTRY_NAME_TO_CODE: Record<string, string> = {
	méxico: "MX",
	mexico: "MX",
	mex: "MX",
	"estados unidos": "US",
	"united states": "US",
	usa: "US",
	canadá: "CA",
	canada: "CA",
};

const countryCodeSchema = z
	.string()
	.min(2)
	.transform((value) => {
		const trimmed = value.trim();
		if (trimmed.length === 2) return trimmed.toUpperCase();
		const normalized = trimmed.toLowerCase();
		return COUNTRY_NAME_TO_CODE[normalized] || trimmed.toUpperCase();
	})
	.refine(
		(value) => value.length === 2,
		"Country must be a 2-character ISO code (e.g., MX, US)",
	);

const dateOnlyString = z
	.string()
	.refine((value) => !Number.isNaN(Date.parse(value)), "Invalid date value")
	.transform((value) => new Date(value).toISOString().split("T")[0]);

// ============================================================================
// Personal Info (physical) - self-service editable fields
// Admin-only fields removed: kycStatus, kycCompletedAt, completenessStatus,
//   missingFields, isPEP, ofacSanctioned, unscSanctioned, sat69bListed,
//   adverseMediaFlagged, screeningResult, screenedAt, watchlistQueryId, notes
// ============================================================================
export const selfServicePersonalInfoPhysicalSchema = z.object({
	firstName: z.string().min(1).max(100),
	lastName: z.string().min(1).max(100),
	secondLastName: z.string().max(100).optional().nullable(),
	birthDate: dateOnlyString.optional().nullable(),
	curp: z
		.string()
		.regex(CURP_REGEX, "Invalid CURP")
		.transform((v) => v.toUpperCase())
		.optional()
		.nullable(),
	// rfc is read-only (it's the client ID) - clients cannot change it
	nationality: z.string().min(2).optional().nullable(),
	email: z
		.string()
		.email()
		.transform((v) => v.toLowerCase())
		.optional(),
	phone: z.string().regex(PHONE_REGEX, "Invalid phone format").optional(),
	gender: z.enum(["M", "F", "OTHER"]).optional().nullable(),
	occupation: z.string().max(200).optional().nullable(),
	maritalStatus: z
		.enum(["SINGLE", "MARRIED", "DIVORCED", "WIDOWED", "OTHER"])
		.optional()
		.nullable(),
	sourceOfFunds: z.string().max(500).optional().nullable(),
	sourceOfWealth: z.string().max(500).optional().nullable(),
	economicActivityCode: z.string().optional().nullable(),
	// Address fields
	country: countryCodeSchema.optional(),
	stateCode: z
		.string()
		.min(2)
		.max(10)
		.transform((v) => v.toUpperCase())
		.optional(),
	city: z.string().min(2).optional(),
	municipality: z.string().min(2).optional(),
	neighborhood: z.string().min(2).optional(),
	street: z.string().min(2).optional(),
	externalNumber: z.string().min(1).optional(),
	internalNumber: z.string().max(20).optional().nullable(),
	postalCode: z
		.string()
		.regex(POSTAL_CODE_REGEX, "Invalid postal code")
		.optional(),
	reference: z.string().max(200).optional().nullable(),
});

// ============================================================================
// Personal Info (moral/trust)
// ============================================================================
export const selfServicePersonalInfoMoralSchema = z.object({
	businessName: z.string().min(3).max(300),
	incorporationDate: z
		.string()
		.transform((v) => new Date(v).toISOString())
		.optional()
		.nullable(),
	// rfc is read-only
	nationality: z.string().min(2).optional().nullable(),
	email: z
		.string()
		.email()
		.transform((v) => v.toLowerCase())
		.optional(),
	phone: z.string().regex(PHONE_REGEX, "Invalid phone format").optional(),
	economicActivityCode: z.string().optional().nullable(),
	// Address fields
	country: countryCodeSchema.optional(),
	stateCode: z
		.string()
		.min(2)
		.max(10)
		.transform((v) => v.toUpperCase())
		.optional(),
	city: z.string().min(2).optional(),
	municipality: z.string().min(2).optional(),
	neighborhood: z.string().min(2).optional(),
	street: z.string().min(2).optional(),
	externalNumber: z.string().min(1).optional(),
	internalNumber: z.string().max(20).optional().nullable(),
	postalCode: z
		.string()
		.regex(POSTAL_CODE_REGEX, "Invalid postal code")
		.optional(),
	reference: z.string().max(200).optional().nullable(),
});

// ============================================================================
// Document upload (self-service)
// Admin-only fields removed: status, verifiedAt, verifiedBy
// ============================================================================
export const selfServiceDocumentSchema = z.object({
	documentType: z.enum([
		"PASSPORT",
		"NATIONAL_ID",
		"DRIVERS_LICENSE",
		"CEDULA_PROFESIONAL",
		"CARTILLA_MILITAR",
		"TAX_ID",
		"PROOF_OF_ADDRESS",
		"UTILITY_BILL",
		"BANK_STATEMENT",
		"ACTA_CONSTITUTIVA",
		"PODER_NOTARIAL",
		"TRUST_AGREEMENT",
		"CORPORATE_BYLAWS",
		"OTHER",
	]),
	// Empty string allowed: document number is often filled later or N/A for some types (e.g. ACTA_CONSTITUTIVA)
	documentNumber: z.string().max(100),
	issuingCountry: z.string().max(10).optional().nullable(),
	issueDate: dateOnlyString.optional().nullable(),
	expiryDate: dateOnlyString.optional().nullable(),
	// docSvcDocumentId and fileUrl are set by the upload flow, not directly by client
	docSvcDocumentId: z.string().optional().nullable(),
	uploadLinkId: z.string().optional().nullable(),
});

// ============================================================================
// Shareholder (self-service) - mirrors ShareholderCreateSchema
// Admin-only fields removed: none (shareholders are fully client-editable)
// ============================================================================
export const selfServiceShareholderPersonSchema = z.object({
	shareholderType: z.literal("PERSON"),
	firstName: z.string().min(1).max(100),
	lastName: z.string().min(1).max(100),
	secondLastName: z.string().max(100).optional().nullable(),
	rfc: z.string().min(12).max(13).optional().nullable(),
	ownershipPercentage: z.number().min(0).max(100),
	email: z.string().email().optional().nullable(),
	phone: z.string().regex(PHONE_REGEX).optional().nullable(),
	parentShareholderId: z.string().optional().nullable(),
	isBeneficialOwner: z.boolean().optional().default(false),
});

export const selfServiceShareholderCompanySchema = z.object({
	shareholderType: z.literal("COMPANY"),
	businessName: z.string().min(3).max(300),
	taxId: z.string().min(1).max(50).optional().nullable(),
	nationality: z.string().min(2).optional().nullable(),
	incorporationDate: dateOnlyString.optional().nullable(),
	representativeName: z.string().min(1).optional().nullable(),
	representativeCurp: z.string().optional().nullable(),
	representativeRfc: z.string().optional().nullable(),
	ownershipPercentage: z.number().min(0).max(100),
	parentShareholderId: z.string().optional().nullable(),
	isBeneficialOwner: z.boolean().optional().default(false),
});

export const selfServiceShareholderSchema = z.discriminatedUnion(
	"shareholderType",
	[selfServiceShareholderPersonSchema, selfServiceShareholderCompanySchema],
);

// ============================================================================
// Beneficial Controller (self-service) - mirrors BC create schema
// Admin-only fields removed: verifiedAt, verifiedBy
// ============================================================================
export const selfServiceBeneficialControllerSchema = z.object({
	bcType: z.enum([
		"SHAREHOLDER",
		"LEGAL_REP",
		"TRUSTEE",
		"SETTLOR",
		"TRUST_BENEFICIARY",
		"DIRECTOR",
	]),
	identificationCriteria: z.enum(["BENEFIT", "CONTROL", "FALLBACK"]),
	controlMechanism: z.string().max(500).optional().nullable(),
	isLegalRepresentative: z.boolean().optional().default(false),
	firstName: z.string().min(1).max(100),
	lastName: z.string().min(1).max(100),
	secondLastName: z.string().max(100).optional().nullable(),
	birthDate: dateOnlyString.optional().nullable(),
	birthCountry: z.string().max(10).optional().nullable(),
	nationality: z.string().min(2).optional().nullable(),
	occupation: z.string().max(200).optional().nullable(),
	curp: z.string().optional().nullable(),
	rfc: z.string().optional().nullable(),
	idDocumentType: z.string().max(50).optional().nullable(),
	idDocumentNumber: z.string().max(100).optional().nullable(),
	idDocumentAuthority: z.string().max(200).optional().nullable(),
	email: z.string().email().optional().nullable(),
	phone: z.string().regex(PHONE_REGEX).optional().nullable(),
	// Address (optional for BC)
	country: z.string().max(10).optional().nullable(),
	stateCode: z.string().max(10).optional().nullable(),
	city: z.string().max(200).optional().nullable(),
	street: z.string().max(500).optional().nullable(),
	postalCode: z.string().max(20).optional().nullable(),
});

// ============================================================================
// Additional Address (self-service)
// ============================================================================
export const selfServiceAddressSchema = z.object({
	addressType: z
		.enum(["RESIDENTIAL", "BUSINESS", "MAILING", "OTHER"])
		.default("RESIDENTIAL"),
	country: countryCodeSchema,
	stateCode: z
		.string()
		.min(2)
		.max(10)
		.transform((v) => v.toUpperCase()),
	city: z.string().min(2),
	municipality: z.string().min(2),
	neighborhood: z.string().min(2),
	street: z.string().min(2),
	externalNumber: z.string().min(1),
	internalNumber: z.string().max(20).optional().nullable(),
	postalCode: z.string().regex(POSTAL_CODE_REGEX, "Invalid postal code"),
	reference: z.string().max(200).optional().nullable(),
	isPrimary: z.boolean().optional().default(false),
});

// Export inferred types
export type SelfServicePersonalInfoPhysical = z.infer<
	typeof selfServicePersonalInfoPhysicalSchema
>;
export type SelfServicePersonalInfoMoral = z.infer<
	typeof selfServicePersonalInfoMoralSchema
>;
export type SelfServiceDocument = z.infer<typeof selfServiceDocumentSchema>;
export type SelfServiceShareholder = z.infer<
	typeof selfServiceShareholderSchema
>;
export type SelfServiceBeneficialController = z.infer<
	typeof selfServiceBeneficialControllerSchema
>;
export type SelfServiceAddress = z.infer<typeof selfServiceAddressSchema>;
