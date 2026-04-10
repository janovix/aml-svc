/**
 * Rule evaluation engine
 * @deprecated This evaluator was used for dynamic rule configuration.
 * Alert detection now uses hardcoded seekers in src/seekers/.
 * This file is kept for reference but should not be used.
 */

import type {
	Client,
	EvaluationResult,
	Operation,
	UmaValueEntity,
} from "../types";

/**
 * @deprecated Rule configuration type - no longer used.
 * Alert rules now use hardcoded seekers instead of dynamic configuration.
 */
interface RuleConfig {
	type: "operation_amount" | "operation_count" | "aggregate_amount" | "custom";
	threshold?: number;
	currency?: string;
	timeWindow?: string;
	operationType?: string;
	conditions?: RuleCondition[];
	logic?: "AND" | "OR";
}

interface RuleCondition {
	field: string;
	operator: string;
	value?: unknown;
	threshold?: number;
}

export class RuleEvaluator {
	/**
	 * Evaluates a rule configuration against client context
	 */
	evaluate(
		ruleConfig: RuleConfig,
		client: Client,
		operations: Operation[],
		umaValue: UmaValueEntity | null,
	): EvaluationResult {
		switch (ruleConfig.type) {
			case "operation_amount":
				return this.evaluateOperationAmount(ruleConfig, operations, umaValue);
			case "operation_count":
				return this.evaluateOperationCount(ruleConfig, operations);
			case "aggregate_amount":
				return this.evaluateAggregateAmount(ruleConfig, operations, umaValue);
			case "custom":
				return this.evaluateCustomRule(
					ruleConfig,
					client,
					operations,
					umaValue,
				);
			default:
				return {
					triggered: false,
					data: {
						operationIds: [],
						totalAmount: 0,
						currency: "MXN",
						triggeredAt: new Date().toISOString(),
					},
				};
		}
	}

	/**
	 * Evaluates operation amount threshold rule
	 */
	private evaluateOperationAmount(
		ruleConfig: RuleConfig,
		operations: Operation[],
		umaValue: UmaValueEntity | null,
	): EvaluationResult {
		const threshold = this.calculateThreshold(
			ruleConfig.threshold || 0,
			umaValue,
		);
		const currency = ruleConfig.currency || "MXN";
		const timeWindow = this.parseTimeWindow(ruleConfig.timeWindow || "24h");
		const cutoffTime = new Date(Date.now() - timeWindow);

		const matchedOperations = operations.filter((op) => {
			const opDate = new Date(op.createdAt);
			return (
				opDate >= cutoffTime &&
				op.currency === currency &&
				op.amount >= threshold
			);
		});

		if (matchedOperations.length === 0) {
			return {
				triggered: false,
				data: {
					operationIds: [],
					totalAmount: 0,
					currency,
					triggeredAt: new Date().toISOString(),
				},
			};
		}

		const totalAmount = matchedOperations.reduce(
			(sum, op) => sum + op.amount,
			0,
		);

		return {
			triggered: true,
			matchedOperations,
			data: {
				operationIds: matchedOperations.map((op) => op.id),
				totalAmount,
				currency,
				triggeredAt: new Date().toISOString(),
			},
		};
	}

	/**
	 * Evaluates operation count rule
	 */
	private evaluateOperationCount(
		ruleConfig: RuleConfig,
		operations: Operation[],
	): EvaluationResult {
		const threshold = ruleConfig.threshold || 0;
		const timeWindow = this.parseTimeWindow(ruleConfig.timeWindow || "1h");
		const cutoffTime = new Date(Date.now() - timeWindow);

		const matchedOperations = operations.filter((op) => {
			const opDate = new Date(op.createdAt);
			return opDate >= cutoffTime;
		});

		const triggered = matchedOperations.length > threshold;

		return {
			triggered,
			matchedOperations: triggered ? matchedOperations : [],
			data: {
				operationIds: matchedOperations.map((op) => op.id),
				totalAmount: matchedOperations.reduce((sum, op) => sum + op.amount, 0),
				currency: matchedOperations[0]?.currency || "MXN",
				triggeredAt: new Date().toISOString(),
				operationCount: matchedOperations.length,
			},
		};
	}

