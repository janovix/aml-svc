#!/usr/bin/env node
/**
 * AML Synthetic Test Data Generator
 *
 * Generates 20 CSV files:
 *   - clients.csv         (100 clients: 70 physical, 25 moral, 5 trust)
 *   - operations_*.csv    (1 per activity, 19 activities)
 *
 * Test coverage per activity:
 *   - Below / at / above identification threshold (UMA-based)
 *   - At notice threshold — direct (operation_amount_uma seeker)
 *   - Above notice threshold
 *   - Aggregated notice trigger (aggregate_amount_uma seeker)
 *   - Structuring pattern (structuring_detection seeker)
 *   - Cash payment above threshold (cash_high_value seeker)
 *   - Foreign-currency cash (foreign_currency_cash seeker)
 *   - Split payment 3+ methods (split_payment seeker)
 *   - Frequent operations — 3 in 30 days (frequent_operations seeker)
 *   - Quick refund pair (quick_refund_pattern seeker)
 *   - Profile mismatch — amount >> average (profile_mismatch seeker)
 *   - Activity-specific extras (minor, new-client, multiple cards, etc.)
 *
 * Usage: node generate.mjs
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const OUT = join(__dirname, "output");
mkdirSync(OUT, { recursive: true });

// ─────────────────────────────────────────────────────────────────────────────
// THRESHOLDS  (UMA units; null = ALWAYS — every operation triggers that level)
// ─────────────────────────────────────────────────────────────────────────────
const UMA = 117.31; // MXN per UMA, effective 2026-02-01

const ID_UMA = {
	VEH: 3210,
	INM: null,
	DIN: null,
	MJR: 805,
	AVI: null,
	JYS: 325,
	ARI: 1605,
	BLI: 2410,
	DON: 1605,
	MPC: null,
	FEP: null,
	FES: null,
	SPR: null,
	CHV: null,
	TSC: 805,
	TPP: 645,
	TDR: 645,
	TCV: null,
	OBA: 2410,
};

const NOTICE_UMA = {
	VEH: 6420,
	INM: 8025,
	DIN: 8025,
	MJR: 1605,
	AVI: 210,
	JYS: 645,
	ARI: 3210,
	BLI: 4815,
	DON: 3210,
	MPC: 1605,
	FEP: 8000,
	FES: null,
	SPR: null,
	CHV: 645,
	TSC: 1285,
	TPP: 645,
	TDR: 645,
	TCV: 3210,
	OBA: 4815,
};

// Convert UMA units to MXN, rounded to 2 decimals
function mxn(uma) {
	return Math.round(uma * UMA * 100) / 100;
}

// ─────────────────────────────────────────────────────────────────────────────
// COLUMN DEFINITIONS  (mirror template-columns.ts exactly)
// ─────────────────────────────────────────────────────────────────────────────
const CORE_OP = [
	"client_rfc",
	"operation_date",
	"operation_type_code",
	"branch_postal_code",
	"amount",
	"currency",
	"exchange_rate",
	"alert_type_code",
	"reference_number",
	"notes",
];

const PAY_COLS = [];
for (let i = 1; i <= 5; i++) {
	PAY_COLS.push(
		`payment_date_${i}`,
		`payment_form_code_${i}`,
		`payment_amount_${i}`,
		`payment_currency_${i}`,
		`payment_exchange_rate_${i}`,
	);
}

const EXT = {
	VEH: [
		"vehicle_type",
		"brand",
		"model",
		"year",
		"vin",
		"repuve",
		"plates",
		"serial_number",
		"flag_country_code",
		"registration_number",
		"armor_level_code",
		"engine_number",
		"description",
	],
	INM: [
		"property_type_code",
		"street",
		"external_number",
		"internal_number",
		"neighborhood",
		"postal_code",
		"municipality",
		"state_code",
		"country_code",
		"registry_folio",
		"registry_date",
		"land_area_m2",
		"construction_area_m2",
		"client_figure_code",
		"person_figure_code",
		"description",
	],
	MJR: [
		"item_type_code",
		"metal_type",
		"weight_grams",
		"purity",
		"jewelry_description",
		"brand",
		"serial_number",
		"trade_unit_code",
		"quantity",
		"unit_price",
	],
	AVI: [
		"asset_type_code",
		"asset_name",
		"wallet_address_origin",
		"wallet_address_destination",
		"exchange_name",
		"exchange_country_code",
		"asset_quantity",
		"asset_unit_price",
		"blockchain_tx_hash",
	],
	JYS: [
		"game_type_code",
		"business_line_code",
		"operation_method_code",
		"prize_amount",
		"bet_amount",
		"ticket_number",
		"event_name",
		"event_date",
		"property_type_code",
		"property_description",
	],
	ARI: [
		"property_type_code",
		"rental_period_months",
		"monthly_rent",
		"deposit_amount",
		"contract_start_date",
		"contract_end_date",
		"street",
		"external_number",
		"internal_number",
		"neighborhood",
		"postal_code",
		"municipality",
		"state_code",
		"is_prepaid",
		"prepaid_months",
		"description",
	],
	BLI: [
		"item_type",
		"item_status_code",
		"armor_level_code",
		"armored_part_code",
		"vehicle_type",
		"vehicle_brand",
		"vehicle_model",
		"vehicle_year",
		"vehicle_vin",
		"vehicle_plates",
		"service_description",
	],
	DON: [
		"donation_type",
		"purpose",
		"item_type_code",
		"item_description",
		"item_value",
		"is_anonymous",
		"campaign_name",
	],
	MPC: [
		"loan_type_code",
		"guarantee_type_code",
		"principal_amount",
		"interest_rate",
		"term_months",
		"monthly_payment",
		"disbursement_date",
		"maturity_date",
		"guarantee_description",
		"guarantee_value",
	],
	FEP: [
		"act_type_code",
		"instrument_number",
		"instrument_date",
		"trust_type_code",
		"trust_identifier",
		"trust_purpose",
		"movement_type_code",
		"assignment_type_code",
		"merger_type_code",
		"incorporation_reason_code",
		"patrimony_modification_type_code",
		"power_of_attorney_type_code",
		"granting_type_code",
		"shareholder_position_code",
		"share_percentage",
		"item_type_code",
		"item_description",
		"item_value",
	],
	FES: [
		"act_type_code",
		"notary_number",
		"notary_state_code",
		"instrument_number",
		"instrument_date",
		"legal_entity_type_code",
		"person_character_type_code",
		"incorporation_reason_code",
		"patrimony_modification_type_code",
		"power_of_attorney_type_code",
		"granting_type_code",
		"shareholder_position_code",
		"share_percentage",
		"item_type_code",
		"item_description",
		"appraisal_value",
		"guarantee_type_code",
	],
	SPR: [
		"service_type_code",
		"service_area_code",
		"client_figure_code",
		"contribution_reason_code",
		"assignment_type_code",
		"merger_type_code",
		"incorporation_reason_code",
		"shareholder_position_code",
		"share_percentage",
		"managed_asset_type_code",
		"management_status_code",
		"financial_institution_type_code",
		"financial_institution_name",
		"occupation_code",
		"service_description",
	],
	CHV: [
		"denomination_code",
		"check_count",
		"serial_numbers",
		"issuer_name",
		"issuer_country_code",
	],
	TSC: [
		"card_type_code",
		"card_number_masked",
		"card_brand",
		"issuer_name",
		"credit_limit",
		"transaction_type",
	],
	TPP: [
		"card_type",
		"card_number_masked",
		"is_initial_load",
		"reload_amount",
		"current_balance",
		"issuer_name",
	],
	TDR: [
		"reward_type",
		"program_name",
		"points_amount",
		"points_value",
		"points_expiry_date",
		"redemption_type",
		"redemption_description",
	],
	TCV: [
		"value_type_code",
		"service_type_code",
		"transport_method",
		"origin_address",
		"destination_address",
		"custody_start_date",
		"custody_end_date",
		"storage_location",
		"declared_value",
		"insured_value",
		"description",
	],
	OBA: [
		"artwork_type_code",
		"title",
		"artist",
		"year_created",
		"medium",
		"dimensions",
		"provenance",
		"certificate_authenticity",
		"previous_owner",
		"is_antique",
		"auction_house",
		"lot_number",
	],
	DIN: [
		"development_type_code",
		"credit_type_code",
		"project_name",
		"project_location",
		"contribution_type",
		"contribution_amount",
		"third_party_type_code",
		"third_party_name",
		"financial_institution_type_code",
		"financial_institution_name",
	],
};

function opHeaders(act) {
	return [...CORE_OP, ...EXT[act], ...PAY_COLS];
}

// ─────────────────────────────────────────────────────────────────────────────
// DATE HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function addDays(d, n) {
	const dt = new Date(d + "T12:00:00Z");
	dt.setUTCDate(dt.getUTCDate() + n);
	return dt.toISOString().split("T")[0];
}

const REF = "2026-02-10"; // Base date for most operations

// ─────────────────────────────────────────────────────────────────────────────
// RFC / CURP GENERATORS
// ─────────────────────────────────────────────────────────────────────────────
// Letters safe for RFC/CURP generation (no I, no Ñ, keeps things ASCII-safe)
const ALPHA = "ABCDFGHJKLMNPQRSTVWXYZ"; // 22 letters (no E/I/O/U/Ñ)
const ALL24 = "ABCDFGHJKLMNPQRSTVWXYZ"; // same set, used for CURP non-vowel positions
const VX = "AEIOUX"; // valid CURP position-2 chars

const pick = (arr, idx) => arr[((idx % arr.length) + arr.length) % arr.length];
const pickN = (n, idx) => pick(ALPHA, idx * n + n);

function ymd6(dateStr) {
	const [y, m, d] = dateStr.split("-");
	return y.slice(2) + m + d;
}

// Physical RFC: [A-Z]{4}\d{6}[A-Z0-9]{3}  →  13 chars
function physRFC(idx, bdate) {
	const d = ymd6(bdate);
	const a = pickN(1, idx),
		b = pickN(7, idx),
		c = pickN(11, idx),
		e = pickN(13, idx);
	const h1 = pickN(17, idx),
		h2 = pickN(19, idx),
		h3 = idx % 10;
	return `${a}${b}${c}${e}${d}${h1}${h2}${h3}`;
}

// Moral/trust RFC: [A-Z]{3}\d{6}[A-Z0-9]{3}  →  12 chars
function moralRFC(idx, idate) {
	const d = ymd6(idate);
	const a = pickN(1, idx),
		b = pickN(7, idx),
		c = pickN(11, idx);
	const h1 = pickN(17, idx),
		h2 = pickN(19, idx),
		h3 = idx % 10;
	return `${a}${b}${c}${d}${h1}${h2}${h3}`;
}

// CURP: [A-Z][AEIOUX][A-Z]{2}\d{6}[HM][A-Z]{5}[A-Z0-9]{2}  →  18 chars
const STATES_CURP = [
	"CM",
	"JA",
	"NL",
	"VZ",
	"PL",
	"GT",
	"YN",
	"BC",
	"SL",
	"SO",
	"CH",
	"DG",
	"ZS",
	"AG",
	"QR",
	"TC",
	"MN",
	"HG",
	"OC",
	"CP",
];
function genCURP(idx, bdate, gender) {
	const d = ymd6(bdate);
	const sex = gender === "M" ? "H" : "M";
	const st = STATES_CURP[idx % STATES_CURP.length];
	const p1 = pick(ALL24, idx);
	const p2 = pick(VX, idx);
	const p3 = pick(ALL24, idx * 3 + 1);
	const p4 = pick(ALL24, idx * 7 + 2);
	const c1 = pick(ALL24, idx * 11);
	const c2 = pick(ALL24, idx * 13 + 3);
	const c3 = pick(ALL24, idx * 17 + 5);
	const hm = pick(ALL24, idx * 19);
	const hn = idx % 10;
	return `${p1}${p2}${p3}${p4}${d}${sex}${st}${c1}${c2}${c3}${hm}${hn}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// CLIENT GENERATION
// ─────────────────────────────────────────────────────────────────────────────
const CITIES = [
	{
		city: "Ciudad de Mexico",
		state: "CMX",
		muni: "Cuauhtemoc",
		nbhd: "Centro",
		postal: "06000",
	},
	{
		city: "Guadalajara",
		state: "JAL",
		muni: "Guadalajara",
		nbhd: "Chapultepec",
		postal: "44660",
	},
	{
		city: "Monterrey",
		state: "NLE",
		muni: "Monterrey",
		nbhd: "San Jeronimo",
		postal: "64630",
	},
	{
		city: "Puebla",
		state: "PUE",
		muni: "Puebla",
		nbhd: "Analco",
		postal: "72000",
	},
	{
		city: "Tijuana",
		state: "BCN",
		muni: "Tijuana",
		nbhd: "Zona Centro",
		postal: "22000",
	},
	{ city: "Leon", state: "GTO", muni: "Leon", nbhd: "Centro", postal: "37000" },
	{
		city: "Merida",
		state: "YUC",
		muni: "Merida",
		nbhd: "Centro",
		postal: "97000",
	},
	{
		city: "Cancun",
		state: "ROO",
		muni: "Benito Juarez",
		nbhd: "Centro",
		postal: "77500",
	},
	{
		city: "Veracruz",
		state: "VER",
		muni: "Veracruz",
		nbhd: "Centro",
		postal: "91700",
	},
	{
		city: "Culiacan",
		state: "SIN",
		muni: "Culiacan",
		nbhd: "Centro",
		postal: "80000",
	},
];

const FIRST = [
	"Juan",
	"Maria",
	"Carlos",
	"Ana",
	"Luis",
	"Laura",
	"Pedro",
	"Sofia",
	"Miguel",
	"Claudia",
	"Jose",
	"Elena",
	"Fernando",
	"Patricia",
	"Roberto",
	"Fernanda",
	"Diego",
	"Carmen",
	"Alejandro",
	"Monica",
	"Ricardo",
	"Gabriela",
	"Ernesto",
	"Lorena",
	"Hector",
	"Beatriz",
	"Francisco",
	"Andrea",
	"Eduardo",
	"Veronica",
];
const LAST = [
	"Garcia",
	"Martinez",
	"Lopez",
	"Gonzalez",
	"Rodriguez",
	"Hernandez",
	"Perez",
	"Sanchez",
	"Ramirez",
	"Torres",
	"Flores",
	"Rivera",
	"Morales",
	"Jimenez",
	"Cruz",
	"Reyes",
	"Diaz",
	"Vargas",
	"Mendoza",
	"Romero",
	"Gutierrez",
	"Castillo",
	"Moreno",
	"Navarro",
	"Luna",
	"Ruiz",
	"Nunez",
	"Vega",
];
const BIZ = [
	"Comercializadora",
	"Constructora",
	"Inmobiliaria",
	"Servicios",
	"Inversiones",
	"Grupo",
	"Desarrolladora",
	"Consultora",
	"Financiera",
	"Transportes",
];
const BIZ_SFX = ["SA de CV", "SAPI de CV", "SC", "SRL", "AC", "IAP"];
const ECO_ACT = [
	"4651101",
	"4653101",
	"4651104",
	"5221101",
	"4311001",
	"7010001",
	"4921001",
	"6820001",
];
const OCCUPATIONS = [
	"Ingeniero",
	"Medico",
	"Abogado",
	"Contador",
	"Empresario",
	"Arquitecto",
	"Profesor",
	"Economista",
];
const MARITAL = ["SINGLE", "MARRIED", "DIVORCED", "WIDOWED", "OTHER"];

function adultBirth(i) {
	const y = 1960 + (i % 40);
	const m = String((i % 12) + 1).padStart(2, "0");
	const d = String((i % 28) + 1).padStart(2, "0");
	return `${y}-${m}-${d}`;
}
function minorBirth(i) {
	const y = 2009 + (i % 2); // ages 16-17 as of 2026
	const m = String((i % 12) + 1).padStart(2, "0");
	const d = String((i % 28) + 1).padStart(2, "0");
	return `${y}-${m}-${d}`;
}
function incorpDate(i) {
	const y = 1990 + (i % 30);
	const m = String((i % 12) + 1).padStart(2, "0");
	const d = String((i % 28) + 1).padStart(2, "0");
	return `${y}-${m}-${d}`;
}

// Shared address for shared_address_analysis seeker (clients 7-9)
const SHARED_ADDR = {
	street: "Masaryk",
	ext: "100",
	nbhd: "Polanco",
	postal: "11560",
	muni: "Miguel Hidalgo",
	city: "Ciudad de Mexico",
	state: "CMX",
};

function buildPhysical(i) {
	const isMinor = i < 2;
	const isSharedAddr = i >= 7 && i < 10;
	const noEcoAct = i >= 15 && i < 20;
	const bdate = isMinor ? minorBirth(i) : adultBirth(i);
	const gender = i % 2 === 0 ? "M" : "F";
	const rfc = physRFC(i, bdate);
	const curp = genCURP(i, bdate, gender);
	const loc = isSharedAddr ? SHARED_ADDR : CITIES[i % CITIES.length];
	const fn = FIRST[i % FIRST.length];
	const ln1 = LAST[i % LAST.length];
	const ln2 = LAST[(i + 10) % LAST.length];
	return {
		person_type: "physical",
		rfc,
		first_name: fn,
		last_name: ln1,
		second_last_name: ln2,
		birth_date: bdate,
		curp,
		business_name: "",
		incorporation_date: "",
		nationality: "MX",
		email: `user${i}@synth.janovix.com`,
		phone: `+5255${String(10000000 + i * 7).padStart(8, "0")}`,
		country: "MX",
		state_code: loc.state || loc.state_code,
		city: loc.city,
		municipality: loc.muni || loc.municipality,
		neighborhood: loc.nbhd || loc.neighborhood,
		street: isSharedAddr ? loc.street : `Av. ${LAST[(i * 3) % LAST.length]}`,
		external_number: isSharedAddr ? loc.ext : String((i % 900) + 100),
		internal_number: i % 5 === 0 ? String(i) : "",
		postal_code: loc.postal,
		reference: "",
		notes: `Test physical client ${i}`,
		country_code: "MEX",
		economic_activity_code: noEcoAct ? "" : ECO_ACT[i % ECO_ACT.length],
		gender,
		occupation: OCCUPATIONS[i % OCCUPATIONS.length],
		marital_status: MARITAL[i % MARITAL.length],
		source_of_funds: "Salario mensual",
		source_of_wealth: "Ahorros personales",
	};
}

function buildMoral(i) {
	const idx = 70 + i;
	const idate = incorpDate(i);
	const rfc = moralRFC(idx, idate);
	const loc = CITIES[idx % CITIES.length];
	const bname = `${BIZ[i % BIZ.length]} ${LAST[i % LAST.length]} ${BIZ_SFX[i % BIZ_SFX.length]}`;
	return {
		person_type: "moral",
		rfc,
		first_name: "",
		last_name: "",
		second_last_name: "",
		birth_date: "",
		curp: "",
		business_name: bname,
		incorporation_date: idate,
		nationality: "",
		email: `empresa${idx}@synth.janovix.com`,
		phone: `+5255${String(20000000 + i * 7).padStart(8, "0")}`,
		country: "MX",
		state_code: loc.state,
		city: loc.city,
		municipality: loc.muni,
		neighborhood: loc.nbhd,
		street: "Av. Insurgentes",
		external_number: String((i % 900) + 100),
		internal_number: `Piso ${(i % 10) + 1}`,
		postal_code: loc.postal,
		reference: "",
		notes: `Test moral entity ${idx}`,
		country_code: "MEX",
		economic_activity_code: ECO_ACT[idx % ECO_ACT.length],
		gender: "",
		occupation: "",
		marital_status: "",
		source_of_funds: "Actividad empresarial",
		source_of_wealth: "Capital social",
	};
}

function buildTrust(i) {
	const idx = 95 + i;
	const idate = incorpDate(idx);
	const rfc = moralRFC(idx, idate);
	const loc = CITIES[idx % CITIES.length];
	return {
		person_type: "trust",
		rfc,
		first_name: "",
		last_name: "",
		second_last_name: "",
		birth_date: "",
		curp: "",
		business_name: `Fideicomiso ${LAST[idx % LAST.length]} ${idx}`,
		incorporation_date: idate,
		nationality: "",
		email: `fideicomiso${idx}@synth.janovix.com`,
		phone: `+5255${String(30000000 + i * 7).padStart(8, "0")}`,
		country: "MX",
		state_code: loc.state,
		city: loc.city,
		municipality: loc.muni,
		neighborhood: loc.nbhd,
		street: "Calle Fideicomiso",
		external_number: String(i + 1),
		internal_number: "",
		postal_code: loc.postal,
		reference: "",
		notes: `Test trust entity ${idx}`,
		country_code: "MEX",
		economic_activity_code: ECO_ACT[idx % ECO_ACT.length],
		gender: "",
		occupation: "",
		marital_status: "",
		source_of_funds: "Fideicomiso patrimonial",
		source_of_wealth: "Patrimonio fideicomitido",
	};
}

// Build the full client pool and expose the RFC index for later use
const CLIENT_ROWS = [];
for (let i = 0; i < 70; i++) CLIENT_ROWS.push(buildPhysical(i));
for (let i = 0; i < 25; i++) CLIENT_ROWS.push(buildMoral(i));
for (let i = 0; i < 5; i++) CLIENT_ROWS.push(buildTrust(i));

// Named RFC handles (used in operation scenarios)
const RFC = {
	agg: CLIENT_ROWS[0].rfc, // aggregate / structuring scenarios
	struct: CLIENT_ROWS[1].rfc,
	freq: CLIENT_ROWS[2].rfc, // frequent operations
	profile: CLIENT_ROWS[3].rfc, // profile mismatch
	refund: CLIENT_ROWS[4].rfc, // quick refund
	minor: CLIENT_ROWS[5].rfc, // minor client
	minor2: CLIENT_ROWS[6].rfc,
	shared: CLIENT_ROWS[7].rfc, // shared address
	newcli: CLIENT_ROWS[8].rfc, // new client high-value (VEH)
	card: CLIENT_ROWS[9].rfc, // multiple cards (TSC/TPP/TDR/CHV)
	norm1: CLIENT_ROWS[20].rfc,
	norm2: CLIENT_ROWS[21].rfc,
	norm3: CLIENT_ROWS[22].rfc,
	norm4: CLIENT_ROWS[23].rfc,
	moral1: CLIENT_ROWS[70].rfc,
	trust1: CLIENT_ROWS[95].rfc,
};

// ─────────────────────────────────────────────────────────────────────────────
// CSV SERIALIZER
// ─────────────────────────────────────────────────────────────────────────────
function csvCell(v) {
	const s = v === null || v === undefined ? "" : String(v);
	if (s.includes(",") || s.includes('"') || s.includes("\n")) {
		return `"${s.replace(/"/g, '""')}"`;
	}
	return s;
}

function toCsv(headers, rows) {
	const lines = [headers.join(",")];
	for (const row of rows) {
		lines.push(headers.map((h) => csvCell(row[h] ?? "")).join(","));
	}
	return lines.join("\r\n") + "\r\n";
}

function write(filename, headers, rows) {
	const path = join(OUT, filename);
	writeFileSync(path, toCsv(headers, rows), "utf-8");
	console.log(`  ✓ ${filename}  (${rows.length} rows)`);
}

// ─────────────────────────────────────────────────────────────────────────────
// CLIENT CSV
// ─────────────────────────────────────────────────────────────────────────────
const CLIENT_HEADERS = [
	"person_type",
	"rfc",
	"first_name",
	"last_name",
	"second_last_name",
	"birth_date",
	"curp",
	"business_name",
	"incorporation_date",
	"nationality",
	"email",
	"phone",
	"country",
	"state_code",
	"city",
	"municipality",
	"neighborhood",
	"street",
	"external_number",
	"internal_number",
	"postal_code",
	"reference",
	"notes",
	"country_code",
	"economic_activity_code",
	"gender",
	"occupation",
	"marital_status",
	"source_of_funds",
	"source_of_wealth",
];

// ─────────────────────────────────────────────────────────────────────────────
// OPERATION BUILDER HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns a base operation row. Pass overrides to customise.
 * payment1 = { form, amount, currency?, date? }
 * payments2..5 optional extras for split scenarios.
 */
