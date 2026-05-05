import type { Prisma, PrismaClient } from "@prisma/client";

import {
	mapAddressCreateInputToPrisma,
	mapAddressPatchInputToPrisma,
	mapAddressUpdateInputToPrisma,
	mapCreateInputToPrisma,
	mapDocumentCreateInputToPrisma,
	mapDocumentPatchInputToPrisma,
	mapDocumentUpdateInputToPrisma,
	mapPatchInputToPrisma,
	mapPrismaAddress,
	mapPrismaClient,
	mapPrismaDocument,
	mapUpdateInputToPrisma,
	toPrismaPersonType,
} from "./mappers";
import {
	ClientAddressCreateInput,
	ClientAddressPatchInput,
	ClientAddressUpdateInput,
	ClientCreateInput,
	ClientDocumentCreateInput,
	ClientDocumentPatchInput,
	ClientDocumentUpdateInput,
	ClientFilters,
	ClientPatchInput,
	ClientUpdateInput,
} from "./schemas";
import type {
	ClientAddressEntity,
	ClientDocumentEntity,
	ClientEntity,
	ListResultWithMeta,
} from "./types";
import {
	buildEnumFilterMeta,
	fromPrismaGroupBy,
} from "../../lib/filter-metadata";
import {
	CatalogNameResolver,
	type CatalogFieldsConfig,
} from "../catalog/name-resolver";
import { CatalogRepository } from "../catalog/repository";
import { recalculateKycProgress } from "./kyc-progress";
import type { TenantContext } from "../../lib/tenant-context";

/**
 * Catalog fields for client name resolution, by person type (SAT UIF).
 * - Persona física: `economic-activities` (actividad_economica)
 * - Persona moral: `business-activities` (giro_mercantil)
 * - Fideicomiso: no activity catalog in core XSD; only geography / countries
 */
export function getClientCatalogFields(
	personType: string | undefined,
): CatalogFieldsConfig {
	const pt = String(personType ?? "physical").toUpperCase();
	const base: CatalogFieldsConfig = {
		stateCode: { catalog: "states", strategy: "BY_CODE" },
		countryCode: { catalog: "countries", strategy: "BY_CODE" },
		country: { catalog: "countries", strategy: "BY_CODE" },
		nationality: { catalog: "countries", strategy: "BY_CODE" },
	};
	if (pt === "PHYSICAL") {
		return {
			...base,
			economicActivityCode: {
				catalog: "economic-activities",
				strategy: "BY_CODE",
			},
		};
	}
	if (pt === "MORAL") {
		return {
			...base,
			commercialActivityCode: {
				catalog: "business-activities",
				strategy: "BY_CODE",
			},
		};
	}
	return base;
}

/**
 * País/Nacionalidad (código) uses `countryCode`; the countries catalog also backs
 * `nationality`. If the client only sends nationality (e.g. wizard default MX),
 * copy it to `countryCode` for persona física, moral, and fideicomiso alike.
 */
function withCountryCodeSyncedFromNationalityWhenMissing<
	T extends { nationality?: unknown; countryCode?: unknown },
>(input: T): T {
	const nationality = String(input.nationality ?? "").trim();
	const countryCode = String(input.countryCode ?? "").trim();
	if (nationality && !countryCode) {
		return { ...input, countryCode: nationality };
	}
	return input;
}

export class ClientRepository {
	private catalogResolver: CatalogNameResolver;
	private readonly catalogRepo: CatalogRepository;

	constructor(
		private readonly prisma: PrismaClient,
		catalogResolver?: CatalogNameResolver,
		catalogRepository?: CatalogRepository,
	) {
		this.catalogRepo = catalogRepository ?? new CatalogRepository(prisma);
		this.catalogResolver =
			catalogResolver ?? new CatalogNameResolver(this.catalogRepo);
	}

