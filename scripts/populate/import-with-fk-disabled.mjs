/**
 * Import catalogs with foreign keys temporarily disabled
 * This helps avoid FK constraint issues during bulk imports
 */

import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log("🚀 Importing catalogs with FK checks disabled...\n");

// Read the catalogs SQL file
const sqlFile = join(__dirname, "sql", "catalogs.sql");
const sqlContent = readFileSync(sqlFile, "utf-8");

// Wrap with FK pragma
const wrappedSql = `
-- Temporarily disable foreign key checks for bulk import
PRAGMA foreign_keys = OFF;

${sqlContent}

-- Re-enable foreign key checks
PRAGMA foreign_keys = ON;
`;

// Write wrapped SQL to temp file
const tempFile = join(__dirname, "sql", "catalogs-wrapped.sql");
import { writeFileSync } from "node:fs";
writeFileSync(tempFile, wrappedSql);

console.log("📝 Created wrapped SQL file with FK checks disabled");
console.log(
	"📦 File size:",
	(wrappedSql.length / 1024 / 1024).toFixed(2),
	"MB\n",
);

try {
	console.log("⬆️  Uploading to D1 (this may take a few minutes)...\n");
	execSync(
		`pnpm wrangler d1 execute DB --config wrangler.jsonc --remote --file "${tempFile}"`,
		{ stdio: "inherit" },
	);
	console.log("\n✅ Import completed successfully!");
} catch (error) {
	console.error("\n❌ Import failed:", error.message);
	process.exit(1);
}