	/**
	 * Evaluates aggregate amount rule
	 */
	private evaluateAggregateAmount(
		ruleConfig: RuleConfig,
		operations: Operation[],
		umaValue: UmaValueEntity | null,
	): EvaluationResult {
		const threshold = this.calculateThreshold(
			ruleConfig.threshold || 0,
			umaValue,
		);
		const currency = ruleConfig.currency || "MXN";
		const timeWindow = this.parseTimeWindow(ruleConfig.timeWindow || "7d");
		const cutoffTime = new Date(Date.now() - timeWindow);

		let filteredOperations = operations.filter((op) => {
			const opDate = new Date(op.createdAt);
			return opDate >= cutoffTime && op.currency === currency;
		});

		// Filter by operation type if specified
		if (ruleConfig.operationType) {
			filteredOperations = filteredOperations.filter(
				(op) => op.operationType === ruleConfig.operationType,
			);
		}

		const totalAmount = filteredOperations.reduce(
			(sum, op) => sum + op.amount,
			0,
		);

		const triggered = totalAmount >= threshold;

		return {
			triggered,
			matchedOperations: triggered ? filteredOperations : [],
			data: {
				operationIds: filteredOperations.map((op) => op.id),
				totalAmount,
				currency,
				triggeredAt: new Date().toISOString(),
			},
		};
	}

	/**
	 * Evaluates custom rule with multiple conditions
	 */
	private evaluateCustomRule(
		ruleConfig: RuleConfig,
		client: Client,
		operations: Operation[],
		umaValue: UmaValueEntity | null,
	): EvaluationResult {
		if (!ruleConfig.conditions || ruleConfig.conditions.length === 0) {
			return {
				triggered: false,
				data: {
					operationIds: [],
					totalAmount: 0,
					currency: "MXN",
					triggeredAt: new Date().toISOString(),
				},
			};
		}

		const logic = ruleConfig.logic || "AND";
		const conditionResults = ruleConfig.conditions.map(
			(condition: RuleCondition) =>
				this.evaluateCondition(condition, client, operations, umaValue),
		);

		let triggered: boolean;
		if (logic === "AND") {
			triggered = conditionResults.every(
				(result: { passed: boolean }) => result.passed,
			);
		} else {
			triggered = conditionResults.some(
				(result: { passed: boolean }) => result.passed,
			);
		}

		// Collect all matched operations from conditions
		const allMatchedOperations: Operation[] = [];
		conditionResults.forEach(
			(result: { passed: boolean; matchedOperations?: Operation[] }) => {
				if (result.matchedOperations) {
					allMatchedOperations.push(...result.matchedOperations);
				}
			},
		);

		// Remove duplicates
		const uniqueOperations = Array.from(
			new Map(allMatchedOperations.map((op) => [op.id, op])).values(),
		);

		return {
			triggered,
			matchedOperations: triggered ? uniqueOperations : [],
			data: {
				operationIds: uniqueOperations.map((op) => op.id),
				totalAmount: uniqueOperations.reduce((sum, op) => sum + op.amount, 0),
				currency: uniqueOperations[0]?.currency || "MXN",
				triggeredAt: new Date().toISOString(),
			},
		};
	}

	/**
	 * Evaluates a single condition
	 */
	private evaluateCondition(
		condition: {
			field: string;
			operator: string;
			value?: unknown;
			threshold?: number;
		},
		client: Client,
		operations: Operation[],
		umaValue: UmaValueEntity | null,
	): {
		passed: boolean;
		matchedOperations?: Operation[];
	} {
		const fieldParts = condition.field.split(".");
		const entity = fieldParts[0];
		const field = fieldParts.slice(1).join(".");

		if (entity === "client") {
			return this.evaluateClientCondition(condition, client, field);
		} else if (entity === "operations") {
			return this.evaluateOperationCondition(
				condition,
				operations,
				field,
				umaValue,
			);
		}

		return { passed: false };
	}