	/**
	 * Normalize ISO-3166 alpha-3 / legacy catalog item IDs to alpha-2 and SAT activity codes.
	 */
	private async normalizeClientCatalogValues(
		input: Record<string, unknown>,
	): Promise<Record<string, unknown>> {
		const out: Record<string, unknown> = { ...input };
		const pt = String(out.personType ?? "physical").toUpperCase();

		const normCountry = async (key: string) => {
			const v = out[key];
			if (typeof v !== "string" || !v.trim()) return;
			const resolved = await this.catalogRepo.resolveStoredCountryCode(v);
			if (resolved) out[key] = resolved;
		};

		await normCountry("nationality");
		await normCountry("countryCode");
		await normCountry("country");

		if (pt === "PHYSICAL") {
			const v = out.economicActivityCode;
			if (typeof v === "string" && v.trim()) {
				const r = await this.catalogRepo.resolveStoredActivityCode(
					"economic-activities",
					v,
				);
				out.economicActivityCode = r ?? null;
			}
		} else if (pt === "MORAL") {
			if (
				!out.commercialActivityCode &&
				typeof out.economicActivityCode === "string" &&
				out.economicActivityCode.trim()
			) {
				out.commercialActivityCode = out.economicActivityCode;
			}
			out.economicActivityCode = null;
			const v = out.commercialActivityCode;
			if (typeof v === "string" && v.trim()) {
				const r = await this.catalogRepo.resolveStoredActivityCode(
					"business-activities",
					v,
				);
				out.commercialActivityCode = r ?? null;
			}
		}

		return out;
	}

	private async enrichResolvedNamesIfStale(
		entity: ClientEntity,
	): Promise<ClientEntity> {
		const fields = getClientCatalogFields(entity.personType);
		const data = entity as unknown as Record<string, unknown>;
		const resolved = entity.resolvedNames ?? {};
		let needs = false;
		for (const fieldName of Object.keys(fields)) {
			const val = data[fieldName];
			if (
				typeof val === "string" &&
				val.trim() !== "" &&
				resolved[fieldName] === undefined
			) {
				needs = true;
				break;
			}
		}
		if (!needs) return entity;
		const fresh = await this.catalogResolver.resolveNames(data, fields);
		return {
			...entity,
			resolvedNames: { ...resolved, ...fresh },
		};
	}

	async list(
		tenant: TenantContext,
		filters: ClientFilters,
	): Promise<ListResultWithMeta<ClientEntity>> {
		const { organizationId, environment } = tenant;
		const { page, limit, search, rfc, personType, stateCode } = filters;

		// Base where clause – applies to data fetch AND to each filter's count query
		const baseWhere: Prisma.ClientWhereInput = {
			organizationId,
			environment,
			deletedAt: null,
		};

		if (rfc) {
			baseWhere.rfc = { contains: rfc.toUpperCase() };
		}

		if (search) {
			const likeFilter = { contains: search };
			baseWhere.OR = [
				{ firstName: likeFilter },
				{ lastName: likeFilter },
				{ secondLastName: likeFilter },
				{ businessName: likeFilter },
			];
		}

		// Active filter conditions for the data query
		const where: Prisma.ClientWhereInput = { ...baseWhere };

		if (personType?.length) {
			where.personType = { in: personType.map(toPrismaPersonType) };
		}

		if (stateCode?.length) {
			where.stateCode = { in: stateCode };
		}

		// personType counts: apply stateCode but NOT personType (so all types show up)
		const personTypeCountWhere: Prisma.ClientWhereInput = { ...baseWhere };
		if (stateCode?.length) personTypeCountWhere.stateCode = { in: stateCode };

		// stateCode counts: apply personType but NOT stateCode
		const stateCodeCountWhere: Prisma.ClientWhereInput = { ...baseWhere };
		if (personType?.length)
			stateCodeCountWhere.personType = {
				in: personType.map(toPrismaPersonType),
			};

		const [total, records, personTypeGroups, stateCodeGroups] =
			await Promise.all([
				this.prisma.client.count({ where }),
				this.prisma.client.findMany({
					where,
					skip: (page - 1) * limit,
					take: limit,
					orderBy: { createdAt: "desc" },
				}),
				this.prisma.client.groupBy({
					by: ["personType"],
					where: personTypeCountWhere,
					_count: { personType: true },
				}),
				this.prisma.client.groupBy({
					by: ["stateCode"],
					where: stateCodeCountWhere,
					_count: { stateCode: true },
				}),
			]);

		const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

		const PERSON_TYPE_LABELS: Record<string, string> = {
			PHYSICAL: "Persona Física",
			MORAL: "Persona Moral",
			TRUST: "Fideicomiso",
		};

		return {
			data: records.map(mapPrismaClient),
			pagination: { page, limit, total, totalPages },
			filterMeta: [
				buildEnumFilterMeta(
					{
						id: "personType",
						label: "Tipo de persona",
						labelMap: PERSON_TYPE_LABELS,
					},
					fromPrismaGroupBy(personTypeGroups, "personType", "personType"),
				),
				buildEnumFilterMeta(
					{ id: "stateCode", label: "Estado" },
					fromPrismaGroupBy(stateCodeGroups, "stateCode", "stateCode"),
				),
			],
		};
	}

