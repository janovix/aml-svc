import type {
	Operation,
	OperationPayment,
	OperationVehicle,
	OperationRealEstate,
	OperationJewelry,
	OperationVirtualAsset,
	OperationGambling,
	OperationRental,
	OperationArmoring,
	OperationDonation,
	OperationLoan,
	OperationOfficial,
	OperationNotary,
	OperationProfessional,
	OperationTravelerCheck,
	OperationCard,
	OperationPrepaid,
	OperationReward,
	OperationValuable,
	OperationArt,
	OperationDevelopment,
} from "@prisma/client";
import type {
	OperationEntity,
	OperationPaymentEntity,
	ActivityCode,
	WatchlistStatus,
	VehicleExtension,
	RealEstateExtension,
	JewelryExtension,
	VirtualAssetExtension,
	GamblingExtension,
	RentalExtension,
	ArmoringExtension,
	DonationExtension,
	LoanExtension,
	OfficialExtension,
	NotaryExtension,
	ProfessionalExtension,
	TravelerCheckExtension,
	CardExtension,
	PrepaidExtension,
	RewardExtension,
	ValuableExtension,
	ArtExtension,
	DevelopmentExtension,
	VehicleType,
} from "./types";

export function mapPaymentToEntity(
	payment: OperationPayment,
): OperationPaymentEntity {
	return {
		id: payment.id,
		operationId: payment.operationId,
		paymentDate: payment.paymentDate.toISOString().split("T")[0],
		paymentFormCode: payment.paymentFormCode,
		monetaryInstrumentCode: payment.monetaryInstrumentCode,
		currencyCode: payment.currencyCode,
		amount: payment.amount.toString(),
		bankName: payment.bankName,
		accountNumberMasked: payment.accountNumberMasked,
		checkNumber: payment.checkNumber,
		reference: payment.reference,
		createdAt: payment.createdAt.toISOString(),
		updatedAt: payment.updatedAt.toISOString(),
	};
}

export function mapVehicleToExtension(
	vehicle: OperationVehicle,
): VehicleExtension {
	return {
		id: vehicle.id,
		operationId: vehicle.operationId,
		vehicleType: vehicle.vehicleType as VehicleType,
		brand: vehicle.brand,
		model: vehicle.model,
		year: vehicle.year,
		vin: vehicle.vin,
		repuve: vehicle.repuve,
		plates: vehicle.plates,
		serialNumber: vehicle.serialNumber,
		flagCountryCode: vehicle.flagCountryCode,
		registrationNumber: vehicle.registrationNumber,
		armorLevelCode: vehicle.armorLevelCode,
		engineNumber: vehicle.engineNumber,
		description: vehicle.description,
	};
}

export function mapRealEstateToExtension(
	re: OperationRealEstate,
): RealEstateExtension {
	return {
		id: re.id,
		operationId: re.operationId,
		propertyTypeCode: re.propertyTypeCode,
		street: re.street,
		externalNumber: re.externalNumber,
		internalNumber: re.internalNumber,
		neighborhood: re.neighborhood,
		postalCode: re.postalCode,
		municipality: re.municipality,
		stateCode: re.stateCode,
		countryCode: re.countryCode,
		registryFolio: re.registryFolio,
		registryDate: re.registryDate?.toISOString().split("T")[0] ?? null,
		landAreaM2: re.landAreaM2?.toString() ?? null,
		constructionAreaM2: re.constructionAreaM2?.toString() ?? null,
		clientFigureCode: re.clientFigureCode,
		personFigureCode: re.personFigureCode,
		description: re.description,
	};
}

export function mapJewelryToExtension(j: OperationJewelry): JewelryExtension {
	return {
		id: j.id,
		operationId: j.operationId,
		itemTypeCode: j.itemTypeCode,
		metalType: j.metalType,
		weightGrams: j.weightGrams?.toString() ?? null,
		purity: j.purity,
		jewelryDescription: j.jewelryDescription,
		brand: j.brand,
		serialNumber: j.serialNumber,
		tradeUnitCode: j.tradeUnitCode,
		quantity: j.quantity?.toString() ?? null,
		unitPrice: j.unitPrice?.toString() ?? null,
	};
}

