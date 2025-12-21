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

	// Dynamically import unstable_dev to avoid build issues
	// Only use it for local development (not in CI/build environments)
	let db;
	let cleanup;
	if (!isRemote && process.env.NODE_ENV !== "production") {
		try {
			// Use dynamic import with a string to prevent static analysis
			const wranglerModule = await import(/* @vite-ignore */ "wrangler");
			const { unstable_dev } = wranglerModule;
			const worker = await unstable_dev("src/index.ts", {
				config: configFile || undefined,
				local: true,
				ip: "127.0.0.1",
				port: 8787,
			});

			db = worker.env?.DB;
			if (!db) {
				await worker.stop();
				throw new Error("Database binding not found");
			}
			cleanup = () => worker.stop();
		} catch (error) {
			console.error(
				"❌ Failed to initialize database connection:",
				error.message,
			);
			console.error(
				"💡 Tip: Make sure wrangler is properly configured and the database exists.",
			);
			process.exit(1);
		}
	} else {
		// For remote/CI, we can't use unstable_dev
		// Seed scripts will need to handle their own database access
		console.warn(
			"⚠️  Remote seeding requires scripts to handle database access themselves",
		);
		process.exit(1);
	}

	try {
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
		if (cleanup) {
			await cleanup();
		}
	}
}

seedAll().catch((error) => {
	console.error("Fatal error:", error);
	process.exit(1);
});
