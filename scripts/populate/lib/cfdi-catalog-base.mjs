/**
 * Base utilities for CFDI catalog population scripts
 *
 * Shared logic for all CFDI catalog population scripts.
 */

import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { writeFileSync, unlinkSync, existsSync, readFileSync } from "node:fs";

/**
 * Get local CSV path for a catalog
 */
export function getLocalCsvPath(catalogFile) {
	const __filename = fileURLToPath(import.meta.url);
	const __dirname = dirname(__filename);
	return join(__dirname, "..", "..", "cfdi-catalogs", "output", catalogFile);
}

/**
 * Get CSV content from local file or remote URL
 */
export async function getCsvContent(catalogFile, remoteUrl) {
	// Try local file first
	const localPath = getLocalCsvPath(catalogFile);
	if (existsSync(localPath)) {
		console.log(`📂 Using local file: ${localPath}`);
		return readFileSync(localPath, "utf-8");
	}

	// Fall back to remote URL
	if (remoteUrl) {
		console.log(`📥 Downloading ${catalogFile}...`);
		const response = await fetch(remoteUrl);
		if (!response.ok) {
			throw new Error(`Failed to download CSV: ${response.statusText}`);
		}
		return await response.text();
	}

	throw new Error(
		`CSV not found. Run 'node scripts/cfdi-catalogs/download-sat-catalogs.mjs' first.`,
	);
}

/**
 * Parse CSV with quoted values
 */
export function parseCsv(csvText, columnCount = 2) {
	const lines = csvText.trim().split("\n");
	const data = [];

	for (let i = 1; i < lines.length; i++) {
		const line = lines[i].trim();
		if (!line) continue;

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

		if (values.length >= columnCount && values[0] && values[1]) {
			data.push(values);
		}
	}

	return data;
}

/**
 * Generate deterministic ID based on catalog key and normalized name
 */
export function generateDeterministicId(catalogId, normalizedName) {
	const combined = `${catalogId}-${normalizedName}`;
	let hash = 0;
	for (let i = 0; i < combined.length; i++) {
		const char = combined.charCodeAt(i);
		hash = (hash << 5) - hash + char;
		hash = hash & hash;
	}
	return Math.abs(hash).toString(16).padStart(32, "0");
}

/**
 * Generate catalog ID from catalog key
 */
export function generateCatalogId(catalogKey) {
	return Array.from(catalogKey)
		.reduce((acc, char) => acc + char.charCodeAt(0), 0)
		.toString(16)
		.padStart(32, "0");
}

/**
 * Normalize text for searching (remove accents, lowercase)
 */
export function normalizeText(text) {
	return text
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.trim();
}

/**
 * Escape single quotes for SQL
 */
export function escapeSql(text) {
	return text.replace(/'/g, "''");
}

/**
 * Get wrangler config based on environment
 */
export function getWranglerConfig() {
	const isRemote = process.env.CI === "true" || process.env.REMOTE === "true";
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

	return { isRemote, configFile };
}

/**
 * Execute SQL via wrangler
 */
export function executeSql(sql, catalogKey) {
	const __filename = fileURLToPath(import.meta.url);
	const __dirname = dirname(__filename);
	const populateDir = dirname(__dirname);

	const { isRemote, configFile } = getWranglerConfig();
	const configFlag = configFile ? `--config ${configFile}` : "";
	const sqlFile = join(populateDir, `temp-${catalogKey}-${Date.now()}.sql`);

	try {
		writeFileSync(sqlFile, sql);

		// Always use pnpm wrangler for consistency across environments
		const wranglerCmd = "pnpm wrangler";
		const command = isRemote
			? `${wranglerCmd} d1 execute DB ${configFlag} --remote --file "${sqlFile}"`
			: `${wranglerCmd} d1 execute DB ${configFlag} --local --file "${sqlFile}"`;

		execSync(command, { stdio: "inherit" });
		return true;
	} finally {
		try {
			unlinkSync(sqlFile);
		} catch {
			// Ignore cleanup errors
		}
	}
}

/**
 * Create a simple CFDI catalog population function
 */
export function createCatalogPopulator({
	catalogKey,
	catalogName,
	csvFile,
	remoteUrl,
	parseItem = (values) => ({ code: values[0], name: values[1] }),
	createMetadata = (item) => ({ code: item.code }),
}) {
	return async function populate() {
		const { isRemote } = getWranglerConfig();

		try {
			console.log(
				`📦 Populating ${catalogKey} catalog (${isRemote ? "remote" : "local"})...`,
			);

			// Get and parse CSV
			const csvText = await getCsvContent(csvFile, remoteUrl);
			const rows = parseCsv(csvText);

			const items = rows
				.map(parseItem)
				.filter((item) => item.code && item.name);
			console.log(`✅ Parsed ${items.length} items from CSV`);

			// Generate catalog ID
			const catalogId = generateCatalogId(catalogKey);

			// Generate SQL
			const sql = [];

			// Insert catalog if it doesn't exist
			sql.push(`
				INSERT OR IGNORE INTO catalogs (id, key, name, active, created_at, updated_at)
				VALUES ('${catalogId}', '${catalogKey}', '${escapeSql(catalogName)}', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
			`);

			// Insert or replace catalog items
			for (const item of items) {
				const name = escapeSql(item.name);
				const normalizedName = escapeSql(normalizeText(item.name));
				const metadata = escapeSql(JSON.stringify(createMetadata(item)));
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

			// Execute SQL
			executeSql(sql.join("\n"), catalogKey);
			console.log(`✅ ${catalogKey} catalog populated successfully!`);
		} catch (error) {
			console.error(`❌ Error populating ${catalogKey} catalog:`, error);
			process.exit(1);
		}
	};
}