	async getById(
		tenant: TenantContext,
		id: string,
	): Promise<ClientEntity | null> {
		const { organizationId, environment } = tenant;
		const record = await this.prisma.client.findFirst({
			where: { organizationId, environment, id, deletedAt: null },
		});
		if (!record) return null;
		const entity = mapPrismaClient(record);
		return this.enrichResolvedNamesIfStale(entity);
	}

	async findByRfc(
		tenant: TenantContext,
		rfc: string,
	): Promise<ClientEntity | null> {
		const { organizationId, environment } = tenant;
		const record = await this.prisma.client.findFirst({
			where: {
				organizationId,
				environment,
				rfc: rfc.toUpperCase(),
				deletedAt: null,
			},
		});
		if (!record) return null;
		const entity = mapPrismaClient(record);
		return this.enrichResolvedNamesIfStale(entity);
	}

	async create(
		tenant: TenantContext,
		input: ClientCreateInput,
	): Promise<ClientEntity> {
		const { organizationId, environment } = tenant;
		const synced = withCountryCodeSyncedFromNationalityWhenMissing(input);
		const catalogNormalized = await this.normalizeClientCatalogValues(
			synced as unknown as Record<string, unknown>,
		);
		const normalized = catalogNormalized as unknown as ClientCreateInput;
		const prismaData = mapCreateInputToPrisma(normalized);
		const { completenessStatus, missingFields } =
			this.detectCompleteness(catalogNormalized);

		const resolvedNames = await this.catalogResolver.resolveNames(
			catalogNormalized,
			getClientCatalogFields(String(normalized.personType)),
		);

		const created = await this.prisma.client.create({
			data: {
				...prismaData,
				organizationId,
				environment,
				completenessStatus,
				missingFields:
					missingFields.length > 0 ? JSON.stringify(missingFields) : null,
				resolvedNames:
					Object.keys(resolvedNames).length > 0
						? JSON.stringify(resolvedNames)
						: null,
			},
		});

		await recalculateKycProgress(this.prisma, created.id);

		const entity = mapPrismaClient(created);
		return this.enrichResolvedNamesIfStale(entity);
	}

