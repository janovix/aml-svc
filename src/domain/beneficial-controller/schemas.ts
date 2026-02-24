/**
 * Beneficial Controller Domain Schemas
 * Zod schemas for validation with Anexo 3 compliance
 */

import { z } from "zod";

const dateOnlyString = z
	.string()
	.refine((value) => !Number.isNaN(Date.parse(value)), "Invalid date value")
	.transform((value) => new Date(value).toISOString().split("T")[0]);

export const BC_TYPE_VALUES = [
	"SHAREHOLDER",
	"LEGAL_REP",
	"TRUSTEE",
	"SETTLOR",
	"TRUST_BENEFICIARY",
	"DIRECTOR",
] as const;

export const IDENTIFICATION_CRITERIA_VALUES = [
	"BENEFIT",
	"CONTROL",
	"FALLBACK",
] as const;

export const ID_DOCUMENT_TYPE_VALUES = ["INE", "PASSPORT", "OTHER"] as const;

export const BCTypeSchema = z.enum(BC_TYPE_VALUES);
export const IdentificationCriteriaSchema = z.enum(
	IDENTIFICATION_CRITERIA_VALUES,
);
export const IdDocumentTypeSchema = z.enum(ID_DOCUMENT_TYPE_VALUES);

// Base validation patterns
const bcIdSchema = z
	.string()
	.regex(/^BC[A-Za-z0-9]{9}$/, "BC ID must match format BC<9 chars>");

const clientIdSchema = z
	.string()
	.regex(/^CLT[A-Za-z0-9]{9}$/, "Client ID must match format CLT<9 chars>");

const shareholderIdSchema = z
	.string()
	.regex(
		/^SHR[A-Za-z0-9]{9}$/,
		"Shareholder ID must match format SHR<9 chars>",
	);

const curpSchema = z
	.string()
	.regex(
		/^[A-Z][AEIOUX][A-Z]{2}\d{6}[HM][A-Z]{5}[A-Z0-9]{2}$/i,
		"Invalid CURP format",
	)
	.optional()
	.nullable();

const rfcSchema = z
	.string()
	.regex(/^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/i, "Invalid RFC format")
	.optional()
	.nullable();

const phoneSchema = z
	.string()
	.regex(/^[+\d][\d\s\-()]{5,}$/, "Invalid phone format")
	.optional()
	.nullable();

const postalCodeSchema = z
	.string()
	.regex(/^\d{4,10}$/, "Invalid postal code format")
	.optional()
	.nullable();

// Beneficial Controller Create Schema
export const BeneficialControllerCreateSchema = z.object({
	shareholderId: shareholderIdSchema.optional().nullable(),
	// BC classification
	bcType: BCTypeSchema,
	identificationCriteria: IdentificationCriteriaSchema,
	controlMechanism: z.string().optional().nullable(),
	isLegalRepresentative: z.boolean().optional(),
	// Anexo 3: personal data (required - all BCs are persons)
	firstName: z.string().min(1, "First name is required"),
	lastName: z.string().min(1, "Last name is required"),
	secondLastName: z.string().optional().nullable(),
	birthDate: dateOnlyString.optional().nullable(),
	birthCountry: z.string().optional().nullable(),
	nationality: z.string().optional().nullable(),
	occupation: z.string().optional().nullable(),
	curp: curpSchema,
	rfc: rfcSchema,
	// Anexo 3: identification document
	idDocumentType: z.string().optional().nullable(),
	idDocumentNumber: z.string().optional().nullable(),
	idDocumentAuthority: z.string().optional().nullable(),
	// Anexo 3: document copy references
	idCopyDocId: z.string().optional().nullable(),
	curpCopyDocId: z.string().optional().nullable(),
	cedulaFiscalDocId: z.string().optional().nullable(),
	addressProofDocId: z.string().optional().nullable(),
	constanciaBcDocId: z.string().optional().nullable(),
	powerOfAttorneyDocId: z.string().optional().nullable(),
	// Contact
	email: z.string().email().optional().nullable(),
	phone: phoneSchema,
	// Address (Anexo 3 requires full address)
	country: z.string().optional().nullable(),
	stateCode: z.string().optional().nullable(),
	city: z.string().optional().nullable(),
	street: z.string().optional().nullable(),
	postalCode: postalCodeSchema,
	// Verification
	verifiedAt: z.string().datetime().optional().nullable(),
	verifiedBy: z.string().optional().nullable(),
	notes: z.string().optional().nullable(),
});

export type BeneficialControllerCreateInput = z.infer<
	typeof BeneficialControllerCreateSchema
>;

// Beneficial Controller Update Schema (full update, omits clientId)
export const BeneficialControllerUpdateSchema =
	BeneficialControllerCreateSchema;

export type BeneficialControllerUpdateInput = z.infer<
	typeof BeneficialControllerUpdateSchema
>;

// Beneficial Controller Patch Schema (partial update - all fields optional)
export const BeneficialControllerPatchSchema = z.object({
	shareholderId: shareholderIdSchema.optional().nullable(),
	bcType: BCTypeSchema.optional(),
	identificationCriteria: IdentificationCriteriaSchema.optional(),
	controlMechanism: z.string().optional().nullable(),
	isLegalRepresentative: z.boolean().optional(),
	firstName: z.string().min(1).optional(),
	lastName: z.string().min(1).optional(),
	secondLastName: z.string().optional().nullable(),
	birthDate: dateOnlyString.optional().nullable(),
	birthCountry: z.string().optional().nullable(),
	nationality: z.string().optional().nullable(),
	occupation: z.string().optional().nullable(),
	curp: curpSchema,
	rfc: rfcSchema,
	idDocumentType: z.string().optional().nullable(),
	idDocumentNumber: z.string().optional().nullable(),
	idDocumentAuthority: z.string().optional().nullable(),
	idCopyDocId: z.string().optional().nullable(),
	curpCopyDocId: z.string().optional().nullable(),
	cedulaFiscalDocId: z.string().optional().nullable(),
	addressProofDocId: z.string().optional().nullable(),
	constanciaBcDocId: z.string().optional().nullable(),
	powerOfAttorneyDocId: z.string().optional().nullable(),
	email: z.string().email().optional().nullable(),
	phone: phoneSchema,
	country: z.string().optional().nullable(),
	stateCode: z.string().optional().nullable(),
	city: z.string().optional().nullable(),
	street: z.string().optional().nullable(),
	postalCode: postalCodeSchema,
	verifiedAt: z.string().datetime().optional().nullable(),
	verifiedBy: z.string().optional().nullable(),
	notes: z.string().optional().nullable(),
});

export type BeneficialControllerPatchInput = z.infer<
	typeof BeneficialControllerPatchSchema
>;

// Route parameter schemas
export const BeneficialControllerIdParamSchema = z.object({
	bcId: bcIdSchema,
});

export const ClientIdParamSchema = z.object({
	clientId: clientIdSchema,
});

// Internal screening update schema (used by watchlist-svc callbacks)
export const BeneficialControllerScreeningUpdateSchema = z.object({
	watchlistQueryId: z.string(),
	ofacSanctioned: z.boolean().optional(),
	unscSanctioned: z.boolean().optional(),
	sat69bListed: z.boolean().optional(),
	adverseMediaFlagged: z.boolean().optional(),
	isPEP: z.boolean().optional(),
	screeningResult: z.enum(["pending", "clear", "flagged"]).optional(),
	screenedAt: z.string().datetime().optional(),
});

export type BeneficialControllerScreeningUpdateInput = z.infer<
	typeof BeneficialControllerScreeningUpdateSchema
>;
