#!/usr/bin/env node
/**
 * Populate Zip Codes Catalog (Mexican Postal Codes - SEPOMEX)
 *
 * This script populates the zip codes catalog with data from CSV.
 * This is a POPULATION script (not a seed) and runs in all environments.
 *
 * Source: SEPOMEX (Servicio Postal Mexicano)
 * CSV hosted at: https://catalogs.janovix.com/zip-codes.csv
 *
 * NOTE: This catalog has ~157K entries and is too large for Cloudflare build environments.
 * It is skipped by default in CI and should be populated via GitHub Actions workflow.
 *
 * Environment variables:
 * - SKIP_ZIP_CODES=true: Skip this catalog entirely
 * - FORCE_ZIP_CODES=true: Force population (required for CI/remote)
 */

import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { writeFileSync, unlinkSync } from "node:fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CSV_URL = "https://catalogs.janovix.com/zip-codes.csv";
const CATALOG_KEY = "zip-codes";
const CATALOG_NAME = "Códigos Postales (México)";

// Batch size for SQL execution - kept small to avoid wrangler/workerd memory issues
// The workerd runtime has hash table issues with large batches
const BATCH_SIZE = 500;

// Delay between batches in ms to allow runtime cleanup
const BATCH_DELAY_MS = 100;

async function downloadCsv() {
	console.log("📥 Downloading zip-codes.csv...");
	const response = await fetch(CSV_URL);
	if (!response.ok) {
		throw new Error(`Failed to download CSV: ${response.statusText}`);
	}
	return await response.text();
}

function parseCsv(csvText) {
	const lines = csvText.trim().split("\n");
	const data = [];

	// Parse header
	const headers = lines[0].split(",").map((h) => h.trim());
	console.log(`   Headers: ${headers.join(", ")}`);

	for (let i = 1; i < lines.length; i++) {
		const line = lines[i].trim();
		if (!line) continue;

		// Parse CSV with proper quote handling
		const values = [];
		let current = "";
		let inQuotes = false;

		for (let j = 0; j < line.length; j++) {
			const char = line[j];
			if (char === '"') {
				if (inQuotes && line[j + 1] === '"') {
					current += '"';
					j++;
				} else {
					inQuotes = !inQuotes;
				}
			} else if (char === "," && !inQuotes) {
				values.push(current.trim());
				current = "";
			} else {
				current += char;
			}
		}
		values.push(current.trim());

		if (values.length >= 5) {
			data.push({
				zipCode: values[0],
				settlement: values[1],
				settlementType: values[2],
				municipality: values[3],
				state: values[4],
				city: values[5] || "",
				stateCode: values[6] || "",
				zone: values[7] || "",
			});
		}
	}

	return data;
}

// Generate deterministic ID based on catalogId and normalizedName
function generateDeterministicId(catalogId, normalizedName) {
	const combined = `${catalogId}-${normalizedName}`;
	let hash = 0;
	for (let i = 0; i < combined.length; i++) {
		const char = combined.charCodeAt(i);
		hash = (hash << 5) - hash + char;
		hash = hash & hash;
	}
	return Math.abs(hash).toString(16).padStart(32, "0");
}

function generateCatalogId(catalogKey) {
	return Array.from(catalogKey)
		.reduce((acc, char) => acc + char.charCodeAt(0), 0)
		.toString(16)
		.padStart(32, "0");
}

