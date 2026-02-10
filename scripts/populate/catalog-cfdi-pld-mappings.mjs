#!/usr/bin/env node
/**
 * Populate CFDI-PLD Catalog Mappings
 *
 * This script creates mappings between CFDI catalogs and PLD catalogs.
 * For example, CFDI payment form "01" (Efectivo) maps to PLD monetary instrument "EFE".
 *
 * These mappings are used when extracting PLD-relevant data from CFDI invoices.
 */

import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { getWranglerConfig, escapeSql, executeSql } from "./lib/shared.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * CFDI Payment Forms (c_FormaPago) to PLD Monetary Instruments mapping
 *
 * SAT PLD codes (from SAT PLD Anexo):
 * - EFE: Efectivo
 * - CHE: Cheque
 * - TRA: Transferencia
 * - TAR: Tarjeta de crédito/débito
 * - MON: Monedero electrónico
 * - OTR: Otro
 */
const PAYMENT_FORM_MAPPINGS = [
	// CFDI code -> PLD code, notes
	{ cfdiCode: "01", pldCode: "EFE", notes: "Efectivo" },
	{ cfdiCode: "02", pldCode: "CHE", notes: "Cheque nominativo" },
	{
		cfdiCode: "03",
		pldCode: "TRA",
		notes: "Transferencia electrónica de fondos",
	},
	{ cfdiCode: "04", pldCode: "TAR", notes: "Tarjeta de crédito" },
	{ cfdiCode: "05", pldCode: "MON", notes: "Monedero electrónico" },
	{ cfdiCode: "06", pldCode: "OTR", notes: "Dinero electrónico" },
	{ cfdiCode: "08", pldCode: "OTR", notes: "Vales de despensa" },
	{ cfdiCode: "12", pldCode: "OTR", notes: "Dación en pago" },
	{ cfdiCode: "13", pldCode: "OTR", notes: "Pago por subrogación" },
	{ cfdiCode: "14", pldCode: "OTR", notes: "Pago por consignación" },
	{ cfdiCode: "15", pldCode: "OTR", notes: "Condonación" },
	{ cfdiCode: "17", pldCode: "OTR", notes: "Compensación" },
	{ cfdiCode: "23", pldCode: "OTR", notes: "Novación" },
	{ cfdiCode: "24", pldCode: "OTR", notes: "Confusión" },
	{ cfdiCode: "25", pldCode: "OTR", notes: "Remisión de deuda" },
	{ cfdiCode: "26", pldCode: "OTR", notes: "Prescripción o caducidad" },
	{ cfdiCode: "27", pldCode: "OTR", notes: "A satisfacción del acreedor" },
	{ cfdiCode: "28", pldCode: "TAR", notes: "Tarjeta de débito" },
	{ cfdiCode: "29", pldCode: "TAR", notes: "Tarjeta de servicios" },
	{ cfdiCode: "30", pldCode: "OTR", notes: "Aplicación de anticipos" },
	{ cfdiCode: "31", pldCode: "OTR", notes: "Intermediario pagos" },
	{ cfdiCode: "99", pldCode: "OTR", notes: "Por definir" },
];

/**
 * CFDI Currencies (c_Moneda) to consolidated Currencies mapping
 * Note: We now have a single "currencies" catalog (not separate cfdi-currencies).
 * Most mappings are direct (same ISO code).
 */
const CURRENCY_MAPPINGS = [
	{ cfdiCode: "MXN", pldCode: "MXN", notes: "Peso Mexicano" },
	{ cfdiCode: "USD", pldCode: "USD", notes: "Dólar Estadounidense" },
	{ cfdiCode: "EUR", pldCode: "EUR", notes: "Euro" },
	{ cfdiCode: "GBP", pldCode: "GBP", notes: "Libra Esterlina" },
	{ cfdiCode: "CAD", pldCode: "CAD", notes: "Dólar Canadiense" },
	{ cfdiCode: "JPY", pldCode: "JPY", notes: "Yen Japonés" },
	{ cfdiCode: "CHF", pldCode: "CHF", notes: "Franco Suizo" },
	// XXX is used for "no currency" in CFDI
	{
		cfdiCode: "XXX",
		pldCode: "MXN",
		notes: "Sin moneda (usar MXN por defecto)",
	},
];

/**
 * CFDI Countries (c_Pais) to consolidated Countries mapping
 * Note: We now have a single "countries" catalog with both iso2 and iso3.
 * CFDI uses ISO 3166-1 alpha-3 (MEX, USA), PLD uses alpha-2 (MX, US).
 * The mapping is from CFDI's iso3 to the country's iso2.
 */
