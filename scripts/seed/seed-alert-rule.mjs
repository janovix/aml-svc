#!/usr/bin/env node
/**
 * Seed Alert Rules
 *
 * Generates synthetic alert rule data for dev/preview environments.
 * This is SEED data (not real data) and should NOT run in production.
 *
 * Note: Real alert rules should be created via the API or create-alert-rules script.
 */

import { PrismaD1 } from "@prisma/adapter-d1";
import { PrismaClient } from "@prisma/client";

// This is a placeholder - implement actual seed logic when needed
async function seedAlertRules(db) {
	const adapter = new PrismaD1(db);
	const prisma = new PrismaClient({ adapter });

	try {
		console.log("🌱 Seeding alert rules...");

		// TODO: Implement alert rule seeding logic
		// Generate synthetic alert rules with realistic configurations for testing

		const existingCount = await prisma.alertRule.count();
		if (existingCount > 0) {
			console.log(
				`⏭️  ${existingCount} alert rule(s) already exist. Skipping seed.`,
			);
			return;
		}

		// Placeholder - add actual seed data here
		console.log(
			"⚠️  Alert rule seed not yet implemented. Add seed data in seed-alert-rule.mjs",
		);
		console.log(
			"💡 Tip: Use scripts/create-alert-rules.mjs for real alert rules",
		);

		console.log("✅ Alert rule seeding completed");
	} catch (error) {
		console.error("❌ Error seeding alert rules:", error);
		throw error;
	} finally {
		await prisma.$disconnect();
	}
}

// Export for use in all.mjs
export { seedAlertRules };

// If run directly, execute seed
if (import.meta.url === `file://${process.argv[1]}`) {
	// This would need D1 database access - handled by all.mjs instead
	console.log("Run via: pnpm seed");
	process.exit(0);
}
