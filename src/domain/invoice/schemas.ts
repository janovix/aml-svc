import { z } from "zod";

const RESOURCE_ID_REGEX = /^[A-Za-z0-9-]+$/;
const _RFC_FISICA_REGEX = /^[A-ZÑ&]{4}\d{6}[A-Z0-9]{3}$/;
const _RFC_MORAL_REGEX = /^[A-ZÑ&]{3}\d{6}[A-Z0-9]{3}$/;
const RFC_REGEX = /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/;

const ResourceIdSchema = z
	.string()
	.trim()
	.min(1, "Invalid ID format")
	.max(64, "Invalid ID format")
	.regex(RESOURCE_ID_REGEX, "Invalid ID format");

const IsoDateTimeSchema = z.string().datetime({ offset: true });
const IsoDateSchema = z
	.string()
	.regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (expected YYYY-MM-DD)");

const RfcSchema = z
	.string()
	.trim()
	.regex(RFC_REGEX, "Invalid RFC format")
	.transform((value) => value.toUpperCase());

const CurrencyCodeSchema = z
	.string()
	.trim()
	.min(3)
	.max(3)
	.transform((value) => value.toUpperCase());

const AmountSchema = z
	.union([
		z.number().nonnegative(),
		z
			.string()
			.trim()
			.regex(/^\d+(\.\d{1,6})?$/, "Invalid amount format"),
	])
	.transform((value) => value.toString());

// Invoice item schema
export const InvoiceItemCreateSchema = z.object({
	productServiceCode: z.string().min(1).max(10),
	productServiceId: z.string().max(100).optional().nullable(),
	quantity: AmountSchema,
	unitCode: z.string().min(1).max(10),
	unitName: z.string().max(100).optional().nullable(),
	description: z.string().min(1).max(1000),
	unitPrice: AmountSchema,
	amount: AmountSchema,
	discount: AmountSchema.optional().nullable(),
	taxObjectCode: z.string().max(3).default("02"),
	transferredTaxAmount: AmountSchema.optional().nullable(),
	withheldTaxAmount: AmountSchema.optional().nullable(),
	metadata: z.record(z.unknown()).optional().nullable(),
});

// Manual invoice creation schema (without XML)
export const InvoiceCreateSchema = z.object({
	// CFDI Core
	uuid: z.string().uuid().optional().nullable(),
	version: z.string().default("4.0"),
	series: z.string().max(25).optional().nullable(),
	folio: z.string().max(40).optional().nullable(),
	// Issuer
	issuerRfc: RfcSchema,
	issuerName: z.string().min(1).max(300).trim(),
	issuerTaxRegimeCode: z.string().min(1).max(3),
	// Receiver
	receiverRfc: RfcSchema,
	receiverName: z.string().min(1).max(300).trim(),
	receiverUsageCode: z.string().max(4).optional().nullable(),
	receiverTaxRegimeCode: z.string().max(3).optional().nullable(),
	receiverPostalCode: z.string().max(10).optional().nullable(),
	// Financial
	subtotal: AmountSchema,
	discount: AmountSchema.optional().nullable(),
	total: AmountSchema,
	currencyCode: CurrencyCodeSchema.default("MXN"),
	exchangeRate: AmountSchema.optional().nullable(),
	// Payment
	paymentFormCode: z.string().max(3).optional().nullable(),
	paymentMethodCode: z.string().max(3).optional().nullable(),
	// Type and dates
	voucherTypeCode: z.string().max(2).default("I"),
	issueDate: IsoDateSchema,
	certificationDate: IsoDateTimeSchema.optional().nullable(),
	// Export
	exportCode: z.string().max(2).default("01").optional().nullable(),
	// Notes
	notes: z.string().max(2000).optional().nullable(),
	// Items
	items: z.array(InvoiceItemCreateSchema).min(1),
});

// XML import schema - only requires the XML content
export const InvoiceParseXmlSchema = z.object({
	xmlContent: z.string().min(100, "Invalid XML content"),
	notes: z.string().max(2000).optional().nullable(),
});

