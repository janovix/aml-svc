#!/usr/bin/env node
/**
 * Generate currencies.csv with correct format
 *
 * This script downloads the current CSV and reformats it to have:
 * - key = currency code (MXN, USD, etc.)
 * - short_name = currency code
 * - name = full name
 * - country = country name
 * - decimal_places = number of decimals
 */

import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CSV_URL = "https://catalogs.janovix.com/currencies.csv";

// Keywords to filter out precious metal coins (not actual currencies)
const EXCLUDED_KEYWORDS = ["LIBERTAD", "HIDALGO", "AZTECA", "CENTENARIO"];

function shouldExcludeEntry(name) {
	const upperName = name.toUpperCase();
	return EXCLUDED_KEYWORDS.some((keyword) => upperName.includes(keyword));
}

/**
 * Get the number of decimal places for a currency based on its ISO code
 */
function getDecimalPlaces(currencyCode) {
	const zeroDecimalCurrencies = [
		"BIF",
		"CLP",
		"DJF",
		"GNF",
		"ISK",
		"JPY",
		"KMF",
		"KRW",
		"PYG",
		"RWF",
		"UGX",
		"VND",
		"VUV",
		"XAF",
		"XOF",
		"XPF",
	];

	const threeDecimalCurrencies = [
		"BHD",
		"IQD",
		"JOD",
		"KWD",
		"LYD",
		"OMR",
		"TND",
	];

	if (zeroDecimalCurrencies.includes(currencyCode)) {
		return 0;
	}

	if (threeDecimalCurrencies.includes(currencyCode)) {
		return 3;
	}

	return 2;
}

function parseCsvLine(line) {
	const values = [];
	let current = "";
	let inQuotes = false;

	for (let i = 0; i < line.length; i++) {
		const char = line[i];
		if (char === '"') {
			inQuotes = !inQuotes;
		} else if (char === "," && !inQuotes) {
			values.push(current.trim());
			current = "";
		} else {
			current += char;
		}
	}
	values.push(current.trim());

	return values;
}

function escapeCsvValue(value) {
	if (value.includes(",") || value.includes('"') || value.includes("\n")) {
		return `"${value.replace(/"/g, '""')}"`;
	}
	return value;
}

async function generateCsv() {
	console.log("📥 Downloading currencies CSV from remote...");
	const response = await fetch(CSV_URL);
	if (!response.ok) {
		throw new Error(`Failed to download CSV: ${response.statusText}`);
	}
	const csvText = await response.text();
	const lines = csvText.trim().split("\n");

	console.log("📋 Parsing and reformatting CSV...");
	const outputLines = [];

	// New header format
	outputLines.push("key,short_name,name,country,decimal_places");

	let processedCount = 0;
	let filteredCount = 0;

	// Skip first 2 lines (old headers: "key,short_name,name,country" and ",decimal_places")
	for (let i = 2; i < lines.length; i++) {
		const line = lines[i].trim();
		if (!line) continue;

		const values = parseCsvLine(line);

		if (values.length < 3) {
			console.warn(`⚠️  Skipping invalid line ${i}: ${line}`);
			continue;
		}

		const _sequentialKey = values[0]; // Old key (1, 2, 3...)
		const currencyCode = values[1]; // e.g., "MXN", "USD"
		const name = values[2]; // e.g., "Peso mexicano"
		const country = values[3] || ""; // e.g., "México"
		const decimalPlaces = values[4]
			? values[4]
			: getDecimalPlaces(currencyCode).toString();

		// Skip precious metal coins
		if (shouldExcludeEntry(name)) {
			filteredCount++;
			continue;
		}

		// New format: key = currency code (not sequential number)
		const newValues = [
			currencyCode, // key
			currencyCode, // short_name
			name,
			country,
			decimalPlaces,
		];

		outputLines.push(newValues.map(escapeCsvValue).join(","));
		processedCount++;
	}

	const outputFile = join(__dirname, "currencies.csv");
	console.log("💾 Writing new currencies.csv...");
	writeFileSync(outputFile, outputLines.join("\n") + "\n", "utf-8");

	console.log(`✅ Successfully generated ${processedCount} currencies`);
	console.log(`🚫 Filtered out ${filteredCount} precious metal coins`);
	console.log(`📄 Output file: ${outputFile}`);

	// Show some examples
	console.log("\n📊 Sample currencies:");
	const samples = [
		{ code: "MXN", decimals: 2 },
		{ code: "USD", decimals: 2 },
		{ code: "JPY", decimals: 0 },
		{ code: "KWD", decimals: 3 },
	];

	for (const sample of samples) {
		console.log(`  ${sample.code}: ${sample.decimals} decimal places`);
	}
}

try {
	await generateCsv();
} catch (error) {
	console.error("❌ Error:", error.message);
	process.exit(1);
}
