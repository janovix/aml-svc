/**
 * Import catalogs with proper FK handling
 * Strategy: Since catalogs already exist, just import the items
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log("🚀 Extracting and importing catalog items only...\n");

// Read the catalogs SQL file
const sqlFile = join(__dirname, "sql", "catalogs.sql");
const sqlContent = readFileSync(sqlFile, "utf-8");

// Extract only the INSERT statements for catalog_items (skip DELETE and catalog creation)
const lines = sqlContent.split("\n");
const itemInserts = [];
let inItemInsert = false;

for (const line of lines) {
	// Skip DELETE statements
	if (line.startsWith("DELETE FROM catalog_items")) {
		continue;
	}

	// Skip catalog creation
	if (line.startsWith("INSERT OR IGNORE INTO catalogs")) {
		continue;
	}

	// Start collecting when we hit an INSERT for catalog_items
	if (line.startsWith("INSERT OR REPLACE INTO catalog_items")) {
		inItemInsert = true;
		itemInserts.push(line);
		continue;
	}

	// Continue collecting if we're in an insert
	if (inItemInsert) {
		itemInserts.push(line);
		// End of this insert block
		if (line.trim().endsWith(");") || line.trim() === ";") {
			inItemInsert = false;
		}
	}
}

const itemsOnlySql = itemInserts.join("\n");

console.log("📊 Extracted catalog items SQL");
console.log(`   Size: ${(itemsOnlySql.length / 1024 / 1024).toFixed(2)} MB`);
console.log(`   Lines: ${itemInserts.length.toLocaleString()}`);

// Write to temp file
const tempFile = join(__dirname, "sql", "catalog-items-only.sql");
writeFileSync(tempFile, itemsOnlySql);

console.log("\n⬆️  Uploading catalog items to D1...\n");

try {
	execSync(
		`pnpm wrangler d1 execute DB --config wrangler.jsonc --remote --file "${tempFile}"`,
		{ stdio: "inherit" },
	);
	console.log("\n✅ Import completed!");

	// Verify
	console.log("\n🔍 Verifying import...");
	const result = execSync(
		`pnpm wrangler d1 execute DB --config wrangler.jsonc --remote --command "SELECT COUNT(*) as count FROM catalog_items;"`,
		{ encoding: "utf-8" },
	);
	console.log(result);
} catch (error) {
	console.error("\n❌ Import failed:", error.message);
	process.exit(1);
}
