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
	ListResult,
} from "./types";

export class ClientRepository {
	constructor(private readonly prisma: PrismaClient) {}

	async list(
		organizationId: string,
		filters: ClientFilters,
	): Promise<ListResult<ClientEntity>> {
		const { page, limit, search, rfc, personType } = filters;

		const where: Prisma.ClientWhereInput = {
			organizationId,
			deletedAt: null,
		};

		if (personType) {
			where.personType = toPrismaPersonType(personType);
		}

		if (rfc) {
			where.rfc = { contains: rfc.toUpperCase() };
		}

		if (search) {
			const likeFilter = { contains: search };
			where.OR = [
				{ firstName: likeFilter },
				{ lastName: likeFilter },
				{ secondLastName: likeFilter },
				{ businessName: likeFilter },
			];
		}

		const [total, records] = await Promise.all([
			this.prisma.client.count({ where }),
			this.prisma.client.findMany({
				where,
				skip: (page - 1) * limit,
				take: limit,
				orderBy: { createdAt: "desc" },
			}),
		]);

		const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

		return {
			data: records.map(mapPrismaClient),
			pagination: {
				page,
				limit,
				total,
				totalPages,
			},
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

	async create(
		organizationId: string,
		input: ClientCreateInput,
	): Promise<ClientEntity> {
		const prismaData = mapCreateInputToPrisma(input);
		const created = await this.prisma.client.create({
			data: {
				...prismaData,
				organizationId,
			},
		});
		return mapPrismaClient(created);
	}

	async update(
		organizationId: string,
		id: string,
		input: ClientUpdateInput,
	): Promise<ClientEntity> {
		await this.ensureExists(organizationId, id);

		const updated = await this.prisma.client.update({
			where: { id },
			data: mapUpdateInputToPrisma(input),
		});

		return mapPrismaClient(updated);
	}

	async patch(
		organizationId: string,
		id: string,
		input: ClientPatchInput,
	): Promise<ClientEntity> {
		await this.ensureExists(organizationId, id);

		const payload = mapPatchInputToPrisma(input) as Prisma.ClientUpdateInput;

		const updated = await this.prisma.client.update({
			where: { id },
			data: payload,
		});

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

	async getStats(organizationId: string): Promise<{
		totalClients: number;
		openAlerts: number;
		urgentReviews: number;
	}> {
		const [totalClients, openAlerts, urgentReviews] = await Promise.all([
			this.prisma.client.count({
				where: { organizationId, deletedAt: null },
			}),
			this.prisma.alert.count({
				where: {
					organizationId,
					status: "DETECTED",
				},
			}),
			this.prisma.alert.count({
				where: {
					organizationId,
					severity: "CRITICAL",
					status: { in: ["DETECTED", "FILE_GENERATED"] },
				},
			}),
		]);

		return {
			totalClients,
			openAlerts,
			urgentReviews,
		};
	}
}
