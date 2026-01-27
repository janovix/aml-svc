import { z } from "zod";

export const UBO_RELATIONSHIP_TYPE_VALUES = [
	"SHAREHOLDER",
	"DIRECTOR",
	"LEGAL_REP",
	"TRUSTEE",
	"SETTLOR",
	"BENEFICIARY",
	"CONTROLLER",
] as const;

export const UBORelationshipTypeSchema = z.enum(UBO_RELATIONSHIP_TYPE_VALUES);

export const PEP_STATUS_VALUES = [
	"PENDING",
	"CONFIRMED",
	"NOT_PEP",
	"ERROR",
] as const;

export const PEPStatusSchema = z.enum(PEP_STATUS_VALUES);

// Client ID format: CLT + 9 base62 characters (12 characters total)
const CLIENT_ID_REGEX = /^CLT[A-Za-z0-9]{9}$/;
const RESOURCE_ID_REGEX = /^[A-Za-z0-9-]+$/;

const ResourceIdSchema = z
	.string()
	.trim()
	.min(1, "Invalid ID format")
	.max(64, "Invalid ID format")
	.regex(RESOURCE_ID_REGEX, "Invalid ID format");

// CURP and RFC validation (same as client schemas)
const CURP_REGEX = /^[A-Z][AEIOUX][A-Z]{2}\d{6}[HM][A-Z]{5}[A-Z0-9]{2}$/i;
const RFC_REGEX = /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/i;
const PHONE_REGEX = /^[+\d][\d\s\-()]{5,}$/;
const POSTAL_CODE_REGEX = /^\d{4,10}$/;

const isoString = z
	.string()
	.transform((value) => {
		// Handle partial datetime formats
		if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) {
			return `${value}:00Z`;
		}
		if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
			return `${value}T00:00:00Z`;
		}
		if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(value)) {
			return `${value}Z`;
		}
		return value;
	})
	.refine(
		(value) => {
			try {
				const date = new Date(value);
				return !isNaN(date.getTime()) && value.includes("T");
			} catch {
				return false;
			}
		},
		{ message: "Invalid ISO datetime" },
	)
	.transform((value) => {
		const date = new Date(value);
		return date.toISOString();
	});

// UBO Create Schema
export const UBOCreateSchema = z.object({
	clientId: z
		.string()
		.regex(
			CLIENT_ID_REGEX,
			"Invalid Client ID format (expected: CLT + 9 characters)",
		),
	// Personal information
	firstName: z.string().min(1, "First name is required"),
	lastName: z.string().min(1, "Last name is required"),
	secondLastName: z.string().optional().nullable(),
	birthDate: isoString.optional().nullable(),
	nationality: z.string().min(2).max(2).optional().nullable(),
	curp: z
		.string()
		.regex(CURP_REGEX, "Invalid CURP format")
		.transform((v) => v.toUpperCase())
		.optional()
		.nullable(),
	rfc: z
		.string()
		.regex(RFC_REGEX, "Invalid RFC format")
		.transform((v) => v.toUpperCase())
		.optional()
		.nullable(),
	// Ownership/relationship
	ownershipPercentage: z
		.number()
		.min(0, "Ownership percentage must be >= 0")
		.max(100, "Ownership percentage must be <= 100")
		.optional()
		.nullable(),
	relationshipType: UBORelationshipTypeSchema,
	position: z.string().max(200).optional().nullable(),
	// Contact
	email: z.string().email().optional().nullable(),
	phone: z
		.string()
		.regex(PHONE_REGEX, "Invalid phone format")
		.optional()
		.nullable(),
	// Address
	country: z
		.string()
		.min(2)
		.max(2)
		.transform((v) => v.toUpperCase())
		.optional()
		.nullable(),
	stateCode: z
		.string()
		.min(2)
		.max(10)
		.transform((v) => v.toUpperCase())
		.optional()
		.nullable(),
	city: z.string().min(2).optional().nullable(),
	street: z.string().min(2).optional().nullable(),
	postalCode: z
		.string()
		.regex(POSTAL_CODE_REGEX, "Invalid postal code")
		.optional()
		.nullable(),
	// Document references
	idDocumentId: ResourceIdSchema.optional().nullable(),
	addressProofId: ResourceIdSchema.optional().nullable(),
	// Notes
	notes: z.string().max(500).optional().nullable(),
});

