#!/usr/bin/env node
/**
 * Populate Vehicle Brands Catalog
 *
 * This script populates the vehicle-brands catalog with real data.
 * This is a POPULATION script (not a seed) and runs in all environments.
 *
 * Refactored from seed-vehicle-brands to align with new terminology.
 */

import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path to the SQL population file (keeping the same file for now)
const sqlFile = join(__dirname, "../seed-vehicle-brands.sql");

// Determine if we're running locally or remotely based on environment
const isRemote = process.env.CI === "true" || process.env.REMOTE === "true";
// Use WRANGLER_CONFIG if set, otherwise detect preview environment
// Note: 'dev' is the production branch, so don't treat it as preview
let configFile = process.env.WRANGLER_CONFIG;
if (!configFile) {
	if (
		(process.env.CF_PAGES_BRANCH &&
			process.env.CF_PAGES_BRANCH !== "main" &&
			process.env.CF_PAGES_BRANCH !== "dev") ||
		(process.env.WORKERS_CI_BRANCH &&
			process.env.WORKERS_CI_BRANCH !== "main" &&
			process.env.WORKERS_CI_BRANCH !== "dev") ||
		process.env.PREVIEW === "true"
	) {
		configFile = "wrangler.preview.jsonc";
	}
}
const configFlag = configFile ? `--config ${configFile}` : "";

try {
	console.log(
		`📦 Populating vehicle-brands catalog (${isRemote ? "remote" : "local"})...`,
	);

	const command = isRemote
		? `wrangler d1 execute DB ${configFlag} --remote --file "${sqlFile}"`
		: `wrangler d1 execute DB ${configFlag} --local --file "${sqlFile}"`;

	execSync(command, { stdio: "inherit" });
	console.log("✅ Vehicle-brands catalog populated successfully!");
} catch (error) {
	console.error("❌ Error populating vehicle-brands catalog:", error);
	process.exit(1);
}
