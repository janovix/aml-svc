import { describe, expect, it } from "vitest";
import {
	mapArmoringToExtension,
	mapArtToExtension,
	mapCardToExtension,
	mapDevelopmentToExtension,
	mapDonationToExtension,
	mapGamblingToExtension,
	mapJewelryToExtension,
	mapLoanToExtension,
	mapNotaryToExtension,
	mapOfficialToExtension,
	mapOperationToEntity,
	mapPaymentToEntity,
	mapPrepaidToExtension,
	mapProfessionalToExtension,
	mapRealEstateToExtension,
	mapRewardToExtension,
	mapRentalToExtension,
	mapTravelerCheckToExtension,
	mapValuableToExtension,
	mapVehicleToExtension,
	mapVirtualAssetToExtension,
} from "./mappers";
import type { Operation, OperationPayment } from "@prisma/client";

describe("mapPaymentToEntity", () => {
	it("maps prisma payment to entity shape", () => {
		const payment = {
			id: "pay-1",
			operationId: "op-1",
			paymentDate: new Date("2024-03-10T15:30:00.000Z"),
			paymentFormCode: "03",
			monetaryInstrumentCode: null,
			currencyCode: "MXN",
			amount: "1234.56",
			exchangeRate: null,
			bankName: "Test Bank",
			accountNumberMasked: "****1234",
			checkNumber: null,
			reference: "REF",
			createdAt: new Date("2024-03-10T16:00:00.000Z"),
			updatedAt: new Date("2024-03-10T16:00:00.000Z"),
		} as unknown as OperationPayment;

		const entity = mapPaymentToEntity(payment);

		expect(entity.id).toBe("pay-1");
		expect(entity.paymentDate).toBe("2024-03-10");
		expect(entity.amount).toBe("1234.56");
		expect(entity.currencyCode).toBe("MXN");
	});
});

const d = new Date("2024-01-01T00:00:00.000Z");

