#!/usr/bin/env node
/**
 * Populate All Activity-Specific Catalogs
 *
 * This script populates all activity-specific catalogs (alert types, operation types, etc.)
 * extracted from the drive-download catalogos.xlsx files.
 *
 * Total: ~103 catalogs with ~947 items
 */

import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
	writeFileSync,
	unlinkSync,
	readFileSync,
	existsSync,
	readdirSync,
} from "node:fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CATALOGS_DIR = join(
	__dirname,
	"..",
	"cfdi-catalogs",
	"output",
	"activity-catalogs",
);
const BATCH_SIZE = 50; // SQL statements per batch

// Activity code to full name mapping (English for DB consistency)
const ACTIVITY_NAMES = {
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

// Catalog type to display name mapping (English keys, Spanish display for user-facing)
const CATALOG_TYPE_NAMES = {
	"alert-types": "Alert Types",
	"operation-types": "Operation Types",
	"operation-types-sale": "Sale Operation Types",
	"payment-forms": "Payment Forms",
	"monetary-instruments": "Monetary Instruments",
	"currency-denominations": "Currency Denominations",
	"property-types": "Property Types",
	"item-types": "Item Types",
	"donation-item-types": "Donation Item Types",
	"appraisal-item-types": "Appraisal Item Types",
	"settlement-item-types": "Settlement Item Types",
	"traded-object-types": "Traded Object Types",
	"transferred-value-types": "Transferred Value Types",
	"trade-units": "Trade Units",
	"armor-levels": "Armor Levels",
	"armored-item-status": "Armored Item Status",
	"armored-property-parts": "Armored Property Parts",
	"client-figures": "Client Figures",
	"person-figures": "Person Figures",
	"person-character-types": "Person Character Types",
	"business-lines": "Business Lines",
	"operation-methods": "Operation Methods",
	"service-types": "Service Types",
	"service-areas": "Service Areas",
	occupations: "Occupations",
	"management-status-types": "Management Status Types",
	"development-types": "Development Types",
	"third-party-types": "Third Party Types",
	"institution-types": "Institution Types",
	"credit-types": "Credit Types",
	"guarantee-types": "Guarantee Types",
	"power-of-attorney-types": "Power of Attorney Types",
	"patrimony-modification-types": "Patrimony Modification Types",
	"incorporation-reasons": "Incorporation Reasons",
	"shareholder-positions": "Shareholder Positions",
	"merger-types": "Merger Types",
	"movement-types": "Movement Types",
	"trust-types": "Trust Types",
	"trust-movement-types": "Trust Movement Types",
	"assignment-types": "Assignment Types",
	"granting-types": "Granting Types",
	"act-types": "Act Types",
	"legal-entity-types": "Legal Entity Types",
	"financial-institution-types": "Financial Institution Types",
	"managed-asset-types": "Managed Asset Types",
	"contribution-reasons": "Contribution Reasons",
	"card-types": "Card Types",
};

/**
 * Parse CSV file
 */
function parseCsv(csvPath) {
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

		if (values.length >= 2 && values[0] && values[1]) {
			items.push({ code: values[0], name: values[1] });
		}
	}

	return items;
}

/**
 * Generate deterministic ID
 */
function generateId(catalogId, normalizedName) {
	const combined = `${catalogId}-${normalizedName}`;
	let hash = 0;
	for (let i = 0; i < combined.length; i++) {
		const char = combined.charCodeAt(i);
		hash = (hash << 5) - hash + char;
		hash = hash & hash;
	}
	return Math.abs(hash).toString(16).padStart(32, "0");
}

/**
 * Generate catalog ID from key
 */
function generateCatalogId(catalogKey) {
	return Array.from(catalogKey)
		.reduce((acc, char) => acc + char.charCodeAt(0), 0)
		.toString(16)
		.padStart(32, "0");
}

/**
 * Normalize text
 */
function normalizeText(text) {
	return text
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.trim();
}

/**
 * Escape SQL
 */
