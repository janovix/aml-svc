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

	list(
		organizationId: string,
		filters: AlertRuleFilters,
	): Promise<ListResult<AlertRuleEntity>> {
		return this.repository.list(organizationId, filters);
	}

	async get(organizationId: string, id: string): Promise<AlertRuleEntity> {
		const rule = await this.repository.getById(organizationId, id);
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

	update(
		organizationId: string,
		id: string,
		input: AlertRuleUpdateInput,
	): Promise<AlertRuleEntity> {
		return this.repository.update(organizationId, id, input);
	}

	patch(
		organizationId: string,
		id: string,
		input: AlertRulePatchInput,
	): Promise<AlertRuleEntity> {
		return this.repository.patch(organizationId, id, input);
	}

	delete(organizationId: string, id: string): Promise<void> {
		return this.repository.delete(organizationId, id);
	}

	listActive(organizationId: string): Promise<AlertRuleEntity[]> {
		return this.repository.listActive(organizationId);
	}
}

export class AlertService {
	constructor(private readonly repository: AlertRepository) {}

	list(
		organizationId: string,
		filters: AlertFilters,
	): Promise<ListResult<AlertEntity>> {
		return this.repository.list(organizationId, filters);
	}

	async get(organizationId: string, id: string): Promise<AlertEntity> {
		const alert = await this.repository.getById(organizationId, id);
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

	update(
		organizationId: string,
		id: string,
		input: AlertUpdateInput,
	): Promise<AlertEntity> {
		return this.repository.update(organizationId, id, input);
	}

	patch(
		organizationId: string,
		id: string,
		input: AlertPatchInput,
	): Promise<AlertEntity> {
		return this.repository.patch(organizationId, id, input);
	}

	delete(organizationId: string, id: string): Promise<void> {
		return this.repository.delete(organizationId, id);
	}

	findByIdempotencyKey(
		organizationId: string,
		idempotencyKey: string,
	): Promise<AlertEntity | null> {
		return this.repository.findByIdempotencyKey(organizationId, idempotencyKey);
	}

	async updateSatFileUrl(
		organizationId: string,
		id: string,
		satFileUrl: string,
	): Promise<AlertEntity> {
		return this.repository.updateSatFileUrl(organizationId, id, satFileUrl);
	}
}
