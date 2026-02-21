#!/usr/bin/env node
/**
 * Generate SQL Dump Files
 *
 * Fetches all CSV data and generates SQL dump files that can be imported
 * with `wrangler d1 execute --file --remote`.
 *
 * Usage:
 *   node generate-sql.mjs [target]
 *
 * Targets:
 *   all             (default) Generate both catalogs.sql and reference-data.sql
 *   catalogs        Generate only catalogs.sql
 *   reference-data  Generate only reference-data.sql
 */

import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { writeFileSync, mkdirSync } from "node:fs";
import { generateAllCatalogsSql } from "./lib/catalogs.mjs";
import { generateReferenceDataSql } from "./lib/reference-data.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Format bytes to human-readable size
 */
function formatBytes(bytes) {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
	return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

/**
 * Main execution
 */
async function main() {
	// Filter out pnpm's `--` separator and get target
	const args = process.argv.slice(2).filter((arg) => arg !== "--");
	const target = args[0] || "all";

	if (!["all", "catalogs", "reference-data"].includes(target)) {
		console.error(`❌ Unknown target: ${target}`);
		console.error(`   Valid targets: all, catalogs, reference-data`);
		process.exit(1);
	}

	console.log("🚀 Generating SQL dump files...\n");

	// Create sql/ directory if it doesn't exist
	const sqlDir = join(__dirname, "sql");
	mkdirSync(sqlDir, { recursive: true });

	try {
		// Generate catalogs SQL
		if (target === "all" || target === "catalogs") {
			console.log("📦 Generating catalogs.sql...");
			const catalogsSql = await generateAllCatalogsSql();
			const catalogsPath = join(sqlDir, "catalogs.sql");
			writeFileSync(catalogsPath, catalogsSql, "utf-8");
			const catalogsSize = Buffer.byteLength(catalogsSql, "utf-8");
			console.log(
				`   ✅ Generated catalogs.sql (${formatBytes(catalogsSize)})`,
			);
			console.log(`   📄 Written to: ${catalogsPath}\n`);
		}

		// Generate reference data SQL
		if (target === "all" || target === "reference-data") {
			console.log("📦 Generating reference-data.sql...");
			const referenceDataSql = generateReferenceDataSql();
			const referenceDataPath = join(sqlDir, "reference-data.sql");
			writeFileSync(referenceDataPath, referenceDataSql, "utf-8");
			const referenceDataSize = Buffer.byteLength(referenceDataSql, "utf-8");
			console.log(
				`   ✅ Generated reference-data.sql (${formatBytes(referenceDataSize)})`,
			);
			console.log(`   📄 Written to: ${referenceDataPath}\n`);
		}

		console.log("✅ All SQL dump files generated successfully!");
		console.log("\nThese files can now be imported with:");
		console.log("  wrangler d1 execute DB --file <sql-file> --remote");
	} catch (error) {
		console.error("\n❌ Failed to generate SQL dump files:", error);
		process.exit(1);
	}
}

main().catch((error) => {
	console.error("\n❌ Fatal error:", error);
	process.exit(1);
});
