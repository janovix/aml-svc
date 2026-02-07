#!/usr/bin/env node
/**
 * Consolidate Activity-Specific Catalogs into Shared PLD Catalogs
 *
 * This script reads all activity-specific catalogs and creates consolidated
 * pld-* catalogs containing the UNION of all items from all activities.
 *
 * For example, if:
 * - ari-payment-forms has items 1,2,3,4,5
 * - veh-payment-forms has items 1,2,3,4,5
 * - inm-payment-forms has items 1,2,3,4,5
 *
 * The output pld-payment-forms will have all unique items (1,2,3,4,5)
 *
 * This ensures no activity is missing items that exist in other activities.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const INPUT_DIR = join(__dirname, "output", "activity-catalogs");
const OUTPUT_DIR = join(__dirname, "output", "pld-catalogs");

// Catalog types that should be consolidated (based on analysis)
// These are catalogs that appear in multiple activities with identical or similar content
const CONSOLIDATION_CONFIG = {
	// Fully identical across activities
	"payment-forms": {
		activities: ["ari", "inm", "mjr", "oba", "veh"],
		outputName: "pld-payment-forms",
		displayName: "PLD Payment Forms",
	},
	"property-types": {
		activities: ["jys", "ari", "spr", "bli"],
		outputName: "pld-property-types",
		displayName: "PLD Property Types",
	},
	"incorporation-reasons": {
		activities: ["fep", "spr", "fes"],
		outputName: "pld-incorporation-reasons",
		displayName: "PLD Incorporation Reasons",
	},
	"shareholder-positions": {
		activities: ["fep", "spr", "fes"],
		outputName: "pld-shareholder-positions",
		displayName: "PLD Shareholder Positions",
	},
	"merger-types": {
		activities: ["fep", "spr"],
		outputName: "pld-merger-types",
		displayName: "PLD Merger Types",
	},
	"granting-types": {
		activities: ["fep", "fes"],
		outputName: "pld-granting-types",
		displayName: "PLD Granting Types",
	},
	"patrimony-modification-types": {
		activities: ["fep", "fes"],
		outputName: "pld-patrimony-modification-types",
		displayName: "PLD Patrimony Modification Types",
	},
	"power-of-attorney-types": {
		activities: ["fep", "fes"],
		outputName: "pld-power-of-attorney-types",
		displayName: "PLD Power of Attorney Types",
	},
	"guarantee-types": {
		activities: ["mpc", "fep", "fes"],
		outputName: "pld-guarantee-types",
		displayName: "PLD Guarantee Types",
	},
	// Superset/subset relationships
	"monetary-instruments": {
		activities: ["jys", "ari"],
		outputName: "pld-monetary-instruments",
		displayName: "PLD Monetary Instruments",
	},
	"armor-levels": {
		activities: ["bli", "veh"],
		outputName: "pld-armor-levels",
		displayName: "PLD Armor Levels",
	},
	// Institution types (same codes, different formatting)
	"institution-types": {
		activities: ["din"],
		outputName: "pld-financial-institution-types",
		displayName: "PLD Financial Institution Types",
		// Also include spr-financial-institution-types
		additionalFiles: ["spr-financial-institution-types.csv"],
	},
	// NOTE: item-types are NOT consolidated because they're semantically different:
	// - mjr-item-types: Specific metals/jewelry (Oro, Plata, Diamantes)
	// - jys-item-types: Liquidation items (Inmueble, Vehículo)
	// - fep/fes-item-types: Appraisal items
	// - don-item-types: Donation items
	// Each VA has its own context-specific item types

	// Appraisal/Avalúo item types (fep and fes are identical)
	"appraisal-item-types": {
		activities: ["fep", "fes"],
		outputName: "pld-appraisal-item-types",
		displayName: "PLD Appraisal Item Types",
		// Use the fep/fes item-types files
		sourcePattern: "item-types",
	},
	// Liquidation item types (jys and don are similar - assets used as payment)
	"liquidation-item-types": {
		activities: ["jys", "don"],
		outputName: "pld-liquidation-item-types",
		displayName: "PLD Liquidation Item Types",
		sourcePattern: "item-types",
	},
};

/**
 * Parse CSV file and return array of items
 */
