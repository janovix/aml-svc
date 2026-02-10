#!/usr/bin/env node
/**
 * Populate Large Catalogs
 *
 * Runs large catalog population with flexible mode selection.
 * Each large catalog can be populated individually or together.
 *
 * Large catalogs:
 * - zip-codes          (~157K items) - from catalogs.janovix.com
 * - cfdi-product-services (~52K items) - from catalogs.janovix.com
 *
 * Both catalogs are now fetched from remote CSVs at catalogs.janovix.com
 * and processed in batches for optimal performance.
 *
 * Environment Variables:
 * - LARGE_CATALOG_MODE: Set to "all" (default), "zip-codes", or "cfdi-product-services"
 *
 * Usage:
 *   node scripts/populate/all-catalogs-large.mjs                    # all (default)
 *   LARGE_CATALOG_MODE=zip-codes node scripts/populate/all-catalogs-large.mjs
 *   LARGE_CATALOG_MODE=cfdi-product-services node scripts/populate/all-catalogs-large.mjs
 *
 * npm scripts:
 *   pnpm populate:catalogs:large        # Local (default DB)
 *   pnpm populate:catalogs:large:local  # Local (wrangler.local.jsonc)
 *   pnpm populate:catalogs:large:dev    # Remote dev
 *   pnpm populate:catalogs:large:prod   # Remote prod
 */

import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import {
	getWranglerConfig,
	fetchCsv,
	parseCsv,
	generateCatalogId,
	generateItemId,
	normalizeText,
	escapeSql,
	executeSql,
} from "./lib/shared.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BASE_URL = "https://catalogs.janovix.com";
const BATCH_SIZE = 500; // Process in batches to avoid huge SQL files

// Chunk configuration for large files
const CHUNK_CONFIG = {
	"zip-codes": {
		totalChunks: 8,
		prefix: "zip-codes-chunk-",
	},
	"cfdi-product-services": {
		totalChunks: 6,
		prefix: "cfdi-product-services-chunk-",
	},
};

/**
 * Populate catalog with batching
 */
function populateCatalogBatched(catalogKey, catalogName, items) {
	const catalogId = generateCatalogId(catalogKey);

	// Insert catalog first (only once)
	const catalogSql = `
		INSERT OR IGNORE INTO catalogs (id, key, name, active, created_at, updated_at)
		VALUES ('${catalogId}', '${catalogKey}', ${escapeSql(catalogName)}, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
	`;
	executeSql(catalogSql, `${catalogKey}-catalog`);

	// Process items in batches
	for (let i = 0; i < items.length; i += BATCH_SIZE) {
		const batch = items.slice(i, i + BATCH_SIZE);
		const batchSql = [];

		for (const item of batch) {
			const name = escapeSql(item.name);
			const normalizedName = escapeSql(normalizeText(item.name));
			const metadata = escapeSql(JSON.stringify(item.metadata || {}));
			const itemId = generateItemId(catalogId, item.id || normalizedName);

			batchSql.push(`
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

		const progress = Math.min(i + BATCH_SIZE, items.length);
		console.log(`   Processing batch: ${progress}/${items.length} items...`);
		executeSql(batchSql.join("\n"), `${catalogKey}-batch-${i}`);
	}
}

/**
 * Populate catalog from chunked CSV files
 */
async function populateCatalogFromChunks(
	catalogKey,
	catalogName,
	config,
	mapRowToItem,
) {
	console.log(
		`\n📦 Populating ${catalogKey} from ${config.totalChunks} chunks...`,
	);

	let totalItems = 0;

	for (let chunkNum = 1; chunkNum <= config.totalChunks; chunkNum++) {
		const chunkNumber = String(chunkNum).padStart(3, "0");
		const chunkFilename = `${config.prefix}${chunkNumber}.csv`;
		const chunkUrl = `${BASE_URL}/chunks/${chunkFilename}`;

		console.log(
			`   [${chunkNum}/${config.totalChunks}] Fetching ${chunkFilename}...`,
		);

		try {
			const chunkCsv = await fetchCsv(chunkUrl);
			const chunkData = parseCsv(chunkCsv);

			const items = chunkData.map(mapRowToItem);

			console.log(`   Processing ${items.length.toLocaleString()} items...`);
			populateCatalogBatched(catalogKey, catalogName, items);

			totalItems += items.length;
			console.log(
				`   ✅ Chunk ${chunkNum} complete (${items.length.toLocaleString()} items)\n`,
			);
		} catch (error) {
			console.error(
				`   ❌ Failed to process chunk ${chunkNum}:`,
				error.message,
			);
			throw error;
		}
	}

	return totalItems;
}

async function populateLargeCatalogs() {
	const { isRemote } = getWranglerConfig();
	const mode = process.env.LARGE_CATALOG_MODE || "all";

	console.log("╔════════════════════════════════════════════════════════════╗");
	console.log("║           Large Catalog Population (Chunked)              ║");
	console.log(
		"╚════════════════════════════════════════════════════════════╝\n",
	);
	console.log(`📦 Mode: ${isRemote ? "remote" : "local"}`);
	console.log(`🎯 Large Catalog Mode: ${mode}`);
	console.log(`⚠️  This may take several minutes...\n`);
	console.log(`📝 Loading from chunked CSV files for better performance`);

	try {
		// ========================================================================
		// 1. ZIP CODES (~157K items from 8 chunks)
		// ========================================================================
		if (mode === "all" || mode === "zip-codes") {
			console.log("\n[1/2] ZIP CODES");
			console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

			const zipCodesTotal = await populateCatalogFromChunks(
				"zip-codes",
				"Zip Codes",
				CHUNK_CONFIG["zip-codes"],
				(row) => ({
					name: `${row.zip_code} - ${row.settlement}`,
					id: `${row.zip_code}-${normalizeText(row.settlement)}`,
					metadata: {
						code: row.zip_code,
						settlement: row.settlement,
						settlementType: row.settlement_type,
						municipality: row.municipality,
						state: row.state,
						city: row.city,
						stateCode: row.state_code,
						zone: row.zone,
					},
				}),
			);

			console.log(
				`✅ Populated ${zipCodesTotal.toLocaleString()} zip codes total\n`,
			);
		}

		// ========================================================================
		// 2. CFDI PRODUCT SERVICES (~52K items from 6 chunks)
		// ========================================================================
		if (mode === "all" || mode === "cfdi-product-services") {
			console.log("\n[2/2] CFDI PRODUCT SERVICES");
			console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

			const productServicesTotal = await populateCatalogFromChunks(
				"cfdi-product-services",
				"CFDI Product/Services",
				CHUNK_CONFIG["cfdi-product-services"],
				(row) => ({
					name: row.name,
					id: normalizeText(row.name),
					metadata: { code: row.code },
				}),
			);

			console.log(
				`✅ Populated ${productServicesTotal.toLocaleString()} product/services total\n`,
			);
		}
	} catch (error) {
		console.error("\n❌ Failed to populate large catalogs:", error);
		process.exit(1);
	}

	console.log(
		"\n╔════════════════════════════════════════════════════════════╗",
	);
	console.log("║                 Large Catalogs Complete!                   ║");
	console.log(
		"╚════════════════════════════════════════════════════════════╝\n",
	);
	console.log("✅ Large catalog population completed successfully!");
	console.log(`   Mode: ${mode}`);
}

populateLargeCatalogs().catch((error) => {
	console.error("Fatal error:", error);
	process.exit(1);
});
