import type { PrismaClient, Prisma } from "@prisma/client";
import type {
	OperationEntity,
	OperationListResult,
	ActivityCode,
} from "./types";
import type {
	OperationFilters,
	OperationCreateInput,
	OperationUpdateInput,
} from "./schemas";
import { mapOperationToEntity } from "./mappers";

// Include clause for all activity extensions
const operationInclude = {
	payments: true,
	vehicle: true,
	realEstate: true,
	jewelry: true,
	virtualAsset: true,
	gambling: true,
	rental: true,
	armoring: true,
	donation: true,
	loan: true,
	official: true,
	notary: true,
	professional: true,
	travelerCheck: true,
	card: true,
	prepaid: true,
	reward: true,
	valuable: true,
	art: true,
	development: true,
} as const;

export class OperationRepository {
	constructor(private prisma: PrismaClient) {}

	async create(
		organizationId: string,
		input: OperationCreateInput,
		umaInfo?: { umaValue: number; umaDailyValue: number },
	): Promise<OperationEntity> {
		const operationId = crypto.randomUUID();

		// Calculate amount in MXN if foreign currency
		const exchangeRate = input.exchangeRate
			? parseFloat(input.exchangeRate)
			: 1;
		const amountMxn = parseFloat(input.amount) * exchangeRate;

		// Auto-detect completeness if not explicitly provided
		const { completenessStatus, missingFields } = input.completenessStatus
			? {
					completenessStatus: input.completenessStatus,
					missingFields: input.missingFields ?? null,
				}
			: this.detectCompleteness(input);

		// Create operation with activity extension in batch transaction (D1 compatible)
		const operationCreateQuery = this.prisma.operation.create({
			data: {
				id: operationId,
				organizationId,
				clientId: input.clientId,
				invoiceId: input.invoiceId,
				activityCode: input.activityCode,
				operationTypeCode: input.operationTypeCode,
				operationDate: new Date(input.operationDate),
				branchPostalCode: input.branchPostalCode,
				amount: input.amount,
				currencyCode: input.currencyCode,
				exchangeRate: input.exchangeRate,
				amountMxn: amountMxn.toString(),
				umaValue: umaInfo?.umaValue.toString(),
				umaDailyValue: umaInfo?.umaDailyValue.toString(),
				alertTypeCode: input.alertTypeCode,
				alertDescription: input.alertDescription,
				priorityCode: input.priorityCode,
				dataSource: input.dataSource ?? "MANUAL",
				completenessStatus,
				missingFields: missingFields ? JSON.stringify(missingFields) : null,
				referenceNumber: input.referenceNumber,
				notes: input.notes,
				payments: {
					create: input.payments.map((p) => ({
						id: crypto.randomUUID(),
						paymentDate: new Date(p.paymentDate),
						paymentFormCode: p.paymentFormCode,
						monetaryInstrumentCode: p.monetaryInstrumentCode,
						currencyCode: p.currencyCode,
						amount: p.amount,
						exchangeRate: p.exchangeRate ?? null,
						bankName: p.bankName,
						accountNumberMasked: p.accountNumberMasked,
						checkNumber: p.checkNumber,
						reference: p.reference,
					})),
				},
			},
		});

		const queries: Prisma.PrismaPromise<unknown>[] = [operationCreateQuery];

		// Add activity extension query based on activity code
		const extensionQuery = this.getActivityExtensionQuery(operationId, input);
		if (extensionQuery) {
			queries.push(extensionQuery);
		}

		await this.prisma.$transaction(queries);

		// Fetch with all relations
		const result = await this.prisma.operation.findUnique({
			where: { id: operationId },
			include: operationInclude,
		});

		if (!result) {
			throw new Error(`Operation ${operationId} not found after creation`);
		}
		return mapOperationToEntity(result);
	}

