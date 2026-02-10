#!/usr/bin/env node
/**
 * Populate ALL Small/Medium Catalogs
 *
 * Single script that populates ~85 catalogs from catalogs.janovix.com:
 * - Core catalogs (countries, currencies, states, banks, etc.)
 * - CFDI catalogs (SAT codes)
 * - PLD consolidated catalogs
 * - Activity-specific catalogs (47 catalogs across 19 vulnerable activities)
 * - Vehicle brands
 *
 * Large catalogs (zip-codes, cfdi-product-services) are in all-catalogs-large.mjs.
 */

import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import {
	getWranglerConfig,
	fetchCsv,
	parseCsv,
	populateCatalog,
	escapeSql,
	generateCatalogId,
	generateItemId,
	normalizeText,
	executeSql,
} from "./lib/shared.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BASE_URL = "https://catalogs.janovix.com";

// ============================================================================
// STANDARD CATALOGS (2-column CSV: code,name)
// ============================================================================

const STANDARD_CATALOGS = [
	// Core catalogs (7 -- countries and currencies handled separately)
	{ key: "states", name: "States" },
	{ key: "banks", name: "Bancos de México" },
	{ key: "armor-levels", name: "Armor Levels" },
	{ key: "business-activities", name: "Business Activities" },
	{ key: "economic-activities", name: "Economic Activities" },
	{ key: "payment-forms", name: "Payment Forms" },
	{ key: "payment-methods", name: "Payment Methods" },

	// CFDI catalogs (11 + cfdi-units)
	{ key: "cfdi-export-types", name: "CFDI Export Types" },
	{ key: "cfdi-payment-forms", name: "CFDI Payment Forms" },
	{ key: "cfdi-payment-methods", name: "CFDI Payment Methods" },
	{ key: "cfdi-relation-types", name: "CFDI Relation Types" },
	{ key: "cfdi-tax-factors", name: "CFDI Tax Factors" },
	{ key: "cfdi-tax-objects", name: "CFDI Tax Objects" },
	{ key: "cfdi-tax-regimes", name: "CFDI Tax Regimes" },
	{ key: "cfdi-taxes", name: "CFDI Taxes" },
	{ key: "cfdi-usages", name: "CFDI Usages" },
	{ key: "cfdi-voucher-types", name: "CFDI Voucher Types" },

	// PLD consolidated (14 -- pld-alert-types is 3-column, handled separately)
	{ key: "pld-monetary-instruments", name: "PLD Monetary Instruments" },
	{ key: "pld-payment-forms", name: "PLD Payment Forms" },
	{ key: "pld-property-types", name: "PLD Property Types" },
	{ key: "pld-appraisal-item-types", name: "PLD Appraisal Item Types" },
	{ key: "pld-liquidation-item-types", name: "PLD Liquidation Item Types" },
	{ key: "pld-armor-levels", name: "PLD Armor Levels" },
	{ key: "pld-incorporation-reasons", name: "PLD Incorporation Reasons" },
	{ key: "pld-shareholder-positions", name: "PLD Shareholder Positions" },
	{ key: "pld-merger-types", name: "PLD Merger Types" },
	{ key: "pld-power-of-attorney-types", name: "PLD Power of Attorney Types" },
	{
		key: "pld-patrimony-modification-types",
		name: "PLD Patrimony Modification Types",
	},
	{ key: "pld-guarantee-types", name: "PLD Guarantee Types" },
	{ key: "pld-granting-types", name: "PLD Granting Types" },
	{
		key: "pld-financial-institution-types",
		name: "PLD Financial Institution Types",
	},

	// Activity-specific (47 catalogs)
	{ key: "ari-operation-types", name: "Real Estate Leasing - Operation Types" },
	{ key: "bli-armored-item-status", name: "Armoring - Armored Item Status" },
	{
		key: "bli-armored-property-parts",
		name: "Armoring - Armored Property Parts",
	},
	{ key: "bli-operation-types", name: "Armoring - Operation Types" },
	{
		key: "chv-currency-denominations",
		name: "Traveler's Checks - Currency Denominations",
	},
	{ key: "chv-operation-types", name: "Traveler's Checks - Operation Types" },
	{ key: "din-credit-types", name: "Real Estate Development - Credit Types" },
	{
		key: "din-development-types",
		name: "Real Estate Development - Development Types",
	},
	{
		key: "din-operation-types",
		name: "Real Estate Development - Operation Types",
	},
	{
		key: "din-third-party-types",
		name: "Real Estate Development - Third Party Types",
	},
	{ key: "don-operation-types", name: "Donations - Operation Types" },
	{ key: "fep-assignment-types", name: "Notaries Public - Assignment Types" },
	{ key: "fep-movement-types", name: "Notaries Public - Movement Types" },
	{ key: "fep-operation-types", name: "Notaries Public - Operation Types" },
	{
		key: "fep-trust-movement-types",
		name: "Notaries Public - Trust Movement Types",
	},
	{ key: "fep-trust-types", name: "Notaries Public - Trust Types" },
	{ key: "fes-act-types", name: "Public Servants - Act Types" },
	{
		key: "fes-legal-entity-types",
		name: "Public Servants - Legal Entity Types",
	},
	{
		key: "fes-person-character-types",
		name: "Public Servants - Person Character Types",
	},
	{ key: "inm-client-figures", name: "Real Estate Sales - Client Figures" },
	{ key: "inm-operation-types", name: "Real Estate Sales - Operation Types" },
	{ key: "inm-person-figures", name: "Real Estate Sales - Person Figures" },
	{ key: "jys-business-lines", name: "Games and Lotteries - Business Lines" },
	{
		key: "jys-operation-methods",
		name: "Games and Lotteries - Operation Methods",
	},
	{ key: "jys-operation-types", name: "Games and Lotteries - Operation Types" },
	{ key: "mjr-item-types", name: "Metals and Jewelry - Item Types" },
	{ key: "mjr-operation-types", name: "Metals and Jewelry - Operation Types" },
	{ key: "mjr-trade-units", name: "Metals and Jewelry - Trade Units" },
	{ key: "mpc-operation-types", name: "Loans and Credits - Operation Types" },
	{ key: "oba-operation-types", name: "Art Works - Operation Types" },
	{ key: "oba-traded-object-types", name: "Art Works - Traded Object Types" },
	{
		key: "spr-assignment-types",
		name: "Professional Services - Assignment Types",
	},
	{ key: "spr-client-figures", name: "Professional Services - Client Figures" },
	{
		key: "spr-contribution-reasons",
		name: "Professional Services - Contribution Reasons",
	},
	{
		key: "spr-managed-asset-types",
		name: "Professional Services - Managed Asset Types",
	},
	{
		key: "spr-management-status-types",
		name: "Professional Services - Management Status Types",
	},
	{ key: "spr-occupations", name: "Professional Services - Occupations" },
	{
		key: "spr-operation-types",
		name: "Professional Services - Operation Types",
	},
	{ key: "spr-service-areas", name: "Professional Services - Service Areas" },
	{
		key: "tcv-operation-types",
		name: "Securities Custody and Transfer - Operation Types",
	},
	{
		key: "tcv-service-types",
		name: "Securities Custody and Transfer - Service Types",
	},
	{
		key: "tcv-transferred-value-types",
		name: "Securities Custody and Transfer - Transferred Value Types",
	},
	{ key: "tdr-operation-types", name: "Reward Cards - Operation Types" },
	{ key: "tpp-operation-types", name: "Prepaid Cards - Operation Types" },
	{ key: "tsc-card-types", name: "Credit and Service Cards - Card Types" },
	{
		key: "tsc-operation-types",
		name: "Credit and Service Cards - Operation Types",
	},
	{ key: "veh-operation-types", name: "Vehicles - Operation Types" },
];

