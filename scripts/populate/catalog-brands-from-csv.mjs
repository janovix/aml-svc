#!/usr/bin/env node
/**
 * Populate Brand Catalogs from CSV
 *
 * This script populates vehicle-brands, maritime-brands, and air-brands catalogs
 * from local CSV files. This is a POPULATION script (not a seed) and runs in all environments.
 *
 * Usage:
 *   node catalog-brands-from-csv.mjs [vehicle-brands.csv] [maritime-brands.csv] [air-brands.csv]
 *
 * Or set environment variables:
 *   VEHICLE_BRANDS_CSV=path/to/vehicle-brands.csv
 *   MARITIME_BRANDS_CSV=path/to/maritime-brands.csv
 *   AIR_BRANDS_CSV=path/to/air-brands.csv
 */

import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { readFileSync, writeFileSync, unlinkSync, existsSync } from "node:fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CATALOGS = [
	{
		key: "vehicle-brands",
		name: "Vehicle Brands",
		envVar: "VEHICLE_BRANDS_CSV",
	},
	{
		key: "maritime-brands",
		name: "Maritime Brands",
		envVar: "MARITIME_BRANDS_CSV",
	},
	{
		key: "air-brands",
		name: "Air Brands",
		envVar: "AIR_BRANDS_CSV",
	},
];

function parseCsv(csvText) {
	const lines = csvText.trim().split("\n");
	const data = [];

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i].trim();
		if (!line) continue;

		// Simple CSV parsing (handles quoted values)
		const values = [];
		let current = "";
		let inQuotes = false;

		for (let j = 0; j < line.length; j++) {
			const char = line[j];
			if (char === '"') {
				inQuotes = !inQuotes;
			} else if (char === "," && !inQuotes) {
				values.push(current.trim());
				current = "";
			} else {
				current += char;
			}
		}
		values.push(current.trim());

		// Expect CSV format: brand_name (or code,brand_name)
		if (values.length >= 1) {
			const brandName = values[values.length - 1]; // Last column is the brand name
			if (brandName) {
				data.push({
					name: brandName,
				});
			}
		}
	}

	return data;
}

function normalizeName(name) {
	return name
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.trim();
}

function generateSql(catalogId, catalogKey, catalogName, items) {
	const sql = [];

	// Insert catalog if it doesn't exist
	sql.push(`
		INSERT OR IGNORE INTO catalogs (id, key, name, active, createdAt, updatedAt)
		VALUES ('${catalogId}', '${catalogKey}', '${catalogName}', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
	`);

	// Delete existing items for this catalog
	sql.push(`DELETE FROM catalog_items WHERE catalogId = '${catalogId}';`);

	// Insert catalog items
	for (const item of items) {
		const name = item.name.replace(/'/g, "''");
		const normalizedName = normalizeName(item.name).replace(/'/g, "''");

		sql.push(`
			INSERT INTO catalog_items (id, catalogId, name, normalizedName, active, createdAt, updatedAt)
			VALUES (
				lower(hex(randomblob(16))),
				'${catalogId}',
				'${name}',
				'${normalizedName}',
				1,
				CURRENT_TIMESTAMP,
				CURRENT_TIMESTAMP
			);
		`);
	}

	return sql.join("\n");
}

async function populateBrandCatalog(catalog, csvPath) {
	const isRemote = process.env.CI === "true" || process.env.REMOTE === "true";
	// Use WRANGLER_CONFIG if set, otherwise detect based on branch
	let configFile = process.env.WRANGLER_CONFIG;
	if (!configFile) {
		const branch = process.env.CF_PAGES_BRANCH || process.env.WORKERS_CI_BRANCH;
		if (branch === "main") {
			configFile = "wrangler.prod.jsonc";
		} else if (branch === "dev") {
			configFile = "wrangler.jsonc";
		} else if (branch || process.env.PREVIEW === "true") {
			configFile = "wrangler.preview.jsonc";
		}
	}
	const configFlag = configFile ? `--config ${configFile}` : "";

	if (!csvPath || !existsSync(csvPath)) {
		console.log(
			`⏭️  Skipping ${catalog.name} - CSV file not found: ${csvPath || "not specified"}`,
		);
		return;
	}

	try {
		console.log(
			`📦 Populating ${catalog.name} catalog (${isRemote ? "remote" : "local"})...`,
		);
		console.log(`   Reading from: ${csvPath}`);

		// Read and parse CSV
		const csvText = readFileSync(csvPath, "utf-8");
		const items = parseCsv(csvText);
		console.log(`✅ Parsed ${items.length} brands from CSV`);

		if (items.length === 0) {
			console.log(`⚠️  No items found in CSV, skipping ${catalog.name}`);
			return;
		}

		// Generate catalog ID (deterministic based on catalog key)
		const catalogId = Array.from(catalog.key)
			.reduce((acc, char) => acc + char.charCodeAt(0), 0)
			.toString(16)
			.padStart(32, "0");

		// Generate SQL
		const sql = generateSql(catalogId, catalog.key, catalog.name, items);
		const sqlFile = join(__dirname, `temp-${catalog.key}-${Date.now()}.sql`);

		try {
			writeFileSync(sqlFile, sql);

			// Execute SQL
			const command = isRemote
				? `wrangler d1 execute DB ${configFlag} --remote --file "${sqlFile}"`
				: `wrangler d1 execute DB ${configFlag} --local --file "${sqlFile}"`;

			execSync(command, { stdio: "inherit" });
			console.log(`✅ ${catalog.name} catalog populated successfully!`);
		} finally {
			// Clean up temp file
			try {
				unlinkSync(sqlFile);
			} catch {
				// Ignore cleanup errors
			}
		}
	} catch (error) {
		console.error(`❌ Error populating ${catalog.name} catalog:`, error);
		throw error;
	}
}

async function populateAllBrandCatalogs() {
	const args = process.argv.slice(2);

	// Get CSV paths from arguments or environment variables
	const csvPaths = {
		"vehicle-brands": args[0] || process.env.VEHICLE_BRANDS_CSV,
		"maritime-brands": args[1] || process.env.MARITIME_BRANDS_CSV,
		"air-brands": args[2] || process.env.AIR_BRANDS_CSV,
	};

	console.log("📦 Populating brand catalogs from CSV files...\n");

	for (const catalog of CATALOGS) {
		const csvPath = csvPaths[catalog.key];
		await populateBrandCatalog(catalog, csvPath);
		console.log();
	}

	console.log("✅ All brand catalogs populated successfully!");
}

populateAllBrandCatalogs().catch((error) => {
	console.error("Fatal error:", error);
	process.exit(1);
});