function op(rfc, date, amount, payment1, ext, overrides = {}) {
	const base = {
		client_rfc: rfc,
		operation_date: date,
		operation_type_code: "",
		branch_postal_code: "06000",
		amount: String(amount),
		currency: payment1.currency || "MXN",
		exchange_rate:
			payment1.currency && payment1.currency !== "MXN" ? "17.50" : "",
		alert_type_code: "",
		reference_number: "",
		notes: overrides.notes || "",
		// payment 1
		payment_date_1: payment1.date || date,
		payment_form_code_1: String(payment1.form),
		payment_amount_1: String(payment1.amount),
		payment_currency_1: payment1.currency || "MXN",
		payment_exchange_rate_1:
			payment1.currency && payment1.currency !== "MXN" ? "17.50" : "",
		// payments 2-5 empty by default
		payment_date_2: "",
		payment_form_code_2: "",
		payment_amount_2: "",
		payment_currency_2: "",
		payment_exchange_rate_2: "",
		payment_date_3: "",
		payment_form_code_3: "",
		payment_amount_3: "",
		payment_currency_3: "",
		payment_exchange_rate_3: "",
		payment_date_4: "",
		payment_form_code_4: "",
		payment_amount_4: "",
		payment_currency_4: "",
		payment_exchange_rate_4: "",
		payment_date_5: "",
		payment_form_code_5: "",
		payment_amount_5: "",
		payment_currency_5: "",
		payment_exchange_rate_5: "",
		...ext,
		...overrides,
	};
	return base;
}

