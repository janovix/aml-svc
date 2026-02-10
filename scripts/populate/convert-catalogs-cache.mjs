#!/usr/bin/env node
/**
 * Convert Catalogs Cache to Standardized Format
 *
 * Converts 7 catalog CSV files to standardized column naming:
 * - 5 files: key,value → code,name
 * - 1 file: Spanish headers → English headers
 * - 1 file: key → code (first column only)
 */

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const CACHE_DIR = join(__dirname, "../../../catalogs-cache");

// Files that need key,value → code,name conversion
const KEY_VALUE_FILES = [
	"armor-levels.csv",
	"business-activities.csv",
	"economic-activities.csv",
	"payment-forms.csv",
	"payment-methods.csv",
];

/**
 * Convert key,value → code,name
 */
function convertKeyValueToCodeName(filePath) {
	const content = readFileSync(filePath, "utf-8");
	const lines = content.split("\n");

	// Replace header
	if (lines[0].trim() === "key,value") {
		lines[0] = "code,name";
		writeFileSync(filePath, lines.join("\n"));
		return true;
	}

	return false;
}

/**
 * Convert Spanish headers to English for vulnerable-activities
 */
function convertVulnerableActivities(filePath) {
	const content = readFileSync(filePath, "utf-8");
	const lines = content.split("\n");

	// Check for Spanish header
	if (lines[0].includes("Clave,Nombre")) {
		lines[0] = "code,name,short_name,description";
		writeFileSync(filePath, lines.join("\n"));
		return true;
	}

	return false;
}

/**
 * Convert currencies: key → code (first column only)
 */
function convertCurrencies(filePath) {
	const content = readFileSync(filePath, "utf-8");
	const lines = content.split("\n");

	// Replace first column name only
	if (lines[0].startsWith("key,")) {
		lines[0] = lines[0].replace("key,", "code,");
		writeFileSync(filePath, lines.join("\n"));
		return true;
	}

	return false;
}

async function convertAll() {
	console.log("╔════════════════════════════════════════════════════════════╗");
	console.log("║         Catalog Cache Format Conversion                   ║");
	console.log(
		"╚════════════════════════════════════════════════════════════╝\n",
	);

	let converted = 0;
	let skipped = 0;

	// Convert key,value files
	console.log("📝 Converting key,value → code,name (5 files)...\n");
	for (const file of KEY_VALUE_FILES) {
		const filePath = join(CACHE_DIR, file);
		try {
			if (convertKeyValueToCodeName(filePath)) {
				console.log(`✅ ${file}`);
				converted++;
			} else {
				console.log(`⏭️  ${file} (already correct)`);
				skipped++;
			}
		} catch (error) {
			console.error(`❌ ${file}: ${error.message}`);
		}
	}

	// Convert vulnerable-activities
	console.log(
		"\n📝 Converting vulnerable-activities.csv (Spanish → English)...\n",
	);
	const vaPath = join(CACHE_DIR, "vulnerable-activities.csv");
	try {
		if (convertVulnerableActivities(vaPath)) {
			console.log("✅ vulnerable-activities.csv");
			converted++;
		} else {
			console.log("⏭️  vulnerable-activities.csv (already correct)");
			skipped++;
		}
	} catch (error) {
		console.error(`❌ vulnerable-activities.csv: ${error.message}`);
	}

	// Convert currencies
	console.log("\n📝 Converting currencies.csv (key → code)...\n");
	const currPath = join(CACHE_DIR, "currencies.csv");
	try {
		if (convertCurrencies(currPath)) {
			console.log("✅ currencies.csv");
			converted++;
		} else {
			console.log("⏭️  currencies.csv (already correct)");
			skipped++;
		}
	} catch (error) {
		console.error(`❌ currencies.csv: ${error.message}`);
	}

	console.log(
		"\n╔════════════════════════════════════════════════════════════╗",
	);
	console.log("║                    Summary                                 ║");
	console.log(
		"╚════════════════════════════════════════════════════════════╝\n",
	);
	console.log(`✅ Converted: ${converted}`);
	console.log(`⏭️  Skipped: ${skipped}`);
	console.log(`\n✅ All conversions complete!`);
}

convertAll().catch(console.error);