	/**
	 * Evaluates a condition on client data
	 */
	private evaluateClientCondition(
		condition: { operator: string; value?: unknown },
		client: Client,
		field: string,
	): { passed: boolean } {
		const clientValue = this.getNestedValue(client, field);

		switch (condition.operator) {
			case "equals":
				return { passed: clientValue === condition.value };
			default:
				return { passed: false };
		}
	}

	/**
	 * Evaluates a condition on operation data
	 */
	private evaluateOperationCondition(
		condition: {
			operator: string;
			threshold?: number;
			value?: unknown;
		},
		operations: Operation[],
		field: string,
		umaValue: UmaValueEntity | null,
	): { passed: boolean; matchedOperations?: Operation[] } {
		switch (condition.operator) {
			case "sum": {
				const threshold = this.calculateThreshold(
					condition.threshold || 0,
					umaValue,
				);
				const sum = operations.reduce((acc, op) => {
					const value = this.getNestedValue(op, field);
					const numValue =
						typeof value === "number" ? value : Number(value) || 0;
					return acc + numValue;
				}, 0);
				return {
					passed: sum >= threshold,
					matchedOperations: sum >= threshold ? operations : [],
				};
			}
			case "count": {
				const threshold = condition.threshold || 0;
				return {
					passed: operations.length > threshold,
					matchedOperations: operations.length > threshold ? operations : [],
				};
			}
			case "greaterThan": {
				const threshold = this.calculateThreshold(
					condition.threshold || 0,
					umaValue,
				);
				const matched = operations.filter((op) => {
					const value = this.getNestedValue(op, field);
					const numValue =
						typeof value === "number" ? value : Number(value) || 0;
					return numValue > threshold;
				});
				return {
					passed: matched.length > 0,
					matchedOperations: matched,
				};
			}
			case "lessThan": {
				const threshold = this.calculateThreshold(
					condition.threshold || 0,
					umaValue,
				);
				const matched = operations.filter((op) => {
					const value = this.getNestedValue(op, field);
					const numValue =
						typeof value === "number" ? value : Number(value) || 0;
					return numValue < threshold;
				});
				return {
					passed: matched.length > 0,
					matchedOperations: matched,
				};
			}
			default:
				return { passed: false };
		}
	}

	/**
	 * Calculates threshold value, applying UMA multiplier if needed
	 * UMBRAL_AVISO = 6420 * umaValue.dailyValue
	 */
	private calculateThreshold(
		baseThreshold: number,
		umaValue: UmaValueEntity | null,
	): number {
		if (baseThreshold === 6420 && umaValue) {
			return 6420 * umaValue.dailyValue;
		}
		return baseThreshold;
	}

	/**
	 * Parses time window string (e.g., "24h", "7d", "1h") to milliseconds
	 */
	private parseTimeWindow(timeWindow: string): number {
		const match = timeWindow.match(/^(\d+)([hdm])$/);
		if (!match) {
			// Default to 24 hours
			return 24 * 60 * 60 * 1000;
		}

		const value = parseInt(match[1], 10);
		const unit = match[2];

		switch (unit) {
			case "h":
				return value * 60 * 60 * 1000;
			case "d":
				return value * 24 * 60 * 60 * 1000;
			case "m":
				return value * 60 * 1000;
			default:
				return 24 * 60 * 60 * 1000;
		}
	}

	/**
	 * Gets nested value from object using dot notation
	 */
	private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
		return path
			.split(".")
			.reduce(
				(current: unknown, key: string) =>
					current && typeof current === "object" && key in current
						? (current as Record<string, unknown>)[key]
						: undefined,
				obj,
			);
	}
}
