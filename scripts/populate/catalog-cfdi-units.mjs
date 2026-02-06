#!/usr/bin/env node
/**
 * Populate CFDI Units Catalog (c_ClaveUnidad)
 *
 * SAT codes for measurement units (~2,400 items).
 * Example: H87=Pieza, E48=Unidad de servicio, KGM=Kilogramo
 */

import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { writeFileSync, unlinkSync } from "node:fs";
import {
	getCsvContent,
	parseCsv,
	getWranglerConfig,
	generateCatalogId,
	generateDeterministicId,
	normalizeText,
	escapeSql,
} from "./lib/cfdi-catalog-base.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BATCH_SIZE = 500; // Items per SQL batch

async function populate() {
	const { isRemote, configFile } = getWranglerConfig();
	const catalogKey = "cfdi-units";
	const catalogName = "CFDI Units";
	const csvFile = "cfdi-units.csv";
	const remoteUrl = "https://catalogs.janovix.com/cfdi-units.csv";

	try {
		console.log(
			`📦 Populating ${catalogKey} catalog (${isRemote ? "remote" : "local"})...`,
		);

		// Get and parse CSV (3 columns: code, name, symbol)
		const csvText = await getCsvContent(csvFile, remoteUrl);
		const rows = parseCsv(csvText, 3);

		const items = rows
			.map((values) => ({
				code: values[0],
				name: values[1],
				symbol: values[2] || "",
			}))
			.filter((item) => item.code && item.name);

		console.log(`✅ Parsed ${items.length.toLocaleString()} items from CSV`);

		// Generate catalog ID
		const catalogId = generateCatalogId(catalogKey);

		// Create catalog first
		const catalogSql = `
			INSERT OR IGNORE INTO catalogs (id, key, name, active, created_at, updated_at)
			VALUES ('${catalogId}', '${catalogKey}', '${escapeSql(catalogName)}', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
		`;

		const configFlag = configFile ? `--config ${configFile}` : "";
		const wranglerCmd = "pnpm wrangler";
		const catalogFile = join(
			__dirname,
			`temp-${catalogKey}-catalog-${Date.now()}.sql`,
		);

		writeFileSync(catalogFile, catalogSql);
		try {
			const catalogCommand = isRemote
				? `${wranglerCmd} d1 execute DB ${configFlag} --remote --file "${catalogFile}"`
				: `${wranglerCmd} d1 execute DB ${configFlag} --local --file "${catalogFile}"`;
			execSync(catalogCommand, { stdio: "pipe" });
		} finally {
			try {
				unlinkSync(catalogFile);
			} catch {
				// Ignore cleanup errors
			}
		}

		// Process items in batches
		const totalBatches = Math.ceil(items.length / BATCH_SIZE);
		console.log(
			`\n📊 Processing ${totalBatches} batches of ${BATCH_SIZE} items each...\n`,
		);

		for (let batchNum = 0; batchNum < totalBatches; batchNum++) {
			const start = batchNum * BATCH_SIZE;
			const end = Math.min(start + BATCH_SIZE, items.length);
			const batch = items.slice(start, end);

			const progress = Math.round(((batchNum + 1) / totalBatches) * 100);
			process.stdout.write(
				`\r   Processing batch ${batchNum + 1}/${totalBatches} (${progress}%)...`,
			);

			const sql = [];
			for (const item of batch) {
				const name = escapeSql(item.name);
				const normalizedName = escapeSql(normalizeText(item.name));
				const metadata = escapeSql(
					JSON.stringify({
						code: item.code,
						symbol: item.symbol,
					}),
				);
				const itemId = generateDeterministicId(
					catalogId,
					`${item.code}-${normalizedName}`,
				);

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

			const sqlFile = join(
				__dirname,
				`temp-${catalogKey}-batch-${Date.now()}.sql`,
			);
			try {
				writeFileSync(sqlFile, sql.join("\n"));

				const command = isRemote
					? `${wranglerCmd} d1 execute DB ${configFlag} --remote --file "${sqlFile}"`
					: `${wranglerCmd} d1 execute DB ${configFlag} --local --file "${sqlFile}"`;

				execSync(command, { stdio: "pipe" });
			} finally {
				try {
					unlinkSync(sqlFile);
				} catch {
					// Ignore cleanup errors
				}
			}
		}

		console.log(
			`\n\n✅ ${catalogKey} catalog populated successfully with ${items.length.toLocaleString()} items!`,
		);
	} catch (error) {
		console.error(`\n❌ Error populating ${catalogKey} catalog:`, error);
		process.exit(1);
	}
}

populate().catch((error) => {
	console.error("Fatal error:", error);
	process.exit(1);
});