// Payment form codes: 1=Contado(cash), 2=Diferido, 3=Dacion, 4=Prestamo, 5=Permuta
const CASH = 1;
const DEFER = 2;
const WIRE = 4; // using "Prestamo" as a wire-transfer analog

/**
 * Produce the full scenario row-set for one activity.
 *
 * @param {string} act - activity code
 * @param {function} extFn - function(scenario, amount) → extension fields object
 * @param {object} extras - activity-specific extra rows array (appended at end)
 */
function buildScenarios(act, extFn, extras = []) {
	const noticeMxn = NOTICE_UMA[act] !== null ? mxn(NOTICE_UMA[act]) : null;
	const idMxn = ID_UMA[act] !== null ? mxn(ID_UMA[act]) : null;
	const rows = [];
	let seq = 1; // reference number sequence

	function push(
		rfc,
		date,
		amount,
		payForm,
		currency,
		scenarioNote,
		extraExt = {},
	) {
		const ext = extFn(scenarioNote, amount);
		const cur = currency || "MXN";
		const payAmt = amount;
		rows.push(
			op(
				rfc,
				date,
				amount,
				{ form: payForm, amount: payAmt, currency: cur },
				{ ...ext, ...extraExt },
				{ reference_number: String(seq++), notes: scenarioNote },
			),
		);
	}

	// ── 1. Baseline — well below any threshold ─────────────────────────────────
	const baselineAmt =
		noticeMxn !== null ? Math.round(noticeMxn * 0.1 * 100) / 100 : 5000; // ALWAYS activities: use a small amount
	push(
		RFC.norm1,
		addDays(REF, -60),
		baselineAmt,
		DEFER,
		"MXN",
		"baseline_below_threshold",
	);
	push(
		RFC.norm2,
		addDays(REF, -55),
		baselineAmt,
		DEFER,
		"MXN",
		"baseline_clean",
	);

	// ── 2. At / above identification threshold ────────────────────────────────
	if (idMxn !== null) {
		push(RFC.norm3, addDays(REF, -50), idMxn, DEFER, "MXN", "at_id_threshold");
		push(
			RFC.norm3,
			addDays(REF, -49),
			Math.round(idMxn * 1.2 * 100) / 100,
			DEFER,
			"MXN",
			"above_id_below_notice",
		);
	}

	// ── 3. At and above notice threshold — direct trigger ─────────────────────
	if (noticeMxn !== null) {
		push(
			RFC.norm4,
			addDays(REF, -40),
			noticeMxn,
			DEFER,
			"MXN",
			"at_notice_threshold_direct",
		);
		push(
			RFC.norm1,
			addDays(REF, -39),
			Math.round(noticeMxn * 1.5 * 100) / 100,
			DEFER,
			"MXN",
			"above_notice_threshold",
		);
	} else {
		// ALWAYS notice: use a moderate amount
		push(
			RFC.norm4,
			addDays(REF, -40),
			50000,
			DEFER,
			"MXN",
			"always_notice_moderate",
		);
		push(
			RFC.norm1,
			addDays(REF, -39),
			500000,
			DEFER,
			"MXN",
			"always_notice_high",
		);
	}

	// ── 4. Aggregated notice trigger (3 ops, same client, sum >= notice) ──────
	if (noticeMxn !== null) {
		const chunk = Math.round(noticeMxn * 0.37 * 100) / 100;
		push(RFC.agg, addDays(REF, -90), chunk, DEFER, "MXN", "aggregate_1_of_3");
		push(RFC.agg, addDays(REF, -60), chunk, DEFER, "MXN", "aggregate_2_of_3");
		push(
			RFC.agg,
			addDays(REF, -30),
			Math.round(noticeMxn * 0.4 * 100) / 100,
			DEFER,
			"MXN",
			"aggregate_3_of_3",
		);
	}

	// ── 5. Structuring — 3 ops each ~88-92% of notice (never triggering direct,
	//       but flagged by structuring_detection seeker) ─────────────────────
	if (noticeMxn !== null) {
		const sAmt = Math.round(noticeMxn * 0.9 * 100) / 100;
		push(
			RFC.struct,
			addDays(REF, -85),
			sAmt,
			DEFER,
			"MXN",
			"structuring_1_of_3",
		);
		push(
			RFC.struct,
			addDays(REF, -60),
			sAmt,
			DEFER,
			"MXN",
			"structuring_2_of_3",
		);
		push(
			RFC.struct,
			addDays(REF, -35),
			sAmt,
			DEFER,
			"MXN",
			"structuring_3_of_3",
		);
	}

	// ── 6. Cash payment above threshold (cash_high_value seeker) ─────────────
	if (noticeMxn !== null) {
		push(
			RFC.norm2,
			addDays(REF, -20),
			Math.round(noticeMxn * 1.1 * 100) / 100,
			CASH,
			"MXN",
			"cash_above_threshold",
		);
	}

	// ── 7. Foreign-currency cash (foreign_currency_cash seeker) ───────────────
	push(
		RFC.norm3,
		addDays(REF, -18),
		10000,
		CASH,
		"USD",
		"foreign_currency_cash_usd",
	);

	// ── 8. Split payment — 3 methods (split_payment seeker) ──────────────────
	{
		const splitAmt =
			noticeMxn !== null ? Math.round(noticeMxn * 0.8 * 100) / 100 : 80000;
		const ext = extFn("split_payment_3_methods", splitAmt);
		const row = op(
			RFC.norm4,
			addDays(REF, -15),
			splitAmt,
			{ form: CASH, amount: Math.round(splitAmt * 0.4 * 100) / 100 },
			ext,
			{ reference_number: String(seq++), notes: "split_payment_3_methods" },
		);
		row.payment_form_code_2 = String(DEFER);
		row.payment_amount_2 = String(Math.round(splitAmt * 0.3 * 100) / 100);
		row.payment_currency_2 = "MXN";
		row.payment_form_code_3 = String(WIRE);
		row.payment_amount_3 = String(Math.round(splitAmt * 0.3 * 100) / 100);
		row.payment_currency_3 = "MXN";
		rows.push(row);
	}

	// ── 9. Frequent operations — 3 ops within 30 days (frequent_operations) ───
	{
		const fAmt =
			noticeMxn !== null ? Math.round(noticeMxn * 0.25 * 100) / 100 : 20000;
		push(RFC.freq, addDays(REF, -5), fAmt, DEFER, "MXN", "frequent_op_1_of_3");
		push(RFC.freq, addDays(REF, -12), fAmt, DEFER, "MXN", "frequent_op_2_of_3");
		push(RFC.freq, addDays(REF, -20), fAmt, DEFER, "MXN", "frequent_op_3_of_3");
	}

	// ── 10. Quick refund pair (quick_refund_pattern seeker) ───────────────────
	{
		const rAmt =
			noticeMxn !== null ? Math.round(noticeMxn * 0.5 * 100) / 100 : 50000;
		push(
			RFC.refund,
			addDays(REF, -14),
			rAmt,
			DEFER,
			"MXN",
			"quick_refund_original_purchase",
		);
		push(
			RFC.refund,
			addDays(REF, -7),
			Math.round(rAmt * 0.98 * 100) / 100,
			DEFER,
			"MXN",
			"quick_refund_refund_within_14d",
		);
	}

	// ── 11. Profile mismatch — amount >> 5× average (profile_mismatch seeker) -
	// First, seed 3 low-amount ops to establish an average
	{
		const lowAmt = 5000;
		const highAmt = lowAmt * 7; // > 5× average
		push(
			RFC.profile,
			addDays(REF, -60),
			lowAmt,
			DEFER,
			"MXN",
			"profile_seed_low_1",
		);
		push(
			RFC.profile,
			addDays(REF, -55),
			lowAmt,
			DEFER,
			"MXN",
			"profile_seed_low_2",
		);
		push(
			RFC.profile,
			addDays(REF, -50),
			lowAmt,
			DEFER,
			"MXN",
			"profile_seed_low_3",
		);
		push(
			RFC.profile,
			addDays(REF, -5),
			highAmt,
			DEFER,
			"MXN",
			"profile_mismatch_high_amount",
		);
	}

	// ── 12. Minor client (minor_client seeker) ────────────────────────────────
	{
		const minAmt =
			noticeMxn !== null ? Math.round(noticeMxn * 0.3 * 100) / 100 : 15000;
		push(
			RFC.minor,
			addDays(REF, -3),
			minAmt,
			DEFER,
			"MXN",
			"minor_client_operation",
		);
	}

	// Append any activity-specific extra rows
	for (const r of extras) rows.push(r);

	return rows;
}

