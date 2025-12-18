import { z } from "zod";

export const OPERATION_TYPE_VALUES = ["purchase", "sale"] as const;
export const VEHICLE_TYPE_VALUES = ["land", "marine", "air"] as const;

export const OperationTypeSchema = z.enum(OPERATION_TYPE_VALUES);
export const VehicleTypeSchema = z.enum(VEHICLE_TYPE_VALUES);

const RESOURCE_ID_REGEX = /^[A-Za-z0-9-]+$/;
const POSTAL_CODE_REGEX = /^\d{4,10}$/;

const ResourceIdSchema = z
	.string()
	.trim()
	.min(1, "Invalid ID format")
	.max(64, "Invalid ID format")
	.regex(RESOURCE_ID_REGEX, "Invalid ID format");

const IsoDateTimeSchema = z.string().datetime({ offset: true });

const CurrencySchema = z
	.string()
	.trim()
	.min(3)
	.max(3)
	.transform((value) => value.toUpperCase());

const AmountSchema = z
	.union([
		z.number().positive(),
		z
			.string()
			.trim()
			.regex(/^\d+(\.\d{1,2})?$/, "Invalid amount format"),
	])
	.transform((value) => value.toString());

const PaymentMethodSchema = z.object({
	method: z
		.string()
		.min(2)
		.max(80)
		.transform((value) => value.trim()),
	amount: AmountSchema,
});

const BaseTransactionSchema = z.object({
	clientId: ResourceIdSchema,
	operationDate: IsoDateTimeSchema,
	operationType: OperationTypeSchema,
	branchPostalCode: z.string().regex(POSTAL_CODE_REGEX, "Invalid postal code"),
	brandId: z.string().min(1),
	model: z
		.string()
		.min(1)
		.max(120)
		.transform((value) => value.trim()),
	year: z.coerce.number().int().min(1900).max(2100),
	serialNumber: z.string().min(5),
	armorLevel: z.string().min(1).max(50).optional().nullable(),
	amount: AmountSchema,
	currency: CurrencySchema,
	paymentMethods: z
		.array(PaymentMethodSchema)
		.min(1, "At least one payment method is required"),
	paymentDate: IsoDateTimeSchema,
});

const LandVehicleSchema = z.object({
	vehicleType: z.literal("land"),
	engineNumber: z.string().min(3),
	plates: z
		.string()
		.min(5)
		.max(20)
		.transform((value) => value.toUpperCase()),
	registrationNumber: z.string().min(3).optional().nullable(),
	flagCountryId: z
		.string()
		.min(2)
		.max(3)
		.transform((value) => value.toUpperCase())
		.optional()
		.nullable(),
});

const MarineVehicleSchema = z.object({
	vehicleType: z.literal("marine"),
	engineNumber: z.string().min(3).optional().nullable(),
	plates: z.string().optional().nullable(),
	registrationNumber: z.string().min(3),
	flagCountryId: z
		.string()
		.min(2)
		.max(3)
		.transform((value) => value.toUpperCase()),
});

const AirVehicleSchema = z.object({
	vehicleType: z.literal("air"),
	engineNumber: z.string().min(3).optional().nullable(),
	plates: z.string().optional().nullable(),
	registrationNumber: z.string().min(3),
	flagCountryId: z
		.string()
		.min(2)
		.max(3)
		.transform((value) => value.toUpperCase()),
});

const VehicleSpecificSchema = z.discriminatedUnion("vehicleType", [
	LandVehicleSchema,
	MarineVehicleSchema,
	AirVehicleSchema,
]);

export const TransactionCreateSchema = BaseTransactionSchema.and(
	VehicleSpecificSchema,
).refine(
	(data) => {
		const totalPaymentAmount = data.paymentMethods.reduce(
			(sum, pm) => sum + parseFloat(pm.amount),
			0,
		);
		const transactionAmount = parseFloat(data.amount);
		return Math.abs(totalPaymentAmount - transactionAmount) < 0.01;
	},
	{
		message:
			"The sum of payment method amounts must equal the transaction amount",
		path: ["paymentMethods"],
	},
);

const TransactionUpdateBaseSchema = BaseTransactionSchema.omit({
	clientId: true,
});

export const TransactionUpdateSchema = TransactionUpdateBaseSchema.and(
	VehicleSpecificSchema,
).refine(
	(data) => {
		const totalPaymentAmount = data.paymentMethods.reduce(
			(sum, pm) => sum + parseFloat(pm.amount),
			0,
		);
		const transactionAmount = parseFloat(data.amount);
		return Math.abs(totalPaymentAmount - transactionAmount) < 0.01;
	},
	{
		message:
			"The sum of payment method amounts must equal the transaction amount",
		path: ["paymentMethods"],
	},
);

export const TransactionIdParamSchema = z.object({
	id: ResourceIdSchema,
});

export const TransactionFilterSchema = z
	.object({
		clientId: ResourceIdSchema.optional(),
		operationType: OperationTypeSchema.optional(),
		vehicleType: VehicleTypeSchema.optional(),
		branchPostalCode: z.string().regex(POSTAL_CODE_REGEX).optional(),
		startDate: IsoDateTimeSchema.optional(),
		endDate: IsoDateTimeSchema.optional(),
		page: z.coerce.number().int().min(1).default(1),
		limit: z.coerce.number().int().min(1).max(100).default(10),
	})
	.refine(
		(data) => {
			if (!data.startDate || !data.endDate) return true;
			return new Date(data.startDate) <= new Date(data.endDate);
		},
		{
			message: "startDate must be before or equal to endDate",
			path: ["endDate"],
		},
	);

export const PaymentMethodEntitySchema = z.object({
	id: ResourceIdSchema,
	method: z.string().min(2),
	amount: z.string(),
	createdAt: IsoDateTimeSchema,
	updatedAt: IsoDateTimeSchema,
});

export const TransactionEntitySchema = z.object({
	id: ResourceIdSchema,
	clientId: ResourceIdSchema,
	operationDate: IsoDateTimeSchema,
	operationType: OperationTypeSchema,
	branchPostalCode: z.string().regex(POSTAL_CODE_REGEX),
	vehicleType: VehicleTypeSchema,
	brandId: z.string().min(1),
	model: z.string().min(1),
	year: z.number().int(),
	serialNumber: z.string().min(5),
	armorLevel: z.string().nullable().optional(),
	engineNumber: z.string().nullable().optional(),
	plates: z.string().nullable().optional(),
	registrationNumber: z.string().nullable().optional(),
	flagCountryId: z.string().nullable().optional(),
	amount: z.string(),
	currency: CurrencySchema,
	paymentDate: IsoDateTimeSchema,
	paymentMethods: z.array(PaymentMethodEntitySchema),
	createdAt: IsoDateTimeSchema,
	updatedAt: IsoDateTimeSchema,
	deletedAt: IsoDateTimeSchema.nullable().optional(),
});

export type TransactionCreateInput = z.infer<typeof TransactionCreateSchema>;
export type TransactionUpdateInput = z.infer<typeof TransactionUpdateSchema>;
export type TransactionFilters = z.infer<typeof TransactionFilterSchema>;