export const InvoiceUpdateSchema = z.object({
	notes: z.string().max(2000).optional().nullable(),
	// Only notes can be updated after creation
});

export const InvoiceIdParamSchema = z.object({
	id: ResourceIdSchema,
});

export const InvoiceFilterSchema = z
	.object({
		issuerRfc: z.string().optional(),
		receiverRfc: z.string().optional(),
		uuid: z.string().uuid().optional(),
		voucherTypeCode: z.string().max(2).optional(),
		currencyCode: CurrencyCodeSchema.optional(),
		startDate: IsoDateSchema.optional(),
		endDate: IsoDateSchema.optional(),
		minAmount: AmountSchema.optional(),
		maxAmount: AmountSchema.optional(),
		page: z.coerce.number().int().min(1).default(1),
		limit: z.coerce.number().int().min(1).max(100).default(10),
	})
	.refine(
		(data) => {
			if (!data.startDate || !data.endDate) return true;
			return data.startDate <= data.endDate;
		},
		{
			message: "startDate must be before or equal to endDate",
			path: ["endDate"],
		},
	);

// Entity schemas for validation
export const InvoiceItemEntitySchema = z.object({
	id: ResourceIdSchema,
	invoiceId: ResourceIdSchema,
	productServiceCode: z.string(),
	productServiceId: z.string().nullable().optional(),
	quantity: z.string(),
	unitCode: z.string(),
	unitName: z.string().nullable().optional(),
	description: z.string(),
	unitPrice: z.string(),
	amount: z.string(),
	discount: z.string().nullable().optional(),
	taxObjectCode: z.string(),
	transferredTaxAmount: z.string().nullable().optional(),
	withheldTaxAmount: z.string().nullable().optional(),
	metadata: z.record(z.unknown()).nullable().optional(),
	createdAt: IsoDateTimeSchema,
	updatedAt: IsoDateTimeSchema,
});

export const InvoiceEntitySchema = z.object({
	id: ResourceIdSchema,
	organizationId: ResourceIdSchema,
	uuid: z.string().nullable().optional(),
	version: z.string(),
	series: z.string().nullable().optional(),
	folio: z.string().nullable().optional(),
	issuerRfc: z.string(),
	issuerName: z.string(),
	issuerTaxRegimeCode: z.string(),
	receiverRfc: z.string(),
	receiverName: z.string(),
	receiverUsageCode: z.string().nullable().optional(),
	receiverTaxRegimeCode: z.string().nullable().optional(),
	receiverPostalCode: z.string().nullable().optional(),
	subtotal: z.string(),
	discount: z.string().nullable().optional(),
	total: z.string(),
	currencyCode: z.string(),
	exchangeRate: z.string().nullable().optional(),
	paymentFormCode: z.string().nullable().optional(),
	paymentMethodCode: z.string().nullable().optional(),
	voucherTypeCode: z.string(),
	issueDate: IsoDateSchema,
	certificationDate: IsoDateTimeSchema.nullable().optional(),
	exportCode: z.string().nullable().optional(),
	tfdUuid: z.string().nullable().optional(),
	tfdSatCertificate: z.string().nullable().optional(),
	tfdSignature: z.string().nullable().optional(),
	tfdStampDate: IsoDateTimeSchema.nullable().optional(),
	xmlContent: z.string().nullable().optional(),
	notes: z.string().nullable().optional(),
	createdAt: IsoDateTimeSchema,
	updatedAt: IsoDateTimeSchema,
	deletedAt: IsoDateTimeSchema.nullable().optional(),
	items: z.array(InvoiceItemEntitySchema),
});

export type InvoiceCreateInput = z.infer<typeof InvoiceCreateSchema>;
export type InvoiceParseXmlInput = z.infer<typeof InvoiceParseXmlSchema>;
export type InvoiceUpdateInput = z.infer<typeof InvoiceUpdateSchema>;
export type InvoiceFilters = z.infer<typeof InvoiceFilterSchema>;
export type InvoiceItemCreateInput = z.infer<typeof InvoiceItemCreateSchema>;