describe("activity extension mappers", () => {
	it("mapVehicleToExtension parses resolvedNames JSON", () => {
		const v = {
			id: "v1",
			operationId: "op1",
			vehicleType: "AUTO",
			brand: "Toyota",
			brandName: null,
			model: "X",
			year: 2020,
			vin: null,
			repuve: null,
			plates: null,
			serialNumber: null,
			flagCountryCode: null,
			registrationNumber: null,
			armorLevelCode: null,
			engineNumber: null,
			description: null,
			resolvedNames: '{"brand":"Toyota MX"}',
		};
		const ext = mapVehicleToExtension(v as never, "Catalog Toyota");
		expect(ext.brandName).toBe("Catalog Toyota");
		expect(ext.resolvedNames).toEqual({ brand: "Toyota MX" });
	});

	it("mapRealEstateToExtension maps registryDate", () => {
		const ext = mapRealEstateToExtension({
			id: "re1",
			operationId: "op1",
			realEstateTypeCode: "HOUSE",
			street: "s",
			externalNumber: "1",
			internalNumber: null,
			neighborhood: "n",
			city: "c",
			stateCode: "CMX",
			postalCode: "01000",
			countryCode: "MX",
			registryFolio: "f",
			registryDate: d,
			landAreaM2: "100",
			constructionAreaM2: null,
			clientFigureCode: null,
			personFigureCode: null,
			description: null,
			resolvedNames: null,
		} as never);
		expect(ext.registryDate).toBe("2024-01-01");
	});

	it("mapJewelryToExtension maps numeric strings", () => {
		const ext = mapJewelryToExtension({
			id: "j1",
			operationId: "op1",
			itemTypeCode: "RING",
			metalType: "GOLD",
			weightGrams: "12.5",
			purity: "24k",
			jewelryDescription: null,
			brand: null,
			brandName: null,
			serialNumber: null,
			tradeUnitCode: null,
			quantity: "1",
			unitPrice: "100",
			resolvedNames: null,
		} as never);
		expect(ext.weightGrams).toBe("12.5");
	});

	it("mapVirtualAssetToExtension maps wallet fields", () => {
		const ext = mapVirtualAssetToExtension({
			id: "va1",
			operationId: "op1",
			assetTypeCode: "BTC",
			assetName: "Bitcoin",
			walletAddressOrigin: "0x1",
			walletAddressDestination: "0x2",
			exchangeName: "X",
			exchangeCountryCode: "US",
			assetQuantity: "1",
			assetUnitPrice: "50000",
			blockchainTxHash: "hash",
			resolvedNames: null,
		} as never);
		expect(ext.assetQuantity).toBe("1");
	});

	it("mapGamblingToExtension maps eventDate", () => {
		const ext = mapGamblingToExtension({
			id: "g1",
			operationId: "op1",
			gameTypeCode: "LOTTO",
			businessLineCode: "b",
			operationMethodCode: "m",
			prizeAmount: "100",
			betAmount: "10",
			ticketNumber: "t",
			eventName: "e",
			eventDate: d,
			propertyTypeCode: null,
			propertyDescription: null,
			resolvedNames: null,
		} as never);
		expect(ext.eventDate).toBe("2024-01-01");
	});

	it("mapRentalToExtension maps contract dates", () => {
		const ext = mapRentalToExtension({
			id: "r1",
			operationId: "op1",
			propertyTypeCode: "HOME",
			rentalPeriodMonths: 12,
			monthlyRent: "5000",
			depositAmount: "1000",
			contractStartDate: d,
			contractEndDate: d,
			street: "s",
			externalNumber: "1",
			internalNumber: null,
			neighborhood: "n",
			city: "c",
			stateCode: "CMX",
			postalCode: "01000",
			countryCode: "MX",
			description: null,
			resolvedNames: null,
		} as never);
		expect(ext.monthlyRent).toBe("5000");
	});

	it("mapArmoringToExtension maps vehicle armor fields", () => {
		const ext = mapArmoringToExtension({
			id: "a1",
			operationId: "op1",
			vehicleTypeCode: "SEDAN",
			armorLevelCode: "L3",
			armorMaterialCode: "STEEL",
			installerName: "Co",
			certificationNumber: "cert",
			description: null,
			resolvedNames: null,
		} as never);
		expect(ext.armorLevelCode).toBe("L3");
	});

	it("mapDonationToExtension maps item value", () => {
		const ext = mapDonationToExtension({
			id: "d1",
			operationId: "op1",
			donationType: "MONETARY",
			purpose: "charity",
			itemTypeCode: null,
			itemDescription: null,
			itemValue: "1000",
			isAnonymous: false,
			campaignName: null,
			resolvedNames: null,
		} as never);
		expect(ext.itemValue).toBe("1000");
	});

	it("mapLoanToExtension maps principal amount", () => {
		const ext = mapLoanToExtension({
			id: "l1",
			operationId: "op1",
			loanTypeCode: "PERSONAL",
			guaranteeTypeCode: null,
			principalAmount: "10000",
			interestRate: "10",
			termMonths: 12,
			monthlyPayment: "900",
			disbursementDate: d,
			maturityDate: d,
			guaranteeDescription: null,
			guaranteeValue: null,
			resolvedNames: null,
		} as never);
		expect(ext.principalAmount).toBe("10000");
	});

	it("mapOfficialToExtension maps act type", () => {
		const ext = mapOfficialToExtension({
			id: "o1",
			operationId: "op1",
			actTypeCode: "TRUST",
			instrumentNumber: "INST-1",
			instrumentDate: d,
			trustTypeCode: null,
			trustIdentifier: null,
			trustPurpose: null,
			movementTypeCode: null,
			assignmentTypeCode: null,
			mergerTypeCode: null,
			incorporationReasonCode: null,
			patrimonyModificationTypeCode: null,
			powerOfAttorneyTypeCode: null,
			grantingTypeCode: null,
			shareholderPositionCode: null,
			sharePercentage: null,
			itemTypeCode: null,
			itemDescription: null,
			itemValue: null,
			resolvedNames: null,
		} as never);
		expect(ext.actTypeCode).toBe("TRUST");
	});

	it("mapNotaryToExtension maps notary act", () => {
		const ext = mapNotaryToExtension({
			id: "n1",
			operationId: "op1",
			notaryActTypeCode: "POA",
			notaryNumber: "123",
			notaryName: "Jane",
			notaryPublicBook: "b",
			notaryPublicPage: "p",
			grantorName: "G",
			beneficiaryName: "B",
			actDate: d,
			description: null,
			resolvedNames: null,
		} as never);
		expect(ext.notaryNumber).toBe("123");
	});

	it("mapProfessionalToExtension maps financial institution", () => {
		const ext = mapProfessionalToExtension({
			id: "p1",
			operationId: "op1",
			serviceTypeCode: "LEGAL",
			serviceAreaCode: null,
			clientFigureCode: null,
			contributionReasonCode: null,
			assignmentTypeCode: null,
			mergerTypeCode: null,
			incorporationReasonCode: null,
			shareholderPositionCode: null,
			sharePercentage: null,
			managedAssetTypeCode: null,
			managementStatusCode: null,
			financialInstitutionTypeCode: "BANK",
			financialInstitutionName: "BBVA",
			occupationCode: null,
			serviceDescription: "Advisory",
			resolvedNames: null,
		} as never);
		expect(ext.financialInstitutionName).toBe("BBVA");
	});

	it("mapTravelerCheckToExtension maps denomination", () => {
		const ext = mapTravelerCheckToExtension({
			id: "t1",
			operationId: "op1",
			denominationCode: "USD100",
			checkCount: 5,
			serialNumbers: "1-5",
			issuerName: "Issuer",
			issuerCountryCode: "US",
			resolvedNames: null,
		} as never);
		expect(ext.checkCount).toBe(5);
	});

	it("mapCardToExtension maps masked number", () => {
		const ext = mapCardToExtension({
			id: "c1",
			operationId: "op1",
			cardTypeCode: "DEBIT",
			cardNumberMasked: "4242",
			cardBrand: "VISA",
			issuerName: "Bank",
			creditLimit: "5000",
			transactionType: "PURCHASE",
			resolvedNames: null,
		} as never);
		expect(ext.cardNumberMasked).toBe("4242");
	});

	it("mapPrepaidToExtension maps reload amount", () => {
		const ext = mapPrepaidToExtension({
			id: "pp1",
			operationId: "op1",
			cardType: "GIFTCARD",
			cardNumberMasked: "****",
			isInitialLoad: true,
			reloadAmount: "200",
			currentBalance: "50",
			issuerName: "Co",
			resolvedNames: null,
		} as never);
		expect(ext.reloadAmount).toBe("200");
	});

	it("mapRewardToExtension maps points", () => {
		const ext = mapRewardToExtension({
			id: "rw1",
			operationId: "op1",
			rewardProgramCode: "PTS",
			rewardDescription: "pts",
			pointsAmount: "1000",
			cashEquivalent: "100",
			description: null,
			resolvedNames: null,
		} as never);
		expect(ext.pointsAmount).toBe("1000");
	});

	it("mapValuableToExtension maps declared value", () => {
		const ext = mapValuableToExtension({
			id: "vl1",
			operationId: "op1",
			valueTypeCode: "WATCH",
			serviceTypeCode: null,
			transportMethod: null,
			originAddress: null,
			destinationAddress: null,
			custodyStartDate: null,
			custodyEndDate: null,
			storageLocation: null,
			declaredValue: "50000",
			insuredValue: null,
			description: "Rolex",
			resolvedNames: null,
		} as never);
		expect(ext.declaredValue).toBe("50000");
	});

	it("mapArtToExtension maps artist field", () => {
		const ext = mapArtToExtension({
			id: "ar1",
			operationId: "op1",
			artworkTypeCode: "PAINTING",
			title: "Sun",
			artist: "Painter",
			yearCreated: 2020,
			medium: "oil",
			dimensions: "1x1",
			provenance: null,
			certificateAuthenticity: null,
			previousOwner: null,
			isAntique: false,
			auctionHouse: null,
			lotNumber: null,
			resolvedNames: null,
		} as never);
		expect(ext.artist).toBe("Painter");
	});

	it("mapDevelopmentToExtension maps project", () => {
		const ext = mapDevelopmentToExtension({
			id: "dv1",
			operationId: "op1",
			developmentTypeCode: "SUBDIVISION",
			creditTypeCode: "MORTGAGE",
			projectName: "P",
			projectLocation: "L",
			contributionType: "EQUITY",
			contributionAmount: "100000",
			thirdPartyTypeCode: null,
			thirdPartyName: null,
			financialInstitutionTypeCode: null,
			financialInstitutionName: null,
			resolvedNames: null,
		} as never);
		expect(ext.projectName).toBe("P");
	});
});