// ============================================================================
// VEHICLE BRANDS (3-column CSV: name,origin_country,type)
// ============================================================================

const VEHICLE_CATALOGS = [
	{ key: "terrestrial-vehicle-brands", name: "Terrestrial Vehicle Brands" },
	{ key: "maritime-vehicle-brands", name: "Maritime Vehicle Brands" },
	{ key: "air-vehicle-brands", name: "Air Vehicle Brands" },
];

// ============================================================================
// MAIN FUNCTION
// ============================================================================

async function populateAllCatalogs() {
	const { isRemote } = getWranglerConfig();

	console.log("╔════════════════════════════════════════════════════════════╗");
	console.log("║           Catalog Population (All Catalogs)                ║");
	console.log(
		"╚════════════════════════════════════════════════════════════╝\n",
	);
	console.log(`📦 Mode: ${isRemote ? "remote" : "local"}\n`);

	let completed = 0;
	const total = STANDARD_CATALOGS.length + 2 + 1 + 1 + 3 + 1 + 1; // standard + countries + currencies + cfdi-units + vehicles + pld-alert-types + vulnerable-activities

	try {
		// ========================================================================
		// 1. COUNTRIES (consolidated: iso2 + iso3)
		// ========================================================================
		console.log(
			`[${++completed}/${total}] Populating countries (iso2 + iso3)...`,
		);
		const countriesCsv = await fetchCsv(`${BASE_URL}/countries.csv`);
		const countriesData = parseCsv(countriesCsv);
		// #region agent log
		console.log("[DEBUG] countriesData:", {
			count: countriesData.length,
			first3: countriesData.slice(0, 3),
		});
		// #endregion

		const countriesItems = countriesData.map((row) => {
			// #region agent log
			console.log("[DEBUG] Processing row:", row);
			// #endregion
			return {
				name: row.name,
				id: normalizeText(row.name),
				metadata: { code: row.iso2, iso2: row.iso2, iso3: row.iso3 },
			};
		});

		populateCatalog("countries", "Countries", countriesItems);
		console.log(`✅ Populated ${countriesItems.length} countries\n`);

		// ========================================================================
		// 2. CURRENCIES (consolidated: code + shortName + decimal_places)
		// ========================================================================
		console.log(`[${++completed}/${total}] Populating currencies...`);
		const currenciesCsv = await fetchCsv(`${BASE_URL}/currencies.csv`);
		const currenciesData = parseCsv(currenciesCsv);

		const currenciesItems = currenciesData.map((row) => ({
			name: row.name,
			id: normalizeText(row.name),
			metadata: {
				code: row.short_name, // ISO code (MXN, USD, etc.)
				shortName: row.short_name, // Backward compat for frontend
				decimal_places: parseInt(row.decimal_places || "2", 10),
				country: row.country,
			},
		}));

		populateCatalog("currencies", "Currencies", currenciesItems);
		console.log(`✅ Populated ${currenciesItems.length} currencies\n`);

		// ========================================================================
		// 3. CFDI UNITS (3-column: code,name,symbol - 2,420 items, needs batching)
		// ========================================================================
		console.log(`[${++completed}/${total}] Populating cfdi-units (batched)...`);
		const cfdiUnitsCsv = await fetchCsv(`${BASE_URL}/cfdi-units.csv`);
		const cfdiUnitsData = parseCsv(cfdiUnitsCsv);

		const cfdiUnitsItems = cfdiUnitsData.map((row) => ({
			name: row.name,
			id: normalizeText(row.name),
			metadata: {
				code: row.code,
				symbol: row.symbol || "",
			},
		}));

		// Use batched approach for 2,420 items
		const cfdiUnitsCatalogId = generateCatalogId("cfdi-units");
		const BATCH_SIZE = 500;

		// Insert catalog first
		const catalogSql = `
			INSERT OR IGNORE INTO catalogs (id, key, name, active, created_at, updated_at)
			VALUES ('${cfdiUnitsCatalogId}', 'cfdi-units', ${escapeSql("CFDI Units")}, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
		`;
		executeSql(catalogSql, "cfdi-units-catalog");

		// Insert items in batches
		for (let i = 0; i < cfdiUnitsItems.length; i += BATCH_SIZE) {
			const batch = cfdiUnitsItems.slice(i, i + BATCH_SIZE);
			const batchSql = [];

			for (const item of batch) {
				const name = escapeSql(item.name);
				const normalizedName = escapeSql(normalizeText(item.name));
				const metadata = escapeSql(JSON.stringify(item.metadata));
				const itemId = generateItemId(cfdiUnitsCatalogId, item.id);

				batchSql.push(`
					INSERT OR REPLACE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
					VALUES (
						'${itemId}',
						'${cfdiUnitsCatalogId}',
						${name},
						${normalizedName},
						1,
						${metadata},
						COALESCE((SELECT created_at FROM catalog_items WHERE id = '${itemId}'), CURRENT_TIMESTAMP),
						CURRENT_TIMESTAMP
					);
				`);
			}

			const progress = Math.min(i + BATCH_SIZE, cfdiUnitsItems.length);
			console.log(
				`   Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${progress}/${cfdiUnitsItems.length} items...`,
			);
			executeSql(batchSql.join("\n"), `cfdi-units-batch-${i}`);
		}

		console.log(`✅ Populated ${cfdiUnitsItems.length} CFDI units\n`);

		// ========================================================================
		// 5. STANDARD CATALOGS (2-column: code,name)
		// ========================================================================
		for (const catalog of STANDARD_CATALOGS) {
			console.log(`[${++completed}/${total}] Populating ${catalog.key}...`);
			const csv = await fetchCsv(`${BASE_URL}/${catalog.key}.csv`);
			const data = parseCsv(csv);
			// #region agent log
			console.log("[DEBUG] Standard catalog data:", {
				catalog: catalog.key,
				count: data.length,
				first3: data.slice(0, 3),
			});
			// #endregion

			const items = data.map((row) => {
				// #region agent log
				if (!row.name) {
					console.log("[DEBUG] Row missing name:", {
						catalog: catalog.key,
						row,
					});
				}
				// #endregion
				// Build metadata - include iso if present (for states), otherwise just code
				const metadata = { code: row.code };
				if (row.iso) {
					metadata.iso = row.iso;
				}

				return {
					name: row.name,
					id: normalizeText(row.name),
					metadata,
				};
			});

			populateCatalog(catalog.key, catalog.name, items);
			console.log(`✅ Populated ${items.length} items\n`);
		}

		// ========================================================================
		// 6. VEHICLE BRANDS (3-column: name,origin_country,type)
		// ========================================================================
		for (const catalog of VEHICLE_CATALOGS) {
			console.log(`[${++completed}/${total}] Populating ${catalog.key}...`);
			const csv = await fetchCsv(`${BASE_URL}/${catalog.key}.csv`);
			const data = parseCsv(csv);

			const items = data.map((row) => ({
				name: row.name,
				id: normalizeText(row.name),
				metadata: {
					originCountry: row.origin_country,
					type: row.type,
				},
			}));

			populateCatalog(catalog.key, catalog.name, items);
			console.log(`✅ Populated ${items.length} items\n`);
		}

		// ========================================================================
		// 7. VULNERABLE ACTIVITIES (4-column: code,name,short_name,description)
		// ========================================================================
		console.log(
			`[${++completed}/${total}] Populating vulnerable-activities...`,
		);
		const vulnerableActivitiesCsv = await fetchCsv(
			`${BASE_URL}/vulnerable-activities.csv`,
		);
		const vulnerableActivitiesData = parseCsv(vulnerableActivitiesCsv);

		const vaItems = vulnerableActivitiesData.map((row) => ({
			name: row.name,
			id: normalizeText(row.name),
			metadata: {
				code: row.code,
				shortName: row.short_name || row.name,
				description: row.description || "",
			},
		}));

		populateCatalog("vulnerable-activities", "Vulnerable Activities", vaItems);
		console.log(`✅ Populated ${vaItems.length} vulnerable activities\n`);

		// ========================================================================
		// 8. PLD ALERT TYPES (3-column: va_code,code,name)
		// ========================================================================
		console.log(`[${++completed}/${total}] Populating pld-alert-types...`);
		const alertTypesCsv = await fetchCsv(`${BASE_URL}/pld-alert-types.csv`);
		const alertTypesData = parseCsv(alertTypesCsv);

		const catalogId = generateCatalogId("pld-alert-types");
		const sql = [];

		// Insert catalog
		sql.push(`
			INSERT OR IGNORE INTO catalogs (id, key, name, active, created_at, updated_at)
			VALUES ('${catalogId}', 'pld-alert-types', ${escapeSql("PLD Alert Types")}, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
		`);

		// Insert items (special handling for va_code)
		for (const row of alertTypesData) {
			const name = escapeSql(row.name);
			const normalizedName = escapeSql(normalizeText(row.name));
			const isAutomatable = row.code !== "100" && row.code !== "9999";
			const metadata = escapeSql(
				JSON.stringify({
					va_code: row.va_code,
					code: row.code,
					automatable: isAutomatable,
				}),
			);
			// Include va_code in ID for uniqueness
			const itemId = generateItemId(
				catalogId,
				`${row.va_code}-${row.code}-${normalizedName}`,
			);

			sql.push(`
				INSERT OR REPLACE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)
				VALUES (
					'${itemId}',
					'${catalogId}',
					${name},
					${normalizedName},
					1,
					${metadata},
					COALESCE((SELECT created_at FROM catalog_items WHERE id = '${itemId}'), CURRENT_TIMESTAMP),
					CURRENT_TIMESTAMP
				);
			`);
		}

		executeSql(sql.join("\n"), "pld-alert-types");
		console.log(`✅ Populated ${alertTypesData.length} PLD alert types\n`);
	} catch (error) {
		console.error("\n❌ Failed to populate catalogs:", error);
		process.exit(1);
	}

	console.log(
		"\n╔════════════════════════════════════════════════════════════╗",
	);
	console.log("║                 Catalogs Complete!                         ║");
	console.log(
		"╚════════════════════════════════════════════════════════════╝\n",
	);
	console.log(`✅ All ${total} catalogs populated successfully!`);
}

populateAllCatalogs().catch((error) => {
	console.error("Fatal error:", error);
	process.exit(1);
});
