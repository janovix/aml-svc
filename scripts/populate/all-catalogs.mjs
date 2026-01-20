#!/usr/bin/env node
/**
 * Populate All Catalogs
 *
 * Runs all catalog population scripts.
 */

import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const catalogScripts = [
	"catalog-armor-levels.mjs",
	"catalog-business-activities.mjs",
	"catalog-countries.mjs",
	"catalog-currencies.mjs",
	"catalog-economic-activities.mjs",
	"catalog-operation-types.mjs",
	"catalog-payment-forms.mjs",
	"catalog-payment-methods.mjs",
	"catalog-states.mjs",
	"catalog-terrestrial-vehicle-brands.mjs",
	"catalog-maritime-vehicle-brands.mjs",
	"catalog-air-vehicle-brands.mjs",
	"catalog-vulnerable-activities.mjs",
	"catalog-zip-codes.mjs",
];

async function populateAllCatalogs() {
	console.log("📦 Populating all catalogs...\n");

	const env = { ...process.env };
	// Inherit WRANGLER_CONFIG if set
	if (process.env.WRANGLER_CONFIG) {
		env.WRANGLER_CONFIG = process.env.WRANGLER_CONFIG;
	}

	for (const script of catalogScripts) {
		const scriptPath = join(__dirname, script);
		console.log(`Running ${script}...`);
		try {
			execSync(`node "${scriptPath}"`, {
				stdio: "inherit",
				env,
			});
			console.log(`✅ ${script} completed\n`);
		} catch (error) {
			console.error(`❌ Failed to run ${script}:`, error);
			process.exit(1);
		}
	}

	console.log("✅ All catalogs populated successfully!");
}

populateAllCatalogs().catch((error) => {
	console.error("Fatal error:", error);
	process.exit(1);
});