function parseCsv(csvPath) {
	if (!existsSync(csvPath)) {
		return [];
	}

	const csvText = readFileSync(csvPath, "utf-8");
	const lines = csvText.trim().split("\n");
	const items = [];

	for (let i = 1; i < lines.length; i++) {
		const line = lines[i].trim();
		if (!line) continue;

		const values = [];
		let current = "";
		let inQuotes = false;

		for (let j = 0; j < line.length; j++) {
			const char = line[j];
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

		if (values.length >= 2 && values[0]) {
			items.push({
				code: values[0],
				name: values[1] || "",
			});
		}
	}

	return items;
}

/**
 * Merge items from multiple sources, keeping unique codes
 * When same code exists, prefer the longer/more descriptive name
 */
function mergeItems(itemArrays) {
	const itemMap = new Map();

	for (const items of itemArrays) {
		for (const item of items) {
			const existing = itemMap.get(item.code);
			if (!existing) {
				itemMap.set(item.code, item);
			} else {
				// Prefer the longer/more descriptive name, or Title Case over ALL CAPS
				const existingIsAllCaps = existing.name === existing.name.toUpperCase();
				const newIsAllCaps = item.name === item.name.toUpperCase();

				if (existingIsAllCaps && !newIsAllCaps) {
					// Prefer Title Case over ALL CAPS
					itemMap.set(item.code, item);
				} else if (item.name.length > existing.name.length && !newIsAllCaps) {
					// Prefer longer name if not ALL CAPS
					itemMap.set(item.code, item);
				}
			}
		}
	}

	// Sort by code (numeric if possible)
	return Array.from(itemMap.values()).sort((a, b) => {
		const aNum = parseInt(a.code, 10);
		const bNum = parseInt(b.code, 10);
		if (!isNaN(aNum) && !isNaN(bNum)) {
			return aNum - bNum;
		}
		return a.code.localeCompare(b.code);
	});
}

/**
 * Write items to CSV file
 */
function writeCsv(items, outputPath) {
	const lines = ["code,name"];
	for (const item of items) {
		// Escape quotes in name
		const escapedName =
			item.name.includes(",") || item.name.includes('"')
				? `"${item.name.replace(/"/g, '""')}"`
				: `"${item.name}"`;
		lines.push(`"${item.code}",${escapedName}`);
	}
	writeFileSync(outputPath, lines.join("\n") + "\n");
}

/**
 * Main consolidation logic
 */
function consolidateCatalogs() {
	console.log("╔════════════════════════════════════════════════════════════╗");
	console.log("║      Catalog Consolidation - Creating PLD Catalogs         ║");
	console.log(
		"╚════════════════════════════════════════════════════════════╝\n",
	);

	// Ensure output directory exists
	if (!existsSync(OUTPUT_DIR)) {
		mkdirSync(OUTPUT_DIR, { recursive: true });
	}

	const manifest = {
		catalogs: [],
		consolidationMap: {}, // Maps activity-specific catalogs to pld catalogs
	};

	let totalConsolidated = 0;
	let totalSourceCatalogs = 0;

	for (const [catalogType, config] of Object.entries(CONSOLIDATION_CONFIG)) {
		console.log(`📦 Consolidating: ${catalogType}`);

		const allItems = [];
		const sourceCatalogs = [];

		// Collect items from all activity-specific catalogs
		// Use sourcePattern if specified, otherwise use catalogType
		const sourcePattern = config.sourcePattern || catalogType;

		for (const activity of config.activities) {
			const filename = `${activity}-${sourcePattern}.csv`;
			const filepath = join(INPUT_DIR, filename);

			if (existsSync(filepath)) {
				const items = parseCsv(filepath);
				if (items.length > 0) {
					allItems.push(items);
					sourceCatalogs.push(filename);
					console.log(`   ├─ ${filename}: ${items.length} items`);
				}
			}
		}

		// Include additional files if specified
		if (config.additionalFiles) {
			for (const filename of config.additionalFiles) {
				const filepath = join(INPUT_DIR, filename);
				if (existsSync(filepath)) {
					const items = parseCsv(filepath);
					if (items.length > 0) {
						allItems.push(items);
						sourceCatalogs.push(filename);
						console.log(`   ├─ ${filename}: ${items.length} items`);
					}
				}
			}
		}

		if (allItems.length === 0) {
			console.log(`   └─ ⚠️  No source catalogs found, skipping\n`);
			continue;
		}

		// Merge all items into consolidated catalog
		const mergedItems = mergeItems(allItems);

		// Write consolidated CSV
		const outputFilename = `${config.outputName}.csv`;
		const outputPath = join(OUTPUT_DIR, outputFilename);
		writeCsv(mergedItems, outputPath);

		console.log(
			`   └─ ✅ ${outputFilename}: ${mergedItems.length} items (consolidated)\n`,
		);

		// Update manifest
		manifest.catalogs.push({
			key: config.outputName,
			displayName: config.displayName,
			filename: outputFilename,
			items: mergedItems.length,
			sources: sourceCatalogs,
		});

		// Track consolidation mapping
		for (const source of sourceCatalogs) {
			manifest.consolidationMap[source.replace(".csv", "")] = config.outputName;
		}

		totalConsolidated++;
		totalSourceCatalogs += sourceCatalogs.length;
	}

	// Write manifest
	const manifestPath = join(OUTPUT_DIR, "_manifest.json");
	writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

	console.log("╔════════════════════════════════════════════════════════════╗");
	console.log("║                         Summary                            ║");
	console.log(
		"╚════════════════════════════════════════════════════════════╝\n",
	);
	console.log(`   📊 Consolidated catalogs created: ${totalConsolidated}`);
	console.log(`   📁 Source catalogs consolidated: ${totalSourceCatalogs}`);
	console.log(`   📄 Output directory: ${OUTPUT_DIR}`);
	console.log(`\n✅ Consolidation complete!`);

	return manifest;
}

// Run the consolidation
consolidateCatalogs();
