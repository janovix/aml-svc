#!/usr/bin/env node
/**
 * Populate CFDI Currencies Catalog (c_Moneda)
 *
 * SAT codes for currencies (ISO 4217).
 * Example: MXN=Peso Mexicano, USD=Dólar americano
 */

import {
	parseCsv,
	getCsvContent,
	getWranglerConfig,
	generateCatalogId,
	generateDeterministicId,
	normalizeText,
	escapeSql,
	executeSql,
} from "./lib/cfdi-catalog-base.mjs";

async function populate() {
	const { isRemote } = getWranglerConfig();
	const catalogKey = "cfdi-currencies";
	const catalogName = "CFDI Currencies";
	const csvFile = "cfdi-currencies.csv";
	const remoteUrl = "https://catalogs.janovix.com/cfdi-currencies.csv";

	try {
		console.log(
			`📦 Populating ${catalogKey} catalog (${isRemote ? "remote" : "local"})...`,
		);

		// Get and parse CSV (3 columns: code, name, decimals)
		const csvText = await getCsvContent(csvFile, remoteUrl);
		const rows = parseCsv(csvText, 3);

		const items = rows
			.map((values) => ({
				code: values[0],
				name: values[1],
				decimals: values[2] || "2",
			}))
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
			const metadata = escapeSql(
				JSON.stringify({
					code: item.code,
					decimals: item.decimals,
				}),
			);
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
}

populate().catch((error) => {
	console.error("Fatal error:", error);
	process.exit(1);
});