	async update(
		tenant: TenantContext,
		id: string,
		input: ClientUpdateInput,
	): Promise<ClientEntity> {
		const { organizationId, environment } = tenant;
		await this.ensureExists(organizationId, id, environment);

		const synced = withCountryCodeSyncedFromNationalityWhenMissing(input);
		const catalogNormalized = await this.normalizeClientCatalogValues(
			synced as unknown as Record<string, unknown>,
		);
		const normalized = catalogNormalized as unknown as ClientUpdateInput;
		const prismaData = mapUpdateInputToPrisma(normalized);
		const { completenessStatus, missingFields } =
			this.detectCompleteness(catalogNormalized);

		const resolvedNames = await this.catalogResolver.resolveNames(
			catalogNormalized,
			getClientCatalogFields(String(normalized.personType)),
		);

		const updated = await this.prisma.client.update({
			where: { id },
			data: {
				...prismaData,
				completenessStatus,
				missingFields:
					missingFields.length > 0 ? JSON.stringify(missingFields) : null,
				resolvedNames:
					Object.keys(resolvedNames).length > 0
						? JSON.stringify(resolvedNames)
						: null,
			},
		});

		await recalculateKycProgress(this.prisma, updated.id);

		const entity = mapPrismaClient(updated);
		return this.enrichResolvedNamesIfStale(entity);
	}

	async patch(
		tenant: TenantContext,
		id: string,
		input: ClientPatchInput,
	): Promise<ClientEntity> {
		const { organizationId, environment } = tenant;
		await this.ensureExists(organizationId, id, environment);

		const payload = mapPatchInputToPrisma(input) as Prisma.ClientUpdateInput;

		const current = await this.prisma.client.findFirst({
			where: { id, deletedAt: null },
		});
		if (current) {
			const merged = withCountryCodeSyncedFromNationalityWhenMissing({
				...current,
				...input,
			});
			const catalogNormalized = await this.normalizeClientCatalogValues(
				merged as unknown as Record<string, unknown>,
			);
			const forCompleteness = {
				...merged,
				...catalogNormalized,
			};
			const { completenessStatus, missingFields } =
				this.detectCompleteness(forCompleteness as Record<string, unknown>);
			(payload as Record<string, unknown>).completenessStatus =
				completenessStatus;
			(payload as Record<string, unknown>).missingFields =
				missingFields.length > 0 ? JSON.stringify(missingFields) : null;

			const p = payload as Record<string, unknown>;
			p.nationality = catalogNormalized.nationality ?? current.nationality;
			p.countryCode = catalogNormalized.countryCode ?? current.countryCode;
			p.country = catalogNormalized.country ?? current.country;
			p.economicActivityCode =
				catalogNormalized.economicActivityCode ?? null;
			p.commercialActivityCode =
				catalogNormalized.commercialActivityCode ?? null;

			const resolvedNames = await this.catalogResolver.resolveNames(
				catalogNormalized,
				getClientCatalogFields(
					String(catalogNormalized.personType ?? current.personType),
				),
			);
			p.resolvedNames =
				Object.keys(resolvedNames).length > 0
					? JSON.stringify(resolvedNames)
					: null;
		}

		const updated = await this.prisma.client.update({
			where: { id },
			data: payload,
		});

		await recalculateKycProgress(this.prisma, updated.id);

		const entity = mapPrismaClient(updated);
		return this.enrichResolvedNamesIfStale(entity);
	}

	async delete(tenant: TenantContext, id: string): Promise<void> {
		const { organizationId, environment } = tenant;
		await this.ensureExists(organizationId, id, environment);

		await this.prisma.client.update({
			where: { id },
			data: {
				deletedAt: new Date(),
			},
		});
	}

	async listDocuments(
		organizationId: string,
		clientId: string,
	): Promise<ClientDocumentEntity[]> {
		await this.ensureExists(organizationId, clientId);
		const documents = await this.prisma.clientDocument.findMany({
			where: { clientId },
			orderBy: { createdAt: "desc" },
		});
		return documents.map(mapPrismaDocument);
	}

	async createDocument(
		organizationId: string,
		input: ClientDocumentCreateInput,
	): Promise<ClientDocumentEntity> {
		await this.ensureExists(organizationId, input.clientId);
		const created = await this.prisma.clientDocument.create({
			data: mapDocumentCreateInputToPrisma(input),
		});

		// Recalculate KYC progress after document creation
		await recalculateKycProgress(this.prisma, input.clientId);

		return mapPrismaDocument(created);
	}

