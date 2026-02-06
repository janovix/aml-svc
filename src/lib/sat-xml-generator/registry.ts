/**
 * SAT XML Generator Strategy Registry
 * Provides a central registry for all activity-specific XML generation strategies
 */

import type { ActivityCode } from "../../domain/operation/types";
import type { ActivityXmlStrategy } from "./types";
import {
	VehicleXmlStrategy,
	RealEstateXmlStrategy,
	JewelryXmlStrategy,
	VirtualAssetXmlStrategy,
	GamblingXmlStrategy,
	RentalXmlStrategy,
	ArmoringXmlStrategy,
	DonationXmlStrategy,
	LoanXmlStrategy,
	OfficialXmlStrategy,
	NotaryXmlStrategy,
	ProfessionalXmlStrategy,
	TravelerCheckXmlStrategy,
	CardXmlStrategy,
	PrepaidXmlStrategy,
	RewardXmlStrategy,
	ValuableXmlStrategy,
	ArtXmlStrategy,
	DevelopmentXmlStrategy,
} from "./strategies";

/**
 * Registry of all activity XML strategies
 */
const strategyRegistry: Map<ActivityCode, ActivityXmlStrategy> = new Map();

// Initialize registry with all strategies
function initializeRegistry(): void {
	const strategies: ActivityXmlStrategy[] = [
		new VehicleXmlStrategy(),
		new RealEstateXmlStrategy(),
		new JewelryXmlStrategy(),
		new VirtualAssetXmlStrategy(),
		new GamblingXmlStrategy(),
		new RentalXmlStrategy(),
		new ArmoringXmlStrategy(),
		new DonationXmlStrategy(),
		new LoanXmlStrategy(),
		new OfficialXmlStrategy(),
		new NotaryXmlStrategy(),
		new ProfessionalXmlStrategy(),
		new TravelerCheckXmlStrategy(),
		new CardXmlStrategy(),
		new PrepaidXmlStrategy(),
		new RewardXmlStrategy(),
		new ValuableXmlStrategy(),
		new ArtXmlStrategy(),
		new DevelopmentXmlStrategy(),
	];

	for (const strategy of strategies) {
		strategyRegistry.set(strategy.activityCode, strategy);
	}
}

// Initialize on module load
initializeRegistry();

/**
 * Gets the XML generation strategy for a specific activity
 * @throws Error if no strategy is registered for the activity
 */
export function getXmlStrategy(
	activityCode: ActivityCode,
): ActivityXmlStrategy {
	const strategy = strategyRegistry.get(activityCode);
	if (!strategy) {
		throw new Error(`No XML strategy registered for activity: ${activityCode}`);
	}
	return strategy;
}

/**
 * Checks if a strategy is registered for the given activity
 */
export function hasXmlStrategy(activityCode: ActivityCode): boolean {
	return strategyRegistry.has(activityCode);
}

/**
 * Gets all registered activity codes
 */
export function getAllRegisteredActivities(): ActivityCode[] {
	return Array.from(strategyRegistry.keys());
}

/**
 * Registers a custom strategy (for testing or extensions)
 */
export function registerXmlStrategy(strategy: ActivityXmlStrategy): void {
	strategyRegistry.set(strategy.activityCode, strategy);
}
