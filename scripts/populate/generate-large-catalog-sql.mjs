#!/usr/bin/env node
/**
 * Generate SQL Dump Files for Large Catalogs
 *
 * Fetches CSV files from catalogs.janovix.com and generates optimized SQL dump files
 * that can be imported with `wrangler d1 execute --file --remote`.
 *
 * The --remote flag uses the D1 Import API which:
 * - Uploads the SQL file to R2 (up to 5 GB)
 * - Ingests it server-side in D1
 * - Polls until complete
 *
 * This eliminates the need for:
 * - Network fetches of CSV chunks during import
 * - Runtime CSV parsing during import
 * - Hundreds of separate wrangler CLI invocations
 * - Complex retry logic
 *
 * Generated SQL files use multi-row INSERT syntax (50 rows per statement)
 * to stay well under D1's 100 KB per-statement limit.
 *
 * Usage:
 *   node scripts/populate/generate-large-catalog-sql.mjs
 *   pnpm generate:large-catalog-sql
 *
 * Note: This script is designed for remote D1 import only. Local testing
 * with large catalogs is not supported due to miniflare limitations.
 *
 * This script is typically run as part of the CI/CD pipeline before importing catalogs.
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
	fetchCsv,
	parseCsv,
	generateCatalogId,
	generateItemId,
	normalizeText,
	escapeSql,
} from "./lib/shared.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BASE_URL = "https://catalogs.janovix.com";

// Configuration for large catalogs
const CATALOGS = {
	"zip-codes": {
		csvUrl: `${BASE_URL}/zip-codes.csv`,
		sqlPath: "./sql/zip-codes.sql",
		catalogName: "Códigos Postales",
		mapRow: (row) => ({
			id: row.zip_code,
			name: `${row.zip_code} - ${row.settlement}, ${row.municipality}, ${row.state}`,
			metadata: {
				zip_code: row.zip_code,
				settlement: row.settlement,
				settlement_type: row.settlement_type,
				municipality: row.municipality,
				state: row.state,
				city: row.city,
				state_code: row.state_code,
				zone: row.zone,
			},
		}),
	},
	"cfdi-product-services": {
		csvUrl: `${BASE_URL}/cfdi-product-services.csv`,
		sqlPath: "./sql/cfdi-product-services.sql",
		catalogName: "CFDI Productos y Servicios",
		mapRow: (row) => ({
			id: row.code,
			name: row.name,
			metadata: {
				code: row.code,
			},
		}),
	},
};

// Batch size for multi-row INSERT statements
const BATCH_SIZE = 50; // Rows per SQL statement (safe under 100 KB D1 limit)

/**
 * Generate SQL dump file for a catalog
 */
async function generateSqlDump(catalogKey, config) {
	console.log(`\n📝 Generating SQL dump for ${catalogKey}...`);

	// Fetch and parse CSV from R2
	console.log(`   Fetching CSV from: ${config.csvUrl}`);
	const csvContent = await fetchCsv(config.csvUrl);
	const rows = parseCsv(csvContent);
	console.log(`   Parsed ${rows.length.toLocaleString()} rows`);

	// Generate catalog ID
	const catalogId = generateCatalogId(catalogKey);

	// Start building SQL
	const sql = [];

	// Add header comment
	sql.push(`-- SQL Dump for ${config.catalogName} (${catalogKey})`);
	sql.push(`-- Generated: ${new Date().toISOString()}`);
	sql.push(`-- Total items: ${rows.length.toLocaleString()}`);
	sql.push(`-- Catalog ID: ${catalogId}`);
	sql.push("");

	// Insert catalog
	sql.push(`-- Insert catalog (idempotent via INSERT OR IGNORE)`);
	sql.push(
		`INSERT OR IGNORE INTO catalogs (id, key, name, active, created_at, updated_at)`,
	);
	sql.push(
		`VALUES ('${catalogId}', '${catalogKey}', ${escapeSql(config.catalogName)}, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);`,
	);
	sql.push("");

	// Process items in batches using multi-row INSERT
	console.log(
		`   Generating INSERT statements (${BATCH_SIZE} rows per statement)...`,
	);
	let totalBatches = 0;

	for (let i = 0; i < rows.length; i += BATCH_SIZE) {
		const batch = rows.slice(i, i + BATCH_SIZE);
		totalBatches++;

		// Start multi-row INSERT statement
		sql.push(
			`-- Batch ${totalBatches}: rows ${i + 1} to ${Math.min(i + BATCH_SIZE, rows.length)}`,
		);
		sql.push(
			`INSERT OR REPLACE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)`,
		);
		sql.push(`VALUES`);

		// Add each row as a VALUES tuple
		const values = batch.map((row, idx) => {
			const item = config.mapRow(row);
			const name = escapeSql(item.name);
			const normalizedName = escapeSql(normalizeText(item.name));
			const metadata = escapeSql(JSON.stringify(item.metadata || {}));
			const itemId = generateItemId(catalogId, item.id || normalizedName);

			const isLast = idx === batch.length - 1;
			const tuple = `  ('${itemId}', '${catalogId}', ${name}, ${normalizedName}, 1, ${metadata}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`;

			return isLast ? tuple + ";" : tuple + ",";
		});

		sql.push(...values);
		sql.push("");

		// Progress indicator
		if (totalBatches % 10 === 0) {
			const progress = Math.min(i + BATCH_SIZE, rows.length);
			const percentage = ((progress / rows.length) * 100).toFixed(1);
			console.log(
				`   Progress: ${progress.toLocaleString()}/${rows.length.toLocaleString()} (${percentage}%)`,
			);
		}
	}

	// Write SQL file
	const sqlPath = join(__dirname, config.sqlPath);
	const sqlDir = dirname(sqlPath);
	mkdirSync(sqlDir, { recursive: true });

	const sqlContent = sql.join("\n");
	writeFileSync(sqlPath, sqlContent, "utf-8");

	const sizeKB = (sqlContent.length / 1024).toFixed(2);
	const sizeMB = (sqlContent.length / 1024 / 1024).toFixed(2);
	console.log(
		`   ✅ Generated ${totalBatches} batches (${sizeKB} KB / ${sizeMB} MB)`,
	);
	console.log(`   📄 Written to: ${sqlPath}`);
}

/**
 * Main execution
 */
async function main() {
	// Check if a specific catalog was requested
	const catalogArg = process.argv[2];
	const catalogsToGenerate = catalogArg
		? { [catalogArg]: CATALOGS[catalogArg] }
		: CATALOGS;

	if (catalogArg && !CATALOGS[catalogArg]) {
		console.error(`❌ Unknown catalog: ${catalogArg}`);
		console.error(`   Valid catalogs: ${Object.keys(CATALOGS).join(", ")}`);
		process.exit(1);
	}

	console.log("🚀 Generating SQL dump files for large catalogs...\n");

	for (const [catalogKey, config] of Object.entries(catalogsToGenerate)) {
		try {
			await generateSqlDump(catalogKey, config);
		} catch (error) {
			console.error(`❌ Failed to generate SQL for ${catalogKey}:`, error);
			process.exit(1);
		}
	}

	console.log("\n✅ All SQL dump files generated successfully!");
	console.log("\nGenerated files:");
	for (const [_catalogKey, config] of Object.entries(catalogsToGenerate)) {
		console.log(`  - ${config.sqlPath}`);
	}
	console.log("\nThese files can now be imported with:");
	console.log("  wrangler d1 execute DB --file <sql-file>");
}

main().catch((error) => {
	console.error("\n❌ Failed to generate SQL dump files:", error);
	process.exit(1);
});
