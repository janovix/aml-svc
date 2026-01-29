import { UBORepository } from "./repository";
import type {
	UBOCreateInput,
	UBOUpdateInput,
	UBOPatchInput,
	PEPStatusUpdateInput,
} from "./schemas";
import type { UBOEntity, UBORelationshipType, UBOListResult } from "./types";
import { formatFullName } from "../../lib/route-helpers";

export class UBOService {
	constructor(private readonly repository: UBORepository) {}

	// =============== Private validation helpers ===============

	/**
	 * Validate that ownership percentage is provided for shareholders
	 */
	private validateOwnershipPercentageRequired(
		relationshipType: UBORelationshipType,
		ownershipPercentage: number | null | undefined,
	): void {
		if (
			relationshipType === "SHAREHOLDER" &&
			(ownershipPercentage === undefined || ownershipPercentage === null)
		) {
			throw new Error("OWNERSHIP_PERCENTAGE_REQUIRED_FOR_SHAREHOLDER");
		}
	}

	/**
	 * Validate minimum ownership percentage (legal requirement: 25% or more)
	 */
	private validateMinimumOwnershipPercentage(
		ownershipPercentage: number | null | undefined,
	): void {
		if (
			ownershipPercentage !== null &&
			ownershipPercentage !== undefined &&
			ownershipPercentage < 25
		) {
			throw new Error("MINIMUM_OWNERSHIP_PERCENTAGE_NOT_MET");
		}
	}

	/**
	 * Validate cap table doesn't exceed 100%
	 */
	private async validateCapTable(
		clientId: string,
		newPercentage: number,
		excludeUboId?: string,
	): Promise<void> {
		const existingUBOs = await this.repository.list(clientId, "SHAREHOLDER");
		const currentTotal = existingUBOs.data
			.filter((ubo) => (excludeUboId ? ubo.id !== excludeUboId : true))
			.reduce((sum, ubo) => sum + (ubo.ownershipPercentage || 0), 0);
		const newTotal = currentTotal + newPercentage;

		if (newTotal > 100) {
			throw new Error("CAP_TABLE_EXCEEDS_100_PERCENT");
		}
	}

	// =============== Public methods ===============

	/**
	 * List all UBOs for a client
	 */
	async list(
		organizationId: string,
		clientId: string,
		relationshipType?: UBORelationshipType,
	): Promise<UBOListResult> {
		// Note: Organization validation should be done at the route level
		// by verifying the client belongs to the organization
		return this.repository.list(clientId, relationshipType);
	}

	/**
	 * Get a single UBO by ID
	 */
	async get(
		organizationId: string,
		clientId: string,
		uboId: string,
	): Promise<UBOEntity> {
		const ubo = await this.repository.getById(clientId, uboId);
		if (!ubo) {
			throw new Error("UBO_NOT_FOUND");
		}
		return ubo;
	}

	/**
	 * Create a new UBO
	 */
	async create(
		organizationId: string,
		input: UBOCreateInput,
	): Promise<UBOEntity> {
		if (input.relationshipType === "SHAREHOLDER") {
			this.validateOwnershipPercentageRequired(
				input.relationshipType,
				input.ownershipPercentage,
			);
			this.validateMinimumOwnershipPercentage(input.ownershipPercentage);
			if (
				input.ownershipPercentage !== null &&
				input.ownershipPercentage !== undefined
			) {
				await this.validateCapTable(input.clientId, input.ownershipPercentage);
			}
		}

		return this.repository.create(input);
	}

	/**
	 * Update a UBO (full update)
	 */
	async update(
		organizationId: string,
		clientId: string,
		uboId: string,
		input: UBOUpdateInput,
	): Promise<UBOEntity> {
		if (input.relationshipType === "SHAREHOLDER") {
			this.validateOwnershipPercentageRequired(
				input.relationshipType,
				input.ownershipPercentage,
			);
			this.validateMinimumOwnershipPercentage(input.ownershipPercentage);
			if (
				input.ownershipPercentage !== null &&
				input.ownershipPercentage !== undefined
			) {
				await this.validateCapTable(clientId, input.ownershipPercentage, uboId);
			}
		}

		return this.repository.update(clientId, uboId, input);
	}

	/**
	 * Patch a UBO (partial update)
	 */
	async patch(
		organizationId: string,
		clientId: string,
		uboId: string,
		input: UBOPatchInput,
	): Promise<UBOEntity> {
		// Get current UBO to check relationship type
		const currentUBO = await this.repository.getById(clientId, uboId);
		if (!currentUBO) {
			throw new Error("UBO_NOT_FOUND");
		}

		// Determine the relationship type (use input if provided, otherwise current)
		const relationshipType =
			input.relationshipType || currentUBO.relationshipType;

		// Validate ownership percentage when working with shareholders
		if (relationshipType === "SHAREHOLDER") {
			// If switching to SHAREHOLDER, require ownershipPercentage
			if (
				input.relationshipType === "SHAREHOLDER" &&
				currentUBO.relationshipType !== "SHAREHOLDER" &&
				(input.ownershipPercentage === undefined ||
					input.ownershipPercentage === null)
			) {
				throw new Error("OWNERSHIP_PERCENTAGE_REQUIRED");
			}

			// If updating ownership percentage, validate it
			if (
				input.ownershipPercentage !== undefined &&
				input.ownershipPercentage !== null
			) {
				this.validateMinimumOwnershipPercentage(input.ownershipPercentage);
				await this.validateCapTable(clientId, input.ownershipPercentage, uboId);
			}
		}

		return this.repository.patch(clientId, uboId, input);
	}

	/**
	 * Delete a UBO
	 */
	async delete(
		organizationId: string,
		clientId: string,
		uboId: string,
	): Promise<void> {
		return this.repository.delete(clientId, uboId);
	}

	/**
	 * Update PEP status for a UBO (used by pep-check-worker)
	 */
	async updatePEPStatus(
		uboId: string,
		input: PEPStatusUpdateInput,
	): Promise<UBOEntity> {
		return this.repository.updatePEPStatus(uboId, {
			isPEP: input.isPEP,
			pepStatus: input.pepStatus,
			pepDetails: input.pepDetails,
			pepMatchConfidence: input.pepMatchConfidence,
			pepCheckedAt: new Date(input.pepCheckedAt),
		});
	}

	/**
	 * Get UBOs with stale PEP checks (for cron refresh)
	 */
	async getStaleUBOs(
		threshold: Date,
		limit: number = 100,
	): Promise<Array<{ id: string; clientId: string; fullName: string }>> {
		return this.repository.getStaleUBOs(threshold, limit);
	}

	/**
	 * Get the full name of a UBO for PEP checking
	 */
	getUBOFullName(ubo: UBOEntity): string {
		return formatFullName(ubo.firstName, ubo.lastName, ubo.secondLastName);
	}
}
