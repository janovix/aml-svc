/**
 * New Client High Value Seeker
 *
 * Detects when a new client (no previous operation history)
 * makes a very high-value purchase.
 */

import {
	BaseAlertSeeker,
	type AlertContext,
	type SeekerEvaluationResult,
	type VulnerableActivityCode,
	type AlertRuleType,
	type AlertSeverity,
} from "../types";

/**
 * Seeker for detecting new clients making high-value purchases
 *
 * Trigger: New client (no previous operations) buying very high-value vehicle
 * Severity: HIGH
 */
export class NewClientHighValueSeeker extends BaseAlertSeeker {
	readonly activityCode: VulnerableActivityCode = "VEH";
	readonly ruleType: AlertRuleType = "new_client_high_value";
	readonly name =
		"Cliente sin historial adquiriendo vehículo de muy alto valor";
	readonly description =
		"Detecta cuando un cliente nuevo (sin historial de operaciones) adquiere un vehículo de muy alto valor";
	readonly defaultSeverity: AlertSeverity = "HIGH";

	/**
	 * Default high-value threshold in MXN
	 * This should be configured based on business rules
	 * Default: 2,000,000 MXN (~luxury vehicle territory)
	 */
	private readonly DEFAULT_HIGH_VALUE_THRESHOLD = 2000000;

	/**
	 * Maximum age of client account to be considered "new" (in days)
	 */
	private readonly NEW_CLIENT_MAX_AGE_DAYS = 30;

	async evaluate(
		context: AlertContext,
	): Promise<SeekerEvaluationResult | null> {
		const { client, operations, alertRules, triggerOperation } = context;

		// Check if this is a new client
		if (!this.isNewClient(client, operations)) {
			return null;
		}

		// Get the threshold from rule configuration or use default
		const matchedRule = this.findMatchingRule(alertRules);
		const highValueThreshold = this.getHighValueThreshold(matchedRule);

		// If we have a trigger operation, evaluate only that one
		const operationsToEvaluate = triggerOperation
			? [triggerOperation]
			: operations;

		// Find high-value operations
		const highValueOperations = operationsToEvaluate.filter(
			(op) => op.amount >= highValueThreshold,
		);

		if (highValueOperations.length === 0) {
			return null;
		}

		// Calculate totals
		const totalAmount = this.sumOperationAmounts(highValueOperations);

		// Determine risk factors
		const riskFactors: string[] = [
			"new_client",
			"high_value_purchase",
			"no_operation_history",
		];

		// Additional risk if very high value
		if (highValueOperations.some((op) => op.amount >= highValueThreshold * 2)) {
			riskFactors.push("extremely_high_value");
		}

		// Check for luxury vehicle types
		const luxuryVehicles = highValueOperations.filter(
			(op) => op.vehicleType === "AIR" || op.vehicleType === "MARINE",
		);
		if (luxuryVehicles.length > 0) {
			riskFactors.push("luxury_vehicle_type");
		}

		return {
			triggered: true,
			matchedRule,
			alertMetadata: {
				...this.createBaseAlertMetadata(
					highValueOperations,
					totalAmount,
					highValueOperations[0]?.currency || "MXN",
				),
				clientId: client.id,
				clientName: client.name || client.rfc,
				alertType: "new_client_high_value",
				isNewClient: true,
				clientCreatedAt: client.createdAt,
				highValueThreshold,
				operationCount: highValueOperations.length,
				riskFactors,
				vehicleDetails: highValueOperations.map((op) => ({
					operationId: op.id,
					amount: op.amount,
					vehicleType: op.vehicleType,
					brand: op.brandId,
					model: op.model,
					year: op.year,
				})),
				requiresEnhancedDueDiligence: true,
				requiresResourceOriginDocumentation: true,
				complianceActions: [
					"verify_source_of_funds",
					"enhanced_identification",
					"economic_profile_review",
					"beneficial_ownership_verification",
				],
			},
			matchedOperations: highValueOperations,
			metadata: {
				seekerType: this.ruleType,
				activityCode: this.activityCode,
				isNewClient: true,
				highValueThreshold,
				maxOperationAmount: Math.max(
					...highValueOperations.map((op) => op.amount),
				),
			},
		};
	}

	/**
	 * Determines if a client is considered "new"
	 */
	private isNewClient(
		client: AlertContext["client"],
		operations: AlertContext["operations"],
	): boolean {
		// Check if client was created recently
		if (client.createdAt) {
			const clientCreatedDate = new Date(client.createdAt);
			const now = new Date();
			const daysSinceCreation = Math.floor(
				(now.getTime() - clientCreatedDate.getTime()) / (1000 * 60 * 60 * 24),
			);

			if (daysSinceCreation <= this.NEW_CLIENT_MAX_AGE_DAYS) {
				return true;
			}
		}

		// Also consider clients with no or very few previous operations as "new"
		// Filter out the current trigger operation if present
		const historicalOperations = operations.filter((op) => {
			const opDate = new Date(op.operationDate || op.createdAt);
			const now = new Date();
			const daysAgo = Math.floor(
				(now.getTime() - opDate.getTime()) / (1000 * 60 * 60 * 24),
			);
			return daysAgo > 0; // Exclude today's operations
		});

		return historicalOperations.length === 0;
	}

	/**
	 * Gets the high-value threshold
	 * Now uses hardcoded constants; rule parameter kept for backward compatibility
	 */
	private getHighValueThreshold(
		_rule: ReturnType<typeof this.findMatchingRule>,
	): number {
		// Configuration is now managed via AlertRuleConfig table or constants
		// This seeker uses the hardcoded default threshold
		return this.DEFAULT_HIGH_VALUE_THRESHOLD;
	}

	/**
	 * Override idempotency key to be per-operation
	 */
	async generateIdempotencyKey(
		context: AlertContext,
		result: SeekerEvaluationResult,
	): Promise<string> {
		const operationIds = result.matchedOperations
			.map((op) => op.id)
			.sort()
			.join(",");
		const data = `${context.client.id}:NEW_CLIENT:${this.ruleType}:${operationIds}`;
		return this.hashString(data);
	}
}
