import { z } from "zod";
import { ACTIVITY_CODES } from "./types";
import { multiEnum } from "../../lib/query-params";

const RESOURCE_ID_REGEX = /^[A-Za-z0-9-]+$/;
const POSTAL_CODE_REGEX = /^\d{4,10}$/;

const ResourceIdSchema = z
	.string()
	.trim()
	.min(1, "Invalid ID format")
	.max(64, "Invalid ID format")
	.regex(RESOURCE_ID_REGEX, "Invalid ID format");

const _IsoDateTimeSchema = z.string().datetime({ offset: true });
const IsoDateSchema = z
	.string()
	.regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (expected YYYY-MM-DD)");

const CurrencyCodeSchema = z
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
			.regex(/^\d+(\.\d{1,6})?$/, "Invalid amount format"),
	])
	.transform((value) => value.toString());

export const ActivityCodeSchema = z.enum(
	ACTIVITY_CODES as [string, ...string[]],
);

// Payment method schema
export const OperationPaymentSchema = z.object({
	paymentDate: IsoDateSchema,
	paymentFormCode: z.string().min(1).max(3),
	monetaryInstrumentCode: z.string().max(3).optional().nullable(),
	currencyCode: CurrencyCodeSchema.default("MXN"),
	amount: AmountSchema,
	/** Per-payment exchange rate (payment currency → operation currency) */
	exchangeRate: AmountSchema.optional().nullable(),
	bankName: z.string().max(200).optional().nullable(),
	accountNumberMasked: z.string().max(20).optional().nullable(),
	checkNumber: z.string().max(50).optional().nullable(),
	reference: z.string().max(200).optional().nullable(),
});

// Base operation create schema (common fields)
/** Data source for the operation */
export const DataSourceSchema = z
	.enum(["CFDI", "MANUAL", "IMPORT", "ENRICHED"])
	.default("MANUAL");

/** Completeness status of the operation */
export const CompletenessStatusSchema = z
	.enum(["COMPLETE", "INCOMPLETE", "MINIMUM"])
	.default("COMPLETE");

const BaseOperationSchema = z.object({
	clientId: ResourceIdSchema,
	invoiceId: ResourceIdSchema.optional().nullable(),
	activityCode: ActivityCodeSchema,
	operationTypeCode: z.string().max(10).optional().nullable(),
	operationDate: IsoDateSchema,
	branchPostalCode: z.string().regex(POSTAL_CODE_REGEX, "Invalid postal code"),
	amount: AmountSchema,
	currencyCode: CurrencyCodeSchema.default("MXN"),
	exchangeRate: AmountSchema.optional().nullable(),
	alertTypeCode: z.string().max(10).default("100"),
	alertDescription: z.string().max(3000).optional().nullable(),
	priorityCode: z.string().max(2).default("2"),
	dataSource: DataSourceSchema.optional(),
	completenessStatus: CompletenessStatusSchema.optional(),
	missingFields: z.array(z.string()).optional().nullable(),
	referenceNumber: z.string().max(100).optional().nullable(),
	notes: z.string().max(2000).optional().nullable(),
	payments: z
		.array(OperationPaymentSchema)
		.min(1, "At least one payment is required"),
});

// Activity-specific extension schemas
export const VehicleExtensionSchema = z.object({
	vehicleType: z.enum(["LAND", "MARINE", "AIR"]),
	brand: z.string().min(1).max(100),
	model: z.string().min(1).max(100),
	year: z.coerce.number().int().min(1900).max(2100),
	vin: z.string().max(17).optional().nullable(),
	repuve: z.string().max(10).optional().nullable(),
	plates: z.string().max(20).optional().nullable(),
	serialNumber: z.string().max(50).optional().nullable(),
	flagCountryCode: z.string().max(3).optional().nullable(),
	registrationNumber: z.string().max(50).optional().nullable(),
	armorLevelCode: z.string().max(2).optional().nullable(),
	engineNumber: z.string().max(50).optional().nullable(),
	description: z.string().max(500).optional().nullable(),
});

