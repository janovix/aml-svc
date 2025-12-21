#!/usr/bin/env node
/**
 * Seed Clients
 *
 * Generates synthetic client data for dev/preview environments.
 * This is SEED data (not real data) and should NOT run in production.
 */

import { PrismaD1 } from "@prisma/adapter-d1";
import { PrismaClient } from "@prisma/client";

// This is a placeholder - implement actual seed logic when needed
async function seedClients(db) {
	const adapter = new PrismaD1(db);
	const prisma = new PrismaClient({ adapter });

	try {
		console.log("🌱 Seeding clients...");

		// TODO: Implement client seeding logic
		// Generate synthetic clients with realistic data for testing

		const existingCount = await prisma.client.count();
		if (existingCount > 0) {
			console.log(
				`⏭️  ${existingCount} client(s) already exist. Skipping seed.`,
			);
			return;
		}

		// Placeholder - add actual seed data here
		console.log(
			"⚠️  Client seed not yet implemented. Add seed data in seed-client.mjs",
		);

		console.log("✅ Client seeding completed");
	} catch (error) {
		console.error("❌ Error seeding clients:", error);
		throw error;
	} finally {
		await prisma.$disconnect();
	}
}

// Export for use in all.mjs
export { seedClients };

// If run directly, execute seed
if (import.meta.url === `file://${process.argv[1]}`) {
	// This would need D1 database access - handled by all.mjs instead
	console.log("Run via: pnpm seed");
	process.exit(0);
}
