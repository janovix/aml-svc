#!/usr/bin/env node
/**
 * Populate Consolidated PLD Catalogs
 *
 * This script populates the consolidated pld-* catalogs that contain
 * the UNION of all items from multiple activity-specific catalogs.
 *
 * These catalogs should be used by multiple VAs instead of their
 * activity-specific duplicates.
 */

import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { writeFileSync, unlinkSync, readFileSync, existsSync } from "node:fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CATALOGS_DIR = join(
	__dirname,
	"..",
	"cfdi-catalogs",
	"output",
	"pld-catalogs",
);
const BATCH_SIZE = 50;

/**
 * Parse CSV file
 * Supports both 2-column (code,name) and 3-column (va_code,code,name) formats
 */
function parseCsv(csvPath, _format = "code,name") {
	const csvText = readFileSync(csvPath, "utf-8");
	const lines = csvText.trim().split("\n");
	const items = [];

	// Check header to detect format
	const header = lines[0].toLowerCase();
	const hasVaCode = header.includes("va_code");

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

		if (hasVaCode) {
			// 3-column format: va_code, code, name
			if (values.length >= 3 && values[0] && values[1]) {
				items.push({
					va_code: values[0],
					code: values[1],
					name: values[2] || "",
				});
			}
		} else {
			// 2-column format: code, name
			if (values.length >= 2 && values[0] && values[1]) {
				items.push({ code: values[0], name: values[1] });
			}
		}
	}

	return items;
}

/**
 * Generate deterministic ID
 */
function generateId(catalogId, normalizedName) {
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
 * Generate catalog ID from key
 */
function generateCatalogId(catalogKey) {
	return Array.from(catalogKey)
		.reduce((acc, char) => acc + char.charCodeAt(0), 0)
		.toString(16)
		.padStart(32, "0");
}

/**
 * Normalize text
 */
function normalizeText(text) {
	return text
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.trim();
}

/**
 * Escape SQL
 */
function escapeSql(text) {
	return text.replace(/'/g, "''");
}

/**
 * Get wrangler config
 */
function getWranglerConfig() {
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

async function populate() {
	const { isRemote, configFile } = getWranglerConfig();
	const configFlag = configFile ? `--config ${configFile}` : "";
	const wranglerCmd = "pnpm wrangler";

	console.log("╔════════════════════════════════════════════════════════════╗");
	console.log("║      Consolidated PLD Catalogs Population                  ║");
	console.log(
		"╚════════════════════════════════════════════════════════════╝\n",
	);

	console.log(`📦 Mode: ${isRemote ? "remote" : "local"}\n`);

	if (!existsSync(CATALOGS_DIR)) {
		console.error(
			"❌ PLD catalogs not found. Run consolidate-catalogs.mjs first.",
		);
		process.exit(1);
	}

	// Read manifest
	const manifestPath = join(CATALOGS_DIR, "_manifest.json");
	if (!existsSync(manifestPath)) {
		console.error("❌ Manifest not found. Run consolidate-catalogs.mjs first.");
		process.exit(1);
	}

	const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
	console.log(`📋 Found ${manifest.catalogs.length} consolidated catalogs\n`);

	const allSql = [];
	let totalItems = 0;

	for (const catalog of manifest.catalogs) {
		const csvPath = join(CATALOGS_DIR, catalog.filename);
		const items = parseCsv(csvPath);

		if (items.length === 0) {
			console.log(`   ⚠️  Empty: ${catalog.filename}`);
			continue;
		}

		const catalogId = generateCatalogId(catalog.key);

		console.log(`   ✅ ${catalog.key}: ${items.length} items`);
		console.log(`      Sources: ${catalog.sources.join(", ")}`);

		// Insert catalog
		allSql.push(`
			INSERT OR REPLACE INTO catalogs (id, key, name, active, created_at, updated_at)
			VALUES ('${catalogId}', '${catalog.key}', '${escapeSql(catalog.displayName)}', 1, 
				COALESCE((SELECT created_at FROM catalogs WHERE key = '${catalog.key}'), CURRENT_TIMESTAMP),
				CURRENT_TIMESTAMP);
		`);

		// Insert items
		for (const item of items) {
			const name = escapeSql(item.name);
			const normalizedName = escapeSql(normalizeText(item.name));

			// Handle va_code if present (for alert types)
			let metadata;
			let itemId;
			if (item.va_code) {
				// For alert types, mark as automatable or not
				// Code "100" (Sin alerta) and "9999" (Otra alerta) are manual-only
				// All other numbered codes are automatable
				const isAutomatable = item.code !== "100" && item.code !== "9999";
				metadata = escapeSql(
					JSON.stringify({
						va_code: item.va_code,
						code: item.code,
						automatable: isAutomatable,
					}),
				);
				// Include va_code in ID for uniqueness (same code can exist in different VAs)
				itemId = generateId(
					catalogId,
					`${item.va_code}-${item.code}-${normalizedName}`,
				);
			} else {
				metadata = escapeSql(JSON.stringify({ code: item.code }));
				itemId = generateId(catalogId, `${item.code}-${normalizedName}`);
			}

			allSql.push(`
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

		totalItems += items.length;
	}

	// Execute SQL in batches
	console.log(`\n📊 Executing ${allSql.length} SQL statements in batches...\n`);

	const totalBatches = Math.ceil(allSql.length / BATCH_SIZE);
	for (let i = 0; i < totalBatches; i++) {
		const start = i * BATCH_SIZE;
		const end = Math.min(start + BATCH_SIZE, allSql.length);
		const batch = allSql.slice(start, end);

		const progress = Math.round(((i + 1) / totalBatches) * 100);
		process.stdout.write(
			`\r   Processing batch ${i + 1}/${totalBatches} (${progress}%)...`,
		);

		const sqlFile = join(__dirname, `temp-pld-catalogs-${Date.now()}.sql`);
		try {
			writeFileSync(sqlFile, batch.join("\n"));

			const command = isRemote
				? `${wranglerCmd} d1 execute DB ${configFlag} --remote --file "${sqlFile}"`
				: `${wranglerCmd} d1 execute DB ${configFlag} --local --file "${sqlFile}"`;

			execSync(command, { stdio: "pipe" });
		} finally {
			try {
				unlinkSync(sqlFile);
			} catch {
				/* ignore cleanup errors */
			}
		}
	}

	console.log(
		"\n\n╔════════════════════════════════════════════════════════════╗",
	);
	console.log("║                         Summary                            ║");
	console.log(
		"╚════════════════════════════════════════════════════════════╝\n",
	);
	console.log(`   ✅ Catalogs populated: ${manifest.catalogs.length}`);
	console.log(`   ✅ Total items: ${totalItems.toLocaleString()}`);
	console.log("\n✅ Consolidated PLD catalogs populated successfully!");
}

populate().catch((error) => {
	console.error("\n❌ Fatal error:", error);
	process.exit(1);
});
