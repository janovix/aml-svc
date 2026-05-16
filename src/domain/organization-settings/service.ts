import type { OrganizationSettingsEntity } from "./types";
import { OrganizationSettingsRepository } from "./repository";
import type { TenantContext } from "../../lib/tenant-context";
import type {
	OrganizationSettingsCreateInput,
	OrganizationSettingsUpdateInput,
} from "./schemas";

export class OrganizationSettingsService {
	constructor(private readonly repository: OrganizationSettingsRepository) {}

	async getByOrganizationId(
		tenant: TenantContext,
	): Promise<OrganizationSettingsEntity | null> {
		return this.repository.findByOrganizationId(tenant);
	}

	async createOrUpdate(
		tenant: TenantContext,
		data: OrganizationSettingsCreateInput,
	): Promise<OrganizationSettingsEntity> {
		return this.repository.upsert(tenant, data);
	}

	async update(
		tenant: TenantContext,
		data: OrganizationSettingsUpdateInput,
	): Promise<OrganizationSettingsEntity> {
		return this.repository.update(tenant, data);
	}
}
