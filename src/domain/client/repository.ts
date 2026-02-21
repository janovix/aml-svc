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

/**
 * Catalog fields configuration for clients.
 * Maps client field names to their catalog keys and resolution strategies.
 */
const CLIENT_CATALOG_FIELDS: CatalogFieldsConfig = {
	stateCode: { catalog: "states", strategy: "BY_CODE" },
	countryCode: { catalog: "countries", strategy: "BY_CODE" },
	economicActivityCode: {
		catalog: "economic-activities",
		strategy: "BY_CODE",
	},
	nationality: { catalog: "countries", strategy: "BY_ID" },
};

export class ClientRepository {
	private catalogResolver: CatalogNameResolver;

	constructor(
		private readonly prisma: PrismaClient,
		catalogResolver?: CatalogNameResolver,
	) {
		this.catalogResolver =
			catalogResolver || new CatalogNameResolver(new CatalogRepository(prisma));
	}

	async list(
		organizationId: string,
		filters: ClientFilters,
	): Promise<ListResultWithMeta<ClientEntity>> {
		const { page, limit, search, rfc, personType, stateCode } = filters;

		// Base where clause – applies to data fetch AND to each filter's count query
		const baseWhere: Prisma.ClientWhereInput = {
			organizationId,
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

		if (personType) {
			where.personType = toPrismaPersonType(personType);
		}

		if (stateCode) {
			where.stateCode = stateCode;
		}

		// personType counts: apply stateCode but NOT personType (so all types show up)
		const personTypeCountWhere: Prisma.ClientWhereInput = { ...baseWhere };
		if (stateCode) personTypeCountWhere.stateCode = stateCode;

		// stateCode counts: apply personType but NOT stateCode
		const stateCodeCountWhere: Prisma.ClientWhereInput = { ...baseWhere };
		if (personType)
			stateCodeCountWhere.personType = toPrismaPersonType(personType);

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
		organizationId: string,
		id: string,
	): Promise<ClientEntity | null> {
		const record = await this.prisma.client.findFirst({
			where: { organizationId, id, deletedAt: null },
		});
		return record ? mapPrismaClient(record) : null;
	}

	async findByRfc(
		organizationId: string,
		rfc: string,
	): Promise<ClientEntity | null> {
		const record = await this.prisma.client.findFirst({
			where: { organizationId, rfc: rfc.toUpperCase(), deletedAt: null },
		});
		return record ? mapPrismaClient(record) : null;
	}

	async create(
		organizationId: string,
		input: ClientCreateInput,
	): Promise<ClientEntity> {
		const prismaData = mapCreateInputToPrisma(input);
		const { completenessStatus, missingFields } =
			this.detectCompleteness(input);

		// Resolve catalog names for *Code fields
		const resolvedNames = await this.catalogResolver.resolveNames(
			input,
			CLIENT_CATALOG_FIELDS,
		);

		const created = await this.prisma.client.create({
			data: {
				...prismaData,
				organizationId,
				completenessStatus,
				missingFields:
					missingFields.length > 0 ? JSON.stringify(missingFields) : null,
				resolvedNames:
					Object.keys(resolvedNames).length > 0
						? JSON.stringify(resolvedNames)
						: null,
			},
		});

		// Recalculate KYC progress after creation
		await recalculateKycProgress(this.prisma, created.id);

		return mapPrismaClient(created);
	}

	async update(
		organizationId: string,
		id: string,
		input: ClientUpdateInput,
	): Promise<ClientEntity> {
		await this.ensureExists(organizationId, id);

		const prismaData = mapUpdateInputToPrisma(input);
		const { completenessStatus, missingFields } =
			this.detectCompleteness(input);

		// Resolve catalog names for *Code fields
		const resolvedNames = await this.catalogResolver.resolveNames(
			input,
			CLIENT_CATALOG_FIELDS,
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

		// Recalculate KYC progress after update
		await recalculateKycProgress(this.prisma, updated.id);

		return mapPrismaClient(updated);
	}

	async patch(
		organizationId: string,
		id: string,
		input: ClientPatchInput,
	): Promise<ClientEntity> {
		await this.ensureExists(organizationId, id);

		const payload = mapPatchInputToPrisma(input) as Prisma.ClientUpdateInput;

		// For patches, re-check completeness by fetching the current record first
		const current = await this.prisma.client.findFirst({
			where: { id, deletedAt: null },
		});
		if (current) {
			const merged = { ...current, ...input };
			const { completenessStatus, missingFields } =
				this.detectCompleteness(merged);
			(payload as Record<string, unknown>).completenessStatus =
				completenessStatus;
			(payload as Record<string, unknown>).missingFields =
				missingFields.length > 0 ? JSON.stringify(missingFields) : null;

			// Resolve catalog names for *Code fields
			const resolvedNames = await this.catalogResolver.resolveNames(
				merged,
				CLIENT_CATALOG_FIELDS,
			);
			(payload as Record<string, unknown>).resolvedNames =
				Object.keys(resolvedNames).length > 0
					? JSON.stringify(resolvedNames)
					: null;
		}

		const updated = await this.prisma.client.update({
			where: { id },
			data: payload,
		});

		// Recalculate KYC progress after patch
		await recalculateKycProgress(this.prisma, updated.id);

		return mapPrismaClient(updated);
	}

	async delete(organizationId: string, id: string): Promise<void> {
		await this.ensureExists(organizationId, id);

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
	): Promise<void> {
		const exists = await this.prisma.client.findFirst({
			where: { organizationId, id, deletedAt: null },
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
		const personType = input.personType as string | undefined;

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
		if (!input.economicActivityCode) missing.push("economicActivityCode");
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

	async getStats(organizationId: string): Promise<{
		totalClients: number;
		physicalClients: number;
		moralClients: number;
		trustClients: number;
	}> {
		const [totalClients, physicalClients, moralClients, trustClients] =
			await Promise.all([
				this.prisma.client.count({
					where: { organizationId, deletedAt: null },
				}),
				this.prisma.client.count({
					where: { organizationId, deletedAt: null, personType: "PHYSICAL" },
				}),
				this.prisma.client.count({
					where: { organizationId, deletedAt: null, personType: "MORAL" },
				}),
				this.prisma.client.count({
					where: { organizationId, deletedAt: null, personType: "TRUST" },
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
