#!/usr/bin/env node
/**
 * Populate All Reference Data
 *
 * Unified script that populates ALL reference data:
 * - ALL catalogs (regular + zip-codes + cfdi-product-services)
 * - Alert rules and configs
 * - CFDI-PLD mappings
 * - UMA values
 *
 * This script auto-generates SQL dump files then imports them via wrangler.
 * Two SQL files, two wrangler calls, everything populated in seconds.
 */

import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { existsSync } from "node:fs";
import { executeSqlFile, getWranglerConfig } from "./lib/shared.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function populateAll() {
	console.log("╔════════════════════════════════════════════════════════════╗");
	console.log("║        Reference Data Population (Unified)                 ║");
	console.log(
		"╚════════════════════════════════════════════════════════════╝\n",
	);

	const { isRemote, configFile } = getWranglerConfig();
	console.log(`📝 Config: ${configFile || "default (wrangler.jsonc)"}`);
	console.log(`📦 Mode: ${isRemote ? "remote" : "local"}\n`);

	const sqlDir = join(__dirname, "sql");
	const catalogsSqlPath = join(sqlDir, "catalogs.sql");
	const referenceDataSqlPath = join(sqlDir, "reference-data.sql");

	// Check if --skip-generate flag is present (for CI optimization)
	const skipGenerate = process.argv.includes("--skip-generate");

	try {
		// Step 1: Generate SQL dump files (unless --skip-generate is set)
		if (!skipGenerate) {
			console.log(
				"═══════════════════════════════════════════════════════════",
			);
			console.log("Step 1/3: Generating SQL dump files...");
			console.log(
				"═══════════════════════════════════════════════════════════\n",
			);

			const generateScript = join(__dirname, "generate-sql.mjs");
			execSync(`node "${generateScript}"`, {
				stdio: "inherit",
				env: process.env,
			});
		} else {
			console.log("⏭️  Skipping SQL generation (--skip-generate flag)\n");

			// Verify SQL files exist
			if (!existsSync(catalogsSqlPath) || !existsSync(referenceDataSqlPath)) {
				console.error(
					"❌ SQL files not found. Run without --skip-generate first.",
				);
				process.exit(1);
			}
		}

		// Step 2: Import catalogs SQL
		console.log(
			"\n═══════════════════════════════════════════════════════════",
		);
		console.log("Step 2/3: Importing catalogs...");
		console.log(
			"═══════════════════════════════════════════════════════════\n",
		);
		executeSqlFile(catalogsSqlPath, "catalogs");

		// Step 3: Import reference data SQL
		console.log(
			"\n═══════════════════════════════════════════════════════════",
		);
		console.log("Step 3/3: Importing reference data...");
		console.log(
			"═══════════════════════════════════════════════════════════\n",
		);
		executeSqlFile(referenceDataSqlPath, "reference-data");
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
	console.log(
		"   - ALL catalogs (including zip-codes + cfdi-product-services)",
	);
	console.log("   - Alert rules and configs");
	console.log("   - CFDI-PLD mappings");
	console.log("   - UMA values");
}

populateAll().catch((error) => {
	console.error("Fatal error:", error);
	process.exit(1);
});
