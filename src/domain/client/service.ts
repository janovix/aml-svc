import type { ClientRepository } from "./repository";
import type {
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

export class ClientService {
	constructor(private readonly repository: ClientRepository) {}

	list(
		organizationId: string,
		filters: ClientFilters,
	): Promise<ListResult<ClientEntity>> {
		return this.repository.list(organizationId, filters);
	}

	async get(organizationId: string, id: string): Promise<ClientEntity> {
		const client = await this.repository.getById(organizationId, id);
		if (!client) {
			throw new Error("CLIENT_NOT_FOUND");
		}
		return client;
	}

	create(
		organizationId: string,
		input: ClientCreateInput,
	): Promise<ClientEntity> {
		return this.repository.create(organizationId, input);
	}

	update(
		organizationId: string,
		id: string,
		input: ClientUpdateInput,
	): Promise<ClientEntity> {
		return this.repository.update(organizationId, id, input);
	}

	patch(
		organizationId: string,
		id: string,
		input: ClientPatchInput,
	): Promise<ClientEntity> {
		return this.repository.patch(organizationId, id, input);
	}

	delete(organizationId: string, id: string): Promise<void> {
		return this.repository.delete(organizationId, id);
	}

	listDocuments(
		organizationId: string,
		clientId: string,
	): Promise<ClientDocumentEntity[]> {
		return this.repository.listDocuments(organizationId, clientId);
	}

	createDocument(
		organizationId: string,
		input: ClientDocumentCreateInput,
	): Promise<ClientDocumentEntity> {
		return this.repository.createDocument(organizationId, input);
	}

	updateDocument(
		organizationId: string,
		clientId: string,
		documentId: string,
		input: ClientDocumentUpdateInput,
	): Promise<ClientDocumentEntity> {
		return this.repository.updateDocument(
			organizationId,
			clientId,
			documentId,
			input,
		);
	}

	patchDocument(
		organizationId: string,
		clientId: string,
		documentId: string,
		input: ClientDocumentPatchInput,
	): Promise<ClientDocumentEntity> {
		return this.repository.patchDocument(
			organizationId,
			clientId,
			documentId,
			input,
		);
	}

	deleteDocument(
		organizationId: string,
		clientId: string,
		documentId: string,
	): Promise<void> {
		return this.repository.deleteDocument(organizationId, clientId, documentId);
	}

	listAddresses(
		organizationId: string,
		clientId: string,
	): Promise<ClientAddressEntity[]> {
		return this.repository.listAddresses(organizationId, clientId);
	}

	createAddress(
		organizationId: string,
		input: ClientAddressCreateInput,
	): Promise<ClientAddressEntity> {
		return this.repository.createAddress(organizationId, input);
	}

	updateAddress(
		organizationId: string,
		clientId: string,
		addressId: string,
		input: ClientAddressUpdateInput,
	): Promise<ClientAddressEntity> {
		return this.repository.updateAddress(
			organizationId,
			clientId,
			addressId,
			input,
		);
	}

	patchAddress(
		organizationId: string,
		clientId: string,
		addressId: string,
		input: ClientAddressPatchInput,
	): Promise<ClientAddressEntity> {
		return this.repository.patchAddress(
			organizationId,
			clientId,
			addressId,
			input,
		);
	}

	deleteAddress(
		organizationId: string,
		clientId: string,
		addressId: string,
	): Promise<void> {
		return this.repository.deleteAddress(organizationId, clientId, addressId);
	}

	getStats(organizationId: string): Promise<{
		totalClients: number;
		physicalClients: number;
		moralClients: number;
	}> {
		return this.repository.getStats(organizationId);
	}
}