// ─────────────────────────────────────────────────────────────────────────────
// ACTIVITY-EXTENSION FACTORIES
// Each returns an object keyed by extension columns for the given activity.
// ─────────────────────────────────────────────────────────────────────────────

function vehExt(scenario, _amount) {
	const types = {
		MARINE: { brand: "Yamaha", model: "Cruiser" },
		AIR: { brand: "Cessna", model: "C172" },
		LAND: { brand: "Toyota", model: "Camry" },
	};
	// Rotate vehicle type for variety
	const vtypes = ["LAND", "MARINE", "AIR"];
	const vt = vtypes[Math.abs(scenario.length) % 3] || "LAND";
	const info = types[vt];
	return {
		vehicle_type: vt,
		brand: info.brand,
		model: info.model,
		year: "2022",
		vin: "",
		repuve: "",
		plates: "",
		serial_number: "",
		flag_country_code: "",
		registration_number: "",
		armor_level_code: "",
		engine_number: "",
		description: `AML test - ${scenario}`,
	};
}

function inmExt(scenario) {
	return {
		property_type_code: "1",
		street: "Reforma",
		external_number: "222",
		internal_number: "",
		neighborhood: "Juarez",
		postal_code: "06600",
		municipality: "Cuauhtemoc",
		state_code: "9",
		country_code: "MEX",
		registry_folio: "",
		registry_date: "",
		land_area_m2: "120",
		construction_area_m2: "90",
		client_figure_code: "",
		person_figure_code: "",
		description: `AML test - ${scenario}`,
	};
}

