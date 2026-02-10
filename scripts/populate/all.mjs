#!/usr/bin/env node
/**
 * Populate All Reference Data
 *
 * Master script that populates ALL reference data needed for the application:
 * - Catalogs (countries, currencies, CFDI, PLD, activity-specific, vehicle brands)
 * - CFDI-PLD mappings
 * - Alert rules
 * - Alert rule configs
 * - UMA values
 *
 * NOTE: Large catalogs (zip-codes, cfdi-product-services) are excluded.
 * Run them separately if needed via: pnpm populate:catalogs:large
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
function getConfigFile() {
	// Check if config is explicitly set
	if (process.env.WRANGLER_CONFIG) {
		return process.env.WRANGLER_CONFIG;
	}
	const branch = process.env.CF_PAGES_BRANCH || process.env.WORKERS_CI_BRANCH;

	// Main branch -> use prod config (aml-svc-prod worker)
	if (branch === "main") {
		return "wrangler.prod.jsonc";
	}

	// Dev branch -> use dev config (aml-svc worker production)
	if (branch === "dev") {
		return "wrangler.jsonc";
	}

	// Preview branches or explicit preview flag -> use preview config
	if (branch || process.env.PREVIEW === "true") {
		return "wrangler.preview.jsonc";
	}

	// Default: no config (will use wrangler.jsonc as default)
	return "";
}

async function populateAll() {
	console.log("╔════════════════════════════════════════════════════════════╗");
	console.log("║        Reference Data Population (All Data)                ║");
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
		// Step 1: Populate catalogs (~85 catalogs)
		console.log("═══════════════════════════════════════════════════════════");
		console.log("Step 1/5: Populating catalogs...");
		console.log(
			"═══════════════════════════════════════════════════════════\n",
		);
		execSync(`node "${join(__dirname, "catalogs.mjs")}"`, {
			stdio: "inherit",
			env,
		});

		// Step 2: Populate CFDI-PLD mappings
		console.log(
			"\n═══════════════════════════════════════════════════════════",
		);
		console.log("Step 2/5: Populating CFDI-PLD mappings...");
		console.log(
			"═══════════════════════════════════════════════════════════\n",
		);
		execSync(`node "${join(__dirname, "catalog-cfdi-pld-mappings.mjs")}"`, {
			stdio: "inherit",
			env,
		});

		// Step 3: Populate alert rules
		console.log(
			"\n═══════════════════════════════════════════════════════════",
		);
		console.log("Step 3/5: Populating alert rules...");
		console.log(
			"═══════════════════════════════════════════════════════════\n",
		);
		execSync(`node "${join(__dirname, "alert-rules.mjs")}"`, {
			stdio: "inherit",
			env,
		});

		// Step 4: Populate alert rule configs
		console.log(
			"\n═══════════════════════════════════════════════════════════",
		);
		console.log("Step 4/5: Populating alert rule configs...");
		console.log(
			"═══════════════════════════════════════════════════════════\n",
		);
		execSync(`node "${join(__dirname, "alert-rule-configs.mjs")}"`, {
			stdio: "inherit",
			env,
		});

		// Step 5: Populate UMA values
		console.log(
			"\n═══════════════════════════════════════════════════════════",
		);
		console.log("Step 5/5: Populating UMA values...");
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
