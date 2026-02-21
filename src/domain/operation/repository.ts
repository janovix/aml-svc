import type { PrismaClient, Prisma } from "@prisma/client";
import type {
	OperationEntity,
	ActivityCode,
	ListResultWithMeta,
} from "./types";
import type {
	OperationFilters,
	OperationCreateInput,
	OperationUpdateInput,
} from "./schemas";
import { mapOperationToEntity } from "./mappers";
import {
	buildEnumFilterMeta,
	buildRangeFilterMeta,
	fromPrismaGroupBy,
} from "../../lib/filter-metadata";
import { CatalogNameResolver } from "../catalog/name-resolver";
import type { CatalogFieldsConfig } from "../catalog/name-resolver";
import { CatalogRepository } from "../catalog/repository";
import { CATALOG_FIELDS as VEH_CATALOG_FIELDS } from "./activities/veh";
import { CATALOG_FIELDS as INM_CATALOG_FIELDS } from "./activities/inm";
import { CATALOG_FIELDS as MJR_CATALOG_FIELDS } from "./activities/mjr";
import { CATALOG_FIELDS as AVI_CATALOG_FIELDS } from "./activities/avi";
import { CATALOG_FIELDS as JYS_CATALOG_FIELDS } from "./activities/jys";
import { CATALOG_FIELDS as ARI_CATALOG_FIELDS } from "./activities/ari";
import { CATALOG_FIELDS as BLI_CATALOG_FIELDS } from "./activities/bli";
import { CATALOG_FIELDS as DON_CATALOG_FIELDS } from "./activities/don";
import { CATALOG_FIELDS as MPC_CATALOG_FIELDS } from "./activities/mpc";
import { CATALOG_FIELDS as FEP_CATALOG_FIELDS } from "./activities/fep";
import { CATALOG_FIELDS as FES_CATALOG_FIELDS } from "./activities/fes";
import { CATALOG_FIELDS as SPR_CATALOG_FIELDS } from "./activities/spr";
import { CATALOG_FIELDS as CHV_CATALOG_FIELDS } from "./activities/chv";
import { CATALOG_FIELDS as TSC_CATALOG_FIELDS } from "./activities/tsc";
import { CATALOG_FIELDS as TPP_CATALOG_FIELDS } from "./activities/tpp";
import { CATALOG_FIELDS as TDR_CATALOG_FIELDS } from "./activities/tdr";
import { CATALOG_FIELDS as TCV_CATALOG_FIELDS } from "./activities/tcv";
import { CATALOG_FIELDS as OBA_CATALOG_FIELDS } from "./activities/oba";
import { CATALOG_FIELDS as DIN_CATALOG_FIELDS } from "./activities/din";

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
	private catalogResolver: CatalogNameResolver;

	constructor(
		private prisma: PrismaClient,
		catalogResolver?: CatalogNameResolver,
	) {
		// Create catalog resolver if not provided (for backward compatibility)
		this.catalogResolver =
			catalogResolver ?? new CatalogNameResolver(new CatalogRepository(prisma));
	}

	/**
	 * Get catalog fields config for an activity code
	 */
	private getCatalogFieldsConfig(
		activityCode: ActivityCode,
	): CatalogFieldsConfig {
		switch (activityCode) {
			case "VEH":
				return VEH_CATALOG_FIELDS;
			case "INM":
				return INM_CATALOG_FIELDS;
			case "MJR":
				return MJR_CATALOG_FIELDS;
			case "AVI":
				return AVI_CATALOG_FIELDS;
			case "JYS":
				return JYS_CATALOG_FIELDS;
			case "ARI":
				return ARI_CATALOG_FIELDS;
			case "BLI":
				return BLI_CATALOG_FIELDS;
			case "DON":
				return DON_CATALOG_FIELDS;
			case "MPC":
				return MPC_CATALOG_FIELDS;
			case "FEP":
				return FEP_CATALOG_FIELDS;
			case "FES":
				return FES_CATALOG_FIELDS;
			case "SPR":
				return SPR_CATALOG_FIELDS;
			case "CHV":
				return CHV_CATALOG_FIELDS;
			case "TSC":
				return TSC_CATALOG_FIELDS;
			case "TPP":
				return TPP_CATALOG_FIELDS;
			case "TDR":
				return TDR_CATALOG_FIELDS;
			case "TCV":
				return TCV_CATALOG_FIELDS;
			case "OBA":
				return OBA_CATALOG_FIELDS;
			case "DIN":
				return DIN_CATALOG_FIELDS;
			default:
				return {};
		}
	}

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

		// Resolve catalog names for extension fields
		const resolvedExtension = await this.resolveExtensionCatalogNames(
			input.activityCode as ActivityCode,
			input,
		);

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
		const extensionQuery = this.getActivityExtensionQuery(
			operationId,
			input,
			resolvedExtension,
		);
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
	 * Resolve catalog names for extension fields
	 * Returns the extension data with resolved names and brandName
	 */
	private async resolveExtensionCatalogNames(
		activityCode: ActivityCode,
		input: OperationCreateInput,
	): Promise<{
		resolvedNames: string | null;
		brandName: string | null;
	}> {
		// Get the extension data based on activity code
		let extensionData: Record<string, unknown> | null = null;
		switch (activityCode) {
			case "VEH":
				extensionData = input.vehicle ?? null;
				break;
			case "INM":
				extensionData = input.realEstate ?? null;
				break;
			case "MJR":
				extensionData = input.jewelry ?? null;
				break;
			case "AVI":
				extensionData = input.virtualAsset ?? null;
				break;
			case "JYS":
				extensionData = input.gambling ?? null;
				break;
			case "ARI":
				extensionData = input.rental ?? null;
				break;
			case "BLI":
				extensionData = input.armoring ?? null;
				break;
			case "DON":
				extensionData = input.donation ?? null;
				break;
			case "MPC":
				extensionData = input.loan ?? null;
				break;
			case "FEP":
				extensionData = input.official ?? null;
				break;
			case "FES":
				extensionData = input.notary ?? null;
				break;
			case "SPR":
				extensionData = input.professional ?? null;
				break;
			case "CHV":
				extensionData = input.travelerCheck ?? null;
				break;
			case "TSC":
				extensionData = input.card ?? null;
				break;
			case "TPP":
				extensionData = input.prepaid ?? null;
				break;
			case "TDR":
				extensionData = input.reward ?? null;
				break;
			case "TCV":
				extensionData = input.valuable ?? null;
				break;
			case "OBA":
				extensionData = input.art ?? null;
				break;
			case "DIN":
				extensionData = input.development ?? null;
				break;
			default:
				return { resolvedNames: null, brandName: null };
		}

		if (!extensionData) {
			return { resolvedNames: null, brandName: null };
		}

		// Get catalog fields config for this activity
		const catalogFieldsConfig = this.getCatalogFieldsConfig(activityCode);

		// Resolve all catalog names
		const resolvedNamesMap = await this.catalogResolver.resolveNames(
			extensionData,
			catalogFieldsConfig,
		);

		// Extract brandName if present (for open catalogs like vehicle brands, jewelry brands)
		const brandName = resolvedNamesMap.brand ?? null;

		// Remove brand from resolvedNames since it has its own column
		if (brandName) {
			delete resolvedNamesMap.brand;
		}

		// Serialize resolved names to JSON
		const resolvedNames =
			Object.keys(resolvedNamesMap).length > 0
				? JSON.stringify(resolvedNamesMap)
				: null;

		return { resolvedNames, brandName };
	}

	/**
	 * Get activity extension query for batch transaction (D1 compatible)
	 * Returns a Prisma query that can be added to a batch transaction
	 */
	private getActivityExtensionQuery(
		operationId: string,
		input: OperationCreateInput,
		resolvedExtension: {
			resolvedNames: string | null;
			brandName: string | null;
		},
	): Prisma.PrismaPromise<unknown> | null {
		const extensionId = crypto.randomUUID();

		switch (input.activityCode as ActivityCode) {
			case "VEH":
				if (input.vehicle) {
					return this.prisma.operationVehicle.create({
						data: {
							id: extensionId,
							operationId,
							...input.vehicle,
							brandName: resolvedExtension.brandName,
							resolvedNames: resolvedExtension.resolvedNames,
						},
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
							resolvedNames: resolvedExtension.resolvedNames,
						},
					});
				}
				break;
			case "MJR":
				if (input.jewelry) {
					return this.prisma.operationJewelry.create({
						data: {
							id: extensionId,
							operationId,
							...input.jewelry,
							brandName: resolvedExtension.brandName,
							resolvedNames: resolvedExtension.resolvedNames,
						},
					});
				}
				break;
			case "AVI":
				if (input.virtualAsset) {
					return this.prisma.operationVirtualAsset.create({
						data: {
							id: extensionId,
							operationId,
							...input.virtualAsset,
							resolvedNames: resolvedExtension.resolvedNames,
						},
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
							resolvedNames: resolvedExtension.resolvedNames,
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
							resolvedNames: resolvedExtension.resolvedNames,
						},
					});
				}
				break;
			case "BLI":
				if (input.armoring) {
					return this.prisma.operationArmoring.create({
						data: {
							id: extensionId,
							operationId,
							...input.armoring,
							resolvedNames: resolvedExtension.resolvedNames,
						},
					});
				}
				break;
			case "DON":
				if (input.donation) {
					return this.prisma.operationDonation.create({
						data: {
							id: extensionId,
							operationId,
							...input.donation,
							resolvedNames: resolvedExtension.resolvedNames,
						},
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
							resolvedNames: resolvedExtension.resolvedNames,
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
							resolvedNames: resolvedExtension.resolvedNames,
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
							resolvedNames: resolvedExtension.resolvedNames,
						},
					});
				}
				break;
			case "SPR":
				if (input.professional) {
					return this.prisma.operationProfessional.create({
						data: {
							id: extensionId,
							operationId,
							...input.professional,
							resolvedNames: resolvedExtension.resolvedNames,
						},
					});
				}
				break;
			case "CHV":
				if (input.travelerCheck) {
					return this.prisma.operationTravelerCheck.create({
						data: {
							id: extensionId,
							operationId,
							...input.travelerCheck,
							resolvedNames: resolvedExtension.resolvedNames,
						},
					});
				}
				break;
			case "TSC":
				if (input.card) {
					return this.prisma.operationCard.create({
						data: {
							id: extensionId,
							operationId,
							...input.card,
							resolvedNames: resolvedExtension.resolvedNames,
						},
					});
				}
				break;
			case "TPP":
				if (input.prepaid) {
					return this.prisma.operationPrepaid.create({
						data: {
							id: extensionId,
							operationId,
							...input.prepaid,
							resolvedNames: resolvedExtension.resolvedNames,
						},
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
							resolvedNames: resolvedExtension.resolvedNames,
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
							resolvedNames: resolvedExtension.resolvedNames,
						},
					});
				}
				break;
			case "OBA":
				if (input.art) {
					return this.prisma.operationArt.create({
						data: {
							id: extensionId,
							operationId,
							...input.art,
							resolvedNames: resolvedExtension.resolvedNames,
						},
					});
				}
				break;
			case "DIN":
				if (input.development) {
					return this.prisma.operationDevelopment.create({
						data: {
							id: extensionId,
							operationId,
							...input.development,
							resolvedNames: resolvedExtension.resolvedNames,
						},
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

		if (!operation) return null;

		return mapOperationToEntity(operation);
	}

	async list(
		organizationId: string,
		filters: OperationFilters,
	): Promise<ListResultWithMeta<OperationEntity>> {
		// Base conditions (always applied, not affected by active filters)
		const baseWhere: Prisma.OperationWhereInput = {
			organizationId,
			deletedAt: null,
		};

		if (filters.clientId) baseWhere.clientId = filters.clientId;
		if (filters.invoiceId) baseWhere.invoiceId = filters.invoiceId;
		if (filters.operationTypeCode)
			baseWhere.operationTypeCode = filters.operationTypeCode;
		if (filters.branchPostalCode)
			baseWhere.branchPostalCode = filters.branchPostalCode;
		if (filters.alertTypeCode) baseWhere.alertTypeCode = filters.alertTypeCode;

		if (filters.startDate || filters.endDate) {
			baseWhere.operationDate = {};
			if (filters.startDate)
				(baseWhere.operationDate as Prisma.DateTimeFilter).gte = new Date(
					filters.startDate,
				);
			if (filters.endDate)
				(baseWhere.operationDate as Prisma.DateTimeFilter).lte = new Date(
					filters.endDate,
				);
		}

		if (filters.minAmount || filters.maxAmount) {
			baseWhere.amount = {};
			if (filters.minAmount)
				(baseWhere.amount as Prisma.DecimalFilter).gte = parseFloat(
					filters.minAmount,
				);
			if (filters.maxAmount)
				(baseWhere.amount as Prisma.DecimalFilter).lte = parseFloat(
					filters.maxAmount,
				);
		}

		// Full data query where (includes all active enum filters)
		const where: Prisma.OperationWhereInput = { ...baseWhere };
		if (filters.activityCode) where.activityCode = filters.activityCode;
		if (filters.watchlistStatus)
			where.watchlistStatus =
				filters.watchlistStatus as import("@prisma/client").WatchlistStatus;
		if (filters.dataSource) where.dataSource = filters.dataSource;

		// For each enum filter's counts: apply all OTHER active enum filters but not its own
		const activityWhere: Prisma.OperationWhereInput = { ...baseWhere };
		if (filters.watchlistStatus)
			activityWhere.watchlistStatus =
				filters.watchlistStatus as import("@prisma/client").WatchlistStatus;
		if (filters.dataSource) activityWhere.dataSource = filters.dataSource;

		const watchlistWhere: Prisma.OperationWhereInput = { ...baseWhere };
		if (filters.activityCode)
			watchlistWhere.activityCode = filters.activityCode;
		if (filters.dataSource) watchlistWhere.dataSource = filters.dataSource;

		const dataSourceWhere: Prisma.OperationWhereInput = { ...baseWhere };
		if (filters.activityCode)
			dataSourceWhere.activityCode = filters.activityCode;
		if (filters.watchlistStatus)
			dataSourceWhere.watchlistStatus =
				filters.watchlistStatus as import("@prisma/client").WatchlistStatus;

		const [
			operations,
			total,
			activityGroups,
			watchlistGroups,
			dataSourceGroups,
			amountAgg,
		] = await Promise.all([
			this.prisma.operation.findMany({
				where,
				include: operationInclude,
				orderBy: { operationDate: "desc" },
				skip: (filters.page - 1) * filters.limit,
				take: filters.limit,
			}),
			this.prisma.operation.count({ where }),
			this.prisma.operation.groupBy({
				by: ["activityCode"],
				where: activityWhere,
				_count: { activityCode: true },
			}),
			this.prisma.operation.groupBy({
				by: ["watchlistStatus"],
				where: watchlistWhere,
				_count: { watchlistStatus: true },
			}),
			this.prisma.operation.groupBy({
				by: ["dataSource"],
				where: dataSourceWhere,
				_count: { dataSource: true },
			}),
			this.prisma.operation.aggregate({
				where: baseWhere,
				_min: { amount: true, operationDate: true },
				_max: { amount: true, operationDate: true },
			}),
		]);

		const WATCHLIST_LABELS: Record<string, string> = {
			PENDING: "Pendiente",
			QUEUED: "En cola",
			CHECKING: "Revisando",
			COMPLETED: "Completado",
			ERROR: "Error",
			NOT_AVAILABLE: "No disponible",
		};

		const DATA_SOURCE_LABELS: Record<string, string> = {
			MANUAL: "Manual",
			CFDI: "CFDI",
			IMPORT: "Importación",
			ENRICHED: "Enriquecido",
		};

		return {
			data: operations.map((op) => mapOperationToEntity(op)),
			pagination: {
				page: filters.page,
				limit: filters.limit,
				total,
				totalPages: Math.ceil(total / filters.limit),
			},
			filterMeta: [
				buildEnumFilterMeta(
					{ id: "activityCode", label: "Actividad" },
					fromPrismaGroupBy(activityGroups, "activityCode", "activityCode"),
				),
				buildEnumFilterMeta(
					{ id: "dataSource", label: "Fuente", labelMap: DATA_SOURCE_LABELS },
					fromPrismaGroupBy(dataSourceGroups, "dataSource", "dataSource"),
				),
				buildEnumFilterMeta(
					{
						id: "watchlistStatus",
						label: "Watchlist",
						labelMap: WATCHLIST_LABELS,
					},
					fromPrismaGroupBy(
						watchlistGroups,
						"watchlistStatus",
						"watchlistStatus",
					),
				),
				buildRangeFilterMeta(
					{ id: "amount", label: "Monto", type: "number-range" },
					{
						min:
							amountAgg._min.amount != null
								? String(amountAgg._min.amount)
								: null,
						max:
							amountAgg._max.amount != null
								? String(amountAgg._max.amount)
								: null,
					},
				),
				buildRangeFilterMeta(
					{
						id: "operationDate",
						label: "Fecha de operación",
						type: "date-range",
					},
					{
						min:
							amountAgg._min.operationDate != null
								? amountAgg._min.operationDate.toISOString()
								: null,
						max:
							amountAgg._max.operationDate != null
								? amountAgg._max.operationDate.toISOString()
								: null,
					},
				),
			],
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

		return operations.map((op) => mapOperationToEntity(op));
	}

	async getStats(organizationId: string): Promise<{
		totalOperations: number;
		operationsToday: number;
		totalAmountMxn: string;
	}> {
		const todayStart = new Date();
		todayStart.setHours(0, 0, 0, 0);

		const [totalOperations, operationsToday, aggregate] = await Promise.all([
			this.prisma.operation.count({
				where: { organizationId, deletedAt: null },
			}),
			this.prisma.operation.count({
				where: {
					organizationId,
					deletedAt: null,
					operationDate: { gte: todayStart },
				},
			}),
			this.prisma.operation.aggregate({
				where: { organizationId, deletedAt: null },
				_sum: { amountMxn: true },
			}),
		]);

		const rawSum = aggregate._sum.amountMxn;
		const totalMxn =
			rawSum === null
				? 0
				: typeof rawSum === "number"
					? rawSum
					: parseFloat(rawSum.toString());

		return {
			totalOperations,
			operationsToday,
			totalAmountMxn: totalMxn.toFixed(2),
		};
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
