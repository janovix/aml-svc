import type { OrganizationSettingsEntity } from "./types";
import { OrganizationSettingsRepository } from "./repository";

export class OrganizationSettingsService {
	constructor(private readonly repository: OrganizationSettingsRepository) {}

	async getByOrganizationId(
		organizationId: string,
	): Promise<OrganizationSettingsEntity | null> {
		return this.repository.findByOrganizationId(organizationId);
	}

	async createOrUpdate(
		organizationId: string,
		data: {
			obligatedSubjectKey: string;
			activityKey: string;
		},
	): Promise<OrganizationSettingsEntity> {
		return this.repository.upsert(organizationId, data);
	}

	async update(
		organizationId: string,
		data: {
			obligatedSubjectKey?: string;
			activityKey?: string;
		},
	): Promise<OrganizationSettingsEntity> {
		return this.repository.update(organizationId, data);
	}
}
