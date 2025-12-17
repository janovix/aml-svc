import { z } from "zod";

export const PERSON_TYPE_VALUES = ["physical", "moral", "trust"] as const;
export const PersonTypeSchema = z.enum(PERSON_TYPE_VALUES);
export const DOCUMENT_TYPE_VALUES = [
	"PASSPORT",
	"NATIONAL_ID",
	"DRIVERS_LICENSE",
	"TAX_ID",
	"PROOF_OF_ADDRESS",
	"OTHER",
] as const;
export const DocumentTypeSchema = z.enum(DOCUMENT_TYPE_VALUES);
export const DOCUMENT_STATUS_VALUES = [
	"PENDING",
	"VERIFIED",
	"REJECTED",
	"EXPIRED",
] as const;
export const DocumentStatusSchema = z.enum(DOCUMENT_STATUS_VALUES);
export const ADDRESS_TYPE_VALUES = [
	"RESIDENTIAL",
	"BUSINESS",
	"MAILING",
	"OTHER",
] as const;
export const AddressTypeSchema = z.enum(ADDRESS_TYPE_VALUES);

// RFC validation: Personas físicas (PHYSICAL) = 13 chars, Personas morales (MORAL/TRUST) = 12 chars
const RFC_PHYSICAL_REGEX = /^[A-ZÑ&]{4}\d{6}[A-Z0-9]{3}$/i; // 13 characters
const RFC_MORAL_REGEX = /^[A-ZÑ&]{3}\d{6}[A-Z0-9]{3}$/i; // 12 characters
const CURP_REGEX = /^[A-Z][AEIOUX][A-Z]{2}\d{6}[HM][A-Z]{5}[A-Z0-9]{2}$/i;
const PHONE_REGEX = /^[+\d][\d\s\-()]{5,}$/;
const POSTAL_CODE_REGEX = /^\d{4,10}$/;
const RESOURCE_ID_REGEX = /^[A-Za-z0-9-]+$/;

const ResourceIdSchema = z
	.string()
	.trim()
	.min(1, "Invalid ID format")
	.max(64, "Invalid ID format")
	.regex(RESOURCE_ID_REGEX, "Invalid ID format");
const dateOnlyString = z
	.string()
	.refine((value) => !Number.isNaN(Date.parse(value)), "Invalid date value")
	.transform((value) => new Date(value).toISOString().split("T")[0]);

// More flexible ISO datetime that accepts partial formats
const isoString = z
	.string()
	.transform((value) => {
		// Handle partial datetime formats like "2025-09-19T14:06"
		if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) {
			return `${value}:00Z`;
		}
		// Handle date-only formats
		if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
			return `${value}T00:00:00Z`;
		}
		// Handle datetime without seconds: "2025-09-19T14:06:00"
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
		// Ensure it's a valid ISO string
		const date = new Date(value);
		return date.toISOString();
	});

// Country name to code mapping (common cases)
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

const AddressSchema = z.object({
	country: z
		.string()
		.min(2)
		.transform((value) => {
			const trimmed = value.trim();
			// If it's already a 2-character code, return it uppercase
			if (trimmed.length === 2) {
				return trimmed.toUpperCase();
			}
			// Try to map country name to code
			const normalized = trimmed.toLowerCase();
			return COUNTRY_NAME_TO_CODE[normalized] || trimmed.toUpperCase();
		})
		.refine(
			(value) => value.length === 2,
			"Country must be a 2-character ISO code (e.g., MX, US)",
		),
	stateCode: z
		.string()
		.min(2)
		.max(10)
		.transform((value) => value.toUpperCase()),
	city: z.string().min(2),
	municipality: z.string().min(2),
	neighborhood: z.string().min(2),
	street: z.string().min(2),
	externalNumber: z.string().min(1),
	internalNumber: z.string().max(20).optional().nullable(),
	postalCode: z.string().regex(POSTAL_CODE_REGEX, "Invalid postal code"),
	reference: z.string().max(200).optional().nullable(),
});