	/**
	 * Get activity extension query for batch transaction (D1 compatible)
	 * Returns a Prisma query that can be added to a batch transaction
	 */
	private getActivityExtensionQuery(
		operationId: string,
		input: OperationCreateInput,
	): Prisma.PrismaPromise<unknown> | null {
		const extensionId = crypto.randomUUID();

		switch (input.activityCode as ActivityCode) {
			case "VEH":
				if (input.vehicle) {
					return this.prisma.operationVehicle.create({
						data: { id: extensionId, operationId, ...input.vehicle },
					});
				}
				break;
			case "INM":
				if (input.realEstate) {
					return this.prisma.operationRealEstate.create({
						data: {
							id: extensionId,
							operationId,
							...input.realEstate,
							registryDate: input.realEstate.registryDate
								? new Date(input.realEstate.registryDate)
								: null,
						},
					});
				}
				break;
			case "MJR":
				if (input.jewelry) {
					return this.prisma.operationJewelry.create({
						data: { id: extensionId, operationId, ...input.jewelry },
					});
				}
				break;
			case "AVI":
				if (input.virtualAsset) {
					return this.prisma.operationVirtualAsset.create({
						data: { id: extensionId, operationId, ...input.virtualAsset },
					});
				}
				break;
			case "JYS":
				if (input.gambling) {
					return this.prisma.operationGambling.create({
						data: {
							id: extensionId,
							operationId,
							...input.gambling,
							eventDate: input.gambling.eventDate
								? new Date(input.gambling.eventDate)
								: null,
						},
					});
				}
				break;
			case "ARI":
				if (input.rental) {
					return this.prisma.operationRental.create({
						data: {
							id: extensionId,
							operationId,
							...input.rental,
							contractStartDate: input.rental.contractStartDate
								? new Date(input.rental.contractStartDate)
								: null,
							contractEndDate: input.rental.contractEndDate
								? new Date(input.rental.contractEndDate)
								: null,
						},
					});
				}
				break;
			case "BLI":
				if (input.armoring) {
					return this.prisma.operationArmoring.create({
						data: { id: extensionId, operationId, ...input.armoring },
					});
				}
				break;
			case "DON":
				if (input.donation) {
					return this.prisma.operationDonation.create({
						data: { id: extensionId, operationId, ...input.donation },
					});
				}
				break;
			case "MPC":
				if (input.loan) {
					return this.prisma.operationLoan.create({
						data: {
							id: extensionId,
							operationId,
							...input.loan,
							disbursementDate: input.loan.disbursementDate
								? new Date(input.loan.disbursementDate)
								: null,
							maturityDate: input.loan.maturityDate
								? new Date(input.loan.maturityDate)
								: null,
						},
					});
				}
				break;
			case "FEP":
				if (input.official) {
					return this.prisma.operationOfficial.create({
						data: {
							id: extensionId,
							operationId,
							...input.official,
							instrumentDate: input.official.instrumentDate
								? new Date(input.official.instrumentDate)
								: null,
						},
					});
				}
				break;
			case "FES":
				if (input.notary) {
					return this.prisma.operationNotary.create({
						data: {
							id: extensionId,
							operationId,
							...input.notary,
							instrumentDate: input.notary.instrumentDate
								? new Date(input.notary.instrumentDate)
								: null,
						},
					});
				}
				break;
			case "SPR":
				if (input.professional) {
					return this.prisma.operationProfessional.create({
						data: { id: extensionId, operationId, ...input.professional },
					});
				}
				break;
			case "CHV":
				if (input.travelerCheck) {
					return this.prisma.operationTravelerCheck.create({
						data: { id: extensionId, operationId, ...input.travelerCheck },
					});
				}
				break;
			case "TSC":
				if (input.card) {
					return this.prisma.operationCard.create({
						data: { id: extensionId, operationId, ...input.card },
					});
				}
				break;
			case "TPP":
				if (input.prepaid) {
					return this.prisma.operationPrepaid.create({
						data: { id: extensionId, operationId, ...input.prepaid },
					});
				}
				break;
			case "TDR":
				if (input.reward) {
					return this.prisma.operationReward.create({
						data: {
							id: extensionId,
							operationId,
							...input.reward,
							pointsExpiryDate: input.reward.pointsExpiryDate
								? new Date(input.reward.pointsExpiryDate)
								: null,
						},
					});
				}
				break;
			case "TCV":
				if (input.valuable) {
					return this.prisma.operationValuable.create({
						data: {
							id: extensionId,
							operationId,
							...input.valuable,
							custodyStartDate: input.valuable.custodyStartDate
								? new Date(input.valuable.custodyStartDate)
								: null,
							custodyEndDate: input.valuable.custodyEndDate
								? new Date(input.valuable.custodyEndDate)
								: null,
						},
					});
				}
				break;
			case "OBA":
				if (input.art) {
					return this.prisma.operationArt.create({
						data: { id: extensionId, operationId, ...input.art },
					});
				}
				break;
			case "DIN":
				if (input.development) {
					return this.prisma.operationDevelopment.create({
						data: { id: extensionId, operationId, ...input.development },
					});
				}
				break;
		}
		return null;
	}

