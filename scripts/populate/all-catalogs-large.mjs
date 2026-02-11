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
	executeSqlWithRetry,
} from "./lib/shared.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BASE_URL = "https://catalogs.janovix.com";

// Batch sizes optimized per catalog
// (larger catalogs with special chars need smaller batches to avoid 502 errors)
const BATCH_SIZES = {
	"zip-codes": 100, // Reduced from 500 to stay under D1's 100KB per-statement limit
	"cfdi-product-services": 50, // Reduced from 200 (special chars + JSON metadata)
};

// Concurrent processing disabled due to network socket errors
// Fetching large CSV chunks concurrently causes connection terminations
// Strategy: Fetch sequentially, but use smaller batches and retry logic for reliability
const CONCURRENT_CHUNKS = 1; // Process 1 chunk at a time (sequential)

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
	const batchSize = BATCH_SIZES[catalogKey] || 500;

	// Insert catalog first (only once)
	const catalogSql = `
		INSERT OR IGNORE INTO catalogs (id, key, name, active, created_at, updated_at)
		VALUES ('${catalogId}', '${catalogKey}', ${escapeSql(catalogName)}, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
	`;
	executeSqlWithRetry(catalogSql, `${catalogKey}-catalog`);

	// Process items in batches
	for (let i = 0; i < items.length; i += batchSize) {
		const batch = items.slice(i, i + batchSize);
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
					CURRENT_TIMESTAMP,
					CURRENT_TIMESTAMP
				);
			`);
		}

		const progress = Math.min(i + batchSize, items.length);
		const percentage = ((progress / items.length) * 100).toFixed(1);
		console.log(
			`   Processing batch: ${progress}/${items.length} items (${percentage}%)...`,
		);
		executeSqlWithRetry(batchSql.join("\n"), `${catalogKey}-batch-${i}`);
	}
}

/**
 * Process a single chunk (fetch, parse, populate)
 */
async function processChunk(
	chunkNum,
	config,
	catalogKey,
	catalogName,
	mapRowToItem,
) {
	const chunkNumber = String(chunkNum).padStart(3, "0");
	const chunkFilename = `${config.prefix}${chunkNumber}.csv`;
	const chunkUrl = `${BASE_URL}/chunks/${chunkFilename}`;

	console.log(
		`   [${chunkNum}/${config.totalChunks}] Fetching ${chunkFilename}...`,
	);

	const chunkCsv = await fetchCsv(chunkUrl);
	const chunkData = parseCsv(chunkCsv);
	const items = chunkData.map(mapRowToItem);

	console.log(
		`   [${chunkNum}/${config.totalChunks}] Processing ${items.length.toLocaleString()} items...`,
	);
	populateCatalogBatched(catalogKey, catalogName, items);

	console.log(
		`   ✅ Chunk ${chunkNum} complete (${items.length.toLocaleString()} items)`,
	);

	return items.length;
}

/**
 * Populate catalog from chunked CSV files with concurrent processing
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
	if (CONCURRENT_CHUNKS > 1) {
		console.log(`   🚀 Processing ${CONCURRENT_CHUNKS} chunks concurrently\n`);
	}

	let totalItems = 0;
	const chunkNumbers = Array.from(
		{ length: config.totalChunks },
		(_, i) => i + 1,
	);

	// Process chunks in batches of CONCURRENT_CHUNKS
	for (let i = 0; i < chunkNumbers.length; i += CONCURRENT_CHUNKS) {
		const batchChunks = chunkNumbers.slice(i, i + CONCURRENT_CHUNKS);

		// Add small delay between chunks to avoid overwhelming D1 API
		if (i > 0 && CONCURRENT_CHUNKS > 1) {
			const delayMs = 2000; // 2 second delay between concurrent batches
			console.log(`   ⏳ Waiting ${delayMs / 1000}s before next batch...\n`);
			await new Promise((resolve) => setTimeout(resolve, delayMs));
		}

		try {
			// Process this batch of chunks (concurrently if CONCURRENT_CHUNKS > 1)
			const results = await Promise.all(
				batchChunks.map((chunkNum) =>
					processChunk(chunkNum, config, catalogKey, catalogName, mapRowToItem),
				),
			);

			// Sum up items from this batch
			const batchTotal = results.reduce((sum, count) => sum + count, 0);
			totalItems += batchTotal;

			const progress = Math.min(i + CONCURRENT_CHUNKS, config.totalChunks);
			const percentage = ((progress / config.totalChunks) * 100).toFixed(1);
			console.log(
				`\n   📊 Progress: ${progress}/${config.totalChunks} chunks (${percentage}%) - ${totalItems.toLocaleString()} items total\n`,
			);
		} catch (error) {
			console.error(`   ❌ Failed to process chunk batch:`, error.message);
			throw error;
		}
	}

	return totalItems;
}

async function populateLargeCatalogs() {
	const { isRemote } = getWranglerConfig();
	const mode = process.env.LARGE_CATALOG_MODE || "none";

	// Skip if mode is "none"
	if (mode === "none") {
		console.log("ℹ️  Large catalogs skipped (mode: none)");
		return;
	}

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
