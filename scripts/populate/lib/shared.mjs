/**
 * Shared utilities for populate scripts
 *
 * Single source of truth for all catalog population logic.
 * Eliminates code duplication across 30+ individual catalog scripts.
 */

import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { writeFileSync, unlinkSync } from "node:fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
 * Execute SQL via wrangler d1
 */
export function executeSql(sql, label = "populate") {
	const { isRemote, configFile } = getWranglerConfig();
	const configFlag = configFile ? `--config ${configFile}` : "";
	const populateDir = join(__dirname, "..");
	const sqlFile = join(populateDir, `temp-${label}-${Date.now()}.sql`);

	try {
		writeFileSync(sqlFile, sql);

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
 * Check if an error is retryable (transient D1 API errors)
 */
function isRetryableError(error) {
	const errorStr = error.toString().toLowerCase();
	return (
		errorStr.includes("500") ||
		errorStr.includes("502") ||
		errorStr.includes("503") ||
		errorStr.includes("504") ||
		errorStr.includes("internal error") ||
		errorStr.includes("internal server error") ||
		errorStr.includes("timeout") ||
		errorStr.includes("7500")
	);
}

/**
 * Execute SQL with retry logic for transient D1 API errors
 */
export function executeSqlWithRetry(sql, label = "populate", maxRetries = 3) {
	let lastError;

	for (let attempt = 1; attempt <= maxRetries; attempt++) {
		try {
			return executeSql(sql, label);
		} catch (error) {
			lastError = error;

			// Check if error is retryable (500, 502, 503, 504, rate limits)
			if (attempt < maxRetries && isRetryableError(error)) {
				const delayMs = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
				console.log(
					`   ⚠️  Attempt ${attempt} failed, retrying in ${delayMs / 1000}s...`,
				);
				// Sleep using a busy-wait approach (Node.js doesn't have sleep in sync context)
				const start = Date.now();
				while (Date.now() - start < delayMs) {
					// Busy wait
				}
				continue;
			}

			throw error;
		}
	}

	throw lastError;
}

/**
 * Execute an existing SQL file
 */
export function executeSqlFile(filePath, _label = "sql-file") {
	const { isRemote, configFile } = getWranglerConfig();
	const configFlag = configFile ? `--config ${configFile}` : "";

	const wranglerCmd = "pnpm wrangler";
	const command = isRemote
		? `${wranglerCmd} d1 execute DB ${configFlag} --remote --file "${filePath}"`
		: `${wranglerCmd} d1 execute DB ${configFlag} --local --file "${filePath}"`;

	execSync(command, { stdio: "inherit" });
}

/**
 * Fetch CSV from remote URL
 */
export async function fetchCsv(url) {
	// #region agent log
	fetch("http://127.0.0.1:7244/ingest/bf26bb78-9b10-4561-bb87-bb814cf22854", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			location: "lib/shared.mjs:93",
			message: "fetchCsv called",
			data: { url },
			timestamp: Date.now(),
			hypothesisId: "H5",
		}),
	}).catch(() => {});
	// #endregion
	// Add cache-busting to ensure we get the latest version
	const cacheBustedUrl = url.includes("?")
		? `${url}&_t=${Date.now()}`
		: `${url}?_t=${Date.now()}`;
	// #region agent log
	console.log("[DEBUG] fetchCsv cache-busted URL:", cacheBustedUrl);
	// #endregion
	const response = await fetch(cacheBustedUrl, {
		cache: "no-store",
		headers: {
			"Cache-Control": "no-cache",
			Pragma: "no-cache",
		},
	});
	// #region agent log
	fetch("http://127.0.0.1:7244/ingest/bf26bb78-9b10-4561-bb87-bb814cf22854", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			location: "lib/shared.mjs:97",
			message: "fetchCsv response",
			data: {
				ok: response.ok,
				status: response.status,
				statusText: response.statusText,
			},
			timestamp: Date.now(),
			hypothesisId: "H5",
		}),
	}).catch(() => {});
	// #endregion
	if (!response.ok) {
		throw new Error(
			`Failed to download CSV from ${url}: ${response.statusText}`,
		);
	}
	const text = await response.text();
	// #region agent log
	console.log("[DEBUG] fetchCsv text:", {
		length: text.length,
		preview: text.substring(0, 300),
	});
	// #endregion
	return text;
}

