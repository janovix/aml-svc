/**
 * Import remaining catalogs starting from a specific index
 * Usage: node import-remaining-catalogs.mjs [startIndex]
 */

import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const startIndex = parseInt(process.argv[2] || "78", 10) - 1; // Default to catalog 78 (0-indexed: 77)

console.log(`🚀 Importing catalogs starting from index ${startIndex + 1}...\n`);

// Read the catalogs SQL file
const sqlFile = join(__dirname, "sql", "catalogs.sql");
const sqlContent = readFileSync(sqlFile, "utf-8");

// Split by catalog sections
const catalogSections = [];
let currentSection = [];
let currentCatalogName = null;

const lines = sqlContent.split("\n");
for (const line of lines) {
	if (line.startsWith("-- Create catalog:")) {
		if (currentSection.length > 0 && currentCatalogName) {
			catalogSections.push({
				name: currentCatalogName,
				sql: currentSection.join("\n"),
			});
		}
		currentCatalogName = line.replace("-- Create catalog:", "").trim();
		currentSection = [line];
	} else {
		currentSection.push(line);
	}
}

if (currentSection.length > 0 && currentCatalogName) {
	catalogSections.push({
		name: currentCatalogName,
		sql: currentSection.join("\n"),
	});
}

console.log(`📦 Total catalogs: ${catalogSections.length}`);
console.log(
	`📦 Importing from: ${startIndex + 1} to ${catalogSections.length}\n`,
);

const remainingSections = catalogSections.slice(startIndex);
let successCount = 0;
let failedCatalog = null;

for (let i = 0; i < remainingSections.length; i++) {
	const section = remainingSections[i];
	const actualIndex = startIndex + i + 1;

	console.log(
		`[${actualIndex}/${catalogSections.length}] Importing ${section.name}...`,
	);

	const tempFile = join(__dirname, "temp-catalog-import.sql");
	const wrappedSql = `
PRAGMA foreign_keys = OFF;
${section.sql}
PRAGMA foreign_keys = ON;
`;
	writeFileSync(tempFile, wrappedSql);

	try {
		execSync(
			`pnpm wrangler d1 execute DB --config wrangler.jsonc --remote --file "${tempFile}"`,
			{ stdio: "pipe", encoding: "utf-8" },
		);
		console.log(`   ✅ Success\n`);
		successCount++;

		// Add a small delay to avoid rate limiting
		await new Promise((resolve) => setTimeout(resolve, 2000));
	} catch (error) {
		console.error(`   ❌ FAILED!\n`);
		console.error("Error:", error.stderr || error.message);
		failedCatalog = section.name;

		const sqlPreview = section.sql.split("\n").slice(0, 15).join("\n");
		console.error("\nSQL preview:");
		console.error(sqlPreview);

		// Ask if user wants to continue
		console.error(
			"\n⚠️  Failed to import. You may need to wait a few minutes for rate limits to reset.",
		);
		break;
	} finally {
		try {
			unlinkSync(tempFile);
		} catch (error) {
			console.error("Error deleting temp file:", error);
		}
	}
}

console.log("\n" + "=".repeat(60));
console.log(
	`✅ Successfully imported: ${successCount}/${remainingSections.length} remaining catalogs`,
);
if (failedCatalog) {
	console.log(
		`❌ Failed at: ${failedCatalog} (index ${startIndex + successCount + 1})`,
	);
	console.log(
		`\n💡 To retry, run: node import-remaining-catalogs.mjs ${startIndex + successCount + 1}`,
	);
	process.exit(1);
} else {
	console.log("🎉 All remaining catalogs imported successfully!");
}
