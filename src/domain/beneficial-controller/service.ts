/**
 * Beneficial Controller Domain Service
 * Business logic for beneficial controller management
 */

import type { PrismaClient } from "@prisma/client";
import type {
	BeneficialControllerEntity,
	BeneficialControllerFilters,
	BeneficialControllerListResult,
} from "./types.js";
import type {
	BeneficialControllerCreateInput,
	BeneficialControllerUpdateInput,
	BeneficialControllerPatchInput,
} from "./schemas.js";
import { BeneficialControllerRepository } from "./repository.js";
import { formatFullName } from "../../lib/route-helpers.js";

export class ValidationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "ValidationError";
	}
}

export class BeneficialControllerService {
	private readonly repo: BeneficialControllerRepository;

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	constructor(db: PrismaClient | any) {
		this.repo = new BeneficialControllerRepository(db);
	}

	async list(
		filters: BeneficialControllerFilters,
	): Promise<BeneficialControllerListResult> {
		return this.repo.list(filters);
	}

	async getById(
		clientId: string,
		bcId: string,
	): Promise<BeneficialControllerEntity | null> {
		return this.repo.getById(clientId, bcId);
	}

	async create(
		clientId: string,
		input: BeneficialControllerCreateInput,
	): Promise<BeneficialControllerEntity> {
		// Validate that all BCs are persons (schema enforces required firstName/lastName)
		// No additional validation needed beyond schema validation
		return this.repo.create(clientId, input);
	}

	async update(
		clientId: string,
		bcId: string,
		input: BeneficialControllerUpdateInput,
	): Promise<BeneficialControllerEntity> {
		const existing = await this.repo.getById(clientId, bcId);
		if (!existing) {
			throw new ValidationError("Beneficial controller not found");
		}

		return this.repo.update(clientId, bcId, input);
	}

	async patch(
		clientId: string,
		bcId: string,
		input: BeneficialControllerPatchInput,
	): Promise<BeneficialControllerEntity> {
		const existing = await this.repo.getById(clientId, bcId);
		if (!existing) {
			throw new ValidationError("Beneficial controller not found");
		}

		return this.repo.patch(clientId, bcId, input);
	}

	async delete(clientId: string, bcId: string): Promise<void> {
		return this.repo.delete(clientId, bcId);
	}

	async findByShareholderId(
		shareholderId: string,
	): Promise<BeneficialControllerListResult> {
		return this.repo.findByShareholderId(shareholderId);
	}

	async updateScreening(
		bcId: string,
		data: {
			watchlistQueryId?: string;
			ofacSanctioned?: boolean;
			unscSanctioned?: boolean;
			sat69bListed?: boolean;
			adverseMediaFlagged?: boolean;
			isPEP?: boolean;
			screeningResult?: string;
			screenedAt?: Date;
		},
	): Promise<BeneficialControllerEntity> {
		return this.repo.updateScreening(bcId, data);
	}

	/**
	 * Gets the full name of a beneficial controller
	 */
	getBCFullName(bc: BeneficialControllerEntity): string {
		return formatFullName(
			bc.firstName,
			bc.lastName,
			bc.secondLastName || undefined,
		);
	}
}