describe("mapOperationToEntity", () => {
	it("maps operation with vehicle extension and catalog brand name", () => {
		const op = {
			id: "op1",
			organizationId: "org1",
			clientId: "cl1",
			invoiceId: null,
			activityCode: "VEH",
			operationTypeCode: "SALE",
			operationDate: d,
			branchPostalCode: "01000",
			amount: "1000",
			currencyCode: "MXN",
			exchangeRate: null,
			amountMxn: null,
			umaValue: null,
			umaDailyValue: null,
			alertTypeCode: null,
			alertDescription: null,
			watchlistStatus: null,
			watchlistCheckedAt: null,
			watchlistResult: null,
			watchlistFlags: null,
			priorityCode: null,
			dataSource: "MANUAL",
			completenessStatus: "COMPLETE",
			missingFields: null,
			referenceNumber: null,
			notes: null,
			createdAt: d,
			updatedAt: d,
			deletedAt: null,
			payments: [],
			vehicle: {
				id: "v1",
				operationId: "op1",
				vehicleType: "AUTO",
				brand: "br1",
				brandName: null,
				model: "M",
				year: 2020,
				vin: null,
				repuve: null,
				plates: null,
				serialNumber: null,
				flagCountryCode: null,
				registrationNumber: null,
				armorLevelCode: null,
				engineNumber: null,
				description: null,
				resolvedNames: null,
			},
		} as unknown as Operation;
		const names = new Map([["br1", "Brand Display"]]);
		const entity = mapOperationToEntity(op, names);
		expect(entity.activityCode).toBe("VEH");
		expect(entity.vehicle?.brandName).toBe("Brand Display");
	});
});