// UBO Update Schema (all fields optional except those that shouldn't change)
export const UBOUpdateSchema = UBOCreateSchema.omit({ clientId: true });

// UBO Patch Schema
export const UBOPatchSchema = z
	.object({
		firstName: z.string().min(1).optional(),
		lastName: z.string().min(1).optional(),
		secondLastName: z.string().optional().nullable(),
		birthDate: isoString.optional().nullable(),
		nationality: z.string().min(2).max(2).optional().nullable(),
		curp: z
			.string()
			.regex(CURP_REGEX, "Invalid CURP format")
			.transform((v) => v.toUpperCase())
			.optional()
			.nullable(),
		rfc: z
			.string()
			.regex(RFC_REGEX, "Invalid RFC format")
			.transform((v) => v.toUpperCase())
			.optional()
			.nullable(),
		ownershipPercentage: z.number().min(0).max(100).optional().nullable(),
		relationshipType: UBORelationshipTypeSchema.optional(),
		position: z.string().max(200).optional().nullable(),
		email: z.string().email().optional().nullable(),
		phone: z.string().regex(PHONE_REGEX).optional().nullable(),
		country: z
			.string()
			.min(2)
			.max(2)
			.transform((v) => v.toUpperCase())
			.optional()
			.nullable(),
		stateCode: z
			.string()
			.min(2)
			.max(10)
			.transform((v) => v.toUpperCase())
			.optional()
			.nullable(),
		city: z.string().min(2).optional().nullable(),
		street: z.string().min(2).optional().nullable(),
		postalCode: z.string().regex(POSTAL_CODE_REGEX).optional().nullable(),
		idDocumentId: ResourceIdSchema.optional().nullable(),
		addressProofId: ResourceIdSchema.optional().nullable(),
		notes: z.string().max(500).optional().nullable(),
		// PEP status can be updated by internal API
		isPEP: z.boolean().optional(),
		pepStatus: PEPStatusSchema.optional(),
		pepDetails: z.string().optional().nullable(),
		pepMatchConfidence: z.string().optional().nullable(),
		pepCheckedAt: isoString.optional().nullable(),
		// Verification
		verifiedAt: isoString.optional().nullable(),
		verifiedBy: z.string().optional().nullable(),
	})
	.refine((data) => Object.keys(data).length > 0, {
		message: "Payload is empty",
	});

// Parameter schemas
export const UBOIdParamSchema = z.object({
	clientId: z
		.string()
		.regex(
			CLIENT_ID_REGEX,
			"Invalid Client ID format (expected: CLT + 9 characters)",
		),
	uboId: ResourceIdSchema,
});

export const ClientIdParamSchema = z.object({
	clientId: z
		.string()
		.regex(
			CLIENT_ID_REGEX,
			"Invalid Client ID format (expected: CLT + 9 characters)",
		),
});

// PEP Status Update Schema (for internal API)
export const PEPStatusUpdateSchema = z.object({
	isPEP: z.boolean(),
	pepStatus: PEPStatusSchema,
	pepDetails: z.string().optional().nullable(),
	pepMatchConfidence: z.string().optional().nullable(),
	pepCheckedAt: isoString,
});

// Type exports
export type UBOCreateInput = z.infer<typeof UBOCreateSchema>;
export type UBOUpdateInput = z.infer<typeof UBOUpdateSchema>;
export type UBOPatchInput = z.infer<typeof UBOPatchSchema>;
export type PEPStatusUpdateInput = z.infer<typeof PEPStatusUpdateSchema>;
