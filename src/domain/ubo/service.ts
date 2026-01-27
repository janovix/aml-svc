import { UBORepository } from "./repository";
import type {
	UBOCreateInput,
	UBOUpdateInput,
	UBOPatchInput,
	PEPStatusUpdateInput,
} from "./schemas";
import type { UBOEntity, UBORelationshipType, UBOListResult } from "./types";

export class UBOService {
	constructor(private readonly repository: UBORepository) {}

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
		// Validate ownership percentage for shareholders
		if (
			input.relationshipType === "SHAREHOLDER" &&
			(input.ownershipPercentage === undefined ||
				input.ownershipPercentage === null)
		) {
			throw new Error("OWNERSHIP_PERCENTAGE_REQUIRED_FOR_SHAREHOLDER");
		}

		// Validate minimum ownership percentage (legal requirement: 25% or more)
		if (
			input.relationshipType === "SHAREHOLDER" &&
			input.ownershipPercentage !== null &&
			input.ownershipPercentage !== undefined &&
			input.ownershipPercentage < 25
		) {
			throw new Error("MINIMUM_OWNERSHIP_PERCENTAGE_NOT_MET");
		}

		// Validate cap table doesn't exceed 100%
		if (
			input.relationshipType === "SHAREHOLDER" &&
			input.ownershipPercentage !== null &&
			input.ownershipPercentage !== undefined
		) {
			const existingUBOs = await this.repository.list(
				input.clientId,
				"SHAREHOLDER",
			);
			const currentTotal = existingUBOs.data.reduce(
				(sum, ubo) => sum + (ubo.ownershipPercentage || 0),
				0,
			);
			const newTotal = currentTotal + input.ownershipPercentage;

			if (newTotal > 100) {
				throw new Error("CAP_TABLE_EXCEEDS_100_PERCENT");
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
		// Validate ownership percentage for shareholders
		if (
			input.relationshipType === "SHAREHOLDER" &&
			(input.ownershipPercentage === undefined ||
				input.ownershipPercentage === null)
		) {
			throw new Error("OWNERSHIP_PERCENTAGE_REQUIRED_FOR_SHAREHOLDER");
		}

		// Validate minimum ownership percentage (legal requirement: 25% or more)
		if (
			input.relationshipType === "SHAREHOLDER" &&
			input.ownershipPercentage !== null &&
			input.ownershipPercentage !== undefined &&
			input.ownershipPercentage < 25
		) {
			throw new Error("MINIMUM_OWNERSHIP_PERCENTAGE_NOT_MET");
		}

		// Validate cap table doesn't exceed 100%
		if (
			input.relationshipType === "SHAREHOLDER" &&
			input.ownershipPercentage !== null &&
			input.ownershipPercentage !== undefined
		) {
			const existingUBOs = await this.repository.list(clientId, "SHAREHOLDER");
			const currentTotal = existingUBOs.data
				.filter((ubo) => ubo.id !== uboId) // Exclude the UBO being updated
				.reduce((sum, ubo) => sum + (ubo.ownershipPercentage || 0), 0);
			const newTotal = currentTotal + input.ownershipPercentage;

			if (newTotal > 100) {
				throw new Error("CAP_TABLE_EXCEEDS_100_PERCENT");
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

		// Validate ownership percentage is required when switching to SHAREHOLDER
		if (
			relationshipType === "SHAREHOLDER" &&
			(input.ownershipPercentage === undefined ||
				input.ownershipPercentage === null)
		) {
			// If switching to SHAREHOLDER, require ownershipPercentage
			if (
				input.relationshipType === "SHAREHOLDER" &&
				currentUBO.relationshipType !== "SHAREHOLDER"
			) {
				throw new Error("OWNERSHIP_PERCENTAGE_REQUIRED");
			}
			// If already a SHAREHOLDER and not updating percentage, use current value
			// (no validation needed)
		}

		// If updating ownership percentage for a shareholder
		if (
			relationshipType === "SHAREHOLDER" &&
			input.ownershipPercentage !== undefined &&
			input.ownershipPercentage !== null
		) {
			// Validate minimum ownership percentage (legal requirement: 25% or more)
			if (input.ownershipPercentage < 25) {
				throw new Error("MINIMUM_OWNERSHIP_PERCENTAGE_NOT_MET");
			}

			// Validate cap table doesn't exceed 100%
			const existingUBOs = await this.repository.list(clientId, "SHAREHOLDER");
			const currentTotal = existingUBOs.data
				.filter((ubo) => ubo.id !== uboId) // Exclude the UBO being updated
				.reduce((sum, ubo) => sum + (ubo.ownershipPercentage || 0), 0);
			const newTotal = currentTotal + input.ownershipPercentage;

			if (newTotal > 100) {
				throw new Error("CAP_TABLE_EXCEEDS_100_PERCENT");
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
		return `${ubo.firstName} ${ubo.lastName} ${ubo.secondLastName || ""}`.trim();
	}
}