export const RealEstateExtensionSchema = z.object({
	propertyTypeCode: z.string().min(1).max(10),
	street: z.string().max(200).optional().nullable(),
	externalNumber: z.string().max(50).optional().nullable(),
	internalNumber: z.string().max(50).optional().nullable(),
	neighborhood: z.string().max(100).optional().nullable(),
	postalCode: z.string().max(10).optional().nullable(),
	municipality: z.string().max(100).optional().nullable(),
	stateCode: z.string().max(10).optional().nullable(),
	countryCode: z.string().max(3).default("MEX").optional().nullable(),
	registryFolio: z.string().max(50).optional().nullable(),
	registryDate: IsoDateSchema.optional().nullable(),
	landAreaM2: AmountSchema.optional().nullable(),
	constructionAreaM2: AmountSchema.optional().nullable(),
	clientFigureCode: z.string().max(10).optional().nullable(),
	personFigureCode: z.string().max(10).optional().nullable(),
	description: z.string().max(500).optional().nullable(),
});

export const JewelryExtensionSchema = z.object({
	itemTypeCode: z.string().min(1).max(10),
	metalType: z.string().max(50).optional().nullable(),
	weightGrams: AmountSchema.optional().nullable(),
	purity: z.string().max(20).optional().nullable(),
	jewelryDescription: z.string().max(500).optional().nullable(),
	brand: z.string().max(100).optional().nullable(),
	serialNumber: z.string().max(50).optional().nullable(),
	tradeUnitCode: z.string().max(10).optional().nullable(),
	quantity: AmountSchema.optional().nullable(),
	unitPrice: AmountSchema.optional().nullable(),
});

export const VirtualAssetExtensionSchema = z.object({
	assetTypeCode: z.string().min(1).max(10),
	assetName: z.string().max(100).optional().nullable(),
	walletAddressOrigin: z.string().max(200).optional().nullable(),
	walletAddressDestination: z.string().max(200).optional().nullable(),
	exchangeName: z.string().max(200).optional().nullable(),
	exchangeCountryCode: z.string().max(3).optional().nullable(),
	assetQuantity: AmountSchema.optional().nullable(),
	assetUnitPrice: AmountSchema.optional().nullable(),
	blockchainTxHash: z.string().max(100).optional().nullable(),
});

export const GamblingExtensionSchema = z.object({
	gameTypeCode: z.string().max(10).optional().nullable(),
	businessLineCode: z.string().max(10).optional().nullable(),
	operationMethodCode: z.string().max(10).optional().nullable(),
	prizeAmount: AmountSchema.optional().nullable(),
	betAmount: AmountSchema.optional().nullable(),
	ticketNumber: z.string().max(50).optional().nullable(),
	eventName: z.string().max(200).optional().nullable(),
	eventDate: IsoDateSchema.optional().nullable(),
	propertyTypeCode: z.string().max(10).optional().nullable(),
	propertyDescription: z.string().max(500).optional().nullable(),
});

export const RentalExtensionSchema = z.object({
	propertyTypeCode: z.string().min(1).max(10),
	rentalPeriodMonths: z.coerce.number().int().min(1).optional().nullable(),
	monthlyRent: AmountSchema.optional().nullable(),
	depositAmount: AmountSchema.optional().nullable(),
	contractStartDate: IsoDateSchema.optional().nullable(),
	contractEndDate: IsoDateSchema.optional().nullable(),
	street: z.string().max(200).optional().nullable(),
	externalNumber: z.string().max(50).optional().nullable(),
	internalNumber: z.string().max(50).optional().nullable(),
	neighborhood: z.string().max(100).optional().nullable(),
	postalCode: z.string().max(10).optional().nullable(),
	municipality: z.string().max(100).optional().nullable(),
	stateCode: z.string().max(10).optional().nullable(),
	isPrepaid: z.boolean().optional().nullable(),
	prepaidMonths: z.coerce.number().int().min(1).optional().nullable(),
	description: z.string().max(500).optional().nullable(),
});

