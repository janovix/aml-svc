import type { TransactionRepository } from "./repository";
import type {
	TransactionCreateInput,
	TransactionFilters,
	TransactionUpdateInput,
} from "./schemas";
import type { TransactionEntity, TransactionListResult } from "./types";
import type { ClientRepository } from "../client/repository";
import type { UmaValueRepository } from "../uma/repository";

export class TransactionService {
	constructor(
		private readonly repository: TransactionRepository,
		private readonly clientRepository: ClientRepository,
		private readonly umaRepository: UmaValueRepository,
	) {}

	list(
		organizationId: string,
		filters: TransactionFilters,
	): Promise<TransactionListResult> {
		return this.repository.list(organizationId, filters);
	}

	async get(organizationId: string, id: string): Promise<TransactionEntity> {
		const record = await this.repository.getById(organizationId, id);
		if (!record) {
			throw new Error("TRANSACTION_NOT_FOUND");
		}
		return record;
	}

	async create(
		input: TransactionCreateInput,
		organizationId: string,
	): Promise<TransactionEntity> {
		await this.ensureClientExists(organizationId, input.clientId);
		return this.repository.create(input, organizationId);
	}

	update(
		organizationId: string,
		id: string,
		input: TransactionUpdateInput,
	): Promise<TransactionEntity> {
		return this.repository.update(organizationId, id, input);
	}

	delete(organizationId: string, id: string): Promise<void> {
		return this.repository.delete(organizationId, id);
	}

	private async ensureClientExists(
		organizationId: string,
		clientId: string,
	): Promise<void> {
		const client = await this.clientRepository.getById(
			organizationId,
			clientId,
		);
		if (!client) {
			throw new Error("CLIENT_NOT_FOUND");
		}
	}

	getStats(organizationId: string): Promise<{
		transactionsToday: number;
		suspiciousTransactions: number;
		totalVolume: string;
		totalVehicles: number;
	}> {
		return this.repository.getStats(organizationId);
	}
}
