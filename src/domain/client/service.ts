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
	ListResultWithMeta,
} from "./types";
import type { TenantContext } from "../../lib/tenant-context";

export class ClientService {
	constructor(private readonly repository: ClientRepository) {}

	list(
		tenant: TenantContext,
		filters: ClientFilters,
	): Promise<ListResultWithMeta<ClientEntity>> {
		return this.repository.list(tenant, filters);
	}

	async get(tenant: TenantContext, id: string): Promise<ClientEntity> {
		const client = await this.repository.getById(tenant, id);
		if (!client) {
			throw new Error("CLIENT_NOT_FOUND");
		}
		return client;
	}

	findByRfc(tenant: TenantContext, rfc: string): Promise<ClientEntity | null> {
		return this.repository.findByRfc(tenant, rfc);
	}

	create(
		tenant: TenantContext,
		input: ClientCreateInput,
	): Promise<ClientEntity> {
		return this.repository.create(tenant, input);
	}

	update(
		tenant: TenantContext,
		id: string,
		input: ClientUpdateInput,
	): Promise<ClientEntity> {
		return this.repository.update(tenant, id, input);
	}

	patch(
		tenant: TenantContext,
		id: string,
		input: ClientPatchInput,
	): Promise<ClientEntity> {
		return this.repository.patch(tenant, id, input);
	}

	delete(tenant: TenantContext, id: string): Promise<void> {
		return this.repository.delete(tenant, id);
	}

	listDocuments(
		tenant: TenantContext,
		clientId: string,
	): Promise<ClientDocumentEntity[]> {
		return this.repository.listDocuments(tenant.organizationId, clientId);
	}

	createDocument(
		tenant: TenantContext,
		input: ClientDocumentCreateInput,
	): Promise<ClientDocumentEntity> {
		return this.repository.createDocument(tenant.organizationId, input);
	}

	updateDocument(
		tenant: TenantContext,
		clientId: string,
		documentId: string,
		input: ClientDocumentUpdateInput,
	): Promise<ClientDocumentEntity> {
		return this.repository.updateDocument(
			tenant.organizationId,
			clientId,
			documentId,
			input,
		);
	}

	patchDocument(
		tenant: TenantContext,
		clientId: string,
		documentId: string,
		input: ClientDocumentPatchInput,
	): Promise<ClientDocumentEntity> {
		return this.repository.patchDocument(
			tenant.organizationId,
			clientId,
			documentId,
			input,
		);
	}

	deleteDocument(
		tenant: TenantContext,
		clientId: string,
		documentId: string,
	): Promise<void> {
		return this.repository.deleteDocument(
			tenant.organizationId,
			clientId,
			documentId,
		);
	}

	listAddresses(
		tenant: TenantContext,
		clientId: string,
	): Promise<ClientAddressEntity[]> {
		return this.repository.listAddresses(tenant.organizationId, clientId);
	}

	createAddress(
		tenant: TenantContext,
		input: ClientAddressCreateInput,
	): Promise<ClientAddressEntity> {
		return this.repository.createAddress(tenant.organizationId, input);
	}

	updateAddress(
		tenant: TenantContext,
		clientId: string,
		addressId: string,
		input: ClientAddressUpdateInput,
	): Promise<ClientAddressEntity> {
		return this.repository.updateAddress(
			tenant.organizationId,
			clientId,
			addressId,
			input,
		);
	}

	patchAddress(
		tenant: TenantContext,
		clientId: string,
		addressId: string,
		input: ClientAddressPatchInput,
	): Promise<ClientAddressEntity> {
		return this.repository.patchAddress(
			tenant.organizationId,
			clientId,
			addressId,
			input,
		);
	}

	deleteAddress(
		tenant: TenantContext,
		clientId: string,
		addressId: string,
	): Promise<void> {
		return this.repository.deleteAddress(
			tenant.organizationId,
			clientId,
			addressId,
		);
	}

	getStats(tenant: TenantContext): Promise<{
		totalClients: number;
		physicalClients: number;
		moralClients: number;
	}> {
		return this.repository.getStats(tenant);
	}
}