export const ArmoringExtensionSchema = z.object({
	itemType: z.string().min(1).max(50),
	itemStatusCode: z.string().max(10).optional().nullable(),
	armorLevelCode: z.string().min(1).max(2),
	armoredPartCode: z.string().max(10).optional().nullable(),
	vehicleType: z.string().max(20).optional().nullable(),
	vehicleBrand: z.string().max(100).optional().nullable(),
	vehicleModel: z.string().max(100).optional().nullable(),
	vehicleYear: z.coerce
		.number()
		.int()
		.min(1900)
		.max(2100)
		.optional()
		.nullable(),
	vehicleVin: z.string().max(17).optional().nullable(),
	vehiclePlates: z.string().max(20).optional().nullable(),
	serviceDescription: z.string().max(500).optional().nullable(),
});

export const DonationExtensionSchema = z.object({
	donationType: z.string().min(1).max(50),
	purpose: z.string().max(500).optional().nullable(),
	itemTypeCode: z.string().max(10).optional().nullable(),
	itemDescription: z.string().max(500).optional().nullable(),
	itemValue: AmountSchema.optional().nullable(),
	isAnonymous: z.boolean().optional().nullable(),
	campaignName: z.string().max(200).optional().nullable(),
});

export const LoanExtensionSchema = z.object({
	loanTypeCode: z.string().max(10).optional().nullable(),
	guaranteeTypeCode: z.string().max(10).optional().nullable(),
	principalAmount: AmountSchema,
	interestRate: AmountSchema.optional().nullable(),
	termMonths: z.coerce.number().int().min(1).optional().nullable(),
	monthlyPayment: AmountSchema.optional().nullable(),
	disbursementDate: IsoDateSchema.optional().nullable(),
	maturityDate: IsoDateSchema.optional().nullable(),
	guaranteeDescription: z.string().max(500).optional().nullable(),
	guaranteeValue: AmountSchema.optional().nullable(),
});

export const OfficialExtensionSchema = z.object({
	actTypeCode: z.string().min(1).max(10),
	instrumentNumber: z.string().max(50).optional().nullable(),
	instrumentDate: IsoDateSchema.optional().nullable(),
	trustTypeCode: z.string().max(10).optional().nullable(),
	trustIdentifier: z.string().max(100).optional().nullable(),
	trustPurpose: z.string().max(500).optional().nullable(),
	movementTypeCode: z.string().max(10).optional().nullable(),
	assignmentTypeCode: z.string().max(10).optional().nullable(),
	mergerTypeCode: z.string().max(10).optional().nullable(),
	incorporationReasonCode: z.string().max(10).optional().nullable(),
	patrimonyModificationTypeCode: z.string().max(10).optional().nullable(),
	powerOfAttorneyTypeCode: z.string().max(10).optional().nullable(),
	grantingTypeCode: z.string().max(10).optional().nullable(),
	shareholderPositionCode: z.string().max(10).optional().nullable(),
	sharePercentage: AmountSchema.optional().nullable(),
	itemTypeCode: z.string().max(10).optional().nullable(),
	itemDescription: z.string().max(500).optional().nullable(),
	itemValue: AmountSchema.optional().nullable(),
});

export const NotaryExtensionSchema = z.object({
	actTypeCode: z.string().min(1).max(10),
	notaryNumber: z.string().max(20).optional().nullable(),
	notaryStateCode: z.string().max(10).optional().nullable(),
	instrumentNumber: z.string().max(50).optional().nullable(),
	instrumentDate: IsoDateSchema.optional().nullable(),
	legalEntityTypeCode: z.string().max(10).optional().nullable(),
	personCharacterTypeCode: z.string().max(10).optional().nullable(),
	incorporationReasonCode: z.string().max(10).optional().nullable(),
	patrimonyModificationTypeCode: z.string().max(10).optional().nullable(),
	powerOfAttorneyTypeCode: z.string().max(10).optional().nullable(),
	grantingTypeCode: z.string().max(10).optional().nullable(),
	shareholderPositionCode: z.string().max(10).optional().nullable(),
	sharePercentage: AmountSchema.optional().nullable(),
	itemTypeCode: z.string().max(10).optional().nullable(),
	itemDescription: z.string().max(500).optional().nullable(),
	appraisalValue: AmountSchema.optional().nullable(),
	guaranteeTypeCode: z.string().max(10).optional().nullable(),
});

