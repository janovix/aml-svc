#!/usr/bin/env node
/**
 * Seed Transactions
 *
 * Generates synthetic transaction data for dev/preview environments.
 * This is SEED data (not real data) and should NOT run in production.
 */

import { PrismaD1 } from "@prisma/adapter-d1";
import { PrismaClient } from "@prisma/client";

// This is a placeholder - implement actual seed logic when needed
async function seedTransactions(db) {
	const adapter = new PrismaD1(db);
	const prisma = new PrismaClient({ adapter });

	try {
		console.log("🌱 Seeding transactions...");

		// TODO: Implement transaction seeding logic
		// Generate synthetic transactions with realistic data for testing
		// Note: Requires clients to exist first

		const existingCount = await prisma.transaction.count();
		if (existingCount > 0) {
			console.log(
				`⏭️  ${existingCount} transaction(s) already exist. Skipping seed.`,
			);
			return;
		}

		// Placeholder - add actual seed data here
		console.log(
			"⚠️  Transaction seed not yet implemented. Add seed data in seed-transaction.mjs",
		);

		console.log("✅ Transaction seeding completed");
	} catch (error) {
		console.error("❌ Error seeding transactions:", error);
		throw error;
	} finally {
		await prisma.$disconnect();
	}
}

// Export for use in all.mjs
export { seedTransactions };

// If run directly, execute seed
if (import.meta.url === `file://${process.argv[1]}`) {
	// This would need D1 database access - handled by all.mjs instead
	console.log("Run via: pnpm seed");
	process.exit(0);
}
