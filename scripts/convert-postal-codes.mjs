#!/usr/bin/env node
/**
 * Convert Mexican Postal Codes (SEPOMEX) file to CSV
 *
 * The source file from Correos de México is pipe-delimited.
 * This script converts it to a proper CSV suitable for the catalog system.
 *
 * Source: https://www.correosdemexico.gob.mx/SSLServicios/ConsultaCP/CodigoPostal_Exportar.aspx
 *
 * Usage:
 *   node convert-postal-codes.mjs <input-file> [output-file]
 *
 * Example:
 *   node convert-postal-codes.mjs CPdescarga.txt zip-codes.csv
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Escape a value for CSV (quote if contains comma, quote, or newline)
 */
function escapeCsvValue(value) {
	if (!value) return "";
	const str = String(value).trim();
	if (str.includes(",") || str.includes('"') || str.includes("\n")) {
		return `"${str.replace(/"/g, '""')}"`;
	}
	return str;
}

/**
 * Parse the SEPOMEX pipe-delimited file
 */
function parseSepomexFile(content) {
	const lines = content.split(/\r?\n/);
	const records = [];

	// Skip the first line (description) and find the header line
	let headerIndex = -1;

	for (let i = 0; i < Math.min(5, lines.length); i++) {
		if (lines[i].startsWith("d_codigo|")) {
			headerIndex = i;
			break;
		}
	}

	if (headerIndex === -1) {
		throw new Error(
			"Could not find header line starting with 'd_codigo|' in the file",
		);
	}

	// Parse header
	const headers = lines[headerIndex].split("|").map((h) => h.trim());
	console.log(`Found ${headers.length} columns: ${headers.join(", ")}`);

	// Field indices based on SEPOMEX format
	const fieldMap = {
		zipCode: headers.indexOf("d_codigo"),
		settlement: headers.indexOf("d_asenta"),
		settlementType: headers.indexOf("d_tipo_asenta"),
		municipality: headers.indexOf("D_mnpio"),
		state: headers.indexOf("d_estado"),
		city: headers.indexOf("d_ciudad"),
		stateCode: headers.indexOf("c_estado"),
		zone: headers.indexOf("d_zona"),
	};

	// Validate we have the required fields
	if (fieldMap.zipCode === -1 || fieldMap.settlement === -1) {
		throw new Error("Required fields d_codigo or d_asenta not found in header");
	}

	// Parse data rows
	for (let i = headerIndex + 1; i < lines.length; i++) {
		const line = lines[i].trim();
		if (!line) continue;

		const fields = line.split("|");

		const record = {
			zipCode: fields[fieldMap.zipCode]?.trim() || "",
			settlement: fields[fieldMap.settlement]?.trim() || "",
			settlementType: fields[fieldMap.settlementType]?.trim() || "",
			municipality: fields[fieldMap.municipality]?.trim() || "",
			state: fields[fieldMap.state]?.trim() || "",
			city: fields[fieldMap.city]?.trim() || "",
			stateCode: fields[fieldMap.stateCode]?.trim() || "",
			zone: fields[fieldMap.zone]?.trim() || "",
		};

		// Only include records with valid zip codes
		if (record.zipCode && /^\d{5}$/.test(record.zipCode)) {
			records.push(record);
		}
	}

	return records;
}

/**
 * Convert records to CSV format
 */
function toCsv(records) {
	const headers = [
		"zip_code",
		"settlement",
		"settlement_type",
		"municipality",
		"state",
		"city",
		"state_code",
		"zone",
	];

	const lines = [headers.join(",")];

	for (const record of records) {
		const row = [
			escapeCsvValue(record.zipCode),
			escapeCsvValue(record.settlement),
			escapeCsvValue(record.settlementType),
			escapeCsvValue(record.municipality),
			escapeCsvValue(record.state),
			escapeCsvValue(record.city),
			escapeCsvValue(record.stateCode),
			escapeCsvValue(record.zone),
		];
		lines.push(row.join(","));
	}

	return lines.join("\n");
}

/**
 * Main function
 */
function main() {
	const args = process.argv.slice(2);

	if (args.length === 0) {
		console.log(`
Usage: node convert-postal-codes.mjs <input-file> [output-file]

Converts the Mexican Postal Codes file (CPdescarga.txt) from SEPOMEX
to a UTF-8 CSV file for the catalog system.

Arguments:
  input-file   Path to the SEPOMEX postal codes file (CPdescarga.txt)
  output-file  Output CSV file path (default: zip-codes.csv)

Example:
  node convert-postal-codes.mjs "C:\\Downloads\\CPdescarga.txt" zip-codes.csv
`);
		process.exit(1);
	}

	const inputFile = resolve(args[0]);
	const outputFile = args[1]
		? resolve(args[1])
		: resolve(__dirname, "zip-codes.csv");

	console.log(`\u{1F4C2} Input file: ${inputFile}`);
	console.log(`\u{1F4C2} Output file: ${outputFile}`);

	// Read file as UTF-8
	console.log("\n\u{1F4D6} Reading input file...");
	const content = readFileSync(inputFile, "utf8");
	console.log(`   Read ${content.length.toLocaleString()} characters`);

	// Parse the SEPOMEX format
	console.log("\n\u{1F4CB} Parsing SEPOMEX format...");
	const records = parseSepomexFile(content);
	console.log(
		`   Found ${records.length.toLocaleString()} postal code entries`,
	);

	// Show some stats
	const uniqueZipCodes = new Set(records.map((r) => r.zipCode));
	const uniqueStates = new Set(records.map((r) => r.state));
	const uniqueMunicipalities = new Set(records.map((r) => r.municipality));

	console.log(`\n\u{1F4CA} Statistics:`);
	console.log(
		`   Unique postal codes: ${uniqueZipCodes.size.toLocaleString()}`,
	);
	console.log(`   States: ${uniqueStates.size}`);
	console.log(
		`   Municipalities: ${uniqueMunicipalities.size.toLocaleString()}`,
	);

	// Convert to CSV
	console.log("\n\u{1F4BE} Writing CSV file...");
	const csv = toCsv(records);
	writeFileSync(outputFile, csv, "utf8");

	const outputStats = readFileSync(outputFile);
	console.log(
		`   Wrote ${outputStats.length.toLocaleString()} bytes to ${basename(outputFile)}`,
	);

	// Show sample output
	console.log("\n\u{1F4DD} Sample output (first 5 data rows):");
	const csvLines = csv.split("\n");
	for (let i = 0; i < Math.min(6, csvLines.length); i++) {
		console.log(`   ${csvLines[i]}`);
	}

	console.log("\n\u{2705} Conversion complete!");
	console.log(`\nNext steps:`);
	console.log(`  1. Upload ${basename(outputFile)} to the catalogs R2 bucket`);
	console.log(`  2. Run: node scripts/populate/catalog-zip-codes.mjs`);
}

main();