	async findById(
		organizationId: string,
		id: string,
	): Promise<OperationEntity | null> {
		const operation = await this.prisma.operation.findFirst({
			where: {
				id,
				organizationId,
				deletedAt: null,
			},
			include: operationInclude,
		});

		return operation ? mapOperationToEntity(operation) : null;
	}

	async list(
		organizationId: string,
		filters: OperationFilters,
	): Promise<OperationListResult> {
		const where: Prisma.OperationWhereInput = {
			organizationId,
			deletedAt: null,
		};

		if (filters.clientId) {
			where.clientId = filters.clientId;
		}

		if (filters.invoiceId) {
			where.invoiceId = filters.invoiceId;
		}

		if (filters.activityCode) {
			where.activityCode = filters.activityCode;
		}

		if (filters.operationTypeCode) {
			where.operationTypeCode = filters.operationTypeCode;
		}

		if (filters.branchPostalCode) {
			where.branchPostalCode = filters.branchPostalCode;
		}

		if (filters.alertTypeCode) {
			where.alertTypeCode = filters.alertTypeCode;
		}

		if (filters.watchlistStatus) {
			where.watchlistStatus = filters.watchlistStatus;
		}

		if (filters.startDate || filters.endDate) {
			where.operationDate = {};
			if (filters.startDate) {
				where.operationDate.gte = new Date(filters.startDate);
			}
			if (filters.endDate) {
				where.operationDate.lte = new Date(filters.endDate);
			}
		}

		if (filters.minAmount || filters.maxAmount) {
			where.amount = {};
			if (filters.minAmount) {
				where.amount.gte = parseFloat(filters.minAmount);
			}
			if (filters.maxAmount) {
				where.amount.lte = parseFloat(filters.maxAmount);
			}
		}

		const [operations, total] = await Promise.all([
			this.prisma.operation.findMany({
				where,
				include: operationInclude,
				orderBy: { operationDate: "desc" },
				skip: (filters.page - 1) * filters.limit,
				take: filters.limit,
			}),
			this.prisma.operation.count({ where }),
		]);

		return {
			data: operations.map(mapOperationToEntity),
			pagination: {
				page: filters.page,
				limit: filters.limit,
				total,
				totalPages: Math.ceil(total / filters.limit),
			},
		};
	}

