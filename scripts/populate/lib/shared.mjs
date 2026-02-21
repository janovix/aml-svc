/**
 * Shared utilities for populate scripts
 *
 * Single source of truth for all catalog population logic.
 * Eliminates code duplication across 30+ individual catalog scripts.
 */

import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
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
		errorStr.includes("terminated") ||
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
 * Check if a fetch error is retryable (network errors, timeouts)
 */
function isRetryableFetchError(error) {
	const errorStr = error.toString().toLowerCase();
	return (
		errorStr.includes("terminated") ||
		errorStr.includes("timeout") ||
		errorStr.includes("network") ||
		errorStr.includes("socket") ||
		errorStr.includes("econnreset") ||
		errorStr.includes("econnrefused") ||
		errorStr.includes("etimedout")
	);
}

/**
 * Fetch CSV from remote URL with retry logic
 */
export async function fetchCsv(url, maxRetries = 5) {
	let lastError;

	for (let attempt = 1; attempt <= maxRetries; attempt++) {
		try {
			// Add cache-busting to ensure we get the latest version
			const cacheBustedUrl = url.includes("?")
				? `${url}&_t=${Date.now()}`
				: `${url}?_t=${Date.now()}`;

			const response = await fetch(cacheBustedUrl, {
				cache: "no-store",
				headers: {
					"Cache-Control": "no-cache",
					Pragma: "no-cache",
				},
			});

			if (!response.ok) {
				throw new Error(
					`Failed to download CSV from ${url}: ${response.statusText}`,
				);
			}

			const text = await response.text();
			return text;
		} catch (error) {
			lastError = error;

			// Check if error is retryable (network errors, socket closures)
			if (attempt < maxRetries && isRetryableFetchError(error)) {
				const delayMs = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s, 16s, 32s
				console.log(
					`   ⚠️  Fetch attempt ${attempt}/${maxRetries} failed: ${error.message}`,
				);
				console.log(`   ⏳ Retrying in ${delayMs / 1000}s...`);
				await new Promise((resolve) => setTimeout(resolve, delayMs));
				continue;
			}

			// Non-retryable error or max retries reached
			throw error;
		}
	}

	throw lastError;
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
 * Generate deterministic catalog ID from key using MD5
 */
export function generateCatalogId(catalogKey) {
	return createHash("md5").update(`catalog:${catalogKey}`).digest("hex");
}

/**
 * Generate deterministic item ID from catalog key and normalized name using MD5.
 * Only the identity (catalog + name) determines the ID, NOT metadata.
 * This way, metadata can evolve over time and INSERT OR REPLACE
 * cleanly updates the same row instead of creating a duplicate.
 */
export function generateItemId(catalogKey, normalizedName) {
	const content = `${catalogKey}:${normalizedName}`;
	return createHash("md5").update(content).digest("hex");
}