function generateSqlBatch(catalogId, items, isFirst = false) {
	const sql = [];

	// Only include catalog creation in the first batch
	if (isFirst) {
		sql.push(`
			INSERT OR IGNORE INTO catalogs (id, key, name, active, created_at, updated_at)
			VALUES ('${catalogId}', '${CATALOG_KEY}', '${CATALOG_NAME}', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
		`);
	}

	// Insert or replace catalog items using deterministic IDs
	for (const item of items) {
		// Create a display name: "Settlement, Municipality, State (ZIP)"
		const displayName = `${item.settlement}, ${item.municipality}, ${item.state}`;
		const name = displayName.replace(/'/g, "''");

		// Create a unique key for each entry (zip + settlement name for uniqueness)
		const uniqueKey = `${item.zipCode}-${item.settlement}`;
		const normalizedName = uniqueKey
			.normalize("NFD")
			.replace(/[\u0300-\u036f]/g, "")
			.toLowerCase()
			.trim()
			.replace(/'/g, "''");

		// Store all details in metadata for lookup/filtering
		const metadata = JSON.stringify({
			code: item.zipCode,
			settlement: item.settlement,
			settlementType: item.settlementType,
			municipality: item.municipality,
			state: item.state,
			city: item.city || null,
			stateCode: item.stateCode || null,
			zone: item.zone || null,
		}).replace(/'/g, "''");

		const itemId = generateDeterministicId(catalogId, normalizedName);

		sql.push(`
			INSERT OR REPLACE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
			VALUES (
				'${itemId}',
				'${catalogId}',
				'${name}',
				'${normalizedName}',
				1,
				'${metadata}',
				COALESCE((SELECT created_at FROM catalog_items WHERE id = '${itemId}'), CURRENT_TIMESTAMP),
				CURRENT_TIMESTAMP
			);
		`);
	}

	return sql.join("\n");
}

function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

async function executeSql(sqlFile, isRemote, configFlag) {
	// Use pnpm wrangler in CI, otherwise use wrangler directly
	const wranglerCmd = process.env.CI === "true" ? "pnpm wrangler" : "wrangler";
	const command = isRemote
		? `${wranglerCmd} d1 execute DB ${configFlag} --remote --file "${sqlFile}" --json`
		: `${wranglerCmd} d1 execute DB ${configFlag} --local --file "${sqlFile}" --json`;

	// Use pipe to suppress verbose JSON output, check for errors via exit code
	execSync(command, { stdio: "pipe" });
}

async function populateZipCodesCatalog() {
	const isRemote = process.env.CI === "true" || process.env.REMOTE === "true";

	// Check if explicitly skipped
	if (process.env.SKIP_ZIP_CODES === "true") {
		console.log("⏭️  Skipping zip codes catalog (SKIP_ZIP_CODES=true)");
		return;
	}

	// Skip by default in CI/remote environments unless explicitly forced
	// The zip-codes catalog has 157K+ entries and is too large for Cloudflare builds
	// Use the GitHub Actions workflow "Populate Zip Codes" instead
	if (isRemote && process.env.FORCE_ZIP_CODES !== "true") {
		console.log(
			"⏭️  Skipping zip codes catalog in CI (too large for Cloudflare builds)",
		);
		console.log(
			"   Use GitHub Actions workflow 'Populate Zip Codes' to populate this catalog.",
		);
		return;
	}

	// Determine config file
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

	try {
		console.log(
			`📦 Populating zip codes catalog (${isRemote ? "remote" : "local"})...`,
		);

		// Download and parse CSV
		const csvText = await downloadCsv();
		const items = parseCsv(csvText);
		console.log(
			`✅ Parsed ${items.length.toLocaleString()} zip code entries from CSV`,
		);

		// Generate catalog ID (deterministic based on catalog key)
		const catalogId = generateCatalogId(CATALOG_KEY);

		// Process in batches to avoid memory issues
		const totalBatches = Math.ceil(items.length / BATCH_SIZE);
		console.log(
			`📊 Processing ${totalBatches} batches of ${BATCH_SIZE} items each...`,
		);

		let successCount = 0;
		const startTime = Date.now();

		for (let batchNum = 0; batchNum < totalBatches; batchNum++) {
			const start = batchNum * BATCH_SIZE;
			const end = Math.min(start + BATCH_SIZE, items.length);
			const batchItems = items.slice(start, end);

			// Progress indicator every 10 batches or on first/last
			if (
				batchNum === 0 ||
				batchNum === totalBatches - 1 ||
				batchNum % 10 === 0
			) {
				const percent = Math.round(((batchNum + 1) / totalBatches) * 100);
				console.log(
					`   Batch ${batchNum + 1}/${totalBatches} (${percent}%): items ${start + 1} - ${end}`,
				);
			}

			// Generate SQL for this batch
			const sql = generateSqlBatch(catalogId, batchItems, batchNum === 0);
			const sqlFile = join(
				__dirname,
				`temp-zip-codes-${Date.now()}-${batchNum}.sql`,
			);

			try {
				writeFileSync(sqlFile, sql);
				await executeSql(sqlFile, isRemote, configFlag);
				successCount += batchItems.length;
			} finally {
				// Clean up temp file
				try {
					unlinkSync(sqlFile);
				} catch {
					// Ignore cleanup errors
				}
			}

			// Add delay between batches to allow runtime cleanup
			if (batchNum < totalBatches - 1) {
				await sleep(BATCH_DELAY_MS);
			}
		}

		const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
		console.log(
			`   Processed ${successCount.toLocaleString()} items in ${elapsed}s`,
		);

		console.log("✅ Zip codes catalog populated successfully!");
	} catch (error) {
		console.error("❌ Error populating zip codes catalog:", error);
		process.exit(1);
	}
}

populateZipCodesCatalog().catch((error) => {
	console.error("Fatal error:", error);
	process.exit(1);
});