	async update(
		organizationId: string,
		id: string,
		input: OperationUpdateInput,
		umaInfo?: { umaValue: number; umaDailyValue: number },
	): Promise<OperationEntity | null> {
		const existing = await this.prisma.operation.findFirst({
			where: { id, organizationId, deletedAt: null },
		});

		if (!existing) {
			return null;
		}

		const exchangeRate = input.exchangeRate
			? parseFloat(input.exchangeRate)
			: 1;
		const amountMxn = parseFloat(input.amount) * exchangeRate;

		// Build batch transaction queries (D1 compatible)
		const queries: Prisma.PrismaPromise<unknown>[] = [
			// Update base operation
			this.prisma.operation.update({
				where: { id },
				data: {
					invoiceId: input.invoiceId,
					operationTypeCode: input.operationTypeCode,
					operationDate: new Date(input.operationDate),
					branchPostalCode: input.branchPostalCode,
					amount: input.amount,
					currencyCode: input.currencyCode,
					exchangeRate: input.exchangeRate,
					amountMxn: amountMxn.toString(),
					umaValue: umaInfo?.umaValue.toString(),
					umaDailyValue: umaInfo?.umaDailyValue.toString(),
					alertTypeCode: input.alertTypeCode,
					alertDescription: input.alertDescription,
					priorityCode: input.priorityCode,
					dataSource: input.dataSource,
					completenessStatus: input.completenessStatus,
					missingFields: input.missingFields
						? JSON.stringify(input.missingFields)
						: undefined,
					referenceNumber: input.referenceNumber,
					notes: input.notes,
				},
			}),
			// Delete existing payments
			this.prisma.operationPayment.deleteMany({ where: { operationId: id } }),
			// Recreate payments
			this.prisma.operationPayment.createMany({
				data: input.payments.map((p) => ({
					id: crypto.randomUUID(),
					operationId: id,
					paymentDate: new Date(p.paymentDate),
					paymentFormCode: p.paymentFormCode,
					monetaryInstrumentCode: p.monetaryInstrumentCode,
					currencyCode: p.currencyCode,
					amount: p.amount,
					exchangeRate: p.exchangeRate ?? null,
					bankName: p.bankName,
					accountNumberMasked: p.accountNumberMasked,
					checkNumber: p.checkNumber,
					reference: p.reference,
				})),
			}),
		];

		// Add activity extension update query
		const extensionQuery = this.getActivityExtensionUpdateQuery(
			id,
			existing.activityCode as ActivityCode,
			input,
		);
		if (extensionQuery) {
			queries.push(extensionQuery);
		}

		await this.prisma.$transaction(queries);

		return this.findById(organizationId, id);
	}

