#!/usr/bin/env node
/**
 * Populate All Catalogs
 *
 * Master script that runs all catalog population scripts.
 */

import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Determine config file based on environment
function getConfigFile() {
	// Check if we're in preview environment (from versions-upload.mjs or CI)
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

async function populateAll() {
	console.log("🚀 Starting catalog population...\n");

	const configFile = getConfigFile();
	const env = { ...process.env };
	if (configFile) {
		env.WRANGLER_CONFIG = configFile;
	}

	try {
		execSync(`node "${join(__dirname, "all-catalogs.mjs")}"`, {
			stdio: "inherit",
			env,
		});
	} catch (error) {
		console.error("Failed to populate catalogs:", error);
		process.exit(1);
	}

	console.log("\n✅ All catalogs populated successfully!");
}

populateAll().catch((error) => {
	console.error("Fatal error:", error);
	process.exit(1);
});