export const ProfessionalExtensionSchema = z.object({
	serviceTypeCode: z.string().min(1).max(10),
	serviceAreaCode: z.string().max(10).optional().nullable(),
	clientFigureCode: z.string().max(10).optional().nullable(),
	contributionReasonCode: z.string().max(10).optional().nullable(),
	assignmentTypeCode: z.string().max(10).optional().nullable(),
	mergerTypeCode: z.string().max(10).optional().nullable(),
	incorporationReasonCode: z.string().max(10).optional().nullable(),
	shareholderPositionCode: z.string().max(10).optional().nullable(),
	sharePercentage: AmountSchema.optional().nullable(),
	managedAssetTypeCode: z.string().max(10).optional().nullable(),
	managementStatusCode: z.string().max(10).optional().nullable(),
	financialInstitutionTypeCode: z.string().max(10).optional().nullable(),
	financialInstitutionName: z.string().max(200).optional().nullable(),
	occupationCode: z.string().max(10).optional().nullable(),
	serviceDescription: z.string().max(500).optional().nullable(),
});

export const TravelerCheckExtensionSchema = z.object({
	denominationCode: z.string().min(1).max(10),
	checkCount: z.coerce.number().int().min(1),
	serialNumbers: z.string().max(1000).optional().nullable(),
	issuerName: z.string().max(200).optional().nullable(),
	issuerCountryCode: z.string().max(3).optional().nullable(),
});

export const CardExtensionSchema = z.object({
	cardTypeCode: z.string().min(1).max(10),
	cardNumberMasked: z.string().max(20).optional().nullable(),
	cardBrand: z.string().max(50).optional().nullable(),
	issuerName: z.string().max(200).optional().nullable(),
	creditLimit: AmountSchema.optional().nullable(),
	transactionType: z.string().max(50).optional().nullable(),
});

export const PrepaidExtensionSchema = z.object({
	cardType: z.string().min(1).max(50),
	cardNumberMasked: z.string().max(20).optional().nullable(),
	isInitialLoad: z.boolean().optional().nullable(),
	reloadAmount: AmountSchema.optional().nullable(),
	currentBalance: AmountSchema.optional().nullable(),
	issuerName: z.string().max(200).optional().nullable(),
});

export const RewardExtensionSchema = z.object({
	rewardType: z.string().min(1).max(50),
	programName: z.string().max(200).optional().nullable(),
	pointsAmount: AmountSchema.optional().nullable(),
	pointsValue: AmountSchema.optional().nullable(),
	pointsExpiryDate: IsoDateSchema.optional().nullable(),
	redemptionType: z.string().max(50).optional().nullable(),
	redemptionDescription: z.string().max(500).optional().nullable(),
});

export const ValuableExtensionSchema = z.object({
	valueTypeCode: z.string().min(1).max(10),
	serviceTypeCode: z.string().max(10).optional().nullable(),
	transportMethod: z.string().max(50).optional().nullable(),
	originAddress: z.string().max(500).optional().nullable(),
	destinationAddress: z.string().max(500).optional().nullable(),
	custodyStartDate: IsoDateSchema.optional().nullable(),
	custodyEndDate: IsoDateSchema.optional().nullable(),
	storageLocation: z.string().max(200).optional().nullable(),
	declaredValue: AmountSchema.optional().nullable(),
	insuredValue: AmountSchema.optional().nullable(),
	description: z.string().max(500).optional().nullable(),
});

export const ArtExtensionSchema = z.object({
	artworkTypeCode: z.string().min(1).max(10),
	title: z.string().max(200).optional().nullable(),
	artist: z.string().max(200).optional().nullable(),
	yearCreated: z.coerce.number().int().min(0).max(2100).optional().nullable(),
	medium: z.string().max(100).optional().nullable(),
	dimensions: z.string().max(100).optional().nullable(),
	provenance: z.string().max(1000).optional().nullable(),
	certificateAuthenticity: z.string().max(200).optional().nullable(),
	previousOwner: z.string().max(200).optional().nullable(),
	isAntique: z.boolean().optional().nullable(),
	auctionHouse: z.string().max(200).optional().nullable(),
	lotNumber: z.string().max(50).optional().nullable(),
});