const ContactSchema = z.object({
	email: z
		.string()
		.email()
		.transform((value) => value.toLowerCase()),
	phone: z.string().regex(PHONE_REGEX, "Invalid phone format"),
});

// RFC validation function based on person type
const validateRFC = (personType: "physical" | "moral" | "trust") => {
	return z
		.string()
		.transform((value) => value.toUpperCase())
		.refine(
			(value) => {
				if (personType === "physical") {
					return RFC_PHYSICAL_REGEX.test(value) && value.length === 13;
				}
				// MORAL or TRUST
				return RFC_MORAL_REGEX.test(value) && value.length === 12;
			},
			{
				message:
					personType === "physical"
						? "RFC for physical persons must be 13 characters"
						: "RFC for legal entities must be 12 characters",
			},
		);
};

// Common schema with optional nationality (for moral/trust)
const CommonSchemaBase = z
	.object({
		rfc: z.string(), // Will be validated in the merged schemas based on personType
		nationality: z
			.string()
			.min(2)
			.max(3)
			.transform((value) => value.toUpperCase())
			.optional()
			.nullable(),
		notes: z.string().max(500).optional().nullable(),
	})
	.merge(AddressSchema)
	.merge(ContactSchema);

// Common schema with required nationality (for physical persons)
const CommonSchemaPhysical = z
	.object({
		rfc: z.string(), // Will be validated in the merged schemas based on personType
		nationality: z
			.string()
			.min(2)
			.max(3)
			.transform((value) => value.toUpperCase()),
		notes: z.string().max(500).optional().nullable(),
	})
	.merge(AddressSchema)
	.merge(ContactSchema);

const PhysicalDetailsSchema = z.object({
	personType: z.literal("physical"),
	firstName: z.string().min(1),
	lastName: z.string().min(1),
	secondLastName: z.string().optional().nullable(),
	birthDate: dateOnlyString,
	curp: z
		.string()
		.regex(CURP_REGEX, "Invalid CURP")
		.transform((value) => value.toUpperCase()),
	businessName: z.string().optional().nullable(),
	incorporationDate: isoString.optional().nullable(),
});

const MoralDetailsSchema = z.object({
	personType: z.literal("moral"),
	businessName: z.string().min(3),
	incorporationDate: isoString,
	firstName: z.string().optional().nullable(),
	lastName: z.string().optional().nullable(),
	secondLastName: z.string().optional().nullable(),
	birthDate: dateOnlyString.optional().nullable(),
	curp: z.string().optional().nullable(),
});

const TrustDetailsSchema = z.object({
	personType: z.literal("trust"),
	businessName: z.string().min(3),
	incorporationDate: isoString,
	firstName: z.string().optional().nullable(),
	lastName: z.string().optional().nullable(),
	secondLastName: z.string().optional().nullable(),
	birthDate: dateOnlyString.optional().nullable(),
	curp: z.string().optional().nullable(),
});

// Base schemas without RFC validation (for updates)
const ClientPhysicalBaseSchema = CommonSchemaPhysical.merge(
	PhysicalDetailsSchema,
);
const ClientMoralBaseSchema = CommonSchemaBase.merge(MoralDetailsSchema);
const ClientTrustBaseSchema = CommonSchemaBase.merge(TrustDetailsSchema);

// Merge schemas and add RFC validation based on personType
export const ClientPhysicalSchema = ClientPhysicalBaseSchema.merge(
	z.object({
		rfc: validateRFC("physical"),
	}),
);

export const ClientMoralSchema = ClientMoralBaseSchema.merge(
	z.object({
		rfc: validateRFC("moral"),
	}),
);

export const ClientTrustSchema = ClientTrustBaseSchema.merge(
	z.object({
		rfc: validateRFC("trust"),
	}),
);

// Use discriminated union for better error messages and type discrimination
export const ClientCreateSchema = z.discriminatedUnion("personType", [
	ClientPhysicalSchema,
	ClientMoralSchema,
	ClientTrustSchema,
]);