function mjrExt(scenario) {
	return {
		item_type_code: "5",
		metal_type: "",
		weight_grams: "10.5",
		purity: "18K",
		jewelry_description: `Test jewelry - ${scenario}`,
		brand: "Generic",
		serial_number: "",
		trade_unit_code: "1",
		quantity: "1",
		unit_price: "",
	};
}

function aviExt(_scenario) {
	return {
		asset_type_code: "1",
		asset_name: "BTC",
		wallet_address_origin: "1A1zP1eP5QGefi2DMPTfTL5SLmv7Divf",
		wallet_address_destination: "",
		exchange_name: "Bitso",
		exchange_country_code: "MX",
		asset_quantity: "0.01",
		asset_unit_price: "",
		blockchain_tx_hash: "",
	};
}

function jysExt(scenario) {
	return {
		game_type_code: "",
		business_line_code: "9",
		operation_method_code: "1",
		prize_amount: "",
		bet_amount: "",
		ticket_number: String(Math.floor(Math.random() * 999999)),
		event_name: "Sorteo Test",
		event_date: REF,
		property_type_code: "",
		property_description: `AML test - ${scenario}`,
	};
}

function ariExt(scenario) {
	return {
		property_type_code: "2",
		rental_period_months: "12",
		monthly_rent: "",
		deposit_amount: "",
		contract_start_date: addDays(REF, -30),
		contract_end_date: addDays(REF, 335),
		street: "Insurgentes",
		external_number: "1500",
		internal_number: "4B",
		neighborhood: "Florida",
		postal_code: "01030",
		municipality: "Alvaro Obregon",
		state_code: "9",
		is_prepaid: "false",
		prepaid_months: "",
		description: `AML test - ${scenario}`,
	};
}

function bliExt(scenario) {
	return {
		item_type: "VEHICULO",
		item_status_code: "1",
		armor_level_code: "4",
		armored_part_code: "",
		vehicle_type: "LAND",
		vehicle_brand: "BMW",
		vehicle_model: "X5",
		vehicle_year: "2023",
		vehicle_vin: "",
		vehicle_plates: "",
		service_description: `AML test - ${scenario}`,
	};
}

function donExt(scenario) {
	return {
		donation_type: "EFECTIVO",
		purpose: "Donativo institucional",
		item_type_code: "",
		item_description: "",
		item_value: "",
		is_anonymous: "false",
		campaign_name: `Campana AML test - ${scenario}`,
	};
}

function mpcExt(_scenario, amount) {
	return {
		loan_type_code: "1",
		guarantee_type_code: "",
		principal_amount: String(amount),
		interest_rate: "12.5",
		term_months: "36",
		monthly_payment: "",
		disbursement_date: REF,
		maturity_date: addDays(REF, 365 * 3),
		guarantee_description: "",
		guarantee_value: "",
	};
}

function fepExt(scenario) {
	return {
		act_type_code: "1",
		instrument_number: "INST-001",
		instrument_date: addDays(REF, -5),
		trust_type_code: "",
		trust_identifier: "",
		trust_purpose: "",
		movement_type_code: "",
		assignment_type_code: "",
		merger_type_code: "",
		incorporation_reason_code: "",
		patrimony_modification_type_code: "",
		power_of_attorney_type_code: "",
		granting_type_code: "",
		shareholder_position_code: "",
		share_percentage: "",
		item_type_code: "",
		item_description: `AML test - ${scenario}`,
		item_value: "",
	};
}

function fesExt(scenario) {
	return {
		act_type_code: "1",
		notary_number: "42",
		notary_state_code: "9",
		instrument_number: "FES-001",
		instrument_date: addDays(REF, -5),
		legal_entity_type_code: "",
		person_character_type_code: "",
		incorporation_reason_code: "",
		patrimony_modification_type_code: "",
		power_of_attorney_type_code: "",
		granting_type_code: "",
		shareholder_position_code: "",
		share_percentage: "",
		item_type_code: "",
		item_description: `AML test - ${scenario}`,
		appraisal_value: "",
		guarantee_type_code: "",
	};
}

function sprExt(scenario) {
	return {
		service_type_code: "1",
		service_area_code: "14",
		client_figure_code: "",
		contribution_reason_code: "",
		assignment_type_code: "",
		merger_type_code: "",
		incorporation_reason_code: "",
		shareholder_position_code: "",
		share_percentage: "",
		managed_asset_type_code: "",
		management_status_code: "",
		financial_institution_type_code: "",
		financial_institution_name: "",
		occupation_code: "1",
		service_description: `Servicios legales AML test - ${scenario}`,
	};
}

function chvExt() {
	return {
		denomination_code: "1",
		check_count: "10",
		serial_numbers: "",
		issuer_name: "American Express",
		issuer_country_code: "US",
	};
}

function tscExt() {
	return {
		card_type_code: "2",
		card_number_masked: "4111-****-****-1234",
		card_brand: "Visa",
		issuer_name: "Banamex",
		credit_limit: "50000",
		transaction_type: "COMPRA",
	};
}

function tppExt() {
	return {
		card_type: "PREPAGO",
		card_number_masked: "5555-****-****-4444",
		is_initial_load: "true",
		reload_amount: "",
		current_balance: "",
		issuer_name: "Oxxo Pay",
	};
}

function tdrExt() {
	return {
		reward_type: "PUNTOS",
		program_name: "Club Puntos Test",
		points_amount: "10000",
		points_value: "",
		points_expiry_date: addDays(REF, 365),
		redemption_type: "TRANSFERENCIA",
		redemption_description: "",
	};
}

function tcvExt(scenario) {
	return {
		value_type_code: "1",
		service_type_code: "2",
		transport_method: "Terrestre",
		origin_address: "CDMX",
		destination_address: "Monterrey",
		custody_start_date: REF,
		custody_end_date: addDays(REF, 30),
		storage_location: "Boveda Segura",
		declared_value: "",
		insured_value: "",
		description: `AML test - ${scenario}`,
	};
}

function obaExt(_scenario) {
	return {
		artwork_type_code: "1",
		title: "Obra de Arte Test",
		artist: "Artista Test",
		year_created: "1990",
		medium: "Oleo sobre tela",
		dimensions: "100x80 cm",
		provenance: "Coleccion privada",
		certificate_authenticity: "SI",
		previous_owner: "Galeria Test",
		is_antique: "false",
		auction_house: "",
		lot_number: "",
	};
}

