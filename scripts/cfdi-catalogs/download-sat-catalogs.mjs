#!/usr/bin/env node
/**
 * Download and Parse SAT CFDI 4.0 Catalogs
 *
 * This script downloads the official SAT CFDI catalog Excel file,
 * parses all relevant sheets, and generates CSV files for each catalog.
 *
 * Source: http://omawww.sat.gob.mx/tramitesyservicios/Paginas/documentos/catCFDI_V_4_*.xls
 *
 * Usage:
 *   node scripts/cfdi-catalogs/download-sat-catalogs.mjs
 *   node scripts/cfdi-catalogs/download-sat-catalogs.mjs --local catCFDI.xls
 */

import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { writeFileSync, readFileSync, existsSync } from "node:fs";
import * as XLSX from "xlsx";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const OUTPUT_DIR = join(__dirname, "output");

// SAT catalog URLs (try multiple versions)
const SAT_CATALOG_URLS = [
	"http://omawww.sat.gob.mx/tramitesyservicios/Paginas/documentos/catCFDI_V_4_10082022.xls",
	"http://omawww.sat.gob.mx/tramitesyservicios/Paginas/documentos/catCFDI_V_4_17052022.xls",
	"http://omawww.sat.gob.mx/tramitesyservicios/Paginas/documentos/catCFDI_V_4_27072022.xls",
];

// Catalog sheet mappings: SAT sheet name -> output file config
const CATALOG_CONFIGS = {
	c_FormaPago: {
		outputFile: "cfdi-payment-forms.csv",
		columns: { code: 0, name: 1 },
		description: "Payment Forms (Formas de Pago)",
	},
	c_MetodoPago: {
		outputFile: "cfdi-payment-methods.csv",
		columns: { code: 0, name: 1 },
		description: "Payment Methods (Método de Pago)",
	},
	c_RegimenFiscal: {
		outputFile: "cfdi-tax-regimes.csv",
		columns: { code: 0, name: 1 },
		description: "Tax Regimes (Régimen Fiscal)",
	},
	c_UsoCFDI: {
		outputFile: "cfdi-usages.csv",
		columns: { code: 0, name: 1 },
		description: "CFDI Usage (Uso del CFDI)",
	},
	c_TipoDeComprobante: {
		outputFile: "cfdi-voucher-types.csv",
		columns: { code: 0, name: 1 },
		description: "Voucher Types (Tipo de Comprobante)",
	},
	c_Moneda: {
		outputFile: "cfdi-currencies.csv",
		columns: { code: 0, name: 1, decimals: 2 },
		description: "Currencies (Monedas)",
	},
	c_Pais: {
		outputFile: "cfdi-countries.csv",
		columns: { code: 0, name: 1 },
		description: "Countries (Países)",
	},
	c_Impuesto: {
		outputFile: "cfdi-taxes.csv",
		columns: { code: 0, name: 1 },
		description: "Taxes (Impuestos)",
	},
	c_TipoFactor: {
		outputFile: "cfdi-tax-factors.csv",
		columns: { code: 0, name: 1 },
		description: "Tax Factors (Tipo de Factor)",
	},
	c_ClaveProdServ: {
		outputFile: "cfdi-product-services.csv",
		columns: { code: 0, name: 1 },
		description: "Product/Service Codes (Clave de Producto/Servicio)",
		large: true,
	},
	c_ClaveUnidad: {
		outputFile: "cfdi-units.csv",
		columns: { code: 0, name: 1, symbol: 2 },
		description: "Unit Codes (Clave de Unidad)",
	},
	c_ObjetoImp: {
		outputFile: "cfdi-tax-objects.csv",
		columns: { code: 0, name: 1 },
		description: "Tax Objects (Objeto de Impuesto)",
	},
	c_TipoRelacion: {
		outputFile: "cfdi-relation-types.csv",
		columns: { code: 0, name: 1 },
		description: "Relation Types (Tipo de Relación)",
	},
	c_Exportacion: {
		outputFile: "cfdi-export-types.csv",
		columns: { code: 0, name: 1 },
		description: "Export Types (Exportación)",
	},
};

/**
 * Download Excel file from SAT
 */
