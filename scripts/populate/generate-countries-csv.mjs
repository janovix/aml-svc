#!/usr/bin/env node
/**
 * Generate consolidated countries.csv with name, iso2, and iso3 columns
 *
 * Merges:
 * - Current countries.csv (iso2 codes) from catalogs.janovix.com
 * - cfdi-countries.csv (iso3 codes) from local
 */

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Fetch current countries.csv
async function fetchCurrentCountries() {
	const response = await fetch("https://catalogs.janovix.com/countries.csv");
	const text = await response.text();
	const lines = text.trim().split("\n");

	const countries = [];
	for (let i = 1; i < lines.length; i++) {
		// Skip header
		const [iso2, name] = lines[i].split(",");
		if (iso2 && name) {
			countries.push({
				iso2: iso2.trim(),
				name: name.trim().toUpperCase(),
			});
		}
	}
	return countries;
}

// Read local cfdi-countries.csv
function readCfdiCountries() {
	const cfdiPath = join(
		__dirname,
		"../cfdi-catalogs/output/cfdi-countries.csv",
	);
	const text = readFileSync(cfdiPath, "utf-8");
	const lines = text.trim().split("\n");

	const countries = [];
	for (let i = 1; i < lines.length; i++) {
		// Skip header
		const match = lines[i].match(/"([^"]+)","([^"]+)"/);
		if (match) {
			const [, iso3, name] = match;
			countries.push({
				iso3: iso3.trim(),
				name: name
					.trim()
					.toUpperCase()
					.normalize("NFD")
					.replace(/[\u0300-\u036f]/g, ""),
			});
		}
	}
	return countries;
}

// Manual mapping for countries where names don't match exactly
const MANUAL_MAPPINGS = {
	AN: "ANT", // Antillas Neerlandesas -> obsolete but in list
	BN: "BRN", // Brunei
	CD: "COD", // Congo (Democratic Republic)
	CG: "COG", // Congo (Republic)
	CI: "CIV", // Ivory Coast
	KP: "PRK", // North Korea
	KR: "KOR", // South Korea
	LA: "LAO", // Laos
	MD: "MDA", // Moldova
	PS: "PSE", // Palestine
	RU: "RUS", // Russia
	SY: "SYR", // Syria
	TZ: "TZA", // Tanzania
	VE: "VEN", // Venezuela
	VN: "VNM", // Vietnam
};

async function generateConsolidatedCsv() {
	console.log("📦 Fetching current countries.csv from catalogs.janovix.com...");
	const currentCountries = await fetchCurrentCountries();
	console.log(
		`✅ Loaded ${currentCountries.length} countries with iso2 codes\n`,
	);

	console.log("📦 Reading cfdi-countries.csv (iso3 codes)...");
	const cfdiCountries = readCfdiCountries();
	console.log(`✅ Loaded ${cfdiCountries.length} countries with iso3 codes\n`);

	// Create map of normalized names to iso3
	const nameToIso3 = new Map();
	for (const country of cfdiCountries) {
		nameToIso3.set(country.name, country.iso3);
	}

	// Merge
	console.log("🔄 Merging countries...");
	const merged = [];
	let matched = 0;
	let unmatched = 0;

	for (const country of currentCountries) {
		const iso3 = MANUAL_MAPPINGS[country.iso2] || nameToIso3.get(country.name);

		if (iso3) {
			merged.push({
				name: country.name,
				iso2: country.iso2,
				iso3: iso3,
			});
			matched++;
		} else {
			console.warn(`⚠️  No iso3 found for: ${country.iso2} - ${country.name}`);
			// Still add with empty iso3
			merged.push({
				name: country.name,
				iso2: country.iso2,
				iso3: "",
			});
			unmatched++;
		}
	}

	console.log(`\n✅ Matched: ${matched}`);
	console.log(`⚠️  Unmatched: ${unmatched}`);

	// Generate CSV
	const csv = ["name,iso2,iso3"];
	for (const country of merged) {
		csv.push(`${country.name},${country.iso2},${country.iso3}`);
	}

	const outputPath = join(__dirname, "countries.csv");
	writeFileSync(outputPath, csv.join("\n"));

	console.log(`\n📄 Generated: ${outputPath}`);
	console.log(`📊 Total countries: ${merged.length}`);
	console.log("\n✅ Done! Upload this file to catalogs.janovix.com");
}

generateConsolidatedCsv().catch(console.error);
