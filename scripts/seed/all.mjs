#!/usr/bin/env node
/**
 * Seed All Models
 *
 * Master script that runs all seed scripts to generate synthetic data
 * for dev/preview environments.
 *
 * Note: Seeds are NOT run in production.
 *
 * This script uses wrangler d1 execute to run seed scripts in the worker context.
 */

import { readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Determine if we're running locally or remotely
const isRemote = process.env.CI === "true" || process.env.REMOTE === "true";

async function seedAll() {
	console.log(
		`🌱 Starting seed scripts (${isRemote ? "remote" : "local"})...\n`,
	);

	// Get all seed scripts (excluding validate.mjs and all.mjs)
	const files = await readdir(__dirname);
	const seedScripts = files
		.filter(
			(file) =>
				file.endsWith(".mjs") && file !== "validate.mjs" && file !== "all.mjs",
		)
		.sort();

	if (seedScripts.length === 0) {
		console.log("⚠️  No seed scripts found.");
		console.log("Run 'pnpm seed:validate' to check requirements.\n");
		return;
	}

	console.log(`Found ${seedScripts.length} seed script(s):\n`);

	// For now, seed scripts are placeholders
	// They will need to be implemented to work with D1 database
	// This can be done via:
	// 1. TypeScript scripts using PrismaD1 adapter (like seed-vehicle-brands.ts)
	// 2. SQL files executed via wrangler d1 execute
	// 3. Direct API calls if seed data is simple

	for (const script of seedScripts) {
		console.log(`  📝 ${script} - Placeholder (implement seed logic)`);
	}

	console.log(
		"\n💡 Seed scripts are placeholders. Implement actual seed logic when needed.",
	);
	console.log(
		"💡 See scripts/seed-vehicle-brands.ts for reference implementation.\n",
	);
	console.log("✅ Seed script discovery completed!");
}

seedAll().catch((error) => {
	console.error("Fatal error:", error);
	process.exit(1);
});