export function mapVirtualAssetToExtension(
	va: OperationVirtualAsset,
): VirtualAssetExtension {
	return {
		id: va.id,
		operationId: va.operationId,
		assetTypeCode: va.assetTypeCode,
		assetName: va.assetName,
		walletAddressOrigin: va.walletAddressOrigin,
		walletAddressDestination: va.walletAddressDestination,
		exchangeName: va.exchangeName,
		exchangeCountryCode: va.exchangeCountryCode,
		assetQuantity: va.assetQuantity?.toString() ?? null,
		assetUnitPrice: va.assetUnitPrice?.toString() ?? null,
		blockchainTxHash: va.blockchainTxHash,
	};
}

export function mapGamblingToExtension(
	g: OperationGambling,
): GamblingExtension {
	return {
		id: g.id,
		operationId: g.operationId,
		gameTypeCode: g.gameTypeCode,
		businessLineCode: g.businessLineCode,
		operationMethodCode: g.operationMethodCode,
		prizeAmount: g.prizeAmount?.toString() ?? null,
		betAmount: g.betAmount?.toString() ?? null,
		ticketNumber: g.ticketNumber,
		eventName: g.eventName,
		eventDate: g.eventDate?.toISOString().split("T")[0] ?? null,
		propertyTypeCode: g.propertyTypeCode,
		propertyDescription: g.propertyDescription,
	};
}

export function mapRentalToExtension(r: OperationRental): RentalExtension {
	return {
		id: r.id,
		operationId: r.operationId,
		propertyTypeCode: r.propertyTypeCode,
		rentalPeriodMonths: r.rentalPeriodMonths,
		monthlyRent: r.monthlyRent?.toString() ?? null,
		depositAmount: r.depositAmount?.toString() ?? null,
		contractStartDate: r.contractStartDate?.toISOString().split("T")[0] ?? null,
		contractEndDate: r.contractEndDate?.toISOString().split("T")[0] ?? null,
		street: r.street,
		externalNumber: r.externalNumber,
		internalNumber: r.internalNumber,
		neighborhood: r.neighborhood,
		postalCode: r.postalCode,
		municipality: r.municipality,
		stateCode: r.stateCode,
		isPrepaid: r.isPrepaid,
		prepaidMonths: r.prepaidMonths,
		description: r.description,
	};
}

export function mapArmoringToExtension(
	a: OperationArmoring,
): ArmoringExtension {
	return {
		id: a.id,
		operationId: a.operationId,
		itemType: a.itemType,
		itemStatusCode: a.itemStatusCode,
		armorLevelCode: a.armorLevelCode,
		armoredPartCode: a.armoredPartCode,
		vehicleType: a.vehicleType,
		vehicleBrand: a.vehicleBrand,
		vehicleModel: a.vehicleModel,
		vehicleYear: a.vehicleYear,
		vehicleVin: a.vehicleVin,
		vehiclePlates: a.vehiclePlates,
		serviceDescription: a.serviceDescription,
	};
}

export function mapDonationToExtension(
	d: OperationDonation,
): DonationExtension {
	return {
		id: d.id,
		operationId: d.operationId,
		donationType: d.donationType,
		purpose: d.purpose,
		itemTypeCode: d.itemTypeCode,
		itemDescription: d.itemDescription,
		itemValue: d.itemValue?.toString() ?? null,
		isAnonymous: d.isAnonymous,
		campaignName: d.campaignName,
	};
}

export function mapLoanToExtension(l: OperationLoan): LoanExtension {
	return {
		id: l.id,
		operationId: l.operationId,
		loanTypeCode: l.loanTypeCode,
		guaranteeTypeCode: l.guaranteeTypeCode,
		principalAmount: l.principalAmount.toString(),
		interestRate: l.interestRate?.toString() ?? null,
		termMonths: l.termMonths,
		monthlyPayment: l.monthlyPayment?.toString() ?? null,
		disbursementDate: l.disbursementDate?.toISOString().split("T")[0] ?? null,
		maturityDate: l.maturityDate?.toISOString().split("T")[0] ?? null,
		guaranteeDescription: l.guaranteeDescription,
		guaranteeValue: l.guaranteeValue?.toString() ?? null,
	};
}

