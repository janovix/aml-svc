#!/usr/bin/env node
/**
 * Populate Terrestrial Vehicle Brands Catalog
 *
 * This script populates the terrestrial-vehicle-brands catalog with common car/truck brands.
 * This is a POPULATION script (not a seed) and runs in all environments.
 */

import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const sqlFile = join(__dirname, "catalog-terrestrial-vehicle-brands.sql");

// Determine if we're running locally or remotely based on environment
const isRemote = process.env.CI === "true" || process.env.REMOTE === "true";
// Use WRANGLER_CONFIG if set, otherwise detect based on branch
let configFile = process.env.WRANGLER_CONFIG;
if (!configFile) {
	const branch = process.env.CF_PAGES_BRANCH || process.env.WORKERS_CI_BRANCH;
	if (branch === "main") {
		configFile = "wrangler.prod.jsonc";
	} else if (branch === "dev") {
		configFile = "wrangler.jsonc";
	} else if (branch || process.env.PREVIEW === "true") {
		configFile = "wrangler.preview.jsonc";
	}
}
const configFlag = configFile ? `--config ${configFile}` : "";

try {
	console.log(
		`📦 Populating terrestrial-vehicle-brands catalog (${isRemote ? "remote" : "local"})...`,
	);

	const wranglerCmd = process.env.CI === "true" ? "pnpm wrangler" : "wrangler";
	const command = isRemote
		? `${wranglerCmd} d1 execute DB ${configFlag} --remote --file "${sqlFile}"`
		: `${wranglerCmd} d1 execute DB ${configFlag} --local --file "${sqlFile}"`;

	execSync(command, { stdio: "inherit" });
	console.log("✅ Terrestrial vehicle brands catalog populated successfully!");
} catch (error) {
	console.error(
		"❌ Error populating terrestrial-vehicle-brands catalog:",
		error,
	);
	process.exit(1);
}