async function downloadSatCatalog() {
	console.log("📥 Attempting to download SAT CFDI catalog...\n");

	for (const url of SAT_CATALOG_URLS) {
		try {
			console.log(`   Trying: ${url}`);
			const controller = new AbortController();
			const timeout = setTimeout(() => controller.abort(), 30000);

			const response = await fetch(url, { signal: controller.signal });
			clearTimeout(timeout);

			if (response.ok) {
				const buffer = await response.arrayBuffer();
				console.log(
					`   ✅ Downloaded successfully (${buffer.byteLength} bytes)\n`,
				);
				return Buffer.from(buffer);
			}
			console.log(`   ❌ HTTP ${response.status}`);
		} catch (error) {
			console.log(`   ❌ ${error.message}`);
		}
	}

	return null;
}

/**
 * Find the start of actual data in the sheet (skip SAT metadata rows)
 * SAT sheets typically have:
 * - Row 1: "Versión CFDI", "Versión catálogo"
 * - Row 2: Version numbers
 * - Row 3: Column headers (c_FormaPago, Descripción, etc.)
 * - Row 4+: Actual data
 */
function findDataStartRow(data, _config) {
	// Look for the header row that contains the catalog key name
	for (let i = 0; i < Math.min(10, data.length); i++) {
		const row = data[i];
		if (!row) continue;

		const firstCell = String(row[0] || "")
			.trim()
			.toLowerCase();

		// Check if this looks like a header row with catalog name
		if (
			firstCell.startsWith("c_") ||
			firstCell === "clave" ||
			firstCell === "código" ||
			firstCell === "codigo"
		) {
			return i + 1; // Data starts after header
		}

		// Check if first cell looks like actual data (numeric code or short code)
		if (/^[0-9]{1,3}$/.test(firstCell) || /^[A-Z]{1,3}$/.test(firstCell)) {
			// Verify this isn't version info (row 2 has "4", "1" etc.)
			const secondCell = String(row[1] || "").trim();
			if (secondCell.length > 3 && !/^[0-9]+$/.test(secondCell)) {
				return i; // This row is actual data
			}
		}
	}

	return 1; // Default: skip first row
}

/**
 * Parse Excel workbook and extract catalog data
 */
function parseWorkbook(workbook) {
	const results = {};
	const sheetNames = workbook.SheetNames;

	console.log(`📋 Found ${sheetNames.length} sheets in workbook\n`);

	for (const [sheetName, config] of Object.entries(CATALOG_CONFIGS)) {
		// Try exact match first, then partial match
		let matchedSheet = sheetNames.find((s) => s === sheetName);
		if (!matchedSheet) {
			matchedSheet = sheetNames.find((s) =>
				s.toLowerCase().includes(sheetName.toLowerCase().replace("c_", "")),
			);
		}

		if (matchedSheet) {
			console.log(`   Processing: ${matchedSheet} -> ${config.outputFile}`);
			const sheet = workbook.Sheets[matchedSheet];
			const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

			// Find where actual data starts (skip SAT metadata rows)
			const dataStartRow = findDataStartRow(data, config);

			// Extract data
			const items = [];
			for (let i = dataStartRow; i < data.length; i++) {
				const row = data[i];
				if (!row || !row[config.columns.code]) continue;

				const code = String(row[config.columns.code]).trim();
				const name = String(row[config.columns.name] || "").trim();

				// Skip header-like rows that might have slipped through
				if (
					code.toLowerCase().startsWith("c_") ||
					code.toLowerCase() === "clave" ||
					code.toLowerCase() === "código" ||
					code.toLowerCase() === "codigo" ||
					code.toLowerCase() === "versión cfdi" ||
					code.toLowerCase() === "version cfdi"
				) {
					continue;
				}

				const item = { code, name };

				// Add optional columns
				if (
					config.columns.decimals !== undefined &&
					row[config.columns.decimals] !== undefined
				) {
					item.decimals = String(row[config.columns.decimals]).trim();
				}
				if (config.columns.symbol !== undefined && row[config.columns.symbol]) {
					item.symbol = String(row[config.columns.symbol]).trim();
				}

				if (item.code && item.name) {
					items.push(item);
				}
			}

			results[sheetName] = {
				config,
				items,
				matchedSheet,
			};
			console.log(`      ✅ Extracted ${items.length} items`);
		} else {
			console.log(`   ⚠️  Sheet not found: ${sheetName}`);
		}
	}

	return results;
}