export function mapOfficialToExtension(
	o: OperationOfficial,
): OfficialExtension {
	return {
		id: o.id,
		operationId: o.operationId,
		actTypeCode: o.actTypeCode,
		instrumentNumber: o.instrumentNumber,
		instrumentDate: o.instrumentDate?.toISOString().split("T")[0] ?? null,
		trustTypeCode: o.trustTypeCode,
		trustIdentifier: o.trustIdentifier,
		trustPurpose: o.trustPurpose,
		movementTypeCode: o.movementTypeCode,
		assignmentTypeCode: o.assignmentTypeCode,
		mergerTypeCode: o.mergerTypeCode,
		incorporationReasonCode: o.incorporationReasonCode,
		patrimonyModificationTypeCode: o.patrimonyModificationTypeCode,
		powerOfAttorneyTypeCode: o.powerOfAttorneyTypeCode,
		grantingTypeCode: o.grantingTypeCode,
		shareholderPositionCode: o.shareholderPositionCode,
		sharePercentage: o.sharePercentage?.toString() ?? null,
		itemTypeCode: o.itemTypeCode,
		itemDescription: o.itemDescription,
		itemValue: o.itemValue?.toString() ?? null,
	};
}

export function mapNotaryToExtension(n: OperationNotary): NotaryExtension {
	return {
		id: n.id,
		operationId: n.operationId,
		actTypeCode: n.actTypeCode,
		notaryNumber: n.notaryNumber,
		notaryStateCode: n.notaryStateCode,
		instrumentNumber: n.instrumentNumber,
		instrumentDate: n.instrumentDate?.toISOString().split("T")[0] ?? null,
		legalEntityTypeCode: n.legalEntityTypeCode,
		personCharacterTypeCode: n.personCharacterTypeCode,
		incorporationReasonCode: n.incorporationReasonCode,
		patrimonyModificationTypeCode: n.patrimonyModificationTypeCode,
		powerOfAttorneyTypeCode: n.powerOfAttorneyTypeCode,
		grantingTypeCode: n.grantingTypeCode,
		shareholderPositionCode: n.shareholderPositionCode,
		sharePercentage: n.sharePercentage?.toString() ?? null,
		itemTypeCode: n.itemTypeCode,
		itemDescription: n.itemDescription,
		appraisalValue: n.appraisalValue?.toString() ?? null,
		guaranteeTypeCode: n.guaranteeTypeCode,
	};
}

export function mapProfessionalToExtension(
	p: OperationProfessional,
): ProfessionalExtension {
	return {
		id: p.id,
		operationId: p.operationId,
		serviceTypeCode: p.serviceTypeCode,
		serviceAreaCode: p.serviceAreaCode,
		clientFigureCode: p.clientFigureCode,
		contributionReasonCode: p.contributionReasonCode,
		assignmentTypeCode: p.assignmentTypeCode,
		mergerTypeCode: p.mergerTypeCode,
		incorporationReasonCode: p.incorporationReasonCode,
		shareholderPositionCode: p.shareholderPositionCode,
		sharePercentage: p.sharePercentage?.toString() ?? null,
		managedAssetTypeCode: p.managedAssetTypeCode,
		managementStatusCode: p.managementStatusCode,
		financialInstitutionTypeCode: p.financialInstitutionTypeCode,
		financialInstitutionName: p.financialInstitutionName,
		occupationCode: p.occupationCode,
		serviceDescription: p.serviceDescription,
	};
}

