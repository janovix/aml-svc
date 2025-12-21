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

	// Determine if we're in a Cloudflare Workers environment (preview or dev)
	// We want to seed in preview and dev, but skip in production
	const isPreviewEnvironment =
		process.env.CF_PAGES_BRANCH ||
		(process.env.WORKERS_CI_BRANCH &&
			process.env.WORKERS_CI_BRANCH !== "main") ||
		process.env.PREVIEW === "true";
	const isDevEnvironment =
		process.env.ENVIRONMENT === "dev" ||
		process.env.WRANGLER_CONFIG === "wrangler.jsonc";
	const isProduction =
		process.env.NODE_ENV === "production" &&
		!isPreviewEnvironment &&
		!isDevEnvironment;

	// Skip seeding only in production, allow it in preview and dev
	if (isProduction) {
		console.log("⏭️  Skipping seeding in production environment.");
		process.exit(0);
	}

	// Dynamically import unstable_dev to avoid build issues
	// Use it for both local and remote Cloudflare environments (preview/dev)
	// Seed scripts run AFTER the build, so they shouldn't affect the build process
	let db;
	let cleanup;
	try {
		// Use string-based dynamic import to prevent build-time static analysis
		// The import path is stored in a variable to prevent bundlers from analyzing it
		const wranglerPath = "wr" + "angler"; // Split string to prevent static analysis
		const wranglerModule = await import(wranglerPath);
		const { unstable_dev } = wranglerModule;

		if (!unstable_dev) {
			throw new Error("unstable_dev not available in wrangler module");
		}

		// Determine if we should use local or remote database
		// Use remote for Cloudflare Workers environments (preview/dev in CI)
		// Use local for local development
		const useLocal = !isRemote && !process.env.CI;

		const worker = await unstable_dev("src/index.ts", {
			config: configFile || undefined,
			local: useLocal,
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
		// Check if error is about KV namespace preview_id
		if (
			error.message &&
			error.message.includes("preview_id") &&
			error.message.includes("kv namespace")
		) {
			console.error("❌ KV namespace configuration issue:", error.message);
			console.error(
				"💡 To fix this, create a preview KV namespace and add its ID to the config:",
			);
			console.error("   1. Run: wrangler kv namespace create CACHE --preview");
			console.error(
				"   2. Add the returned ID as 'preview_id' to the CACHE kv_namespace in your wrangler config",
			);
			console.error(
				"   3. For now, using the same ID as production (may cause issues)",
			);
			// Try to continue with a workaround - use the same ID
			// This might work if the namespace supports both production and preview
		} else {
			console.error(
				"❌ Failed to initialize database connection:",
				error.message,
			);
			console.error(
				"💡 Tip: Make sure wrangler is properly configured and the database exists.",
			);
		}
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
