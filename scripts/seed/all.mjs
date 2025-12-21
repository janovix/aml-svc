#!/usr/bin/env node
/**
 * Seed All Models
 *
 * Master script that runs all seed scripts to generate synthetic data
 * for dev/preview environments.
 *
 * Note: Seeds are NOT run in production.
 */

import { readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { unstable_dev } from "wrangler";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Determine if we're running locally or remotely
const isRemote = process.env.CI === "true" || process.env.REMOTE === "true";

// Determine config file based on environment
function getConfigFile() {
	// Check if we're in preview environment
	if (
		process.env.CF_PAGES_BRANCH ||
		(process.env.WORKERS_CI_BRANCH &&
			process.env.WORKERS_CI_BRANCH !== "main") ||
		process.env.PREVIEW === "true"
	) {
		return "wrangler.preview.jsonc";
	}
	// Check if config is explicitly set
	if (process.env.WRANGLER_CONFIG) {
		return process.env.WRANGLER_CONFIG;
	}
	return "";
}

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

	const configFile = getConfigFile();

	// Start wrangler dev to get database access
	const worker = await unstable_dev("src/index.ts", {
		config: configFile || undefined,
		local: !isRemote,
		ip: "127.0.0.1",
		port: 8787,
	});

	try {
		// Get database from worker bindings
		const db = worker.env?.DB;
		if (!db) {
			throw new Error("Database binding not found");
		}

		// Import and run each seed script
		for (const script of seedScripts) {
			const scriptPath = join(__dirname, script);
			console.log(`Running ${script}...`);
			try {
				// Import the seed function
				const module = await import(`file://${scriptPath}`);
				const seedFunctionName = Object.keys(module).find((key) =>
					key.startsWith("seed"),
				);
				const seedFunction = module[seedFunctionName];

				if (typeof seedFunction === "function") {
					await seedFunction(db);
					console.log(`✅ ${script} completed\n`);
				} else {
					console.error(`❌ ${script} does not export a seed function`);
					process.exit(1);
				}
			} catch (error) {
				console.error(`❌ Failed to run ${script}:`, error);
				process.exit(1);
			}
		}

		console.log("✅ All seed scripts completed successfully!");
	} finally {
		await worker.stop();
	}
}

seedAll().catch((error) => {
	console.error("Fatal error:", error);
	process.exit(1);
});
