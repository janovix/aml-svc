import type { OrganizationSettingsEntity } from "./types";
import { OrganizationSettingsRepository } from "./repository";
import type { TenantContext } from "../../lib/tenant-context";

export class OrganizationSettingsService {
	constructor(private readonly repository: OrganizationSettingsRepository) {}

	async getByOrganizationId(
		tenant: TenantContext,
	): Promise<OrganizationSettingsEntity | null> {
		return this.repository.findByOrganizationId(tenant);
	}

	async createOrUpdate(
		tenant: TenantContext,
		data: {
			obligatedSubjectKey: string;
			activityKey: string;
			selfServiceMode?: string;
			selfServiceExpiryHours?: number;
			selfServiceRequiredSections?: string[] | null;
			selfServiceSendEmail?: boolean;
		},
	): Promise<OrganizationSettingsEntity> {
		return this.repository.upsert(tenant, data);
	}

	async update(
		tenant: TenantContext,
		data: {
			obligatedSubjectKey?: string;
			activityKey?: string;
			selfServiceMode?: string;
			selfServiceExpiryHours?: number;
			selfServiceRequiredSections?: string[] | null;
			selfServiceSendEmail?: boolean;
		},
	): Promise<OrganizationSettingsEntity> {
		return this.repository.update(tenant, data);
	}
}