export const DevelopmentExtensionSchema = z.object({
	developmentTypeCode: z.string().min(1).max(10),
	creditTypeCode: z.string().max(10).optional().nullable(),
	projectName: z.string().max(200).optional().nullable(),
	projectLocation: z.string().max(500).optional().nullable(),
	contributionType: z.string().max(50).optional().nullable(),
	contributionAmount: AmountSchema.optional().nullable(),
	thirdPartyTypeCode: z.string().max(10).optional().nullable(),
	thirdPartyName: z.string().max(200).optional().nullable(),
	financialInstitutionTypeCode: z.string().max(10).optional().nullable(),
	financialInstitutionName: z.string().max(200).optional().nullable(),
});

// Full operation create schema with optional activity extension
export const OperationCreateSchema = BaseOperationSchema.extend({
	vehicle: VehicleExtensionSchema.optional(),
	realEstate: RealEstateExtensionSchema.optional(),
	jewelry: JewelryExtensionSchema.optional(),
	virtualAsset: VirtualAssetExtensionSchema.optional(),
	gambling: GamblingExtensionSchema.optional(),
	rental: RentalExtensionSchema.optional(),
	armoring: ArmoringExtensionSchema.optional(),
	donation: DonationExtensionSchema.optional(),
	loan: LoanExtensionSchema.optional(),
	official: OfficialExtensionSchema.optional(),
	notary: NotaryExtensionSchema.optional(),
	professional: ProfessionalExtensionSchema.optional(),
	travelerCheck: TravelerCheckExtensionSchema.optional(),
	card: CardExtensionSchema.optional(),
	prepaid: PrepaidExtensionSchema.optional(),
	reward: RewardExtensionSchema.optional(),
	valuable: ValuableExtensionSchema.optional(),
	art: ArtExtensionSchema.optional(),
	development: DevelopmentExtensionSchema.optional(),
}).refine(
	(data) => {
		// Calculate total payment amount, converting foreign currencies
		const totalPaymentAmount = data.payments.reduce((sum, pm) => {
			const amount = parseFloat(pm.amount);
			const paymentCurrency = pm.currencyCode || "MXN";
			const operationCurrency = data.currencyCode || "MXN";

			// If same currency, add directly
			if (paymentCurrency === operationCurrency) {
				return sum + amount;
			}

			// If different currency, convert using the payment's exchange rate
			const rate = parseFloat(pm.exchangeRate || "0");
			return sum + amount * rate;
		}, 0);

		const operationAmount = parseFloat(data.amount);
		return Math.abs(totalPaymentAmount - operationAmount) < 0.01;
	},
	{
		message: "The sum of payment amounts must equal the operation amount",
		path: ["payments"],
	},
);

export const OperationUpdateSchema = BaseOperationSchema.omit({
	clientId: true,
	activityCode: true, // Cannot change activity code after creation
})
	.extend({
		vehicle: VehicleExtensionSchema.optional(),
		realEstate: RealEstateExtensionSchema.optional(),
		jewelry: JewelryExtensionSchema.optional(),
		virtualAsset: VirtualAssetExtensionSchema.optional(),
		gambling: GamblingExtensionSchema.optional(),
		rental: RentalExtensionSchema.optional(),
		armoring: ArmoringExtensionSchema.optional(),
		donation: DonationExtensionSchema.optional(),
		loan: LoanExtensionSchema.optional(),
		official: OfficialExtensionSchema.optional(),
		notary: NotaryExtensionSchema.optional(),
		professional: ProfessionalExtensionSchema.optional(),
		travelerCheck: TravelerCheckExtensionSchema.optional(),
		card: CardExtensionSchema.optional(),
		prepaid: PrepaidExtensionSchema.optional(),
		reward: RewardExtensionSchema.optional(),
		valuable: ValuableExtensionSchema.optional(),
		art: ArtExtensionSchema.optional(),
		development: DevelopmentExtensionSchema.optional(),
	})
	.refine(
		(data) => {
			// Calculate total payment amount, converting foreign currencies
			const totalPaymentAmount = data.payments.reduce((sum, pm) => {
				const amount = parseFloat(pm.amount);
				const paymentCurrency = pm.currencyCode || "MXN";
				const operationCurrency = data.currencyCode || "MXN";

				// If same currency, add directly
				if (paymentCurrency === operationCurrency) {
					return sum + amount;
				}

				// If different currency, convert using the payment's exchange rate
				const rate = parseFloat(pm.exchangeRate || "0");
				return sum + amount * rate;
			}, 0);

			const operationAmount = parseFloat(data.amount);
			return Math.abs(totalPaymentAmount - operationAmount) < 0.01;
		},
		{
			message: "The sum of payment amounts must equal the operation amount",
			path: ["payments"],
		},
	);

