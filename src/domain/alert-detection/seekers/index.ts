/**
 * Alert Seeker Registry and Auto-Discovery
 *
 * This module provides the seeker registry that manages all alert seekers.
 * It supports both:
 * - Legacy activity-specific seekers (VEH only)
 * - Universal pattern-based seekers (all 19 VAs)
 */

import type {
	AlertSeeker,
	AlertRuleType,
	SeekerRegistry,
	VulnerableActivityCode,
	UniversalAlertSeeker,
} from "./types";

// Import VEH seekers (legacy, kept for backward compatibility)
import { OperationAmountUmaSeeker } from "./VEH/operation_amount_uma";
import { AggregateAmountUmaSeeker } from "./VEH/aggregate_amount_uma";
import { CashPaymentLimitSeeker } from "./VEH/cash_payment_limit";
import { CashFragmentationSeeker } from "./VEH/cash_fragmentation";
import { PayerBuyerMismatchSeeker } from "./VEH/payer_buyer_mismatch";
import { PepAboveThresholdSeeker } from "./VEH/pep_above_threshold";
import { PepOrHighRiskSeeker } from "./VEH/pep_or_high_risk";
import { FrequentOperationsSeeker } from "./VEH/frequent_operations";
import { NewClientHighValueSeeker } from "./VEH/new_client_high_value";
import { ThirdPartyAccountsSeeker } from "./VEH/third_party_accounts";

// Import universal seekers
import { createAllUniversalSeekers } from "./universal/index";

/**
 * Default implementation of the SeekerRegistry
 * Now supports both legacy per-activity seekers and universal seekers.
 */
class DefaultSeekerRegistry implements SeekerRegistry {
	private seekers: Map<string, AlertSeeker> = new Map();
	private seekersByActivity: Map<VulnerableActivityCode, AlertSeeker[]> =
		new Map();

	/** Universal seekers that work across all VAs */
	private universalSeekers: UniversalAlertSeeker[] = [];

	/**
	 * Registers a seeker in the registry
	 */
	register(seeker: AlertSeeker): void {
		const key = this.makeKey(seeker.activityCode, seeker.ruleType);

		if (this.seekers.has(key)) {
			console.warn(
				`Seeker already registered for ${seeker.activityCode}:${seeker.ruleType}, replacing...`,
			);
		}

		this.seekers.set(key, seeker);

		// Add to activity-specific list
		const activitySeekers =
			this.seekersByActivity.get(seeker.activityCode) || [];
		const existingIndex = activitySeekers.findIndex(
			(s) => s.ruleType === seeker.ruleType,
		);

		if (existingIndex >= 0) {
			activitySeekers[existingIndex] = seeker;
		} else {
			activitySeekers.push(seeker);
		}

		this.seekersByActivity.set(seeker.activityCode, activitySeekers);

		console.log(
			`Registered seeker: ${seeker.name} (${seeker.activityCode}:${seeker.ruleType})`,
		);
	}

	/**
	 * Registers a universal seeker
	 */
	registerUniversal(seeker: UniversalAlertSeeker): void {
		this.universalSeekers.push(seeker);
		console.log(
			`Registered universal seeker: ${seeker.name} (pattern: ${seeker.patternType})`,
		);
	}

	/**
	 * Gets all seekers for a specific activity.
	 * Merges universal seekers that apply to this activity
	 * with legacy activity-specific seekers (deduplicating by ruleType,
	 * universal takes priority for overlapping types).
	 */
	getSeekersForActivity(activityCode: VulnerableActivityCode): AlertSeeker[] {
		// Universal seekers that apply to this activity
		const universalApplicable = this.universalSeekers.filter((s) =>
			s.appliesTo(activityCode),
		);

		// Legacy activity-specific seekers
		const legacySeekers = this.seekersByActivity.get(activityCode) || [];

		// If no universal seekers, return legacy only
		if (universalApplicable.length === 0) {
			return legacySeekers;
		}

		// Merge: universal + legacy seekers whose ruleType isn't covered by universal
		const universalRuleTypes = new Set(
			universalApplicable.map((s) => s.ruleType),
		);
		const uniqueLegacy = legacySeekers.filter(
			(s) => !universalRuleTypes.has(s.ruleType),
		);

		return [...universalApplicable, ...uniqueLegacy];
	}

	/**
	 * Gets all universal seekers applicable to a specific activity
	 */
	getUniversalSeekersForActivity(activityCode: string): UniversalAlertSeeker[] {
		return this.universalSeekers.filter((s) => s.appliesTo(activityCode));
	}