	async updateDocument(
		organizationId: string,
		clientId: string,
		documentId: string,
		input: ClientDocumentUpdateInput,
	): Promise<ClientDocumentEntity> {
		await this.ensureExists(organizationId, clientId);
		await this.ensureDocumentExists(clientId, documentId);
		const updated = await this.prisma.clientDocument.update({
			where: { id: documentId },
			data: mapDocumentUpdateInputToPrisma(input),
		});

		// Recalculate KYC progress after document update
		await recalculateKycProgress(this.prisma, clientId);

		return mapPrismaDocument(updated);
	}

	async patchDocument(
		organizationId: string,
		clientId: string,
		documentId: string,
		input: ClientDocumentPatchInput,
	): Promise<ClientDocumentEntity> {
		await this.ensureExists(organizationId, clientId);
		await this.ensureDocumentExists(clientId, documentId);
		const updated = await this.prisma.clientDocument.update({
			where: { id: documentId },
			data: mapDocumentPatchInputToPrisma(input),
		});

		// Recalculate KYC progress after document patch
		await recalculateKycProgress(this.prisma, clientId);

		return mapPrismaDocument(updated);
	}

	async deleteDocument(
		organizationId: string,
		clientId: string,
		documentId: string,
	): Promise<void> {
		await this.ensureExists(organizationId, clientId);
		await this.ensureDocumentExists(clientId, documentId);
		await this.prisma.clientDocument.delete({ where: { id: documentId } });

		// Recalculate KYC progress after document deletion
		await recalculateKycProgress(this.prisma, clientId);
	}

	async listAddresses(
		organizationId: string,
		clientId: string,
	): Promise<ClientAddressEntity[]> {
		await this.ensureExists(organizationId, clientId);
		const addresses = await this.prisma.clientAddress.findMany({
			where: { clientId },
			orderBy: { createdAt: "desc" },
		});
		return addresses.map(mapPrismaAddress);
	}

	async createAddress(
		organizationId: string,
		input: ClientAddressCreateInput,
	): Promise<ClientAddressEntity> {
		await this.ensureExists(organizationId, input.clientId);
		const created = await this.prisma.clientAddress.create({
			data: mapAddressCreateInputToPrisma(input),
		});
		return mapPrismaAddress(created);
	}

	async updateAddress(
		organizationId: string,
		clientId: string,
		addressId: string,
		input: ClientAddressUpdateInput,
	): Promise<ClientAddressEntity> {
		await this.ensureExists(organizationId, clientId);
		await this.ensureAddressExists(clientId, addressId);
		const updated = await this.prisma.clientAddress.update({
			where: { id: addressId },
			data: mapAddressUpdateInputToPrisma(input),
		});
		return mapPrismaAddress(updated);
	}

	async patchAddress(
		organizationId: string,
		clientId: string,
		addressId: string,
		input: ClientAddressPatchInput,
	): Promise<ClientAddressEntity> {
		await this.ensureExists(organizationId, clientId);
		await this.ensureAddressExists(clientId, addressId);
		const updated = await this.prisma.clientAddress.update({
			where: { id: addressId },
			data: mapAddressPatchInputToPrisma(input),
		});
		return mapPrismaAddress(updated);
	}

	async deleteAddress(
		organizationId: string,
		clientId: string,
		addressId: string,
	): Promise<void> {
		await this.ensureExists(organizationId, clientId);
		await this.ensureAddressExists(clientId, addressId);
		await this.prisma.clientAddress.delete({ where: { id: addressId } });
	}

	private async ensureExists(
		organizationId: string,
		id: string,
		environment?: string,
	): Promise<void> {
		const where: Prisma.ClientWhereInput = {
			organizationId,
			id,
			deletedAt: null,
		};
		if (environment) where.environment = environment;
		const exists = await this.prisma.client.findFirst({
			where,
			select: { id: true },
		});

		if (!exists) {
			throw new Error("CLIENT_NOT_FOUND");
		}
	}

