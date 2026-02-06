#!/usr/bin/env node
/**
 * Extract Activity-Specific Catalogs from drive-download XLSX files
 *
 * This script reads all catalogos.xlsx files from the drive-download folder
 * and generates CSV files for each activity-specific catalog.
 *
 * Usage:
 *   node scripts/cfdi-catalogs/extract-activity-catalogs.mjs
 */

import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
	writeFileSync,
	readdirSync,
	statSync,
	existsSync,
	mkdirSync,
} from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const XLSX = require("xlsx");

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const OUTPUT_DIR = join(__dirname, "output", "activity-catalogs");

// Mapping of folder names to activity codes
const FOLDER_TO_ACTIVITY = {
	ActivosVirtuales: "avi",
	ApuestasConcursosSorteos: "jys",
	ArrendamientoInmuebles: "ari",
	Blindaje: "bli",
	ChequesViajero: "chv",
	CustodiaValores: "tcv",
	DesarrolloInmobiliario: "din",
	Donativos: "don",
	Inmuebles: "inm",
	MetalesJoyas: "mjr",
	MonederosDevolucionRecompensas: "tdr",
	MutuoPrestamosCreditos: "mpc",
	NotariosCorredoresPublicos: "fep",
	ObrasArte: "oba",
	ServiciosProfesionales: "spr",
	ServidoresPublicos: "fes",
	TarjetasPrepagoValesCupones: "tpp",
	TarjetasServicioCredito: "tsc",
	Vehiculos: "veh",
};

// Mapping of sheet name patterns to catalog keys (ALL ENGLISH)
// NOTE: Patterns should be accent-free (normalized) since we normalize sheet names before matching
const SHEET_TO_CATALOG = {
	// Alert types
	"tipo de alerta": "alert-types",
	"tipo de alertas": "alert-types",
	"indicadores de alertas": "alert-types",
	// Operation types
	"tipo de operacion": "operation-types",
	"tipo de operacion de compravent": "operation-types-sale",
	"tipo de operacion compraventa m": "operation-types-sale",
	// Payment & monetary
	"forma de pago": "payment-forms",
	"instrumento monetario": "monetary-instruments",
	"tipo de moneda o divisa de deno": "currency-denominations",
	// Property & items
	"tipo de inmueble": "property-types",
	"tipo de bien": "item-types",
	"tipo de bien materia del donati": "donation-item-types",
	"tipo de bien objeto avaluo": "appraisal-item-types",
	"tipo de bien de la liquidacion": "settlement-item-types",
	"tipo de objeto comercializado": "traded-object-types",
	"tipo de valor trasladado yo cus": "transferred-value-types",
	"unidad de comercializacion": "trade-units",
	// Client & person figures
	"figura del cliente reportado": "client-figures",
	"figura del cliente": "client-figures",
	"figura de la persona que realiz": "person-figures",
	"caracter de la persona que inte": "person-character-types",
	// Business & service
	"linea de negocio": "business-lines",
	"medio empleado para realizar la": "operation-methods",
	"tipo de servicio": "service-types",
	"areas de servicio": "service-areas",
	ocupacion: "occupations",
	"estatus del manejo": "management-status-types",
	// Real estate development
	"tipos de desarrollos inmobiliar": "development-types",
	"tipos de terceros": "third-party-types",
	"tipos de institucion": "institution-types",
	"tipos de creditos": "credit-types",
	// Armor/blindaje
	"nivel de blindaje": "armor-levels",
	"estado del bien que se blinda": "armored-item-status",
	"parte del inmueble objeto del s": "armored-property-parts",
	// Legal & notary
	"tipo de garantia": "guarantee-types",
	"tipo de poder": "power-of-attorney-types",
	"tipo de modificacion patrimonia": "patrimony-modification-types",
	"motivo de la constitucion de la": "incorporation-reasons",
	"cargo del accionista dentro de": "shareholder-positions",
	"tipo de fusion": "merger-types",
	"tipo de movimiento": "movement-types",
	"tipo de fideicomiso": "trust-types",
	"tipo de mov fideicomitente": "trust-movement-types",
	"tipo de cesion": "assignment-types",
	"tipo de otorgamiento": "granting-types",
	"tipo de acto realizado": "act-types",
	"tipo de persona moral": "legal-entity-types",
	// Financial
	"tipo de institucion financiera": "financial-institution-types",
	"tipo de activo administrado": "managed-asset-types",
	"motivo de la aportacion": "contribution-reasons",
	// Cards
	"tipo de tarjeta": "card-types",
};

// Sheets to skip (not catalogs)
const SKIP_SHEETS = ["hoja 13", "hoja 16"];

/**
 * Normalize sheet name to catalog key
 */
function sheetToCatalogKey(sheetName) {
	const normalized = sheetName
		.toLowerCase()
		.trim()
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "");

	// Check if should skip
	if (SKIP_SHEETS.some((s) => normalized.includes(s))) {
		return null;
	}

	// Remove activity suffix like "- VEH", "- AVI"
	const cleanName = normalized.replace(/\s*-\s*[a-z]{3}$/i, "").trim();

	// Find matching catalog key
	for (const [pattern, key] of Object.entries(SHEET_TO_CATALOG)) {
		if (cleanName.includes(pattern) || cleanName.startsWith(pattern)) {
			return key;
		}
	}

	// If no match, create a key from the sheet name
	return cleanName
		.replace(/[^a-z0-9\s]/g, "")
		.trim()
		.replace(/\s+/g, "-");
}