	/**
	 * Get activity extension update query for batch transaction (D1 compatible)
	 * Returns a Prisma upsert query that can be added to a batch transaction
	 */
	private getActivityExtensionUpdateQuery(
		operationId: string,
		activityCode: ActivityCode,
		input: OperationUpdateInput,
	): Prisma.PrismaPromise<unknown> | null {
		switch (activityCode) {
			case "VEH":
				if (input.vehicle) {
					return this.prisma.operationVehicle.upsert({
						where: { operationId },
						create: { id: crypto.randomUUID(), operationId, ...input.vehicle },
						update: input.vehicle,
					});
				}
				break;
			case "INM":
				if (input.realEstate) {
					return this.prisma.operationRealEstate.upsert({
						where: { operationId },
						create: {
							id: crypto.randomUUID(),
							operationId,
							...input.realEstate,
							registryDate: input.realEstate.registryDate
								? new Date(input.realEstate.registryDate)
								: null,
						},
						update: {
							...input.realEstate,
							registryDate: input.realEstate.registryDate
								? new Date(input.realEstate.registryDate)
								: null,
						},
					});
				}
				break;
			case "MJR":
				if (input.jewelry) {
					return this.prisma.operationJewelry.upsert({
						where: { operationId },
						create: { id: crypto.randomUUID(), operationId, ...input.jewelry },
						update: input.jewelry,
					});
				}
				break;
			case "AVI":
				if (input.virtualAsset) {
					return this.prisma.operationVirtualAsset.upsert({
						where: { operationId },
						create: {
							id: crypto.randomUUID(),
							operationId,
							...input.virtualAsset,
						},
						update: input.virtualAsset,
					});
				}
				break;
			case "JYS":
				if (input.gambling) {
					return this.prisma.operationGambling.upsert({
						where: { operationId },
						create: {
							id: crypto.randomUUID(),
							operationId,
							...input.gambling,
							eventDate: input.gambling.eventDate
								? new Date(input.gambling.eventDate)
								: null,
						},
						update: {
							...input.gambling,
							eventDate: input.gambling.eventDate
								? new Date(input.gambling.eventDate)
								: null,
						},
					});
				}
				break;
			case "ARI":
				if (input.rental) {
					return this.prisma.operationRental.upsert({
						where: { operationId },
						create: {
							id: crypto.randomUUID(),
							operationId,
							...input.rental,
							contractStartDate: input.rental.contractStartDate
								? new Date(input.rental.contractStartDate)
								: null,
							contractEndDate: input.rental.contractEndDate
								? new Date(input.rental.contractEndDate)
								: null,
						},
						update: {
							...input.rental,
							contractStartDate: input.rental.contractStartDate
								? new Date(input.rental.contractStartDate)
								: null,
							contractEndDate: input.rental.contractEndDate
								? new Date(input.rental.contractEndDate)
								: null,
						},
					});
				}
				break;
			case "BLI":
				if (input.armoring) {
					return this.prisma.operationArmoring.upsert({
						where: { operationId },
						create: { id: crypto.randomUUID(), operationId, ...input.armoring },
						update: input.armoring,
					});
				}
				break;
			case "DON":
				if (input.donation) {
					return this.prisma.operationDonation.upsert({
						where: { operationId },
						create: { id: crypto.randomUUID(), operationId, ...input.donation },
						update: input.donation,
					});
				}
				break;
			case "MPC":
				if (input.loan) {
					return this.prisma.operationLoan.upsert({
						where: { operationId },
						create: {
							id: crypto.randomUUID(),
							operationId,
							...input.loan,
							disbursementDate: input.loan.disbursementDate
								? new Date(input.loan.disbursementDate)
								: null,
							maturityDate: input.loan.maturityDate
								? new Date(input.loan.maturityDate)
								: null,
						},
						update: {
							...input.loan,
							disbursementDate: input.loan.disbursementDate
								? new Date(input.loan.disbursementDate)
								: null,
							maturityDate: input.loan.maturityDate
								? new Date(input.loan.maturityDate)
								: null,
						},
					});
				}
				break;
			case "FEP":
				if (input.official) {
					return this.prisma.operationOfficial.upsert({
						where: { operationId },
						create: {
							id: crypto.randomUUID(),
							operationId,
							...input.official,
							instrumentDate: input.official.instrumentDate
								? new Date(input.official.instrumentDate)
								: null,
						},
						update: {
							...input.official,
							instrumentDate: input.official.instrumentDate
								? new Date(input.official.instrumentDate)
								: null,
						},
					});
				}
				break;
			case "FES":
				if (input.notary) {
					return this.prisma.operationNotary.upsert({
						where: { operationId },
						create: {
							id: crypto.randomUUID(),
							operationId,
							...input.notary,
							instrumentDate: input.notary.instrumentDate
								? new Date(input.notary.instrumentDate)
								: null,
						},
						update: {
							...input.notary,
							instrumentDate: input.notary.instrumentDate
								? new Date(input.notary.instrumentDate)
								: null,
						},
					});
				}
				break;
			case "SPR":
				if (input.professional) {
					return this.prisma.operationProfessional.upsert({
						where: { operationId },
						create: {
							id: crypto.randomUUID(),
							operationId,
							...input.professional,
						},
						update: input.professional,
					});
				}
				break;
			case "CHV":
				if (input.travelerCheck) {
					return this.prisma.operationTravelerCheck.upsert({
						where: { operationId },
						create: {
							id: crypto.randomUUID(),
							operationId,
							...input.travelerCheck,
						},
						update: input.travelerCheck,
					});
				}
				break;
			case "TSC":
				if (input.card) {
					return this.prisma.operationCard.upsert({
						where: { operationId },
						create: { id: crypto.randomUUID(), operationId, ...input.card },
						update: input.card,
					});
				}
				break;
			case "TPP":
				if (input.prepaid) {
					return this.prisma.operationPrepaid.upsert({
						where: { operationId },
						create: { id: crypto.randomUUID(), operationId, ...input.prepaid },
						update: input.prepaid,
					});
				}
				break;
			case "TDR":
				if (input.reward) {
					return this.prisma.operationReward.upsert({
						where: { operationId },
						create: {
							id: crypto.randomUUID(),
							operationId,
							...input.reward,
							pointsExpiryDate: input.reward.pointsExpiryDate
								? new Date(input.reward.pointsExpiryDate)
								: null,
						},
						update: {
							...input.reward,
							pointsExpiryDate: input.reward.pointsExpiryDate
								? new Date(input.reward.pointsExpiryDate)
								: null,
						},
					});
				}
				break;
			case "TCV":
				if (input.valuable) {
					return this.prisma.operationValuable.upsert({
						where: { operationId },
						create: {
							id: crypto.randomUUID(),
							operationId,
							...input.valuable,
							custodyStartDate: input.valuable.custodyStartDate
								? new Date(input.valuable.custodyStartDate)
								: null,
							custodyEndDate: input.valuable.custodyEndDate
								? new Date(input.valuable.custodyEndDate)
								: null,
						},
						update: {
							...input.valuable,
							custodyStartDate: input.valuable.custodyStartDate
								? new Date(input.valuable.custodyStartDate)
								: null,
							custodyEndDate: input.valuable.custodyEndDate
								? new Date(input.valuable.custodyEndDate)
								: null,
						},
					});
				}
				break;
			case "OBA":
				if (input.art) {
					return this.prisma.operationArt.upsert({
						where: { operationId },
						create: { id: crypto.randomUUID(), operationId, ...input.art },
						update: input.art,
					});
				}
				break;
			case "DIN":
				if (input.development) {
					return this.prisma.operationDevelopment.upsert({
						where: { operationId },
						create: {
							id: crypto.randomUUID(),
							operationId,
							...input.development,
						},
						update: input.development,
					});
				}
				break;
		}
		return null;
	}

