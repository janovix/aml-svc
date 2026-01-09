import type {
	AlertRepository,
	AlertRuleRepository,
	AlertRuleConfigRepository,
} from "./repository";
import type {
	AlertCreateInput,
	AlertFilters,
	AlertPatchInput,
	AlertRuleCreateInput,
	AlertRuleFilters,
	AlertRulePatchInput,
	AlertRuleUpdateInput,
	AlertUpdateInput,
	AlertRuleConfigCreateInput,
	AlertRuleConfigUpdateInput,
} from "./schemas";
import type {
	AlertEntity,
	AlertRuleEntity,
	AlertRuleConfigEntity,
	ListResult,
} from "./types";

/**
 * AlertRuleService - Global alert rules (no organizationId)
 */
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

	async getByRuleType(ruleType: string): Promise<AlertRuleEntity> {
		const rule = await this.repository.getByRuleType(ruleType);
		if (!rule) {
			throw new Error("ALERT_RULE_NOT_FOUND");
		}
		return rule;
	}

	create(input: AlertRuleCreateInput): Promise<AlertRuleEntity> {
		return this.repository.create(input);
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

	listActiveForSeeker(): Promise<AlertRuleEntity[]> {
		return this.repository.listActiveForSeeker();
	}
}

/**
 * AlertRuleConfigService - Configuration values for alert rules
 */
export class AlertRuleConfigService {
	constructor(private readonly repository: AlertRuleConfigRepository) {}

	listByAlertRuleId(alertRuleId: string): Promise<AlertRuleConfigEntity[]> {
		return this.repository.listByAlertRuleId(alertRuleId);
	}

	async getByKey(
		alertRuleId: string,
		key: string,
	): Promise<AlertRuleConfigEntity> {
		const config = await this.repository.getByKey(alertRuleId, key);
		if (!config) {
			throw new Error("ALERT_RULE_CONFIG_NOT_FOUND");
		}
		return config;
	}

	create(
		alertRuleId: string,
		input: AlertRuleConfigCreateInput,
	): Promise<AlertRuleConfigEntity> {
		return this.repository.create(alertRuleId, input);
	}

	update(
		alertRuleId: string,
		key: string,
		input: AlertRuleConfigUpdateInput,
	): Promise<AlertRuleConfigEntity> {
		return this.repository.update(alertRuleId, key, input);
	}

	delete(alertRuleId: string, key: string): Promise<void> {
		return this.repository.delete(alertRuleId, key);
	}
}

/**
 * AlertService - Organization-specific alerts
 */
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
}
