import type { ComplianceOrganizationEntity } from "./types";
import { ComplianceOrganizationRepository } from "./repository";

export class ComplianceOrganizationService {
	constructor(private readonly repository: ComplianceOrganizationRepository) {}

	async getByUserId(
		userId: string,
	): Promise<ComplianceOrganizationEntity | null> {
		return this.repository.findByUserId(userId);
	}

	async createOrUpdate(
		userId: string,
		data: {
			claveSujetoObligado: string;
			claveActividad: string;
		},
	): Promise<ComplianceOrganizationEntity> {
		return this.repository.upsert(userId, data);
	}
}
