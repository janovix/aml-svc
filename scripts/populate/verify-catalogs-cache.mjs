#!/usr/bin/env node
/**
 * Verify Catalogs Cache Format
 *
 * Verifies that all 83 CSV files have the correct format:
 * - Standard catalogs: code,name
 * - Special formats: documented exceptions
 * - No deprecated files included
 */

import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const CACHE_DIR = join(__dirname, "../../../catalogs-cache");

// Expected formats
const FORMATS = {
	standard: ["code", "name"],
	countries: ["name", "iso2", "iso3"],
	states: ["code", "name", "iso"],
	currencies: ["code", "short_name", "name", "country", "decimal_places"],
	"cfdi-units": ["code", "name", "symbol"],
	"pld-alert-types": ["va_code", "code", "name"],
	"vulnerable-activities": ["code", "name", "short_name", "description"],
	"zip-codes": [
		"zip_code",
		"settlement",
		"settlement_type",
		"municipality",
		"state",
		"city",
		"state_code",
		"zone",
	],
	"cfdi-product-services": ["code", "name"],
	vehicleBrands: ["name", "origin_country", "type"],
};

// Files to skip (deprecated)
const DEPRECATED = ["cfdi-countries.csv", "cfdi-currencies.csv"];

// Vehicle brand files
const VEHICLE_FILES = [
	"terrestrial-vehicle-brands.csv",
	"maritime-vehicle-brands.csv",
	"air-vehicle-brands.csv",
];

// Large files
const _LARGE_FILES = ["zip-codes.csv", "cfdi-product-services.csv"];

// Special format files
const SPECIAL_FILES = {
	"countries.csv": "countries",
	"states.csv": "states",
	"currencies.csv": "currencies",
	"cfdi-units.csv": "cfdi-units",
	"pld-alert-types.csv": "pld-alert-types",
	"vulnerable-activities.csv": "vulnerable-activities",
	"zip-codes.csv": "zip-codes",
	"cfdi-product-services.csv": "cfdi-product-services",
};

function getFirstLine(filePath) {
	const content = readFileSync(filePath, "utf-8");
	return content.split("\n")[0].trim();
}

function verifyFormat(filename, header) {
	const columns = header.split(",").map((c) => c.trim());

	// Check if deprecated
	if (DEPRECATED.includes(filename)) {
		return { status: "deprecated", expected: null, actual: columns };
	}

	// Check special formats
	if (SPECIAL_FILES[filename]) {
		const formatKey = SPECIAL_FILES[filename];
		const expected = FORMATS[formatKey];
		const match = JSON.stringify(columns) === JSON.stringify(expected);
		return { status: match ? "ok" : "mismatch", expected, actual: columns };
	}

	// Check vehicle brands
	if (VEHICLE_FILES.includes(filename)) {
		const expected = FORMATS.vehicleBrands;
		const match = JSON.stringify(columns) === JSON.stringify(expected);
		return { status: match ? "ok" : "mismatch", expected, actual: columns };
	}

	// Standard format (code,name)
	const expected = FORMATS.standard;
	const match = JSON.stringify(columns) === JSON.stringify(expected);
	return { status: match ? "ok" : "mismatch", expected, actual: columns };
}

async function verifyAll() {
	console.log("╔════════════════════════════════════════════════════════════╗");
	console.log("║         Catalog Cache Format Verification                 ║");
	console.log(
		"╚════════════════════════════════════════════════════════════╝\n",
	);

	const files = readdirSync(CACHE_DIR).filter((f) => f.endsWith(".csv"));
	console.log(`📂 Found ${files.length} CSV files\n`);

	let ok = 0;
	let mismatch = 0;
	let deprecated = 0;
	const errors = [];

	for (const file of files.sort()) {
		const filePath = join(CACHE_DIR, file);
		try {
			const header = getFirstLine(filePath);
			const result = verifyFormat(file, header);

			if (result.status === "ok") {
				console.log(`✅ ${file}`);
				ok++;
			} else if (result.status === "deprecated") {
				console.log(`🗑️  ${file} (deprecated - should not upload)`);
				deprecated++;
			} else {
				console.log(`❌ ${file}`);
				console.log(`   Expected: ${result.expected.join(",")}`);
				console.log(`   Actual:   ${result.actual.join(",")}`);
				mismatch++;
				errors.push({ file, expected: result.expected, actual: result.actual });
			}
		} catch (error) {
			console.log(`❌ ${file}: ${error.message}`);
			mismatch++;
			errors.push({ file, error: error.message });
		}
	}

	console.log(
		"\n╔════════════════════════════════════════════════════════════╗",
	);
	console.log("║                    Summary                                 ║");
	console.log(
		"╚════════════════════════════════════════════════════════════╝\n",
	);
	console.log(`✅ Correct format: ${ok}`);
	console.log(`❌ Format mismatch: ${mismatch}`);
	console.log(`🗑️  Deprecated (skip): ${deprecated}`);
	console.log(`📊 Total files: ${files.length}`);
	console.log(
		`📤 Ready to upload: ${ok} (${files.length - deprecated} expected)\n`,
	);

	if (errors.length > 0) {
		console.log("⚠️  Files with issues:\n");
		for (const error of errors) {
			console.log(`   - ${error.file}`);
			if (error.expected) {
				console.log(`     Expected: ${error.expected.join(",")}`);
				console.log(`     Actual:   ${error.actual.join(",")}`);
			} else {
				console.log(`     Error: ${error.error}`);
			}
		}
		console.log("");
		process.exit(1);
	}

	console.log("✅ All files verified successfully!");
	console.log(
		`\n📝 Note: Exclude ${deprecated} deprecated file(s) when uploading to R2.`,
	);
}

verifyAll().catch(console.error);