/**
 * Parse CSV with quote handling
 * Auto-detects columns from header
 */
export function parseCsv(csvText) {
	const lines = csvText.trim().split("\n");
	if (lines.length < 2) {
		return [];
	}

	// Parse header to get column names
	const header = lines[0].trim();
	// #region agent log
	fetch("http://127.0.0.1:7244/ingest/bf26bb78-9b10-4561-bb87-bb814cf22854", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			location: "lib/shared.mjs:117",
			message: "parseCsv header",
			data: { header, firstLine: lines[0] },
			timestamp: Date.now(),
			hypothesisId: "H2",
		}),
	}).catch(() => {});
	// #endregion
	const columnNames = [];
	let current = "";
	let inQuotes = false;

	for (let j = 0; j < header.length; j++) {
		const char = header[j];
		if (char === '"') {
			inQuotes = !inQuotes;
		} else if (char === "," && !inQuotes) {
			columnNames.push(current.trim());
			current = "";
		} else {
			current += char;
		}
	}
	columnNames.push(current.trim());
	// #region agent log
	console.log("[DEBUG] parseCsv columnNames:", columnNames);
	// #endregion

	// Parse data rows
	const items = [];
	for (let i = 1; i < lines.length; i++) {
		const line = lines[i].trim();
		if (!line) continue;

		const values = [];
		current = "";
		inQuotes = false;

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

		// Map values to column names
		if (values.length >= columnNames.length && values[0]) {
			const item = {};
			for (let k = 0; k < columnNames.length; k++) {
				item[columnNames[k]] = values[k];
			}
			items.push(item);
		}
	}
	// #region agent log
	console.log("[DEBUG] parseCsv result:", {
		count: items.length,
		first3: items.slice(0, 3),
	});
	// #endregion

	return items;
}

/**
 * Escape SQL string
 */
export function escapeSql(text) {
	if (text === null || text === undefined) return "NULL";
	return `'${String(text).replace(/'/g, "''")}'`;
}

/**
 * Normalize text (remove accents, lowercase, trim)
 */
export function normalizeText(text) {
	return text
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.trim();
}

/**
 * Generate deterministic catalog ID from key
 */
export function generateCatalogId(catalogKey) {
	return Array.from(catalogKey)
		.reduce((acc, char) => acc + char.charCodeAt(0), 0)
		.toString(16)
		.padStart(32, "0");
}

/**
 * Generate deterministic item ID
 */
export function generateItemId(catalogId, seed) {
	const combined = `${catalogId}-${seed}`;
	let hash = 0;
	for (let i = 0; i < combined.length; i++) {
		const char = combined.charCodeAt(i);
		hash = (hash << 5) - hash + char;
		hash = hash & hash;
	}
	return Math.abs(hash).toString(16).padStart(32, "0");
}

/**
 * Populate a catalog with items
 * Generates and executes INSERT SQL for catalog + items
 */
export function populateCatalog(catalogKey, catalogName, items) {
	const catalogId = generateCatalogId(catalogKey);
	const sql = [];

	// Insert catalog
	sql.push(`
		INSERT OR IGNORE INTO catalogs (id, key, name, active, created_at, updated_at)
		VALUES ('${catalogId}', '${catalogKey}', ${escapeSql(catalogName)}, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
	`);

	// Insert items
	for (const item of items) {
		const name = escapeSql(item.name);
		const normalizedName = escapeSql(normalizeText(item.name));
		const metadata = escapeSql(JSON.stringify(item.metadata || {}));
		const itemId = generateItemId(catalogId, item.id || normalizedName);

		sql.push(`
			INSERT OR REPLACE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
			VALUES (
				'${itemId}',
				'${catalogId}',
				${name},
				${normalizedName},
				1,
				${metadata},
				COALESCE((SELECT created_at FROM catalog_items WHERE id = '${itemId}'), CURRENT_TIMESTAMP),
				CURRENT_TIMESTAMP
			);
		`);
	}

	executeSql(sql.join("\n"), catalogKey);
}
