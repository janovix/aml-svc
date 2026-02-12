/**
 * Catalog Definitions and SQL Generation
 *
 * Consolidates ALL catalog definitions (regular + large) and provides
 * a single function to generate SQL for all catalogs.
 */

import {
	fetchCsv,
	parseCsv,
	generateCatalogId,
	generateItemId,
	normalizeText,
	escapeSql,
} from "./shared.mjs";

const BASE_URL = "https://catalogs.janovix.com";

// ============================================================================
// CATALOG DEFINITIONS
// ============================================================================

/**
 * Standard catalogs (2-column CSV: code,name)
 */
const STANDARD_CATALOGS = [
	// Core catalogs (7)
	{ key: "states", name: "States" },
	{ key: "banks", name: "Bancos de México" },
	{ key: "armor-levels", name: "Armor Levels" },
	{ key: "business-activities", name: "Business Activities" },
	{ key: "economic-activities", name: "Economic Activities" },
	{ key: "payment-forms", name: "Payment Forms" },
	{ key: "payment-methods", name: "Payment Methods" },

	// CFDI catalogs (11)
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

	// PLD consolidated (14)
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

/**
 * Vehicle brands (3-column CSV: name,origin_country,type)
 */
const VEHICLE_CATALOGS = [
	{ key: "terrestrial-vehicle-brands", name: "Terrestrial Vehicle Brands" },
	{ key: "maritime-vehicle-brands", name: "Maritime Vehicle Brands" },
	{ key: "air-vehicle-brands", name: "Air Vehicle Brands" },
];

// ============================================================================
// SQL GENERATION HELPERS
// ============================================================================

/**
 * Generate multi-row INSERT statement
 */
function generateMultiRowInsert(catalogId, catalogKey, items, batchSize = 50) {
	const sql = [];
	const batches = [];

	for (let i = 0; i < items.length; i += batchSize) {
		batches.push(items.slice(i, i + batchSize));
	}

	for (const batch of batches) {
		const values = batch.map((item) => {
			const name = escapeSql(item.name);
			const normalizedName = normalizeText(item.name);
			const normalizedNameEscaped = escapeSql(normalizedName);
			const metadata = escapeSql(JSON.stringify(item.metadata || {}));
			const itemId = generateItemId(catalogKey, normalizedName);

			return `  ('${itemId}', '${catalogId}', ${name}, ${normalizedNameEscaped}, 1, ${metadata}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`;
		});

		sql.push(
			`INSERT OR REPLACE INTO catalog_items (id, catalog_id, name, normalized_name, active, metadata, created_at, updated_at)`,
		);
		sql.push(`VALUES`);
		sql.push(values.join(",\n") + ";");
		sql.push("");
	}

	return sql.join("\n");
}

/**
 * Generate SQL for a single catalog
 */
function generateCatalogSql(catalogKey, catalogName, items) {
	const catalogId = generateCatalogId(catalogKey);
	const sql = [];

	// Delete existing items for this catalog (clean slate)
	sql.push(`-- Clear existing items for ${catalogKey} (${items.length} items)`);
	sql.push(`DELETE FROM catalog_items WHERE catalog_id = '${catalogId}';`);
	sql.push("");

	// Insert or ignore catalog
	sql.push(`-- Create catalog: ${catalogKey}`);
	sql.push(
		`INSERT OR IGNORE INTO catalogs (id, key, name, active, created_at, updated_at)`,
	);
	sql.push(
		`VALUES ('${catalogId}', '${catalogKey}', ${escapeSql(catalogName)}, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);`,
	);
	sql.push("");

	// Insert items (batched)
	if (items.length > 0) {
		sql.push(`-- Insert ${items.length.toLocaleString()} items`);
		sql.push(generateMultiRowInsert(catalogId, catalogKey, items));
	}

	return sql.join("\n");
}

// ============================================================================
// MAIN EXPORT: Generate SQL for ALL Catalogs
// ============================================================================

/**
 * Generate SQL for ALL catalogs (regular + large)
 */
export async function generateAllCatalogsSql() {
	const sql = [];
	let totalItems = 0;

	sql.push(
		`-- ============================================================================`,
	);
	sql.push(`-- ALL CATALOGS SQL DUMP`);
	sql.push(`-- Generated: ${new Date().toISOString()}`);
	sql.push(
		`-- ============================================================================`,
	);
	sql.push("");

	// ========================================================================
	// 1. COUNTRIES (consolidated: iso2 + iso3)
	// ========================================================================
	console.log(`   [1/88] Fetching countries...`);
	const countriesCsv = await fetchCsv(`${BASE_URL}/countries.csv`);
	const countriesData = parseCsv(countriesCsv);

	const countriesItems = countriesData.map((row) => ({
		name: row.name,
		metadata: { code: row.iso2, iso2: row.iso2, iso3: row.iso3 },
	}));

	sql.push(generateCatalogSql("countries", "Countries", countriesItems));
	totalItems += countriesItems.length;
	console.log(`   ✅ countries: ${countriesItems.length} items`);

	// ========================================================================
	// 2. CURRENCIES (consolidated: code + shortName + decimal_places)
	// ========================================================================
	console.log(`   [2/88] Fetching currencies...`);
	const currenciesCsv = await fetchCsv(`${BASE_URL}/currencies.csv`);
	const currenciesData = parseCsv(currenciesCsv);

	const currenciesItems = currenciesData.map((row) => ({
		name: row.name,
		metadata: {
			code: row.short_name,
			shortName: row.short_name,
			decimal_places: parseInt(row.decimal_places || "2", 10),
			country: row.country,
		},
	}));

	sql.push(generateCatalogSql("currencies", "Currencies", currenciesItems));
	totalItems += currenciesItems.length;
	console.log(`   ✅ currencies: ${currenciesItems.length} items`);

	// ========================================================================
	// 3. CFDI UNITS (3-column: code,name,symbol - 2,420 items)
	// ========================================================================
	console.log(`   [3/88] Fetching cfdi-units...`);
	const cfdiUnitsCsv = await fetchCsv(`${BASE_URL}/cfdi-units.csv`);
	const cfdiUnitsData = parseCsv(cfdiUnitsCsv);

	const cfdiUnitsItems = cfdiUnitsData.map((row) => ({
		name: row.name,
		metadata: {
			code: row.code,
			symbol: row.symbol || "",
		},
	}));

	sql.push(generateCatalogSql("cfdi-units", "CFDI Units", cfdiUnitsItems));
	totalItems += cfdiUnitsItems.length;
	console.log(`   ✅ cfdi-units: ${cfdiUnitsItems.length} items`);

	// ========================================================================
	// 4. STANDARD CATALOGS (2-column: code,name)
	// ========================================================================
	let catalogIndex = 4;
	for (const catalog of STANDARD_CATALOGS) {
		console.log(`   [${catalogIndex}/88] Fetching ${catalog.key}...`);
		const csv = await fetchCsv(`${BASE_URL}/${catalog.key}.csv`);
		const data = parseCsv(csv);

		const items = data.map((row) => {
			const metadata = { code: row.code };
			if (row.iso) {
				metadata.iso = row.iso;
			}
			return {
				name: row.name,
				metadata,
			};
		});

		sql.push(generateCatalogSql(catalog.key, catalog.name, items));
		totalItems += items.length;
		console.log(`   ✅ ${catalog.key}: ${items.length} items`);
		catalogIndex++;
	}

	// ========================================================================
	// 5. VEHICLE BRANDS (3-column: name,origin_country,type)
	// ========================================================================
	for (const catalog of VEHICLE_CATALOGS) {
		console.log(`   [${catalogIndex}/88] Fetching ${catalog.key}...`);
		const csv = await fetchCsv(`${BASE_URL}/${catalog.key}.csv`);
		const data = parseCsv(csv);

		const items = data.map((row) => ({
			name: row.name,
			metadata: {
				originCountry: row.origin_country,
				type: row.type,
			},
		}));

		sql.push(generateCatalogSql(catalog.key, catalog.name, items));
		totalItems += items.length;
		console.log(`   ✅ ${catalog.key}: ${items.length} items`);
		catalogIndex++;
	}

	// ========================================================================
	// 6. VULNERABLE ACTIVITIES (4-column: code,name,short_name,description)
	// ========================================================================
	console.log(`   [${catalogIndex}/88] Fetching vulnerable-activities...`);
	const vulnerableActivitiesCsv = await fetchCsv(
		`${BASE_URL}/vulnerable-activities.csv`,
	);
	const vulnerableActivitiesData = parseCsv(vulnerableActivitiesCsv);

	const vaItems = vulnerableActivitiesData.map((row) => ({
		name: row.name,
		metadata: {
			code: row.code,
			shortName: row.short_name || row.name,
			description: row.description || "",
		},
	}));

	sql.push(
		generateCatalogSql(
			"vulnerable-activities",
			"Vulnerable Activities",
			vaItems,
		),
	);
	totalItems += vaItems.length;
	console.log(`   ✅ vulnerable-activities: ${vaItems.length} items`);
	catalogIndex++;

	// ========================================================================
	// 7. PLD ALERT TYPES (3-column: va_code,code,name)
	// ========================================================================
	console.log(`   [${catalogIndex}/88] Fetching pld-alert-types...`);
	const alertTypesCsv = await fetchCsv(`${BASE_URL}/pld-alert-types.csv`);
	const alertTypesData = parseCsv(alertTypesCsv);

	const alertTypesItems = alertTypesData.map((row) => {
		const isAutomatable = row.code !== "100" && row.code !== "9999";
		return {
			name: row.name,
			metadata: {
				va_code: row.va_code,
				code: row.code,
				automatable: isAutomatable,
			},
		};
	});

	sql.push(
		generateCatalogSql("pld-alert-types", "PLD Alert Types", alertTypesItems),
	);
	totalItems += alertTypesItems.length;
	console.log(`   ✅ pld-alert-types: ${alertTypesItems.length} items`);
	catalogIndex++;

	// ========================================================================
	// 8. ZIP CODES (8-column CSV, ~157K items)
	// ========================================================================
	console.log(`   [${catalogIndex}/88] Fetching zip-codes (large)...`);
	const zipCodesCsv = await fetchCsv(`${BASE_URL}/zip-codes.csv`);
	const zipCodesData = parseCsv(zipCodesCsv);

	const zipCodesItems = zipCodesData.map((row) => ({
		name: `${row.zip_code} - ${row.settlement}, ${row.municipality}, ${row.state}`,
		metadata: {
			zip_code: row.zip_code,
			settlement: row.settlement,
			settlement_type: row.settlement_type,
			municipality: row.municipality,
			state: row.state,
			city: row.city,
			state_code: row.state_code,
			zone: row.zone,
		},
	}));

	sql.push(generateCatalogSql("zip-codes", "Códigos Postales", zipCodesItems));
	totalItems += zipCodesItems.length;
	console.log(
		`   ✅ zip-codes: ${zipCodesItems.length.toLocaleString()} items`,
	);
	catalogIndex++;

	// ========================================================================
	// 9. CFDI PRODUCT/SERVICES (2-column CSV, ~52K items)
	// ========================================================================
	console.log(
		`   [${catalogIndex}/88] Fetching cfdi-product-services (large)...`,
	);
	const cfdiProductServicesCsv = await fetchCsv(
		`${BASE_URL}/cfdi-product-services.csv`,
	);
	const cfdiProductServicesData = parseCsv(cfdiProductServicesCsv);

	const cfdiProductServicesItems = cfdiProductServicesData.map((row) => ({
		name: row.name,
		metadata: {
			code: row.code,
		},
	}));

	sql.push(
		generateCatalogSql(
			"cfdi-product-services",
			"CFDI Productos y Servicios",
			cfdiProductServicesItems,
		),
	);
	totalItems += cfdiProductServicesItems.length;
	console.log(
		`   ✅ cfdi-product-services: ${cfdiProductServicesItems.length.toLocaleString()} items`,
	);

	// ========================================================================
	// FOOTER
	// ========================================================================
	sql.push("");
	sql.push(
		`-- ============================================================================`,
	);
	sql.push(
		`-- TOTAL: ${totalItems.toLocaleString()} catalog items across 87 catalogs`,
	);
	sql.push(
		`-- ============================================================================`,
	);

	return sql.join("\n");
}
