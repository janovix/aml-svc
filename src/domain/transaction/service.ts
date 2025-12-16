import type { TransactionRepository } from "./repository";
import type {
	TransactionCreateInput,
	TransactionFilters,
	TransactionUpdateInput,
} from "./schemas";
import type { TransactionEntity, TransactionListResult } from "./types";
import type { ClientRepository } from "../client/repository";

export class TransactionService {
	constructor(
		private readonly repository: TransactionRepository,
		private readonly clientRepository: ClientRepository,
	) {}

	list(filters: TransactionFilters): Promise<TransactionListResult> {
		return this.repository.list(filters);
	}

	async get(id: string): Promise<TransactionEntity> {
		const record = await this.repository.getById(id);
		if (!record) {
			throw new Error("TRANSACTION_NOT_FOUND");
		}
		return record;
	}

	async create(input: TransactionCreateInput): Promise<TransactionEntity> {
		await this.ensureClientExists(input.clientId);
		return this.repository.create(input);
	}

	update(
		id: string,
		input: TransactionUpdateInput,
	): Promise<TransactionEntity> {
		return this.repository.update(id, input);
	}

	delete(id: string): Promise<void> {
		return this.repository.delete(id);
	}

	private async ensureClientExists(clientId: string): Promise<void> {
		const client = await this.clientRepository.getById(clientId);
		if (!client) {
			throw new Error("CLIENT_NOT_FOUND");
		}
	}
}
