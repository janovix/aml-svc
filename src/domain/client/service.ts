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

	list(filters: ClientFilters): Promise<ListResult<ClientEntity>> {
		return this.repository.list(filters);
	}

	async get(id: string): Promise<ClientEntity> {
		const client = await this.repository.getById(id);
		if (!client) {
			throw new Error("CLIENT_NOT_FOUND");
		}
		return client;
	}

	create(input: ClientCreateInput): Promise<ClientEntity> {
		return this.repository.create(input);
	}

	update(id: string, input: ClientUpdateInput): Promise<ClientEntity> {
		return this.repository.update(id, input);
	}

	patch(id: string, input: ClientPatchInput): Promise<ClientEntity> {
		return this.repository.patch(id, input);
	}

	delete(id: string): Promise<void> {
		return this.repository.delete(id);
	}

	listDocuments(clientId: string): Promise<ClientDocumentEntity[]> {
		return this.repository.listDocuments(clientId);
	}

	createDocument(
		input: ClientDocumentCreateInput,
	): Promise<ClientDocumentEntity> {
		return this.repository.createDocument(input);
	}

	updateDocument(
		clientId: string,
		documentId: string,
		input: ClientDocumentUpdateInput,
	): Promise<ClientDocumentEntity> {
		return this.repository.updateDocument(clientId, documentId, input);
	}

	patchDocument(
		clientId: string,
		documentId: string,
		input: ClientDocumentPatchInput,
	): Promise<ClientDocumentEntity> {
		return this.repository.patchDocument(clientId, documentId, input);
	}

	deleteDocument(clientId: string, documentId: string): Promise<void> {
		return this.repository.deleteDocument(clientId, documentId);
	}

	listAddresses(clientId: string): Promise<ClientAddressEntity[]> {
		return this.repository.listAddresses(clientId);
	}

	createAddress(input: ClientAddressCreateInput): Promise<ClientAddressEntity> {
		return this.repository.createAddress(input);
	}

	updateAddress(
		clientId: string,
		addressId: string,
		input: ClientAddressUpdateInput,
	): Promise<ClientAddressEntity> {
		return this.repository.updateAddress(clientId, addressId, input);
	}

	patchAddress(
		clientId: string,
		addressId: string,
		input: ClientAddressPatchInput,
	): Promise<ClientAddressEntity> {
		return this.repository.patchAddress(clientId, addressId, input);
	}

	deleteAddress(clientId: string, addressId: string): Promise<void> {
		return this.repository.deleteAddress(clientId, addressId);
	}

	getStats(): Promise<{
		totalClients: number;
		openAlerts: number;
		urgentReviews: number;
	}> {
		return this.repository.getStats();
	}
}