/**
 * Generate CSV content from items
 */
function generateCsv(items, config) {
	const lines = [];

	// Determine header based on available columns
	const hasDecimals = config.columns.decimals !== undefined;
	const hasSymbol = config.columns.symbol !== undefined;

	if (hasDecimals) {
		lines.push("code,name,decimals");
	} else if (hasSymbol) {
		lines.push("code,name,symbol");
	} else {
		lines.push("code,name");
	}

	for (const item of items) {
		// Escape quotes in values
		const code = item.code.replace(/"/g, '""');
		const name = item.name.replace(/"/g, '""');

		if (hasDecimals) {
			const decimals = (item.decimals || "").replace(/"/g, '""');
			lines.push(`"${code}","${name}","${decimals}"`);
		} else if (hasSymbol) {
			const symbol = (item.symbol || "").replace(/"/g, '""');
			lines.push(`"${code}","${name}","${symbol}"`);
		} else {
			lines.push(`"${code}","${name}"`);
		}
	}

	return lines.join("\n");
}

/**
 * Write CSV files to output directory
 */
function writeCsvFiles(results) {
	console.log("\n📁 Writing CSV files to output directory...\n");

	let totalItems = 0;
	const written = [];

	for (const [_sheetName, data] of Object.entries(results)) {
		const { config, items } = data;
		const csvContent = generateCsv(items, config);
		const outputPath = join(OUTPUT_DIR, config.outputFile);

		writeFileSync(outputPath, csvContent, "utf-8");
		console.log(`   ✅ ${config.outputFile} (${items.length} items)`);

		totalItems += items.length;
		written.push({
			file: config.outputFile,
			items: items.length,
			description: config.description,
		});
	}

	return { totalItems, written };
}

/**
 * Main function
 */
async function main() {
	console.log("╔════════════════════════════════════════════════════════════╗");
	console.log("║        SAT CFDI 4.0 Catalog Downloader & Parser            ║");
	console.log(
		"╚════════════════════════════════════════════════════════════╝\n",
	);

	let excelBuffer;

	// Check for local file argument
	const localFileArg = process.argv.find(
		(arg, i) => process.argv[i - 1] === "--local",
	);
	const localFilePath = localFileArg || join(__dirname, "catCFDI.xls");

	if (existsSync(localFilePath)) {
		console.log(`📂 Using local file: ${localFilePath}\n`);
		excelBuffer = readFileSync(localFilePath);
	} else {
		// Try to download from SAT
		excelBuffer = await downloadSatCatalog();

		if (!excelBuffer) {
			console.log("\n⚠️  Could not download from SAT.");
			console.log("   Please download manually and place at:");
			console.log(`   ${localFilePath}\n`);
			console.log(
				"   Or run with: node download-sat-catalogs.mjs --local <path>\n",
			);
			process.exit(1);
		}

		// Save downloaded file for future use
		const cachedPath = join(__dirname, "catCFDI.xls");
		writeFileSync(cachedPath, excelBuffer);
		console.log(`💾 Cached Excel file to: ${cachedPath}\n`);
	}

	// Parse workbook
	console.log("📖 Parsing Excel workbook...\n");
	const workbook = XLSX.read(excelBuffer, { type: "buffer" });

	// Extract catalog data
	const results = parseWorkbook(workbook);

	// Write CSV files
	const { totalItems, written } = writeCsvFiles(results);

	// Summary
	console.log(
		"\n╔════════════════════════════════════════════════════════════╗",
	);
	console.log("║                         Summary                            ║");
	console.log(
		"╚════════════════════════════════════════════════════════════╝\n",
	);
	console.log(`   📊 Total catalogs extracted: ${written.length}`);
	console.log(`   📝 Total items: ${totalItems.toLocaleString()}\n`);
	console.log("   Generated files:");
	for (const { file, items } of written) {
		console.log(`      - ${file} (${items.toLocaleString()} items)`);
	}
	console.log("\n✅ Done! CSV files are in:", OUTPUT_DIR);
}

main().catch((error) => {
	console.error("\n❌ Fatal error:", error.message);
	process.exit(1);
});