	private async ensureDocumentExists(clientId: string, documentId: string) {
		const document = await this.prisma.clientDocument.findFirst({
			where: { id: documentId, clientId },
			select: { id: true },
		});
		if (!document) {
			throw new Error("DOCUMENT_NOT_FOUND");
		}
	}

	private async ensureAddressExists(clientId: string, addressId: string) {
		const address = await this.prisma.clientAddress.findFirst({
			where: { id: addressId, clientId },
			select: { id: true },
		});
		if (!address) {
			throw new Error("ADDRESS_NOT_FOUND");
		}
	}

	/**
	 * Detect client data completeness based on LFPIORPI requirements.
	 * Required fields differ by person type (PHYSICAL vs MORAL vs TRUST).
	 *
	 * - COMPLETE: All required fields are present
	 * - INCOMPLETE: Some required fields are missing
	 * - MINIMUM: Only critical identifier (RFC) is present
	 */
	private detectCompleteness(input: Record<string, unknown>): {
		completenessStatus: "COMPLETE" | "INCOMPLETE" | "MINIMUM";
		missingFields: string[];
	} {
		const missing: string[] = [];
		const personType = String(input.personType ?? "")
			.toUpperCase()
			.trim() as "PHYSICAL" | "MORAL" | "TRUST" | "";

		// Core fields required for all person types (LFPIORPI Art. 17+18)
		const coreFields = [
			"rfc",
			"email",
			"phone",
			"country",
			"stateCode",
			"city",
			"postalCode",
			"street",
			"externalNumber",
		];

		// Person-type specific fields
		const physicalFields = [
			"firstName",
			"lastName",
			"birthDate",
			"nationality",
			"gender",
			"curp",
		];
		const moralFields = ["businessName", "incorporationDate", "nationality"];

		for (const field of coreFields) {
			if (!input[field]) {
				missing.push(field);
			}
		}

		if (personType === "PHYSICAL" || personType === "TRUST") {
			for (const field of physicalFields) {
				if (!input[field]) {
					missing.push(field);
				}
			}
		}

		if (personType === "MORAL") {
			for (const field of moralFields) {
				if (!input[field]) {
					missing.push(field);
				}
			}
		}

		// KYC-relevant fields (important but not blocking)
		if (personType === "PHYSICAL") {
			if (!input.economicActivityCode) missing.push("economicActivityCode");
		} else if (personType === "MORAL") {
			if (!input.commercialActivityCode)
				missing.push("commercialActivityCode");
		}
		if (!input.sourceOfFunds) missing.push("sourceOfFunds");

		// Determine status
		let completenessStatus: "COMPLETE" | "INCOMPLETE" | "MINIMUM";
		if (missing.length === 0) {
			completenessStatus = "COMPLETE";
		} else {
			// MINIMUM: only has RFC (the absolute minimum identifier)
			const hasOnlyRfc =
				!!input.rfc &&
				!input.firstName &&
				!input.lastName &&
				!input.businessName;
			completenessStatus = hasOnlyRfc ? "MINIMUM" : "INCOMPLETE";
		}

		return { completenessStatus, missingFields: missing };
	}

	async getStats(tenant: TenantContext): Promise<{
		totalClients: number;
		physicalClients: number;
		moralClients: number;
		trustClients: number;
	}> {
		const { organizationId, environment } = tenant;
		const [totalClients, physicalClients, moralClients, trustClients] =
			await Promise.all([
				this.prisma.client.count({
					where: { organizationId, environment, deletedAt: null },
				}),
				this.prisma.client.count({
					where: {
						organizationId,
						environment,
						deletedAt: null,
						personType: "PHYSICAL",
					},
				}),
				this.prisma.client.count({
					where: {
						organizationId,
						environment,
						deletedAt: null,
						personType: "MORAL",
					},
				}),
				this.prisma.client.count({
					where: {
						organizationId,
						environment,
						deletedAt: null,
						personType: "TRUST",
					},
				}),
			]);

		return {
			totalClients,
			physicalClients,
			moralClients,
			trustClients,
		};
	}
}