export const OperationIdParamSchema = z.object({
	id: ResourceIdSchema,
});

export const OperationFilterSchema = z
	.object({
		clientId: ResourceIdSchema.optional(),
		invoiceId: ResourceIdSchema.optional(),
		activityCode: multiEnum(ActivityCodeSchema),
		operationTypeCode: z.string().optional(),
		branchPostalCode: z.string().regex(POSTAL_CODE_REGEX).optional(),
		alertTypeCode: z.string().optional(),
		watchlistStatus: multiEnum(
			z.enum([
				"PENDING",
				"QUEUED",
				"CHECKING",
				"COMPLETED",
				"ERROR",
				"NOT_AVAILABLE",
			]),
		),
		dataSource: multiEnum(DataSourceSchema),
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

// ============================================================================
// Bulk import schema for legacy system integration
// ============================================================================

/**
 * Soft-validated operation for bulk import.
 * Same structure as OperationCreateSchema but:
 * - Payment amount validation is relaxed (warning instead of error)
 * - dataSource defaults to "IMPORT"
 * - Missing VA extension fields produce warnings, not errors
 */
const BulkOperationItemSchema = BaseOperationSchema.extend({
	dataSource: DataSourceSchema.default("IMPORT"),
	vehicle: VehicleExtensionSchema.optional(),
	realEstate: RealEstateExtensionSchema.optional(),
	jewelry: JewelryExtensionSchema.optional(),
	virtualAsset: VirtualAssetExtensionSchema.optional(),
	gambling: GamblingExtensionSchema.optional(),
	rental: RentalExtensionSchema.optional(),
	armoring: ArmoringExtensionSchema.optional(),
	donation: DonationExtensionSchema.optional(),
	loan: LoanExtensionSchema.optional(),
	official: OfficialExtensionSchema.optional(),
	notary: NotaryExtensionSchema.optional(),
	professional: ProfessionalExtensionSchema.optional(),
	travelerCheck: TravelerCheckExtensionSchema.optional(),
	card: CardExtensionSchema.optional(),
	prepaid: PrepaidExtensionSchema.optional(),
	reward: RewardExtensionSchema.optional(),
	valuable: ValuableExtensionSchema.optional(),
	art: ArtExtensionSchema.optional(),
	development: DevelopmentExtensionSchema.optional(),
});

export const BulkOperationImportSchema = z.object({
	operations: z
		.array(BulkOperationItemSchema)
		.min(1, "At least one operation is required")
		.max(100, "Maximum 100 operations per batch"),
	/** When true, stop on first error instead of processing all */
	stopOnError: z.boolean().default(false),
});

export type BulkOperationItemInput = z.infer<typeof BulkOperationItemSchema>;
export type BulkOperationImportInput = z.infer<
	typeof BulkOperationImportSchema
>;

export type OperationCreateInput = z.infer<typeof OperationCreateSchema>;
export type OperationUpdateInput = z.infer<typeof OperationUpdateSchema>;
export type OperationFilters = z.infer<typeof OperationFilterSchema>;
export type OperationPaymentInput = z.infer<typeof OperationPaymentSchema>;