function dinExt(scenario) {
	return {
		development_type_code: "1",
		credit_type_code: "1",
		project_name: `Proyecto Habitacional AML ${scenario}`,
		project_location: "Zona Norte CDMX",
		contribution_type: "CAPITAL",
		contribution_amount: "",
		third_party_type_code: "1",
		third_party_name: "Constructora Test",
		financial_institution_type_code: "",
		financial_institution_name: "",
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// GENERATE OPERATIONS PER ACTIVITY
// ─────────────────────────────────────────────────────────────────────────────

function genVEH() {
	const extras = [];
	const noticeMxn = mxn(NOTICE_UMA.VEH);
	let seq = 1000;

	// All 3 vehicle types
	for (const [vt, brand, model] of [
		["LAND", "Ford", "F-150"],
		["MARINE", "SeaDoo", "GTX"],
		["AIR", "Piper", "PA-28"],
	]) {
		extras.push(
			op(
				RFC.norm2,
				addDays(REF, -45),
				mxn(1000),
				{ form: DEFER, amount: mxn(1000) },
				{
					vehicle_type: vt,
					brand,
					model,
					year: "2021",
					vin: "",
					repuve: "",
					plates: "",
					serial_number: "",
					flag_country_code: "",
					registration_number: "",
					armor_level_code: "",
					engine_number: "",
					description: `vehicle_type_${vt}`,
				},
				{ reference_number: String(seq++), notes: `vehicle_type_${vt}` },
			),
		);
	}

	// New client high-value (>= 2,000,000 MXN)  — triggers new_client_high_value seeker
	extras.push(
		op(
			RFC.newcli,
			REF,
			2100000,
			{ form: DEFER, amount: 2100000 },
			{
				vehicle_type: "AIR",
				brand: "Bombardier",
				model: "Learjet",
				year: "2023",
				vin: "",
				repuve: "",
				plates: "",
				serial_number: "",
				flag_country_code: "US",
				registration_number: "",
				armor_level_code: "",
				engine_number: "",
				description: "new_client_high_value",
			},
			{ reference_number: String(seq++), notes: "new_client_high_value" },
		),
	);

	// Cash fragmentation — 2 cash payments in 30 days with similar amounts
	const fragAmt = Math.round(noticeMxn * 0.48 * 100) / 100;
	for (let f = 0; f < 2; f++) {
		extras.push(
			op(
				RFC.shared,
				addDays(REF, -(28 - f * 14)),
				fragAmt,
				{ form: CASH, amount: fragAmt },
				{
					vehicle_type: "LAND",
					brand: "Nissan",
					model: "Versa",
					year: "2022",
					vin: "",
					repuve: "",
					plates: "",
					serial_number: "",
					flag_country_code: "",
					registration_number: "",
					armor_level_code: "",
					engine_number: "",
					description: `cash_fragmentation_${f + 1}_of_2`,
				},
				{
					reference_number: String(seq++),
					notes: `cash_fragmentation_${f + 1}_of_2`,
				},
			),
		);
	}

	return buildScenarios("VEH", vehExt, extras);
}

function genINM() {
	const extras = [];
	let seq = 2000;
	// Antique building (high risk)
	extras.push(
		op(
			RFC.norm3,
			addDays(REF, -10),
			mxn(500),
			{ form: DEFER, amount: mxn(500) },
			{
				...inmExt("historic_building"),
				property_type_code: "99",
				description: "historic_building_other",
			},
			{
				reference_number: String(seq++),
				notes: "historic_building_other_type",
			},
		),
	);
	return buildScenarios("INM", (s) => inmExt(s), extras);
}

function genMJR() {
	const extras = [];
	let seq = 3000;
	// All major item types
	for (const code of ["1", "5", "11", "12"]) {
		extras.push(
			op(
				RFC.norm4,
				addDays(REF, -(10 + Number(code))),
				mxn(200),
				{ form: DEFER, amount: mxn(200) },
				{ ...mjrExt(`item_type_${code}`), item_type_code: code },
				{ reference_number: String(seq++), notes: `mjr_item_type_${code}` },
			),
		);
	}
	return buildScenarios("MJR", (s) => mjrExt(s), extras);
}

function genAVI() {
	const extras = [];
	let seq = 4000;
	// Quick fund movement — deposit then withdrawal within 48h (quick_fund_movement seeker)
	const aviAmt = mxn(300);
	extras.push(
		op(
			RFC.newcli,
			REF,
			aviAmt,
			{ form: DEFER, amount: aviAmt },
			{
				asset_type_code: "1",
				asset_name: "BTC",
				wallet_address_origin: "1A1zP1eP5QGefi2DMPTfTL5SLmv7Divf",
				wallet_address_destination: "",
				exchange_name: "Bitso",
				exchange_country_code: "MX",
				asset_quantity: "0.02",
				asset_unit_price: "",
				blockchain_tx_hash: "",
			},
			{ reference_number: String(seq++), notes: "quick_fund_buy" },
		),
	);
	extras.push(
		op(
			RFC.newcli,
			addDays(REF, 1),
			Math.round(aviAmt * 0.97 * 100) / 100,
			{ form: DEFER, amount: Math.round(aviAmt * 0.97 * 100) / 100 },
			{
				asset_type_code: "1",
				asset_name: "BTC",
				wallet_address_origin: "",
				wallet_address_destination: "3FZbgi29cpjq2GjdwV8eyHuJJnkLtktZc5",
				exchange_name: "Bitso",
				exchange_country_code: "MX",
				asset_quantity: "0.019",
				asset_unit_price: "",
				blockchain_tx_hash: "",
			},
			{
				reference_number: String(seq++),
				notes: "quick_fund_withdrawal_within_48h",
			},
		),
	);
	// High-risk privacy coin
	extras.push(
		op(
			RFC.norm1,
			addDays(REF, -8),
			mxn(250),
			{ form: DEFER, amount: mxn(250) },
			{
				asset_type_code: "2",
				asset_name: "XMR",
				wallet_address_origin:
					"44AFFq5kSiGBoZ4NMDwYtN18obc8AemS33DBLWs3H7otXft3",
				wallet_address_destination: "",
				exchange_name: "LocalCrypto",
				exchange_country_code: "MX",
				asset_quantity: "1",
				asset_unit_price: "",
				blockchain_tx_hash: "",
			},
			{ reference_number: String(seq++), notes: "privacy_coin_monero" },
		),
	);
	return buildScenarios("AVI", (s) => aviExt(s), extras);
}

function genJYS() {
	// JYS has no activity-required fields; core + gambling extension
	return buildScenarios("JYS", (s) => jysExt(s));
}

function genARI() {
	const extras = [];
	let seq = 6000;
	// Prepaid rental — unusual payment pattern
	extras.push(
		op(
			RFC.norm3,
			addDays(REF, -15),
			mxn(2000),
			{ form: WIRE, amount: mxn(2000) },
			{ ...ariExt("prepaid_rental"), is_prepaid: "true", prepaid_months: "12" },
			{ reference_number: String(seq++), notes: "prepaid_12_months_wire" },
		),
	);
	return buildScenarios("ARI", (s) => ariExt(s), extras);
}

function genBLI() {
	const extras = [];
	let seq = 7000;
	// Different armor levels
	for (const level of ["1", "4", "7", "9"]) {
		extras.push(
			op(
				RFC.norm4,
				addDays(REF, -(5 + Number(level))),
				mxn(1000),
				{ form: DEFER, amount: mxn(1000) },
				{ ...bliExt(`armor_level_${level}`), armor_level_code: level },
				{ reference_number: String(seq++), notes: `armor_level_${level}` },
			),
		);
	}
	return buildScenarios("BLI", (s) => bliExt(s), extras);
}

function genDON() {
	const extras = [];
	let seq = 8000;
	// Anonymous donation
	extras.push(
		op(
			RFC.norm2,
			addDays(REF, -12),
			mxn(800),
			{ form: CASH, amount: mxn(800) },
			{ ...donExt("anonymous_cash"), is_anonymous: "true" },
			{ reference_number: String(seq++), notes: "anonymous_cash_donation" },
		),
	);
	// In-kind donation
	extras.push(
		op(
			RFC.norm3,
			addDays(REF, -11),
			mxn(600),
			{ form: DEFER, amount: mxn(600) },
			{
				...donExt("in_kind"),
				donation_type: "ESPECIE",
				item_description: "Computadoras usadas",
				item_value: String(mxn(600)),
			},
			{ reference_number: String(seq++), notes: "in_kind_donation" },
		),
	);
	return buildScenarios("DON", (s) => donExt(s), extras);
}

function genMPC() {
	const extras = [];
	let seq = 9000;
	// With guarantee
	extras.push(
		op(
			RFC.moral1,
			addDays(REF, -20),
			mxn(1000),
			{ form: DEFER, amount: mxn(1000) },
			{
				...mpcExt("guaranteed_loan", mxn(1000)),
				loan_type_code: "2",
				guarantee_type_code: "1",
				guarantee_description: "Hipoteca sobre inmueble",
				guarantee_value: String(mxn(1200)),
			},
			{ reference_number: String(seq++), notes: "loan_with_guarantee" },
		),
	);
	return buildScenarios("MPC", (s, a) => mpcExt(s, a), extras);
}

function genFEP() {
	const extras = [];
	let seq = 10000;
	// Trust operation
	extras.push(
		op(
			RFC.trust1,
			addDays(REF, -14),
			mxn(5000),
			{ form: WIRE, amount: mxn(5000) },
			{
				...fepExt("trust_operation"),
				act_type_code: "1",
				trust_type_code: "1",
				trust_identifier: "FIDEI-001",
				trust_purpose: "Fideicomiso de administracion",
			},
			{ reference_number: String(seq++), notes: "fep_trust_operation" },
		),
	);
	// Majority ownership change
	extras.push(
		op(
			RFC.moral1,
			addDays(REF, -13),
			mxn(2000),
			{ form: WIRE, amount: mxn(2000) },
			{
				...fepExt("majority_ownership"),
				act_type_code: "1",
				shareholder_position_code: "1",
				share_percentage: "75",
			},
			{ reference_number: String(seq++), notes: "fep_majority_ownership" },
		),
	);
	return buildScenarios("FEP", (s) => fepExt(s), extras);
}

function genFES() {
	const extras = [];
	let seq = 11000;
	// Adjudication act
	extras.push(
		op(
			RFC.norm2,
			addDays(REF, -10),
			mxn(3000),
			{ form: WIRE, amount: mxn(3000) },
			{ ...fesExt("adjudication"), act_type_code: "3" },
			{ reference_number: String(seq++), notes: "fes_adjudication_act" },
		),
	);
	// Dacion en pago
	extras.push(
		op(
			RFC.norm3,
			addDays(REF, -9),
			mxn(2500),
			{ form: WIRE, amount: mxn(2500) },
			{ ...fesExt("dacion_en_pago"), act_type_code: "2" },
			{ reference_number: String(seq++), notes: "fes_dacion_en_pago" },
		),
	);
	return buildScenarios("FES", (s) => fesExt(s), extras);
}

function genSPR() {
	const extras = [];
	let seq = 12000;
	// Real estate purchase service (high risk)
	extras.push(
		op(
			RFC.norm1,
			addDays(REF, -6),
			mxn(1500),
			{ form: WIRE, amount: mxn(1500) },
			{
				...sprExt("real_estate_service"),
				service_type_code: "1",
				service_area_code: "1",
				service_description: "Asesoria en compraventa de inmueble",
			},
			{ reference_number: String(seq++), notes: "spr_real_estate_advisory" },
		),
	);
	// Corporate management service
	extras.push(
		op(
			RFC.moral1,
			addDays(REF, -5),
			mxn(2000),
			{ form: WIRE, amount: mxn(2000) },
			{
				...sprExt("corporate_management"),
				service_type_code: "2",
				service_area_code: "2",
				managed_asset_type_code: "1",
				management_status_code: "1",
			},
			{ reference_number: String(seq++), notes: "spr_corporate_management" },
		),
	);
	return buildScenarios("SPR", (s) => sprExt(s), extras);
}

function genCHV() {
	const extras = [];
	let seq = 13000;
	// Different denominations
	for (const [code, name] of [
		["2", "CAD"],
		["4", "GBP"],
		["5", "EUR"],
	]) {
		extras.push(
			op(
				RFC.card,
				addDays(REF, -(5 + Number(code))),
				mxn(200),
				{ form: CASH, amount: mxn(200) },
				{
					denomination_code: code,
					check_count: "5",
					serial_numbers: "",
					issuer_name: "AMEX",
					issuer_country_code: "US",
				},
				{ reference_number: String(seq++), notes: `chv_denomination_${name}` },
			),
		);
	}
	// Multiple cards — 3 ops in 30 days (multiple_cards_requests seeker)
	for (let m = 0; m < 3; m++) {
		extras.push(
			op(
				RFC.card,
				addDays(REF, -(10 + m * 3)),
				mxn(150),
				{ form: CASH, amount: mxn(150) },
				{
					denomination_code: "1",
					check_count: "3",
					serial_numbers: "",
					issuer_name: "Thomas Cook",
					issuer_country_code: "GB",
				},
				{
					reference_number: String(seq++),
					notes: `chv_multiple_cards_${m + 1}_of_3`,
				},
			),
		);
	}
	return buildScenarios("CHV", () => chvExt(), extras);
}

function genTSC() {
	const extras = [];
	let seq = 14000;
	// Multiple card requests — 3 ops in 30 days
	for (let m = 0; m < 3; m++) {
		extras.push(
			op(
				RFC.card,
				addDays(REF, -(8 + m * 3)),
				mxn(600),
				{ form: DEFER, amount: mxn(600) },
				{ ...tscExt(), card_type_code: m % 2 === 0 ? "2" : "1" },
				{
					reference_number: String(seq++),
					notes: `tsc_multiple_cards_${m + 1}_of_3`,
				},
			),
		);
	}
	return buildScenarios("TSC", () => tscExt(), extras);
}

function genTPP() {
	const extras = [];
	let seq = 15000;
	// Multiple reloads (multiple_cards_requests seeker applies to TPP)
	for (let m = 0; m < 3; m++) {
		extras.push(
			op(
				RFC.card,
				addDays(REF, -(6 + m * 3)),
				mxn(400),
				{ form: CASH, amount: mxn(400) },
				{
					...tppExt(),
					is_initial_load: m === 0 ? "true" : "false",
					reload_amount: String(mxn(400)),
					current_balance: String(mxn(400) * (m + 1)),
				},
				{
					reference_number: String(seq++),
					notes: `tpp_multiple_loads_${m + 1}_of_3`,
				},
			),
		);
	}
	return buildScenarios("TPP", () => tppExt(), extras);
}

function genTDR() {
	const extras = [];
	let seq = 16000;
	// Multiple reward redemptions (multiple_cards_requests seeker)
	for (let m = 0; m < 3; m++) {
		const types = ["PUNTOS", "MILLAS", "CASHBACK"];
		extras.push(
			op(
				RFC.card,
				addDays(REF, -(7 + m * 3)),
				mxn(400),
				{ form: DEFER, amount: mxn(400) },
				{
					reward_type: types[m],
					program_name: `Programa ${types[m]}`,
					points_amount: "50000",
					points_value: "",
					points_expiry_date: addDays(REF, 180),
					redemption_type: "EFECTIVO",
					redemption_description: "",
				},
				{
					reference_number: String(seq++),
					notes: `tdr_multiple_rewards_${m + 1}_of_3`,
				},
			),
		);
	}
	return buildScenarios("TDR", () => tdrExt(), extras);
}

function genTCV() {
	const extras = [];
	let seq = 17000;
	// Different value types
	for (const [code, name] of [
		["3", "joyas"],
		["4", "arte"],
		["8", "titulos"],
	]) {
		extras.push(
			op(
				RFC.norm4,
				addDays(REF, -(5 + Number(code))),
				mxn(1000),
				{ form: WIRE, amount: mxn(1000) },
				{ ...tcvExt(`value_type_${name}`), value_type_code: code },
				{ reference_number: String(seq++), notes: `tcv_value_type_${name}` },
			),
		);
	}
	return buildScenarios("TCV", (s) => tcvExt(s), extras);
}

function genOBA() {
	const extras = [];
	let seq = 18000;
	// Antique — triggers is_antique risk factor
	extras.push(
		op(
			RFC.norm2,
			addDays(REF, -8),
			mxn(3000),
			{ form: WIRE, amount: mxn(3000) },
			{
				artwork_type_code: "8",
				title: "Pieza Antigua Siglo XVIII",
				artist: "Desconocido",
				year_created: "1750",
				medium: "Ceramica",
				dimensions: "30x20 cm",
				provenance: "Subasta europea",
				certificate_authenticity: "NO",
				previous_owner: "Comerciante europeo",
				is_antique: "true",
				auction_house: "Sothebys",
				lot_number: "L-4521",
			},
			{ reference_number: String(seq++), notes: "oba_antique_high_risk" },
		),
	);
	// No certificate of authenticity
	extras.push(
		op(
			RFC.norm3,
			addDays(REF, -7),
			mxn(2000),
			{ form: CASH, amount: mxn(2000) },
			{
				artwork_type_code: "1",
				title: "Pintura Sin Certificado",
				artist: "Artista Desconocido",
				year_created: "2000",
				medium: "Acrilico",
				dimensions: "80x60 cm",
				provenance: "",
				certificate_authenticity: "NO",
				previous_owner: "",
				is_antique: "false",
				auction_house: "",
				lot_number: "",
			},
			{ reference_number: String(seq++), notes: "oba_no_certificate" },
		),
	);
	return buildScenarios("OBA", (s) => obaExt(s), extras);
}

function genDIN() {
	const extras = [];
	let seq = 19000;
	// Different development types
	for (const [code, name] of [
		["2", "comercial"],
		["5", "mixto"],
	]) {
		extras.push(
			op(
				RFC.moral1,
				addDays(REF, -(6 + Number(code))),
				mxn(5000),
				{ form: WIRE, amount: mxn(5000) },
				{ ...dinExt(`dev_type_${name}`), development_type_code: code },
				{ reference_number: String(seq++), notes: `din_dev_type_${name}` },
			),
		);
	}
	return buildScenarios("DIN", (s) => dinExt(s), extras);
}

// ─────────────────────────────────────────────────────────────────────────────
// COVERAGE / BULK OPERATION GENERATION
//
// The scenario rows above only use ~16 named clients.  This section ensures
// that (almost) every client from the 100-client pool appears in at least one
// operations CSV, and bulks each activity up to 60-100+ rows for realistic
// import testing.
// ─────────────────────────────────────────────────────────────────────────────

// Clients intentionally left WITHOUT any operations (edge-case testing)
const NO_OPS_INDICES = [10, 11, 12];

// Client indices already covered by named RFC handles in scenarios
const SCENARIO_INDICES = new Set([
	0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 20, 21, 22, 23, 70, 95,
]);

// Extension factory per activity — reuse the ones already defined above
const EXT_FACTORIES = {
	VEH: vehExt,
	INM: (s) => inmExt(s),
	MJR: (s) => mjrExt(s),
	AVI: (s) => aviExt(s),
	JYS: (s) => jysExt(s),
	ARI: (s) => ariExt(s),
	BLI: (s) => bliExt(s),
	DON: (s) => donExt(s),
	MPC: (s, a) => mpcExt(s, a),
	FEP: (s) => fepExt(s),
	FES: (s) => fesExt(s),
	SPR: (s) => sprExt(s),
	CHV: () => chvExt(),
	TSC: () => tscExt(),
	TPP: () => tppExt(),
	TDR: () => tdrExt(),
	TCV: (s) => tcvExt(s),
	OBA: (s) => obaExt(s),
	DIN: (s) => dinExt(s),
};

const ALL_ACTIVITIES = Object.keys(EXT_FACTORIES);

/**
 * Build a mapping: activityCode → array of client indices to generate
 * coverage operations for.  Each active, uncovered client is assigned
 * to 2-4 random activities.  Scenario clients also get 1-2 extra
 * activity assignments for bulk.
 */
function buildCoverageAssignments() {
	const assignments = {};
	for (const act of ALL_ACTIVITIES) assignments[act] = [];

	// Deterministic but well-distributed assignment via simple hashing
	function activitiesFor(clientIdx, count) {
		const picks = [];
		for (let k = 0; picks.length < count && k < ALL_ACTIVITIES.length; k++) {
			const h = ((clientIdx + 1) * 7 + k * 31) % ALL_ACTIVITIES.length;
			if (!picks.includes(ALL_ACTIVITIES[h])) picks.push(ALL_ACTIVITIES[h]);
		}
		// Fallback: fill remaining slots sequentially
		for (let k = 0; picks.length < count; k++) {
			const act = ALL_ACTIVITIES[k % ALL_ACTIVITIES.length];
			if (!picks.includes(act)) picks.push(act);
		}
		return picks;
	}

	for (let i = 0; i < CLIENT_ROWS.length; i++) {
		if (NO_OPS_INDICES.includes(i)) continue;

		if (SCENARIO_INDICES.has(i)) {
			// Scenario clients already appear — give them 1-2 extra activities
			const extras = activitiesFor(i, 1 + (i % 2));
			for (const act of extras) assignments[act].push(i);
		} else {
			// Uncovered clients — assign to 2-4 activities
			const count = 2 + (i % 3); // 2, 3, or 4
			const acts = activitiesFor(i, count);
			for (const act of acts) assignments[act].push(i);
		}
	}

	return assignments;
}

const COVERAGE_ASSIGNMENTS = buildCoverageAssignments();

// Payment form codes used for coverage rows (rotate for variety)
const COV_PAY_FORMS = [DEFER, CASH, WIRE, DEFER, DEFER];

/**
 * Generate coverage (bulk) rows for a given activity.
 * Each assigned client gets 2-4 operations with varied dates and amounts.
 */
function generateCoverageRows(act) {
	const clientIndices = COVERAGE_ASSIGNMENTS[act] || [];
	const extFn = EXT_FACTORIES[act];
	const noticeMxn = NOTICE_UMA[act] !== null ? mxn(NOTICE_UMA[act]) : null;
	const rows = [];
	let seq = 5000; // high base to avoid collisions with scenario ref numbers

	for (const ci of clientIndices) {
		const rfc = CLIENT_ROWS[ci].rfc;
		const opsCount = 2 + (ci % 3); // 2, 3, or 4 operations

		for (let j = 0; j < opsCount; j++) {
			const dayOffset = -(((ci * 3 + j * 7) % 120) + 1); // -1 to -121 days
			const date = addDays(REF, dayOffset);

			// Amount: varied, generally below notice to keep these as "normal business"
			const baseAmt =
				noticeMxn !== null
					? Math.round(
							noticeMxn * (0.1 + ((ci * 7 + j * 13) % 60) / 100) * 100,
						) / 100
					: Math.round((5000 + ((ci * 11 + j * 17) % 200) * 500) * 100) / 100;

			const payForm = COV_PAY_FORMS[(ci + j) % COV_PAY_FORMS.length];
			const cur = "MXN";
			const ext = extFn(`coverage_client_${ci}`, baseAmt);

			rows.push(
				op(
					rfc,
					date,
					baseAmt,
					{ form: payForm, amount: baseAmt, currency: cur },
					ext,
					{
						reference_number: String(seq++),
						notes: `coverage_client_${ci}_op_${j + 1}`,
					},
				),
			);
		}
	}

	return rows;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n═══════════════════════════════════════════════════════════");
console.log("  AML Synthetic Test Data Generator");
console.log("═══════════════════════════════════════════════════════════\n");

// 1. Clients
write("clients.csv", CLIENT_HEADERS, CLIENT_ROWS);

// 2. Operations per activity (scenarios + coverage bulk)
const GENERATORS = {
	VEH: genVEH,
	INM: genINM,
	MJR: genMJR,
	AVI: genAVI,
	JYS: genJYS,
	ARI: genARI,
	BLI: genBLI,
	DON: genDON,
	MPC: genMPC,
	FEP: genFEP,
	FES: genFES,
	SPR: genSPR,
	CHV: genCHV,
	TSC: genTSC,
	TPP: genTPP,
	TDR: genTDR,
	TCV: genTCV,
	OBA: genOBA,
	DIN: genDIN,
};

// Track which clients appear in at least one activity (for summary)
const clientsWithOps = new Set();
let totalOps = 0;

for (const [act, gen] of Object.entries(GENERATORS)) {
	const scenarioRows = gen();
	const coverageRows = generateCoverageRows(act);
	const allRows = [...scenarioRows, ...coverageRows];

	for (const row of allRows) clientsWithOps.add(row.client_rfc);
	totalOps += allRows.length;

	write(`operations_${act.toLowerCase()}.csv`, opHeaders(act), allRows);
}

console.log("\n═══════════════════════════════════════════════════════════");
console.log(`  Done! Files written to: ${OUT}`);
console.log("═══════════════════════════════════════════════════════════\n");

console.log(`  Total clients:              ${CLIENT_ROWS.length}`);
console.log(`  Clients with operations:    ${clientsWithOps.size}`);
console.log(
	`  Clients without operations: ${CLIENT_ROWS.length - clientsWithOps.size} (intentional edge cases: indices ${NO_OPS_INDICES.join(", ")})`,
);
console.log(`  Total operation rows:       ${totalOps}`);
console.log();

console.log("RFC handles for cross-referencing:");
for (const [k, v] of Object.entries(RFC)) {
	console.log(`  ${k.padEnd(10)} ${v}`);
}
console.log();
