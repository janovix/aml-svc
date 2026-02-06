#!/usr/bin/env node
/**
 * Consolidate All Alert Types into a Single Catalog
 *
 * Creates a single pld-alert-types catalog with columns:
 * - va_code: 3-letter VA code (e.g., VEH, ARI, BLI)
 * - code: Alert code (e.g., 100, 101, 102)
 * - name: Alert description
 *
 * This allows querying alerts by VA while maintaining a single source of truth.
 */

import {
	readFileSync,
	writeFileSync,
	readdirSync,
	existsSync,
	mkdirSync,
} from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const INPUT_DIR = join(__dirname, "output", "activity-catalogs");
const OUTPUT_DIR = join(__dirname, "output", "pld-catalogs");

// VA code to full name mapping
const _VA_NAMES = {
	avi: "Virtual Assets",
	jys: "Games and Lotteries",
	ari: "Real Estate Leasing",
	bli: "Armoring",
	chv: "Traveler's Checks",
	tcv: "Securities Custody and Transfer",
	din: "Real Estate Development",
	don: "Donations",
	inm: "Real Estate Sales",
	mjr: "Metals and Jewelry",
	tdr: "Reward Cards",
	mpc: "Loans and Credits",
	fep: "Notaries Public",
	oba: "Art Works",
	spr: "Professional Services",
	fes: "Public Servants",
	tpp: "Prepaid Cards",
	tsc: "Credit and Service Cards",
	veh: "Vehicles",
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
 * Main consolidation logic
 */
function consolidateAlertTypes() {
	console.log("╔════════════════════════════════════════════════════════════╗");
	console.log("║      Alert Types Consolidation - Single Catalog            ║");
	console.log(
		"╚════════════════════════════════════════════════════════════╝\n",
	);

	// Ensure output directory exists
	if (!existsSync(OUTPUT_DIR)) {
		mkdirSync(OUTPUT_DIR, { recursive: true });
	}

	// Find all alert-types files
	const alertFiles = readdirSync(INPUT_DIR)
		.filter((f) => f.endsWith("-alert-types.csv"))
		.sort();

	console.log(`📋 Found ${alertFiles.length} alert-types catalogs\n`);

	const allAlerts = [];
	const vaStats = {};

	for (const filename of alertFiles) {
		// Extract VA code from filename (e.g., "veh-alert-types.csv" -> "veh")
		const vaCode = filename.replace("-alert-types.csv", "").toUpperCase();
		const filepath = join(INPUT_DIR, filename);
		const items = parseCsv(filepath);

		if (items.length === 0) {
			console.log(`   ⚠️  Empty: ${filename}`);
			continue;
		}

		console.log(`   ✅ ${vaCode}: ${items.length} alerts`);
		vaStats[vaCode] = items.length;

		// Add VA code to each alert
		for (const item of items) {
			allAlerts.push({
				va_code: vaCode,
				code: item.code,
				name: item.name,
			});
		}
	}

	// Sort by VA code, then by alert code
	allAlerts.sort((a, b) => {
		const vaCompare = a.va_code.localeCompare(b.va_code);
		if (vaCompare !== 0) return vaCompare;

		const aNum = parseInt(a.code, 10);
		const bNum = parseInt(b.code, 10);
		if (!isNaN(aNum) && !isNaN(bNum)) {
			return aNum - bNum;
		}
		return a.code.localeCompare(b.code);
	});

	// Write consolidated CSV
	const outputFilename = "pld-alert-types.csv";
	const outputPath = join(OUTPUT_DIR, outputFilename);

	const lines = ["va_code,code,name"];
	for (const alert of allAlerts) {
		const escapedName =
			alert.name.includes(",") || alert.name.includes('"')
				? `"${alert.name.replace(/"/g, '""')}"`
				: `"${alert.name}"`;
		lines.push(`"${alert.va_code}","${alert.code}",${escapedName}`);
	}
	writeFileSync(outputPath, lines.join("\n") + "\n");

	// Analyze common alerts (alerts that appear in multiple VAs)
	const alertsByCode = new Map();
	for (const alert of allAlerts) {
		const key = alert.code;
		if (!alertsByCode.has(key)) {
			alertsByCode.set(key, []);
		}
		alertsByCode.get(key).push(alert);
	}

	const commonAlerts = [];
	for (const [code, alerts] of alertsByCode) {
		if (alerts.length > 1) {
			commonAlerts.push({
				code,
				count: alerts.length,
				vas: alerts.map((a) => a.va_code),
			});
		}
	}
	commonAlerts.sort((a, b) => b.count - a.count);

	// Update manifest
	const manifestPath = join(OUTPUT_DIR, "_manifest.json");
	let manifest = { catalogs: [], consolidationMap: {} };
	if (existsSync(manifestPath)) {
		manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
	}

	// Remove any existing pld-alert-types entry
	manifest.catalogs = manifest.catalogs.filter(
		(c) => c.key !== "pld-alert-types",
	);

	// Add new entry
	manifest.catalogs.push({
		key: "pld-alert-types",
		displayName: "PLD Alert Types",
		filename: outputFilename,
		items: allAlerts.length,
		format: "va_code,code,name",
		sources: alertFiles,
		vaStats: vaStats,
	});

	// Update consolidation map
	for (const filename of alertFiles) {
		const key = filename.replace(".csv", "");
		manifest.consolidationMap[key] = "pld-alert-types";
	}

	writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

	console.log(
		"\n╔════════════════════════════════════════════════════════════╗",
	);
	console.log("║                         Summary                            ║");
	console.log(
		"╚════════════════════════════════════════════════════════════╝\n",
	);
	console.log(`   📊 Total alerts: ${allAlerts.length}`);
	console.log(`   📁 VAs covered: ${Object.keys(vaStats).length}`);
	console.log(`   📄 Output: ${outputPath}`);

	if (commonAlerts.length > 0) {
		console.log(`\n   🔄 Common alert codes (appear in multiple VAs):`);
		for (const alert of commonAlerts.slice(0, 5)) {
			console.log(`      - Code ${alert.code}: ${alert.count} VAs`);
		}
		if (commonAlerts.length > 5) {
			console.log(`      ... and ${commonAlerts.length - 5} more`);
		}
	}

	console.log(`\n✅ Alert types consolidated into single catalog!`);
	console.log(
		`   Query by VA: SELECT * FROM pld_alert_types WHERE va_code = 'VEH'`,
	);
}

// Run the consolidation
consolidateAlertTypes();
