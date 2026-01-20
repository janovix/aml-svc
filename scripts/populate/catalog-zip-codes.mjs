#!/usr/bin/env node
/**
 * Populate Zip Codes Catalog (Mexican Postal Codes - SEPOMEX)
 *
 * This script populates the zip codes catalog with data from CSV.
 * This is a POPULATION script (not a seed) and runs in all environments.
 *
 * Source: SEPOMEX (Servicio Postal Mexicano)
 * CSV hosted at: https://catalogs.janovix.com/zip-codes.csv
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

// Batch size for SQL execution to avoid memory issues
const BATCH_SIZE = 5000;

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

async function executeSql(sqlFile, isRemote, configFlag) {
	const command = isRemote
		? `wrangler d1 execute DB ${configFlag} --remote --file "${sqlFile}"`
		: `wrangler d1 execute DB ${configFlag} --local --file "${sqlFile}"`;

	execSync(command, { stdio: "inherit" });
}

async function populateZipCodesCatalog() {
	const isRemote = process.env.CI === "true" || process.env.REMOTE === "true";
	// Use WRANGLER_CONFIG if set, otherwise detect preview environment
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

		for (let batchNum = 0; batchNum < totalBatches; batchNum++) {
			const start = batchNum * BATCH_SIZE;
			const end = Math.min(start + BATCH_SIZE, items.length);
			const batchItems = items.slice(start, end);

			console.log(
				`   Batch ${batchNum + 1}/${totalBatches}: items ${start + 1} - ${end}`,
			);

			// Generate SQL for this batch
			const sql = generateSqlBatch(catalogId, batchItems, batchNum === 0);
			const sqlFile = join(
				__dirname,
				`temp-zip-codes-${Date.now()}-${batchNum}.sql`,
			);

			try {
				writeFileSync(sqlFile, sql);
				await executeSql(sqlFile, isRemote, configFlag);
			} finally {
				// Clean up temp file
				try {
					unlinkSync(sqlFile);
				} catch {
					// Ignore cleanup errors
				}
			}
		}

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
