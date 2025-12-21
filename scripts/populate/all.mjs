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
// Setup:
// - aml-svc (dev worker): dev branch = production → wrangler.jsonc
// - aml-svc-prod (prod worker): main branch = production → wrangler.prod.jsonc
// - aml-svc (preview): other branches = preview → wrangler.preview.jsonc
function getConfigFile() {
	// Check if config is explicitly set
	if (process.env.WRANGLER_CONFIG) {
		return process.env.WRANGLER_CONFIG;
	}
	const branch = process.env.CF_PAGES_BRANCH || process.env.WORKERS_CI_BRANCH;
	
	// Main branch → use prod config (aml-svc-prod worker)
	if (branch === "main") {
		return "wrangler.prod.jsonc";
	}
	
	// Dev branch → use dev config (aml-svc worker production)
	if (branch === "dev") {
		return "wrangler.jsonc";
	}
	
	// Preview branches or explicit preview flag → use preview config
	if (
		branch ||
		process.env.PREVIEW === "true"
	) {
		return "wrangler.preview.jsonc";
	}
	
	// Default: no config (will use wrangler.jsonc as default)
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
