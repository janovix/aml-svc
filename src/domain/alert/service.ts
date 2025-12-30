import type { AlertRepository, AlertRuleRepository } from "./repository";
import type {
	AlertCreateInput,
	AlertFilters,
	AlertPatchInput,
	AlertRuleCreateInput,
	AlertRuleFilters,
	AlertRulePatchInput,
	AlertRuleUpdateInput,
	AlertUpdateInput,
} from "./schemas";
import type { AlertEntity, AlertRuleEntity, ListResult } from "./types";

export class AlertRuleService {
	constructor(private readonly repository: AlertRuleRepository) {}

	list(filters: AlertRuleFilters): Promise<ListResult<AlertRuleEntity>> {
		return this.repository.list(filters);
	}

	async get(id: string): Promise<AlertRuleEntity> {
		const rule = await this.repository.getById(id);
		if (!rule) {
			throw new Error("ALERT_RULE_NOT_FOUND");
		}
		return rule;
	}

	create(
		input: AlertRuleCreateInput,
		organizationId: string,
	): Promise<AlertRuleEntity> {
		return this.repository.create(input, organizationId);
	}

	update(id: string, input: AlertRuleUpdateInput): Promise<AlertRuleEntity> {
		return this.repository.update(id, input);
	}

	patch(id: string, input: AlertRulePatchInput): Promise<AlertRuleEntity> {
		return this.repository.patch(id, input);
	}

	delete(id: string): Promise<void> {
		return this.repository.delete(id);
	}

	listActive(): Promise<AlertRuleEntity[]> {
		return this.repository.listActive();
	}
}

export class AlertService {
	constructor(private readonly repository: AlertRepository) {}

	list(filters: AlertFilters): Promise<ListResult<AlertEntity>> {
		return this.repository.list(filters);
	}

	async get(id: string): Promise<AlertEntity> {
		const alert = await this.repository.getById(id);
		if (!alert) {
			throw new Error("ALERT_NOT_FOUND");
		}
		return alert;
	}

	create(
		input: AlertCreateInput,
		organizationId: string,
	): Promise<AlertEntity> {
		// The repository handles idempotency via idempotencyKey
		return this.repository.create(input, organizationId);
	}

	update(id: string, input: AlertUpdateInput): Promise<AlertEntity> {
		return this.repository.update(id, input);
	}

	patch(id: string, input: AlertPatchInput): Promise<AlertEntity> {
		return this.repository.patch(id, input);
	}

	delete(id: string): Promise<void> {
		return this.repository.delete(id);
	}

	findByIdempotencyKey(idempotencyKey: string): Promise<AlertEntity | null> {
		return this.repository.findByIdempotencyKey(idempotencyKey);
	}

	async updateSatFileUrl(id: string, satFileUrl: string): Promise<AlertEntity> {
		return this.repository.updateSatFileUrl(id, satFileUrl);
	}
}
