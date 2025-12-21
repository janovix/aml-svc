#!/usr/bin/env node
/**
 * Populate All SAT Catalogs
 *
 * Runs all SAT catalog population scripts.
 * These catalogs are required for SAT XML file generation.
 *
 * Note: This script will be populated once CSV files are provided.
 */

import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// SAT catalog population scripts (to be added when CSV files are provided)
const satCatalogScripts = [
	// "sat-catalog-tipo-sujeto-obligado.mjs",
	// "sat-catalog-tipo-operacion.mjs",
	// "sat-catalog-moneda.mjs",
	// "sat-catalog-tipo-vehiculo.mjs",
	// "sat-catalog-marca-vehiculo.mjs",
	// "sat-catalog-color-vehiculo.mjs",
	// "sat-catalog-tipo-persona.mjs",
	// "sat-catalog-pais.mjs",
	// "sat-catalog-entidad-federativa.mjs",
];

async function populateAllSatCatalogs() {
	console.log("📦 Populating all SAT catalogs...\n");

	if (satCatalogScripts.length === 0) {
		console.log(
			"⚠️  No SAT catalog scripts found. Waiting for CSV files to be provided.",
		);
		console.log("See docs/MISSING_SAT_CATALOGS.md for required catalogs.\n");
		return;
	}

	for (const script of satCatalogScripts) {
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

	console.log("✅ All SAT catalogs populated successfully!");
}

populateAllSatCatalogs().catch((error) => {
	console.error("Fatal error:", error);
	process.exit(1);
});
