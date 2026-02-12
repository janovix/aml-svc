/**
 * Import catalogs one at a time to identify which one fails
 * This helps debug FK constraint issues
 */

import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log("🚀 Importing catalogs incrementally...\n");

// Read the catalogs SQL file
const sqlFile = join(__dirname, "sql", "catalogs.sql");
const sqlContent = readFileSync(sqlFile, "utf-8");

// Split by catalog sections (each starts with "-- Create catalog:")
const catalogSections = [];
let currentSection = [];
let currentCatalogName = null;

const lines = sqlContent.split("\n");
for (const line of lines) {
	if (line.startsWith("-- Create catalog:")) {
		// Save previous section
		if (currentSection.length > 0 && currentCatalogName) {
			catalogSections.push({
				name: currentCatalogName,
				sql: currentSection.join("\n"),
			});
		}
		// Start new section
		currentCatalogName = line.replace("-- Create catalog:", "").trim();
		currentSection = [line];
	} else {
		currentSection.push(line);
	}
}

// Save last section
if (currentSection.length > 0 && currentCatalogName) {
	catalogSections.push({
		name: currentCatalogName,
		sql: currentSection.join("\n"),
	});
}

console.log(`📦 Found ${catalogSections.length} catalog sections\n`);

let successCount = 0;
let failedCatalog = null;

for (let i = 0; i < catalogSections.length; i++) {
	const section = catalogSections[i];
	console.log(
		`[${i + 1}/${catalogSections.length}] Importing ${section.name}...`,
	);

	// Write section to temp file
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
	} catch (error) {
		console.error(`   ❌ FAILED!\n`);
		console.error("Error output:", error.stderr || error.message);
		failedCatalog = section.name;

		// Show some of the SQL that failed
		const sqlPreview = section.sql.split("\n").slice(0, 20).join("\n");
		console.error("\nSQL preview (first 20 lines):");
		console.error(sqlPreview);

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
	`✅ Successfully imported: ${successCount}/${catalogSections.length} catalogs`,
);
if (failedCatalog) {
	console.log(`❌ Failed at: ${failedCatalog}`);
	process.exit(1);
} else {
	console.log("🎉 All catalogs imported successfully!");
}