// Update schema: RFC cannot be changed, so we omit it from base schemas
// Use discriminated union for better error messages
export const ClientUpdateSchema = z.discriminatedUnion("personType", [
	ClientPhysicalBaseSchema.omit({ rfc: true }),
	ClientMoralBaseSchema.omit({ rfc: true }),
	ClientTrustBaseSchema.omit({ rfc: true }),
]);

// Patch schema: RFC cannot be changed, so we omit it
export const ClientPatchSchema = z.object({
	personType: PersonTypeSchema.optional(),
	firstName: z.string().min(1).optional().nullable(),
	lastName: z.string().min(1).optional().nullable(),
	secondLastName: z.string().optional().nullable(),
	birthDate: dateOnlyString.optional().nullable(),
	curp: z
		.string()
		.regex(CURP_REGEX, "Invalid CURP")
		.transform((value) => value.toUpperCase())
		.optional(),
	businessName: z.string().min(3).optional().nullable(),
	incorporationDate: isoString.optional().nullable(),
	// RFC is intentionally omitted - it cannot be changed after creation
	nationality: z
		.string()
		.min(2)
		.max(3)
		.transform((value) => value.toUpperCase())
		.optional(),
	email: z
		.string()
		.email()
		.transform((value) => value.toLowerCase())
		.optional(),
	phone: z.string().regex(PHONE_REGEX).optional(),
	country: z
		.string()
		.min(2)
		.max(2)
		.transform((value) => value.toUpperCase())
		.optional(),
	stateCode: z
		.string()
		.min(2)
		.max(10)
		.transform((value) => value.toUpperCase())
		.optional(),
	city: z.string().min(2).optional(),
	municipality: z.string().min(2).optional(),
	neighborhood: z.string().min(2).optional(),
	street: z.string().min(2).optional(),
	externalNumber: z.string().min(1).optional(),
	internalNumber: z.string().max(20).optional().nullable(),
	postalCode: z.string().regex(POSTAL_CODE_REGEX).optional(),
	reference: z.string().max(200).optional().nullable(),
	notes: z.string().max(500).optional().nullable(),
});

export const ClientFilterSchema = z.object({
	search: z.string().min(2).max(100).optional(),
	rfc: z
		.string()
		.refine(
			(value) => RFC_PHYSICAL_REGEX.test(value) || RFC_MORAL_REGEX.test(value),
			"Invalid RFC",
		)
		.optional(),
	personType: PersonTypeSchema.optional(),
	page: z.coerce.number().int().min(1).default(1),
	limit: z.coerce.number().int().min(1).max(100).default(10),
});

// RFC is now the primary key, so we use it as the ID parameter
export const ClientIdParamSchema = z.object({
	id: z
		.string()
		.refine(
			(value) => RFC_PHYSICAL_REGEX.test(value) || RFC_MORAL_REGEX.test(value),
			"Invalid RFC format",
		)
		.transform((value) => value.toUpperCase()),
});

export const DocumentIdParamSchema = z.object({
	clientId: z
		.string()
		.refine(
			(value) => RFC_PHYSICAL_REGEX.test(value) || RFC_MORAL_REGEX.test(value),
			"Invalid RFC format",
		)
		.transform((value) => value.toUpperCase()),
	documentId: ResourceIdSchema,
});

export const AddressIdParamSchema = z.object({
	clientId: z
		.string()
		.refine(
			(value) => RFC_PHYSICAL_REGEX.test(value) || RFC_MORAL_REGEX.test(value),
			"Invalid RFC format",
		)
		.transform((value) => value.toUpperCase()),
	addressId: ResourceIdSchema,
});

