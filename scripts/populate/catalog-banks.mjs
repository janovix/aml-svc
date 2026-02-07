#!/usr/bin/env node
/**
 * Populate Banks Catalog (Mexican Financial Institutions / SPEI Participants)
 *
 * This script populates the banks catalog with data from CSV.
 * This is a POPULATION script (not a seed) and runs in all environments.
 */

import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { writeFileSync, unlinkSync } from "node:fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CSV_URL = "https://catalogs.janovix.com/banks.csv";
const CATALOG_KEY = "banks";

async function downloadCsv() {
	console.log("📥 Downloading banks.csv...");
	const response = await fetch(CSV_URL);
	if (!response.ok) {
		throw new Error(`Failed to download CSV: ${response.statusText}`);
	}
	return await response.text();
}

function parseCsv(csvText) {
	const lines = csvText.trim().split("\n");
	const data = [];

	for (let i = 1; i < lines.length; i++) {
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

		if (values.length >= 2) {
			data.push({
				key: values[0], // Bank code (e.g., "40133")
				value: values[1], // Bank name (e.g., "ACTINVER")
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
		INSERT OR IGNORE INTO catalogs (id, key, name, active, created_at, updated_at)
		VALUES ('${catalogId}', '${CATALOG_KEY}', 'Bancos de México', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
	`);

	// Insert or replace catalog items using deterministic IDs
	for (const item of items) {
		// name = human-readable name (e.g., "ACTINVER", "BBVA MEXICO")
		const name = item.value.replace(/'/g, "''");
		// normalizedName = normalized human-readable name for searching
		const normalizedName = item.value
			.normalize("NFD")
			.replace(/[\u0300-\u036f]/g, "")
			.toLowerCase()
			.trim()
			.replace(/'/g, "''");
		// Store the code in metadata for reference
		const metadata = JSON.stringify({
			code: item.key, // e.g., "40133", "40012" - SPEI participant code
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

async function populateBanksCatalog() {
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
			`📦 Populating banks catalog (${isRemote ? "remote" : "local"})...`,
		);

		// Download and parse CSV
		const csvText = await downloadCsv();
		const items = parseCsv(csvText);
		console.log(`✅ Parsed ${items.length} banks from CSV`);

		// Generate catalog ID (deterministic based on catalog key)
		const catalogId = Array.from(CATALOG_KEY)
			.reduce((acc, char) => acc + char.charCodeAt(0), 0)
			.toString(16)
			.padStart(32, "0");

		// Generate SQL
		const sql = generateSql(catalogId, items);
		const sqlFile = join(__dirname, `temp-banks-${Date.now()}.sql`);

		try {
			writeFileSync(sqlFile, sql);

			// Execute SQL
			const wranglerCmd =
				process.env.CI === "true" ? "pnpm wrangler" : "wrangler";
			const command = isRemote
				? `${wranglerCmd} d1 execute DB ${configFlag} --remote --file "${sqlFile}"`
				: `${wranglerCmd} d1 execute DB ${configFlag} --local --file "${sqlFile}"`;

			execSync(command, { stdio: "inherit" });
			console.log("✅ Banks catalog populated successfully!");
		} finally {
			// Clean up temp file
			try {
				unlinkSync(sqlFile);
			} catch {
				// Ignore cleanup errors
			}
		}
	} catch (error) {
		console.error("❌ Error populating banks catalog:", error);
		process.exit(1);
	}
}

populateBanksCatalog().catch((error) => {
	console.error("Fatal error:", error);
	process.exit(1);
});