const COUNTRY_MAPPINGS = [
	{ cfdiCode: "MEX", pldCode: "MX", notes: "México" },
	{ cfdiCode: "USA", pldCode: "US", notes: "Estados Unidos" },
	{ cfdiCode: "CAN", pldCode: "CA", notes: "Canadá" },
	// Add more as needed
];

function generateId(cfdiCatalog, cfdiCode, pldCatalog) {
	const combined = `${cfdiCatalog}-${cfdiCode}-${pldCatalog}`;
	let hash = 0;
	for (let i = 0; i < combined.length; i++) {
		const char = combined.charCodeAt(i);
		hash = (hash << 5) - hash + char;
		hash = hash & hash;
	}
	return Math.abs(hash).toString(16).padStart(32, "0");
}

async function populate() {
	const { isRemote, _configFile } = getWranglerConfig();

	try {
		console.log(
			`📦 Populating CFDI-PLD catalog mappings (${isRemote ? "remote" : "local"})...`,
		);

		const sql = [];

		// Create the catalog_mappings table if it doesn't exist
		sql.push(`
			CREATE TABLE IF NOT EXISTS catalog_mappings (
				id TEXT PRIMARY KEY,
				cfdi_catalog TEXT NOT NULL,
				cfdi_code TEXT NOT NULL,
				pld_catalog TEXT NOT NULL,
				pld_code TEXT NOT NULL,
				notes TEXT,
				created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
				updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
				UNIQUE(cfdi_catalog, cfdi_code, pld_catalog)
			);
		`);

		// Payment form mappings
		console.log(
			`   Adding ${PAYMENT_FORM_MAPPINGS.length} payment form mappings...`,
		);
		for (const mapping of PAYMENT_FORM_MAPPINGS) {
			const id = generateId(
				"cfdi-payment-forms",
				mapping.cfdiCode,
				"monetary-instruments",
			);
			sql.push(`
				INSERT OR REPLACE INTO catalog_mappings (id, cfdi_catalog, cfdi_code, pld_catalog, pld_code, notes, updated_at)
				VALUES (
					'${id}',
					'cfdi-payment-forms',
					'${mapping.cfdiCode}',
					'monetary-instruments',
					'${mapping.pldCode}',
					${escapeSql(mapping.notes)},
					CURRENT_TIMESTAMP
				);
			`);
		}

		// Currency mappings
		console.log(`   Adding ${CURRENCY_MAPPINGS.length} currency mappings...`);
		for (const mapping of CURRENCY_MAPPINGS) {
			const id = generateId("currencies", mapping.cfdiCode, "currencies");
			sql.push(`
				INSERT OR REPLACE INTO catalog_mappings (id, cfdi_catalog, cfdi_code, pld_catalog, pld_code, notes, updated_at)
				VALUES (
					'${id}',
					'currencies',
					'${mapping.cfdiCode}',
					'currencies',
					'${mapping.pldCode}',
					${escapeSql(mapping.notes)},
					CURRENT_TIMESTAMP
				);
			`);
		}

		// Country mappings
		console.log(`   Adding ${COUNTRY_MAPPINGS.length} country mappings...`);
		for (const mapping of COUNTRY_MAPPINGS) {
			const id = generateId("countries", mapping.cfdiCode, "countries");
			sql.push(`
				INSERT OR REPLACE INTO catalog_mappings (id, cfdi_catalog, cfdi_code, pld_catalog, pld_code, notes, updated_at)
				VALUES (
					'${id}',
					'countries',
					'${mapping.cfdiCode}',
					'countries',
					'${mapping.pldCode}',
					${escapeSql(mapping.notes)},
					CURRENT_TIMESTAMP
				);
			`);
		}

		// Execute SQL using shared utility
		executeSql(sql.join("\n"), "cfdi-pld-mappings");

		const totalMappings =
			PAYMENT_FORM_MAPPINGS.length +
			CURRENCY_MAPPINGS.length +
			COUNTRY_MAPPINGS.length;

		console.log(
			`\n✅ CFDI-PLD mappings populated successfully! (${totalMappings} mappings)`,
		);
	} catch (error) {
		console.error("❌ Error populating CFDI-PLD mappings:", error);
		process.exit(1);
	}
}

populate().catch((error) => {
	console.error("Fatal error:", error);
	process.exit(1);
});
