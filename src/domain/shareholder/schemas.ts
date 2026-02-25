/**
 * Shareholder Domain Schemas
 * Zod schemas for validation with Anexo 4 compliance for company shareholders
 */

import { z } from "zod";

export const SHAREHOLDER_ENTITY_TYPE_VALUES = ["PERSON", "COMPANY"] as const;

export const ShareholderEntityTypeSchema = z.enum(
	SHAREHOLDER_ENTITY_TYPE_VALUES,
);

// Base schemas for validation
const shareholderIdSchema = z
	.string()
	.regex(
		/^SHR[A-Za-z0-9]{9}$/,
		"Shareholder ID must match format SHR<9 chars>",
	);

const clientIdSchema = z
	.string()
	.regex(/^CLT[A-Za-z0-9]{9}$/, "Client ID must match format CLT<9 chars>");

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

// Shareholder Create Schema (discriminated union for PERSON vs COMPANY)
export const ShareholderCreateSchema = z.discriminatedUnion("entityType", [
	// PERSON shareholder
	z.object({
		entityType: z.literal("PERSON"),
		parentShareholderId: shareholderIdSchema.optional().nullable(),
		firstName: z
			.string()
			.min(1, "First name is required for person shareholders"),
		lastName: z
			.string()
			.min(1, "Last name is required for person shareholders"),
		secondLastName: z.string().optional().nullable(),
		rfc: rfcSchema,
		ownershipPercentage: z
			.number()
			.min(0.01, "Ownership percentage must be greater than 0")
			.max(100, "Ownership percentage cannot exceed 100"),
		email: z.string().email().optional().nullable(),
		phone: phoneSchema,
	}),
	// COMPANY shareholder (Anexo 4 requirements)
	z.object({
		entityType: z.literal("COMPANY"),
		parentShareholderId: shareholderIdSchema.optional().nullable(),
		businessName: z
			.string()
			.min(1, "Business name is required for company shareholders"),
		taxId: z.string().min(1, "Tax ID is required for company shareholders"),
		incorporationDate: z.string().date().optional().nullable(),
		nationality: z.string().optional().nullable(),
		// Anexo 4: Representative of the moral entity
		representativeName: z.string().optional().nullable(),
		representativeCurp: curpSchema,
		representativeRfc: rfcSchema,
		// Anexo 4: Document references
		actaConstitutivaDocId: z.string().optional().nullable(),
		cedulaFiscalDocId: z.string().optional().nullable(),
		addressProofDocId: z.string().optional().nullable(),
		powerOfAttorneyDocId: z.string().optional().nullable(),
		ownershipPercentage: z
			.number()
			.min(0.01, "Ownership percentage must be greater than 0")
			.max(100, "Ownership percentage cannot exceed 100"),
		email: z.string().email().optional().nullable(),
		phone: phoneSchema,
	}),
]);

export type ShareholderCreateInput = z.infer<typeof ShareholderCreateSchema>;

// Shareholder Update Schema (full update, omits clientId)
export const ShareholderUpdateSchema = ShareholderCreateSchema;

export type ShareholderUpdateInput = z.infer<typeof ShareholderUpdateSchema>;

// Shareholder Patch Schema (partial update - all fields optional except entityType)
export const ShareholderPatchSchema = z.discriminatedUnion("entityType", [
	// PERSON shareholder partial update
	z.object({
		entityType: z.literal("PERSON"),
		parentShareholderId: shareholderIdSchema.optional().nullable(),
		firstName: z.string().min(1).optional(),
		lastName: z.string().min(1).optional(),
		secondLastName: z.string().optional().nullable(),
		rfc: rfcSchema,
		ownershipPercentage: z.number().min(0.01).max(100).optional(),
		email: z.string().email().optional().nullable(),
		phone: phoneSchema,
	}),
	// COMPANY shareholder partial update
	z.object({
		entityType: z.literal("COMPANY"),
		parentShareholderId: shareholderIdSchema.optional().nullable(),
		businessName: z.string().min(1).optional(),
		taxId: z.string().optional(),
		incorporationDate: z.string().date().optional().nullable(),
		nationality: z.string().optional().nullable(),
		representativeName: z.string().optional().nullable(),
		representativeCurp: curpSchema,
		representativeRfc: rfcSchema,
		actaConstitutivaDocId: z.string().optional().nullable(),
		cedulaFiscalDocId: z.string().optional().nullable(),
		addressProofDocId: z.string().optional().nullable(),
		powerOfAttorneyDocId: z.string().optional().nullable(),
		ownershipPercentage: z.number().min(0.01).max(100).optional(),
		email: z.string().email().optional().nullable(),
		phone: phoneSchema,
	}),
]);

export type ShareholderPatchInput = z.infer<typeof ShareholderPatchSchema>;

// Route parameter schemas
export const ShareholderIdParamSchema = z.object({
	shareholderId: shareholderIdSchema,
});

export const ClientIdParamSchema = z.object({
	clientId: clientIdSchema,
});
