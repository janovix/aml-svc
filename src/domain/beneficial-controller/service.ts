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

/** Fields in create/update inputs that are FK references to client_documents(id). */
const DOC_ID_FIELDS = [
	"idCopyDocId",
	"curpCopyDocId",
	"cedulaFiscalDocId",
	"addressProofDocId",
	"constanciaBcDocId",
	"powerOfAttorneyDocId",
] as const;

type DocIdField = (typeof DOC_ID_FIELDS)[number];
type WithDocIds = Partial<Record<DocIdField, string | null | undefined>>;

export class BeneficialControllerService {
	private readonly repo: BeneficialControllerRepository;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	private readonly db: PrismaClient | any;

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	constructor(db: PrismaClient | any) {
		this.db = db;
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
		const resolved = await this.resolveDocIds(clientId, input);
		return this.repo.create(clientId, resolved);
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

		const resolved = await this.resolveDocIds(clientId, input);
		return this.repo.update(clientId, bcId, resolved);
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

		const resolved = await this.resolveDocIds(clientId, input);
		return this.repo.patch(clientId, bcId, resolved);
	}

	/**
	 * Resolves doc-svc document IDs (format: `doc_xxx`) to their corresponding
	 * internal client_documents primary keys (format: `DOCxxx`).
	 *
	 * When the frontend uploads a document it receives a doc-svc ID from the
	 * blocks/doc-svc service. That ID is stored in `client_documents.docSvcDocumentId`,
	 * not in `client_documents.id`. The beneficial_controllers table has FK constraints
	 * pointing at `client_documents.id`, so passing the raw doc-svc ID causes a
	 * FOREIGN KEY constraint failure. This method performs the lookup and replaces the
	 * doc-svc IDs transparently before the DB write.
	 *
	 * If a doc-svc ID cannot be resolved (document not yet registered in aml-svc),
	 * the field is set to null to avoid the FK violation.
	 */
	private async resolveDocIds<T extends WithDocIds>(
		clientId: string,
		input: T,
	): Promise<T> {
		const prisma = this.db as PrismaClient;

		// Collect only the doc-svc IDs that need resolution (start with "doc_")
		const docSvcIds = DOC_ID_FIELDS.map((field) => input[field]).filter(
			(id): id is string => typeof id === "string" && id.startsWith("doc_"),
		);

		if (docSvcIds.length === 0) return input;

		// Batch lookup: find all matching client_documents in one query
		const found = await prisma.clientDocument.findMany({
			where: {
				clientId,
				docSvcDocumentId: { in: docSvcIds },
			},
			select: { id: true, docSvcDocumentId: true },
		});

		const docSvcToInternalId = new Map(
			found
				.filter((d) => d.docSvcDocumentId != null)
				.map((d) => [d.docSvcDocumentId as string, d.id]),
		);

		// Build patched input, replacing doc-svc IDs with resolved internal IDs
		const patched = { ...input };
		for (const field of DOC_ID_FIELDS) {
			const value = patched[field];
			if (typeof value === "string" && value.startsWith("doc_")) {
				(patched as WithDocIds)[field] = docSvcToInternalId.get(value) ?? null;
			}
		}

		return patched;
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
