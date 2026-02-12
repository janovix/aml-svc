/**
 * Quick script to check database state before catalog import
 */

import { execSync } from "node:child_process";

console.log("🔍 Checking database state...\n");

const queries = [
	"SELECT COUNT(*) as count FROM catalogs;",
	"SELECT COUNT(*) as count FROM catalog_items;",
	"SELECT key, COUNT(*) as item_count FROM catalogs LEFT JOIN catalog_items ON catalogs.id = catalog_items.catalog_id GROUP BY catalogs.key LIMIT 10;",
];

for (const query of queries) {
	console.log(`\n📊 Query: ${query}`);
	try {
		const result = execSync(
			`pnpm wrangler d1 execute DB --config wrangler.jsonc --remote --command "${query}"`,
			{ encoding: "utf-8", stdio: "pipe" },
		);
		console.log(result);
	} catch (error) {
		console.error("❌ Error:", error.message);
	}
}