export const ClientDocumentCreateSchema = z.object({
	clientId: z
		.string()
		.refine(
			(value) => RFC_PHYSICAL_REGEX.test(value) || RFC_MORAL_REGEX.test(value),
			"Invalid RFC format",
		)
		.transform((value) => value.toUpperCase()),
	documentType: DocumentTypeSchema,
	documentNumber: z.string().min(3),
	issuingCountry: z
		.string()
		.min(2)
		.max(2)
		.transform((value) => value.toUpperCase())
		.optional()
		.nullable(),
	issueDate: isoString.optional().nullable(),
	expiryDate: isoString.optional().nullable(),
	status: DocumentStatusSchema.default("PENDING"),
	fileUrl: z.string().url().optional().nullable(),
	metadata: z.record(z.string(), z.any()).optional().nullable(),
});

export const ClientDocumentUpdateSchema = ClientDocumentCreateSchema.omit({
	clientId: true,
});

export const ClientDocumentPatchSchema = z
	.object({
		documentType: DocumentTypeSchema.optional(),
		documentNumber: z.string().min(3).optional(),
		issuingCountry: z
			.string()
			.min(2)
			.max(2)
			.transform((value) => value.toUpperCase())
			.optional()
			.nullable(),
		issueDate: isoString.optional().nullable(),
		expiryDate: isoString.optional().nullable(),
		status: DocumentStatusSchema.optional(),
		fileUrl: z.string().url().optional().nullable(),
		metadata: z.record(z.string(), z.any()).optional().nullable(),
	})
	.refine((data) => Object.keys(data).length > 0, {
		message: "Payload is empty",
	});

export const ClientAddressCreateSchema = z.object({
	clientId: z
		.string()
		.refine(
			(value) => RFC_PHYSICAL_REGEX.test(value) || RFC_MORAL_REGEX.test(value),
			"Invalid RFC format",
		)
		.transform((value) => value.toUpperCase()),
	addressType: AddressTypeSchema.default("RESIDENTIAL"),
	street1: z.string().min(1),
	street2: z.string().optional().nullable(),
	city: z.string().min(2),
	state: z.string().optional().nullable(),
	postalCode: z.string().regex(POSTAL_CODE_REGEX).optional().nullable(),
	country: z
		.string()
		.min(2)
		.max(2)
		.transform((value) => value.toUpperCase()),
	isPrimary: z.boolean().default(false),
	verifiedAt: isoString.optional().nullable(),
	reference: z.string().max(200).optional().nullable(),
});

export const ClientAddressUpdateSchema = ClientAddressCreateSchema.omit({
	clientId: true,
});

export const ClientAddressPatchSchema = z
	.object({
		addressType: AddressTypeSchema.optional(),
		street1: z.string().min(1).optional(),
		street2: z.string().optional().nullable(),
		city: z.string().min(2).optional(),
		state: z.string().optional().nullable(),
		postalCode: z.string().regex(POSTAL_CODE_REGEX).optional().nullable(),
		country: z
			.string()
			.min(2)
			.max(2)
			.transform((value) => value.toUpperCase())
			.optional(),
		isPrimary: z.boolean().optional(),
		verifiedAt: isoString.optional().nullable(),
		reference: z.string().max(200).optional().nullable(),
	})
	.refine((data) => Object.keys(data).length > 0, {
		message: "Payload is empty",
	});

export type ClientCreateInput = z.infer<typeof ClientCreateSchema>;
export type ClientUpdateInput = z.infer<typeof ClientUpdateSchema>;
export type ClientPatchInput = z.infer<typeof ClientPatchSchema>;
export type ClientFilters = z.infer<typeof ClientFilterSchema>;
export type PersonType = z.infer<typeof PersonTypeSchema>;
export type ClientDocumentCreateInput = z.infer<
	typeof ClientDocumentCreateSchema
>;
export type ClientDocumentUpdateInput = z.infer<
	typeof ClientDocumentUpdateSchema
>;
export type ClientDocumentPatchInput = z.infer<
	typeof ClientDocumentPatchSchema
>;
export type ClientAddressCreateInput = z.infer<
	typeof ClientAddressCreateSchema
>;
export type ClientAddressUpdateInput = z.infer<
	typeof ClientAddressUpdateSchema
>;
export type ClientAddressPatchInput = z.infer<typeof ClientAddressPatchSchema>;