/**
 * Parse sheet data to extract catalog items
 */
function parseSheet(sheet) {
	const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
	if (data.length < 2) return [];

	// Find header row (first row with content)
	let headerRow = 0;
	for (let i = 0; i < Math.min(5, data.length); i++) {
		if (data[i] && data[i].length >= 2 && data[i][0] && data[i][1]) {
			headerRow = i;
			break;
		}
	}

	const items = [];
	for (let i = headerRow + 1; i < data.length; i++) {
		const row = data[i];
		if (!row || row.length < 2) continue;

		const code = String(row[0] || "").trim();
		const name = String(row[1] || "").trim();

		// Skip empty rows or header-like rows
		if (
			!code ||
			!name ||
			code.toLowerCase() === "clave" ||
			code.toLowerCase() === "key" ||
			code.toLowerCase() === "código"
		) {
			continue;
		}

		items.push({ code, name });
	}

	return items;
}

/**
 * Generate CSV content
 */
function generateCsv(items) {
	const lines = ["code,name"];
	for (const item of items) {
		const code = item.code.replace(/"/g, '""');
		const name = item.name.replace(/"/g, '""');
		lines.push(`"${code}","${name}"`);
	}
	return lines.join("\n");
}

/**
 * Main extraction function
 */
async function main() {
	console.log("╔════════════════════════════════════════════════════════════╗");
	console.log("║      Activity-Specific Catalog Extractor                   ║");
	console.log(
		"╚════════════════════════════════════════════════════════════╝\n",
	);

	const baseDir = join(
		__dirname,
		"..",
		"..",
		"..",
		"drive-download-20260204T170203Z-3-001",
	);

	if (!existsSync(baseDir)) {
		console.error("❌ drive-download folder not found at:", baseDir);
		process.exit(1);
	}

	// Create output directory
	if (!existsSync(OUTPUT_DIR)) {
		mkdirSync(OUTPUT_DIR, { recursive: true });
	}

	const folders = readdirSync(baseDir).filter((f) =>
		statSync(join(baseDir, f)).isDirectory(),
	);

	const results = {
		catalogs: [],
		errors: [],
	};

	console.log(`📁 Found ${folders.length} activity folders\n`);

	for (const folder of folders) {
		const activityCode = FOLDER_TO_ACTIVITY[folder];
		if (!activityCode) {
			console.log(`   ⚠️  Unknown folder: ${folder}`);
			continue;
		}

		const catalogPath = join(baseDir, folder, "catalogos.xlsx");
		if (!existsSync(catalogPath)) {
			console.log(`   ⚠️  No catalogos.xlsx in: ${folder}`);
			continue;
		}

		console.log(`📂 Processing: ${folder} (${activityCode.toUpperCase()})`);

		try {
			const workbook = XLSX.readFile(catalogPath);

			for (const sheetName of workbook.SheetNames) {
				const catalogKey = sheetToCatalogKey(sheetName);
				if (!catalogKey) {
					console.log(`      ⏭️  Skipping: ${sheetName}`);
					continue;
				}

				const sheet = workbook.Sheets[sheetName];
				const items = parseSheet(sheet);

				if (items.length === 0) {
					console.log(`      ⚠️  Empty sheet: ${sheetName}`);
					continue;
				}

				// Generate filename: {activity}-{catalog}.csv
				const filename = `${activityCode}-${catalogKey}.csv`;
				const outputPath = join(OUTPUT_DIR, filename);

				const csv = generateCsv(items);
				writeFileSync(outputPath, csv, "utf-8");

				console.log(`      ✅ ${filename} (${items.length} items)`);
				results.catalogs.push({
					activity: activityCode,
					catalog: catalogKey,
					filename,
					items: items.length,
					sheet: sheetName,
				});
			}
		} catch (error) {
			console.log(`      ❌ Error: ${error.message}`);
			results.errors.push({ folder, error: error.message });
		}

		console.log("");
	}

	// Generate summary
	console.log("╔════════════════════════════════════════════════════════════╗");
	console.log("║                         Summary                            ║");
	console.log(
		"╚════════════════════════════════════════════════════════════╝\n",
	);

	const totalItems = results.catalogs.reduce((sum, c) => sum + c.items, 0);
	console.log(`   📊 Total catalogs extracted: ${results.catalogs.length}`);
	console.log(`   📝 Total items: ${totalItems.toLocaleString()}`);
	if (results.errors.length > 0) {
		console.log(`   ❌ Errors: ${results.errors.length}`);
	}

	// Group by catalog type
	const byCatalog = {};
	for (const c of results.catalogs) {
		if (!byCatalog[c.catalog]) {
			byCatalog[c.catalog] = [];
		}
		byCatalog[c.catalog].push(c.activity);
	}

	console.log("\n   Catalog types extracted:");
	for (const [catalog, activities] of Object.entries(byCatalog).sort()) {
		console.log(`      - ${catalog}: ${activities.join(", ")}`);
	}

	// Save manifest
	const manifestPath = join(OUTPUT_DIR, "_manifest.json");
	writeFileSync(manifestPath, JSON.stringify(results, null, 2), "utf-8");
	console.log(`\n📄 Manifest saved to: ${manifestPath}`);

	console.log("\n✅ Done! CSV files are in:", OUTPUT_DIR);
}

main().catch((error) => {
	console.error("\n❌ Fatal error:", error.message);
	process.exit(1);
});