export function mapTravelerCheckToExtension(
	tc: OperationTravelerCheck,
): TravelerCheckExtension {
	return {
		id: tc.id,
		operationId: tc.operationId,
		denominationCode: tc.denominationCode,
		checkCount: tc.checkCount,
		serialNumbers: tc.serialNumbers,
		issuerName: tc.issuerName,
		issuerCountryCode: tc.issuerCountryCode,
	};
}

export function mapCardToExtension(c: OperationCard): CardExtension {
	return {
		id: c.id,
		operationId: c.operationId,
		cardTypeCode: c.cardTypeCode,
		cardNumberMasked: c.cardNumberMasked,
		cardBrand: c.cardBrand,
		issuerName: c.issuerName,
		creditLimit: c.creditLimit?.toString() ?? null,
		transactionType: c.transactionType,
	};
}

export function mapPrepaidToExtension(p: OperationPrepaid): PrepaidExtension {
	return {
		id: p.id,
		operationId: p.operationId,
		cardType: p.cardType,
		cardNumberMasked: p.cardNumberMasked,
		isInitialLoad: p.isInitialLoad,
		reloadAmount: p.reloadAmount?.toString() ?? null,
		currentBalance: p.currentBalance?.toString() ?? null,
		issuerName: p.issuerName,
	};
}

export function mapRewardToExtension(r: OperationReward): RewardExtension {
	return {
		id: r.id,
		operationId: r.operationId,
		rewardType: r.rewardType,
		programName: r.programName,
		pointsAmount: r.pointsAmount?.toString() ?? null,
		pointsValue: r.pointsValue?.toString() ?? null,
		pointsExpiryDate: r.pointsExpiryDate?.toISOString().split("T")[0] ?? null,
		redemptionType: r.redemptionType,
		redemptionDescription: r.redemptionDescription,
	};
}

export function mapValuableToExtension(
	v: OperationValuable,
): ValuableExtension {
	return {
		id: v.id,
		operationId: v.operationId,
		valueTypeCode: v.valueTypeCode,
		serviceTypeCode: v.serviceTypeCode,
		transportMethod: v.transportMethod,
		originAddress: v.originAddress,
		destinationAddress: v.destinationAddress,
		custodyStartDate: v.custodyStartDate?.toISOString().split("T")[0] ?? null,
		custodyEndDate: v.custodyEndDate?.toISOString().split("T")[0] ?? null,
		storageLocation: v.storageLocation,
		declaredValue: v.declaredValue?.toString() ?? null,
		insuredValue: v.insuredValue?.toString() ?? null,
		description: v.description,
	};
}

export function mapArtToExtension(a: OperationArt): ArtExtension {
	return {
		id: a.id,
		operationId: a.operationId,
		artworkTypeCode: a.artworkTypeCode,
		title: a.title,
		artist: a.artist,
		yearCreated: a.yearCreated,
		medium: a.medium,
		dimensions: a.dimensions,
		provenance: a.provenance,
		certificateAuthenticity: a.certificateAuthenticity,
		previousOwner: a.previousOwner,
		isAntique: a.isAntique,
		auctionHouse: a.auctionHouse,
		lotNumber: a.lotNumber,
	};
}

export function mapDevelopmentToExtension(
	d: OperationDevelopment,
): DevelopmentExtension {
	return {
		id: d.id,
		operationId: d.operationId,
		developmentTypeCode: d.developmentTypeCode,
		creditTypeCode: d.creditTypeCode,
		projectName: d.projectName,
		projectLocation: d.projectLocation,
		contributionType: d.contributionType,
		contributionAmount: d.contributionAmount?.toString() ?? null,
		thirdPartyTypeCode: d.thirdPartyTypeCode,
		thirdPartyName: d.thirdPartyName,
		financialInstitutionTypeCode: d.financialInstitutionTypeCode,
		financialInstitutionName: d.financialInstitutionName,
	};
}