	/**
	 * Gets a specific seeker by activity and rule type.
	 * Checks legacy seekers first, then universal seekers.
	 */
	getSeeker(
		activityCode: VulnerableActivityCode,
		ruleType: AlertRuleType,
	): AlertSeeker | undefined {
		// Check legacy seekers first
		const legacy = this.seekers.get(this.makeKey(activityCode, ruleType));
		if (legacy) return legacy;

		// Check universal seekers
		return this.universalSeekers.find(
			(s) => s.ruleType === ruleType && s.appliesTo(activityCode),
		);
	}

	/**
	 * Gets all registered seekers
	 */
	getAllSeekers(): AlertSeeker[] {
		return Array.from(this.seekers.values());
	}

	/**
	 * Gets the count of registered seekers (legacy + universal)
	 */
	getCount(): number {
		return this.seekers.size + this.universalSeekers.length;
	}

	/**
	 * Gets the count of universal seekers
	 */
	getUniversalCount(): number {
		return this.universalSeekers.length;
	}

	/**
	 * Gets the count of seekers for a specific activity
	 */
	getCountForActivity(activityCode: VulnerableActivityCode): number {
		return this.getSeekersForActivity(activityCode).length;
	}

	/**
	 * Lists all registered activity codes
	 */
	getRegisteredActivities(): VulnerableActivityCode[] {
		return Array.from(this.seekersByActivity.keys());
	}

	/**
	 * Clears all registered seekers (useful for testing)
	 */
	clear(): void {
		this.seekers.clear();
		this.seekersByActivity.clear();
		this.universalSeekers = [];
	}

	private makeKey(
		activityCode: VulnerableActivityCode,
		ruleType: AlertRuleType,
	): string {
		return `${activityCode}:${ruleType}`;
	}
}

/**
 * Global seeker registry instance
 */
export const seekerRegistry: SeekerRegistry & {
	getCount(): number;
	getUniversalCount(): number;
	getCountForActivity(activityCode: VulnerableActivityCode): number;
	getRegisteredActivities(): VulnerableActivityCode[];
	getUniversalSeekersForActivity(activityCode: string): UniversalAlertSeeker[];
	registerUniversal(seeker: UniversalAlertSeeker): void;
	clear(): void;
} = new DefaultSeekerRegistry();

/**
 * Registers all VEH (Vehículos) seekers
 */
function registerVehSeekers(): void {
	seekerRegistry.register(new OperationAmountUmaSeeker());
	seekerRegistry.register(new AggregateAmountUmaSeeker());
	seekerRegistry.register(new CashPaymentLimitSeeker());
	seekerRegistry.register(new CashFragmentationSeeker());
	seekerRegistry.register(new PayerBuyerMismatchSeeker());
	seekerRegistry.register(new PepAboveThresholdSeeker());
	seekerRegistry.register(new PepOrHighRiskSeeker());
	seekerRegistry.register(new FrequentOperationsSeeker());
	seekerRegistry.register(new NewClientHighValueSeeker());
	seekerRegistry.register(new ThirdPartyAccountsSeeker());
}

/**
 * Registers all universal (pattern-based) seekers
 */
function registerUniversalSeekers(): void {
	const seekers = createAllUniversalSeekers();
	for (const seeker of seekers) {
		seekerRegistry.registerUniversal(seeker);
	}
}

/**
 * Initializes all seekers
 * Call this function at worker startup
 */
export function initializeSeekers(): void {
	console.log("Initializing alert seekers...");

	// Register universal seekers (all 19 VAs)
	registerUniversalSeekers();

	// Register legacy VEH seekers (kept for backward compatibility)
	registerVehSeekers();

	// Log registration summary
	const activities = seekerRegistry.getRegisteredActivities();
	console.log(
		`Seeker initialization complete: ${seekerRegistry.getCount()} seekers total`,
	);
	console.log(
		`  - ${seekerRegistry.getUniversalCount()} universal seekers (all VAs)`,
	);

	for (const activity of activities) {
		const totalForActivity = seekerRegistry.getCountForActivity(activity);
		console.log(`  - ${activity}: ${totalForActivity} total seekers`);
	}
}

/**
 * Gets seekers for a specific activity code
 * @param activityCode The vulnerable activity code
 * @returns Array of seekers for that activity
 */
export function getSeekersForActivity(
	activityCode: VulnerableActivityCode,
): AlertSeeker[] {
	return seekerRegistry.getSeekersForActivity(activityCode);
}

/**
 * Gets a specific seeker
 * @param activityCode The vulnerable activity code
 * @param ruleType The rule type
 * @returns The seeker, or undefined if not found
 */
export function getSeeker(
	activityCode: VulnerableActivityCode,
	ruleType: AlertRuleType,
): AlertSeeker | undefined {
	return seekerRegistry.getSeeker(activityCode, ruleType);
}

/**
 * Re-exports for convenience
 */
export * from "./types";
