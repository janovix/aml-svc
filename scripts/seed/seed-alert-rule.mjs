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

		// TODO: Add synthetic alert rule data generation here
		// For now, skip if no alert rules exist
		console.log(
			"✅ Alert rule seeding completed (no synthetic data generated)",
		);
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