type OperationWithRelations = Operation & {
	payments?: OperationPayment[];
	vehicle?: OperationVehicle | null;
	realEstate?: OperationRealEstate | null;
	jewelry?: OperationJewelry | null;
	virtualAsset?: OperationVirtualAsset | null;
	gambling?: OperationGambling | null;
	rental?: OperationRental | null;
	armoring?: OperationArmoring | null;
	donation?: OperationDonation | null;
	loan?: OperationLoan | null;
	official?: OperationOfficial | null;
	notary?: OperationNotary | null;
	professional?: OperationProfessional | null;
	travelerCheck?: OperationTravelerCheck | null;
	card?: OperationCard | null;
	prepaid?: OperationPrepaid | null;
	reward?: OperationReward | null;
	valuable?: OperationValuable | null;
	art?: OperationArt | null;
	development?: OperationDevelopment | null;
};

export function mapOperationToEntity(
	op: OperationWithRelations,
): OperationEntity {
	return {
		id: op.id,
		organizationId: op.organizationId,
		clientId: op.clientId,
		invoiceId: op.invoiceId,
		activityCode: op.activityCode as ActivityCode,
		operationTypeCode: op.operationTypeCode,
		operationDate: op.operationDate.toISOString().split("T")[0],
		branchPostalCode: op.branchPostalCode,
		amount: op.amount.toString(),
		currencyCode: op.currencyCode,
		exchangeRate: op.exchangeRate?.toString() ?? null,
		amountMxn: op.amountMxn?.toString() ?? null,
		umaValue: op.umaValue?.toString() ?? null,
		umaDailyValue: op.umaDailyValue?.toString() ?? null,
		alertTypeCode: op.alertTypeCode,
		alertDescription: op.alertDescription,
		watchlistStatus: op.watchlistStatus as WatchlistStatus | null,
		watchlistCheckedAt: op.watchlistCheckedAt?.toISOString() ?? null,
		watchlistResult: op.watchlistResult ? JSON.parse(op.watchlistResult) : null,
		watchlistFlags: op.watchlistFlags,
		priorityCode: op.priorityCode,
		dataSource: (op.dataSource ?? "MANUAL") as OperationEntity["dataSource"],
		completenessStatus: (op.completenessStatus ??
			"COMPLETE") as OperationEntity["completenessStatus"],
		missingFields: op.missingFields ? JSON.parse(op.missingFields) : null,
		referenceNumber: op.referenceNumber,
		notes: op.notes,
		createdAt: op.createdAt.toISOString(),
		updatedAt: op.updatedAt.toISOString(),
		deletedAt: op.deletedAt?.toISOString() ?? null,
		payments: op.payments?.map(mapPaymentToEntity) ?? [],
		// Activity extensions
		vehicle: op.vehicle ? mapVehicleToExtension(op.vehicle) : null,
		realEstate: op.realEstate ? mapRealEstateToExtension(op.realEstate) : null,
		jewelry: op.jewelry ? mapJewelryToExtension(op.jewelry) : null,
		virtualAsset: op.virtualAsset
			? mapVirtualAssetToExtension(op.virtualAsset)
			: null,
		gambling: op.gambling ? mapGamblingToExtension(op.gambling) : null,
		rental: op.rental ? mapRentalToExtension(op.rental) : null,
		armoring: op.armoring ? mapArmoringToExtension(op.armoring) : null,
		donation: op.donation ? mapDonationToExtension(op.donation) : null,
		loan: op.loan ? mapLoanToExtension(op.loan) : null,
		official: op.official ? mapOfficialToExtension(op.official) : null,
		notary: op.notary ? mapNotaryToExtension(op.notary) : null,
		professional: op.professional
			? mapProfessionalToExtension(op.professional)
			: null,
		travelerCheck: op.travelerCheck
			? mapTravelerCheckToExtension(op.travelerCheck)
			: null,
		card: op.card ? mapCardToExtension(op.card) : null,
		prepaid: op.prepaid ? mapPrepaidToExtension(op.prepaid) : null,
		reward: op.reward ? mapRewardToExtension(op.reward) : null,
		valuable: op.valuable ? mapValuableToExtension(op.valuable) : null,
		art: op.art ? mapArtToExtension(op.art) : null,
		development: op.development
			? mapDevelopmentToExtension(op.development)
			: null,
	};
}
