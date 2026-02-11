#!/usr/bin/env node
/**
 * Populate Large Catalogs
 *
 * Executes pre-generated SQL dump files for large catalogs using the D1 Import API.
 *
 * Large catalogs:
 * - zip-codes          (~157K items) - ~60 MB SQL file
 * - cfdi-product-services (~52K items) - ~11 MB SQL file
 *
 * The SQL files are pre-generated from CSV data using:
 *   node scripts/populate/generate-large-catalog-sql.mjs
 *
 * These files are then imported via `wrangler d1 execute --file --remote` which
 * uploads to R2 and ingests server-side, avoiding network timeout issues.
 *
 * Environment Variables:
 * - LARGE_CATALOG_MODE: Set to "all", "zip-codes", "cfdi-product-services", or "none" (default)
 *
 * Usage:
 *   node scripts/populate/all-catalogs-large.mjs                    # none (default)
 *   LARGE_CATALOG_MODE=all node scripts/populate/all-catalogs-large.mjs
 *   LARGE_CATALOG_MODE=zip-codes node scripts/populate/all-catalogs-large.mjs
 *   LARGE_CATALOG_MODE=cfdi-product-services node scripts/populate/all-catalogs-large.mjs
 *
 * npm scripts:
 *   pnpm populate:catalogs:large:dev    # Remote dev
 *   pnpm populate:catalogs:large:prod   # Remote prod
 *
 * Note: Large catalog population is designed for --remote only.
 */

import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { executeSqlFile } from "./lib/shared.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// SQL file paths
const SQL_FILES = {
	"zip-codes": join(__dirname, "sql", "zip-codes.sql"),
	"cfdi-product-services": join(__dirname, "sql", "cfdi-product-services.sql"),
};

/**
 * Populate large catalogs from pre-generated SQL files
 */
async function populateLargeCatalogs() {
	const mode = process.env.LARGE_CATALOG_MODE || "none";

	console.log("\n🚀 Populating large catalogs...");
	console.log(`   Mode: ${mode}\n`);

	if (mode === "none") {
		console.log("⏭️  Skipping large catalogs (mode=none)");
		return;
	}

	const catalogsToPopulate = [];

	if (mode === "all" || mode === "zip-codes") {
		catalogsToPopulate.push("zip-codes");
	}

	if (mode === "all" || mode === "cfdi-product-services") {
		catalogsToPopulate.push("cfdi-product-services");
	}

	if (catalogsToPopulate.length === 0) {
		console.log(`⚠️  Unknown mode: ${mode}`);
		console.log(
			'   Valid modes: "all", "zip-codes", "cfdi-product-services", "none"',
		);
		process.exit(1);
	}

	for (const catalogKey of catalogsToPopulate) {
		const sqlFile = SQL_FILES[catalogKey];
		console.log(`📦 Importing ${catalogKey}...`);
		console.log(`   SQL file: ${sqlFile}`);

		try {
			executeSqlFile(sqlFile, catalogKey);
			console.log(`   ✅ ${catalogKey} imported successfully\n`);
		} catch (error) {
			console.error(`   ❌ Failed to import ${catalogKey}:`, error.message);
			throw error;
		}
	}

	console.log("✅ All large catalogs populated successfully!");
}

// Run
populateLargeCatalogs().catch((error) => {
	console.error("\n❌ Failed to populate large catalogs:", error);
	process.exit(1);
});
