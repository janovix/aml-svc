#!/usr/bin/env node
/**
 * Populate All Regular Catalogs
 *
 * Runs all regular catalog population scripts.
 * These catalogs are used by the application (not SAT-specific).
 */

import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const catalogScripts = [
	"catalog-vehicle-brands.mjs",
	"catalog-country.mjs",
	"catalog-currency.mjs",
	"catalog-operation-type.mjs",
	"catalog-payment-forms.mjs",
	"catalog-vulnerable-activities.mjs",
];

async function populateAllCatalogs() {
	console.log("📦 Populating all regular catalogs...\n");

	for (const script of catalogScripts) {
		const scriptPath = join(__dirname, script);
		console.log(`Running ${script}...`);
		try {
			execSync(`node "${scriptPath}"`, { stdio: "inherit" });
			console.log(`✅ ${script} completed\n`);
		} catch (error) {
			console.error(`❌ Failed to run ${script}:`, error);
			process.exit(1);
		}
	}

	console.log("✅ All regular catalogs populated successfully!");
}

populateAllCatalogs().catch((error) => {
	console.error("Fatal error:", error);
	process.exit(1);
});
