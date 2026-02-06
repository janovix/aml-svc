#!/usr/bin/env node
/**
 * Populate All Reference Data
 *
 * Master script that populates ALL reference data needed for the application:
 * - Core catalogs (countries, states, currencies, etc.)
 * - CFDI catalogs (SAT codes)
 * - PLD catalogs (consolidated across VAs)
 * - Activity-specific catalogs (all 19 vulnerable activities)
 * - UMA values (economic reference data)
 *
 * NOTE: Large catalogs (zip-codes, cfdi-units, cfdi-product-services) are
 * excluded by default. Run them separately if needed.
 *
 * This is for REFERENCE DATA only (catalogs, constants).
 * For SYNTHETIC TEST DATA, use the seed scripts instead.
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
	if (branch || process.env.PREVIEW === "true") {
		return "wrangler.preview.jsonc";
	}

	// Default: no config (will use wrangler.jsonc as default)
	return "";
}

async function populateAll() {
	console.log("╔════════════════════════════════════════════════════════════╗");
	console.log("║        Reference Data Population (All Catalogs)            ║");
	console.log(
		"╚════════════════════════════════════════════════════════════╝\n",
	);

	const configFile = getConfigFile();
	const env = { ...process.env };
	if (configFile) {
		env.WRANGLER_CONFIG = configFile;
		console.log(`📝 Using config: ${configFile}`);
	}

	const isRemote = process.env.CI === "true" || process.env.REMOTE === "true";
	console.log(`📦 Mode: ${isRemote ? "remote" : "local"}\n`);

	try {
		// Step 1: Populate catalogs (core + essential)
		console.log("═══════════════════════════════════════════════════════════");
		console.log("Step 1/2: Populating catalogs...");
		console.log(
			"═══════════════════════════════════════════════════════════\n",
		);
		execSync(`node "${join(__dirname, "all-catalogs.mjs")}"`, {
			stdio: "inherit",
			env,
		});

		// Step 2: Populate UMA values (essential reference data)
		console.log(
			"\n═══════════════════════════════════════════════════════════",
		);
		console.log("Step 2/2: Populating UMA values...");
		console.log(
			"═══════════════════════════════════════════════════════════\n",
		);
		execSync(`node "${join(__dirname, "uma-values.mjs")}"`, {
			stdio: "inherit",
			env,
		});
	} catch (error) {
		console.error("\n❌ Failed to populate reference data:", error);
		process.exit(1);
	}

	console.log(
		"\n╔════════════════════════════════════════════════════════════╗",
	);
	console.log("║                 Population Complete!                       ║");
	console.log(
		"╚════════════════════════════════════════════════════════════╝\n",
	);
	console.log("✅ All reference data populated successfully!");
	console.log("\n💡 Optional: Populate large catalogs separately:");
	console.log("   pnpm populate:catalogs:large");
}

populateAll().catch((error) => {
	console.error("Fatal error:", error);
	process.exit(1);
});
