#!/usr/bin/env node
/**
 * Populate Currencies Catalog
 *
 * This script populates the currencies catalog with data from SAT CSV.
 * This is a POPULATION script (not a seed) and runs in all environments.
 */

import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { writeFileSync, unlinkSync } from "node:fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CSV_URL = "https://catalogs.janovix.ai/currencies.csv";
const CATALOG_KEY = "currencies";

async function downloadCsv() {
	console.log("📥 Downloading currencies.csv...");
	const response = await fetch(CSV_URL);
	if (!response.ok) {
		throw new Error(`Failed to download CSV: ${response.statusText}`);
	}
	return await response.text();
}

// Keywords to filter out precious metal coins (not actual currencies)
const EXCLUDED_KEYWORDS = ["LIBERTAD", "HIDALGO", "AZTECA", "CENTENARIO"];

function shouldExcludeEntry(name) {
	const upperName = name.toUpperCase();
	return EXCLUDED_KEYWORDS.some((keyword) => upperName.includes(keyword));
}

function parseCsv(csvText) {
	const lines = csvText.trim().split("\n");
	const data = [];

	for (let i = 1; i < lines.length; i++) {
		const line = lines[i].trim();
		if (!line) continue;

		// Parse CSV with quoted values
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

		if (values.length >= 3) {
			const name = values[2];
			// Skip precious metal coins (LIBERTAD, HIDALGO, AZTECA, CENTENARIO)
			if (shouldExcludeEntry(name)) {
				continue;
			}
			data.push({
				key: values[0], // e.g., "1"
				shortName: values[1], // e.g., "MXN"
				name: name, // e.g., "Peso mexicano"
				country: values[3] || "", // e.g., "México"
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

function generateSql(catalogId, items) {
	const sql = [];

	// Insert catalog if it doesn't exist
	sql.push(`
		INSERT OR IGNORE INTO catalogs (id, key, name, active, createdAt, updatedAt)
		VALUES ('${catalogId}', '${CATALOG_KEY}', 'Monedas', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
	`);

	// Delete precious metal coins that were previously imported
	sql.push(`
		DELETE FROM catalog_items 
		WHERE catalogId = '${catalogId}' 
		AND (
			name LIKE '%LIBERTAD%' 
			OR name LIKE '%HIDALGO%' 
			OR name LIKE '%AZTECA%' 
			OR name LIKE '%CENTENARIO%'
		);
	`);

	// Insert or replace catalog items using deterministic IDs
	for (const item of items) {
		// name = human-readable name (e.g., "Peso mexicano", "Dólar estadounidense")
		const name = item.name.replace(/'/g, "''");
		// normalizedName = normalized human-readable name for searching
		const normalizedName = item.name
			.normalize("NFD")
			.replace(/[\u0300-\u036f]/g, "")
			.toLowerCase()
			.trim()
			.replace(/'/g, "''");
		// Store the code and additional info in metadata for XML generation
		const metadata = JSON.stringify({
			code: item.key, // e.g., "1", "2", "3" - used in XML
			shortName: item.shortName, // e.g., "MXN", "USD"
			country: item.country,
		}).replace(/'/g, "''"); // Escape single quotes
		const itemId = generateDeterministicId(catalogId, normalizedName);

		sql.push(`
			INSERT OR REPLACE INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
			VALUES (
				'${itemId}',
				'${catalogId}',
				'${name}',
				'${normalizedName}',
				1,
				'${metadata}',
				COALESCE((SELECT createdAt FROM catalog_items WHERE id = '${itemId}'), CURRENT_TIMESTAMP),
				CURRENT_TIMESTAMP
			);
		`);
	}

	return sql.join("\n");
}

async function populateCurrencyCatalog() {
	const isRemote = process.env.CI === "true" || process.env.REMOTE === "true";
	// Use WRANGLER_CONFIG if set, otherwise detect based on branch
	// Setup: main → wrangler.prod.jsonc, dev → wrangler.jsonc, others → wrangler.preview.jsonc
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
			`📦 Populating currencies catalog (${isRemote ? "remote" : "local"})...`,
		);

		// Download and parse CSV
		const csvText = await downloadCsv();
		const allLines = csvText.trim().split("\n").length - 1; // Exclude header
		const items = parseCsv(csvText);
		const filtered = allLines - items.length;
		console.log(
			`✅ Parsed ${items.length} currencies from CSV (filtered out ${filtered} precious metal coins)`,
		);

		// Generate catalog ID (deterministic based on catalog key)
		const catalogId = Array.from(CATALOG_KEY)
			.reduce((acc, char) => acc + char.charCodeAt(0), 0)
			.toString(16)
			.padStart(32, "0");

		// Generate SQL
		const sql = generateSql(catalogId, items);
		const sqlFile = join(__dirname, `temp-currencies-${Date.now()}.sql`);

		try {
			writeFileSync(sqlFile, sql);

			// Execute SQL
			const command = isRemote
				? `wrangler d1 execute DB ${configFlag} --remote --file "${sqlFile}"`
				: `wrangler d1 execute DB ${configFlag} --local --file "${sqlFile}"`;

			execSync(command, { stdio: "inherit" });
			console.log("✅ Currencies catalog populated successfully!");
		} finally {
			// Clean up temp file
			try {
				unlinkSync(sqlFile);
			} catch {
				// Ignore cleanup errors
			}
		}
	} catch (error) {
		console.error("❌ Error populating currencies catalog:", error);
		process.exit(1);
	}
}

populateCurrencyCatalog().catch((error) => {
	console.error("Fatal error:", error);
	process.exit(1);
});
