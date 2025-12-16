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

const RFC_REGEX = /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/i;
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

const isoString = z.string().datetime({ offset: true });

const AddressSchema = z.object({
	country: z
		.string()
		.min(2)
		.max(2)
		.transform((value) => value.toUpperCase()),
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

const CommonSchema = z
	.object({
		rfc: z
			.string()
			.regex(RFC_REGEX, "Invalid RFC")
			.transform((value) => value.toUpperCase()),
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

export const ClientPhysicalSchema = CommonSchema.merge(PhysicalDetailsSchema);
export const ClientMoralSchema = CommonSchema.merge(MoralDetailsSchema);
export const ClientTrustSchema = CommonSchema.merge(TrustDetailsSchema);

export const ClientCreateSchema = z.union([
	ClientPhysicalSchema,
	ClientMoralSchema,
	ClientTrustSchema,
]);

export const ClientUpdateSchema = ClientCreateSchema;

export const ClientPatchSchema = z.object({
	id: ResourceIdSchema.optional(),
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
	rfc: z
		.string()
		.regex(RFC_REGEX, "Invalid RFC")
		.transform((value) => value.toUpperCase())
		.optional(),
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
	rfc: z.string().regex(RFC_REGEX, "Invalid RFC").optional(),
	personType: PersonTypeSchema.optional(),
	page: z.coerce.number().int().min(1).default(1),
	limit: z.coerce.number().int().min(1).max(100).default(10),
});

export const ClientIdParamSchema = z.object({ id: ResourceIdSchema });

export const DocumentIdParamSchema = z.object({
	clientId: ResourceIdSchema,
	documentId: ResourceIdSchema,
});

export const AddressIdParamSchema = z.object({
	clientId: ResourceIdSchema,
	addressId: ResourceIdSchema,
});

export const ClientDocumentCreateSchema = z.object({
	clientId: ResourceIdSchema,
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
	clientId: z.string().uuid(),
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
