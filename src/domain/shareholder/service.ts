/**
 * Shareholder Domain Service
 * Business logic for shareholder management with depth and ownership validation
 */

import type { PrismaClient } from "@prisma/client";
import type {
	ShareholderEntity,
	ShareholderFilters,
	ShareholderListResult,
} from "./types.js";
import type {
	ShareholderCreateInput,
	ShareholderUpdateInput,
	ShareholderPatchInput,
} from "./schemas.js";
import { ShareholderRepository } from "./repository.js";
import { formatFullName } from "../../lib/route-helpers.js";

export class ValidationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "ValidationError";
	}
}

export class ShareholderService {
	private readonly repo: ShareholderRepository;

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	constructor(db: PrismaClient | any) {
		this.repo = new ShareholderRepository(db);
	}

	async list(filters: ShareholderFilters): Promise<ShareholderListResult> {
		return this.repo.list(filters);
	}

	async getById(
		clientId: string,
		shareholderId: string,
	): Promise<ShareholderEntity | null> {
		return this.repo.getById(clientId, shareholderId);
	}

	async create(
		clientId: string,
		input: ShareholderCreateInput,
	): Promise<ShareholderEntity> {
		// Validate depth if this is a level-2 shareholder
		if (input.parentShareholderId) {
			await this.validateDepth(input.parentShareholderId);
		}

		// Validate ownership percentage cap
		await this.validateOwnershipCap(
			clientId,
			input.parentShareholderId ?? null,
			input.ownershipPercentage,
		);

		return this.repo.create(clientId, input);
	}

	async update(
		clientId: string,
		shareholderId: string,
		input: ShareholderUpdateInput,
	): Promise<ShareholderEntity> {
		const existing = await this.repo.getById(clientId, shareholderId);
		if (!existing) {
			throw new ValidationError("Shareholder not found");
		}

		// Validate depth if parent is changing
		if (
			input.parentShareholderId !== undefined &&
			input.parentShareholderId !== existing.parentShareholderId
		) {
			if (input.parentShareholderId) {
				await this.validateDepth(input.parentShareholderId);
			}
		}

		// Validate ownership percentage cap if ownership or parent is changing
		const newOwnership =
			input.ownershipPercentage ?? existing.ownershipPercentage;
		const newParent =
			input.parentShareholderId !== undefined
				? input.parentShareholderId
				: existing.parentShareholderId;

		await this.validateOwnershipCap(
			clientId,
			newParent ?? null,
			newOwnership,
			shareholderId,
		);

		return this.repo.update(clientId, shareholderId, input);
	}

	async patch(
		clientId: string,
		shareholderId: string,
		input: ShareholderPatchInput,
	): Promise<ShareholderEntity> {
		const existing = await this.repo.getById(clientId, shareholderId);
		if (!existing) {
			throw new ValidationError("Shareholder not found");
		}

		// Validate depth if parent is changing
		if (
			"parentShareholderId" in input &&
			input.parentShareholderId !== existing.parentShareholderId
		) {
			if (input.parentShareholderId) {
				await this.validateDepth(input.parentShareholderId);
			}
		}

		// Validate ownership percentage cap if ownership or parent is changing
		const newOwnership =
			"ownershipPercentage" in input && input.ownershipPercentage !== undefined
				? input.ownershipPercentage
				: existing.ownershipPercentage;
		const newParent =
			"parentShareholderId" in input
				? input.parentShareholderId
				: existing.parentShareholderId;

		await this.validateOwnershipCap(
			clientId,
			newParent ?? null,
			newOwnership,
			shareholderId,
		);

		return this.repo.patch(clientId, shareholderId, input);
	}

	async delete(clientId: string, shareholderId: string): Promise<void> {
		return this.repo.delete(clientId, shareholderId);
	}

	async listByParent(
		parentShareholderId: string,
	): Promise<ShareholderListResult> {
		return this.repo.listByParent(parentShareholderId);
	}

	/**
	 * Validates that adding a shareholder under the given parent doesn't exceed depth limit of 2
	 * @throws ValidationError if depth would exceed 2 levels
	 */
	private async validateDepth(parentShareholderId: string): Promise<void> {
		const parent = await this.repo.getByIdOnly(parentShareholderId);

		if (!parent) {
			throw new ValidationError("Parent shareholder not found");
		}

		// If parent has a parent, that means we're trying to create level 3
		if (parent.parentShareholderId !== null) {
			throw new ValidationError(
				"Maximum shareholder depth (2 levels) exceeded. Cannot add shareholders under a level-2 shareholder.",
			);
		}

		// Only company shareholders can have sub-shareholders
		if (parent.entityType !== "COMPANY") {
			throw new ValidationError(
				"Only company shareholders can have sub-shareholders",
			);
		}
	}

	/**
	 * Validates that adding/updating ownership doesn't exceed 100% cap for a given level
	 * @param clientId The client ID
	 * @param parentShareholderId The parent shareholder ID (null for level 1)
	 * @param newOwnership The new ownership percentage to add/set
	 * @param excludeShareholderId Optional shareholder ID to exclude from sum (for updates)
	 * @throws ValidationError if total ownership would exceed 100%
	 */
	private async validateOwnershipCap(
		clientId: string,
		parentShareholderId: string | null,
		newOwnership: number,
		excludeShareholderId?: string,
	): Promise<void> {
		const currentSum = await this.repo.getSumOfOwnershipByParent(
			clientId,
			parentShareholderId,
		);

		// Subtract the existing shareholder's ownership if updating
		let adjustedSum = currentSum;
		if (excludeShareholderId) {
			const existing = await this.repo.getById(clientId, excludeShareholderId);
			if (existing && existing.parentShareholderId === parentShareholderId) {
				adjustedSum -= existing.ownershipPercentage;
			}
		}

		const newTotal = adjustedSum + newOwnership;

		if (newTotal > 100) {
			const levelName = parentShareholderId
				? "this company shareholder"
				: "the client";
			throw new ValidationError(
				`Total ownership for ${levelName} would exceed 100% (current: ${adjustedSum.toFixed(2)}%, adding: ${newOwnership.toFixed(2)}%, total: ${newTotal.toFixed(2)}%)`,
			);
		}
	}

	/**
	 * Gets the display name for a shareholder
	 */
	getShareholderDisplayName(shareholder: ShareholderEntity): string {
		if (shareholder.entityType === "COMPANY") {
			return shareholder.businessName || "Unknown Company";
		}

		return formatFullName(
			shareholder.firstName || "",
			shareholder.lastName || "",
			shareholder.secondLastName || undefined,
		);
	}
}