function escapeSql(text) {
	return text.replace(/'/g, "''");
}

/**
 * Get wrangler config
 */
function getWranglerConfig() {
	const isRemote = process.env.CI === "true" || process.env.REMOTE === "true";
	let configFile = process.env.WRANGLER_CONFIG;

	if (!configFile) {
		const branch = process.env.CF_PAGES_BRANCH || process.env.WORKERS_CI_BRANCH;
		if (branch === "main") {
			configFile = "wrangler.prod.jsonc";
		} else if (branch === "dev") {
			configFile = "wrangler.jsonc";
		} else if (branch || process.env.PREVIEW === "true") {
			configFile = "wrangler.preview.jsonc";
		}
	}

	return { isRemote, configFile };
}

/**
 * Generate catalog display name
 */
function getCatalogDisplayName(filename) {
	// Extract activity code and catalog type from filename (e.g., "veh-alert-types.csv")
	const match = filename.match(/^([a-z]+)-(.+)\.csv$/);
	if (!match) return filename;

	const [, activity, catalogType] = match;
	const activityName = ACTIVITY_NAMES[activity] || activity.toUpperCase();
	const typeName =
		CATALOG_TYPE_NAMES[catalogType] || catalogType.replace(/-/g, " ");

	return `${activityName} - ${typeName}`;
}

async function populate() {
	const { isRemote, configFile } = getWranglerConfig();
	const configFlag = configFile ? `--config ${configFile}` : "";
	const wranglerCmd = "pnpm wrangler";

	console.log("╔════════════════════════════════════════════════════════════╗");
	console.log("║      Activity-Specific Catalog Population                  ║");
	console.log(
		"╚════════════════════════════════════════════════════════════╝\n",
	);

	console.log(`📦 Mode: ${isRemote ? "remote" : "local"}\n`);

	if (!existsSync(CATALOGS_DIR)) {
		console.error(
			"❌ Activity catalogs not found. Run extract-activity-catalogs.mjs first.",
		);
		process.exit(1);
	}

	// Get all CSV files
	const csvFiles = readdirSync(CATALOGS_DIR)
		.filter((f) => f.endsWith(".csv"))
		.sort();

	console.log(`📋 Found ${csvFiles.length} catalog files\n`);

	const allSql = [];
	let totalItems = 0;
	const catalogsCreated = [];

	for (const csvFile of csvFiles) {
		const csvPath = join(CATALOGS_DIR, csvFile);
		const items = parseCsv(csvPath);

		if (items.length === 0) {
			console.log(`   ⚠️  Empty: ${csvFile}`);
			continue;
		}

		// Catalog key is the filename without .csv
		const catalogKey = csvFile.replace(".csv", "");
		const catalogId = generateCatalogId(catalogKey);
		const displayName = getCatalogDisplayName(csvFile);

		console.log(`   ✅ ${csvFile} (${items.length} items)`);

		// Insert catalog
		allSql.push(`
			INSERT OR IGNORE INTO catalogs (id, key, name, active, created_at, updated_at)
			VALUES ('${catalogId}', '${catalogKey}', '${escapeSql(displayName)}', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
		`);

		// Insert items
		for (const item of items) {
			const name = escapeSql(item.name);
			const normalizedName = escapeSql(normalizeText(item.name));
			const metadata = escapeSql(JSON.stringify({ code: item.code }));
			const itemId = generateId(catalogId, `${item.code}-${normalizedName}`);

			allSql.push(`
				INSERT OR REPLACE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
				VALUES (
					'${itemId}',
					'${catalogId}',
					'${name}',
					'${normalizedName}',
					1,
					'${metadata}',
					COALESCE((SELECT created_at FROM catalog_items WHERE id = '${itemId}'), CURRENT_TIMESTAMP),
					CURRENT_TIMESTAMP
				);
			`);
		}

		totalItems += items.length;
		catalogsCreated.push({ key: catalogKey, items: items.length });
	}

	// Execute SQL in batches
	console.log(`\n📊 Executing ${allSql.length} SQL statements in batches...\n`);

	const totalBatches = Math.ceil(allSql.length / BATCH_SIZE);
	for (let i = 0; i < totalBatches; i++) {
		const start = i * BATCH_SIZE;
		const end = Math.min(start + BATCH_SIZE, allSql.length);
		const batch = allSql.slice(start, end);

		const progress = Math.round(((i + 1) / totalBatches) * 100);
		process.stdout.write(
			`\r   Processing batch ${i + 1}/${totalBatches} (${progress}%)...`,
		);

		const sqlFile = join(__dirname, `temp-activity-catalogs-${Date.now()}.sql`);
		try {
			writeFileSync(sqlFile, batch.join("\n"));

			const command = isRemote
				? `${wranglerCmd} d1 execute DB ${configFlag} --remote --file "${sqlFile}"`
				: `${wranglerCmd} d1 execute DB ${configFlag} --local --file "${sqlFile}"`;

			execSync(command, { stdio: "pipe" });
		} finally {
			try {
				unlinkSync(sqlFile);
			} catch {
				// Ignore cleanup errors
			}
		}
	}

	console.log(
		"\n\n╔════════════════════════════════════════════════════════════╗",
	);
	console.log("║                         Summary                            ║");
	console.log(
		"╚════════════════════════════════════════════════════════════╝\n",
	);
	console.log(`   ✅ Catalogs populated: ${catalogsCreated.length}`);
	console.log(`   ✅ Total items: ${totalItems.toLocaleString()}`);
	console.log("\n✅ Activity-specific catalogs populated successfully!");
}

populate().catch((error) => {
	console.error("\n❌ Fatal error:", error);
	process.exit(1);
});