	async softDelete(organizationId: string, id: string): Promise<boolean> {
		const existing = await this.prisma.operation.findFirst({
			where: { id, organizationId, deletedAt: null },
		});

		if (!existing) {
			return false;
		}

		await this.prisma.operation.update({
			where: { id },
			data: { deletedAt: new Date() },
		});

		return true;
	}

	async findByClientId(
		organizationId: string,
		clientId: string,
		options?: { activityCode?: ActivityCode; startDate?: Date; endDate?: Date },
	): Promise<OperationEntity[]> {
		const where: Prisma.OperationWhereInput = {
			organizationId,
			clientId,
			deletedAt: null,
		};

		if (options?.activityCode) {
			where.activityCode = options.activityCode;
		}

		if (options?.startDate || options?.endDate) {
			where.operationDate = {};
			if (options?.startDate) {
				where.operationDate.gte = options.startDate;
			}
			if (options?.endDate) {
				where.operationDate.lte = options.endDate;
			}
		}

		const operations = await this.prisma.operation.findMany({
			where,
			include: operationInclude,
			orderBy: { operationDate: "desc" },
		});

		return operations.map(mapOperationToEntity);
	}

	/**
	 * Auto-detects completeness based on whether the activity extension is present.
	 * Operations without their VA-specific extension are marked as INCOMPLETE.
	 */
	private detectCompleteness(input: OperationCreateInput): {
		completenessStatus: string;
		missingFields: string[] | null;
	} {
		const code = input.activityCode as ActivityCode;
		const missing: string[] = [];

		// Check if VA-specific extension data is provided
		const extensionMap: Record<string, unknown> = {
			VEH: input.vehicle,
			INM: input.realEstate,
			MJR: input.jewelry,
			AVI: input.virtualAsset,
			JYS: input.gambling,
			ARI: input.rental,
			BLI: input.armoring,
			DON: input.donation,
			MPC: input.loan,
			FEP: input.official,
			FES: input.notary,
			SPR: input.professional,
			CHV: input.travelerCheck,
			TSC: input.card,
			TPP: input.prepaid,
			TDR: input.reward,
			TCV: input.valuable,
			OBA: input.art,
			DIN: input.development,
		};

		if (!extensionMap[code]) {
			missing.push(`${code.toLowerCase()}_extension`);
		}

		if (missing.length > 0) {
			return {
				completenessStatus: "INCOMPLETE",
				missingFields: missing,
			};
		}

		return { completenessStatus: "COMPLETE", missingFields: null };
	}
}
