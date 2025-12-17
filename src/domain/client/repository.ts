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

	async list(filters: ClientFilters): Promise<ListResult<ClientEntity>> {
		const { page, limit, search, rfc, personType } = filters;

		const where: Prisma.ClientWhereInput = {
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

	async getById(id: string): Promise<ClientEntity | null> {
		// id is now RFC (primary key)
		const record = await this.prisma.client.findFirst({
			where: { rfc: id.toUpperCase(), deletedAt: null },
		});
		return record ? mapPrismaClient(record) : null;
	}

	async create(input: ClientCreateInput): Promise<ClientEntity> {
		const prismaData = mapCreateInputToPrisma(input);
		// RFC is the primary key, so we use it directly
		const created = await this.prisma.client.create({
			data: {
				...prismaData,
				rfc: prismaData.rfc, // RFC is the PK
			},
		});
		return mapPrismaClient(created);
	}

	async update(id: string, input: ClientUpdateInput): Promise<ClientEntity> {
		// id is now RFC (primary key)
		await this.ensureExists(id);

		const updated = await this.prisma.client.update({
			where: { rfc: id.toUpperCase() },
			data: mapUpdateInputToPrisma(input),
		});

		return mapPrismaClient(updated);
	}

	async patch(id: string, input: ClientPatchInput): Promise<ClientEntity> {
		// id is now RFC (primary key)
		await this.ensureExists(id);

		const payload = mapPatchInputToPrisma(input) as Prisma.ClientUpdateInput;

		const updated = await this.prisma.client.update({
			where: { rfc: id.toUpperCase() },
			data: payload,
		});

		return mapPrismaClient(updated);
	}

	async delete(id: string): Promise<void> {
		// id is now RFC (primary key)
		await this.ensureExists(id);

		await this.prisma.client.update({
			where: { rfc: id.toUpperCase() },
			data: {
				deletedAt: new Date(),
			},
		});
	}

	async listDocuments(clientId: string): Promise<ClientDocumentEntity[]> {
		await this.ensureExists(clientId);
		const documents = await this.prisma.clientDocument.findMany({
			where: { clientId },
			orderBy: { createdAt: "desc" },
		});
		return documents.map(mapPrismaDocument);
	}

	async createDocument(
		input: ClientDocumentCreateInput,
	): Promise<ClientDocumentEntity> {
		await this.ensureExists(input.clientId);
		const created = await this.prisma.clientDocument.create({
			data: mapDocumentCreateInputToPrisma(input),
		});
		return mapPrismaDocument(created);
	}

	async updateDocument(
		clientId: string,
		documentId: string,
		input: ClientDocumentUpdateInput,
	): Promise<ClientDocumentEntity> {
		await this.ensureDocumentExists(clientId, documentId);
		const updated = await this.prisma.clientDocument.update({
			where: { id: documentId },
			data: mapDocumentUpdateInputToPrisma(input),
		});
		return mapPrismaDocument(updated);
	}

	async patchDocument(
		clientId: string,
		documentId: string,
		input: ClientDocumentPatchInput,
	): Promise<ClientDocumentEntity> {
		await this.ensureDocumentExists(clientId, documentId);
		const updated = await this.prisma.clientDocument.update({
			where: { id: documentId },
			data: mapDocumentPatchInputToPrisma(input),
		});
		return mapPrismaDocument(updated);
	}

	async deleteDocument(clientId: string, documentId: string): Promise<void> {
		await this.ensureDocumentExists(clientId, documentId);
		await this.prisma.clientDocument.delete({ where: { id: documentId } });
	}

	async listAddresses(clientId: string): Promise<ClientAddressEntity[]> {
		await this.ensureExists(clientId);
		const addresses = await this.prisma.clientAddress.findMany({
			where: { clientId },
			orderBy: { createdAt: "desc" },
		});
		return addresses.map(mapPrismaAddress);
	}

	async createAddress(
		input: ClientAddressCreateInput,
	): Promise<ClientAddressEntity> {
		await this.ensureExists(input.clientId);
		const created = await this.prisma.clientAddress.create({
			data: mapAddressCreateInputToPrisma(input),
		});
		return mapPrismaAddress(created);
	}

	async updateAddress(
		clientId: string,
		addressId: string,
		input: ClientAddressUpdateInput,
	): Promise<ClientAddressEntity> {
		await this.ensureAddressExists(clientId, addressId);
		const updated = await this.prisma.clientAddress.update({
			where: { id: addressId },
			data: mapAddressUpdateInputToPrisma(input),
		});
		return mapPrismaAddress(updated);
	}

	async patchAddress(
		clientId: string,
		addressId: string,
		input: ClientAddressPatchInput,
	): Promise<ClientAddressEntity> {
		await this.ensureAddressExists(clientId, addressId);
		const updated = await this.prisma.clientAddress.update({
			where: { id: addressId },
			data: mapAddressPatchInputToPrisma(input),
		});
		return mapPrismaAddress(updated);
	}

	async deleteAddress(clientId: string, addressId: string): Promise<void> {
		await this.ensureAddressExists(clientId, addressId);
		await this.prisma.clientAddress.delete({ where: { id: addressId } });
	}

	private async ensureExists(id: string): Promise<void> {
		// id is now RFC (primary key)
		const exists = await this.prisma.client.findFirst({
			where: { rfc: id.toUpperCase(), deletedAt: null },
			select: { rfc: true },
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
}
