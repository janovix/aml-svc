#!/usr/bin/env node
/**
 * Validates all generated CSVs against the import rules defined in:
 *   - aml-import-worker/src/processors/client-processor.ts
 *   - aml-import-worker/src/processors/operation-processor.ts
 *   - aml-svc/src/domain/import/template-columns.ts
 *   - aml-svc/src/domain/client/schemas.ts  (RFC / CURP regex)
 *
 * Exit 0 = all checks pass.  Exit 1 = failures found.
 */

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const OUT = join(__dirname, "output");

// ── Regex from aml-svc/src/domain/client/schemas.ts ──────────────────────────
const RFC_PHYS = /^[A-ZÑ&]{4}\d{6}[A-Z0-9]{3}$/i;
const RFC_MORAL = /^[A-ZÑ&]{3}\d{6}[A-Z0-9]{3}$/i;
const CURP_RE = /^[A-Z][AEIOUX][A-Z]{2}\d{6}[HM][A-Z]{5}[A-Z0-9]{2}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// ── Thresholds from template-columns.ts (required fields per activity) ────────
const ACT_REQUIRED = {
	VEH: ["vehicle_type", "brand", "model", "year"],
	INM: ["property_type_code"],
	MJR: ["item_type_code"],
	AVI: ["asset_type_code"],
	JYS: [],
	ARI: ["property_type_code"],
	BLI: ["item_type", "armor_level_code"],
	DON: ["donation_type"],
	MPC: ["principal_amount"],
	FEP: ["act_type_code"],
	FES: ["act_type_code"],
	SPR: ["service_type_code"],
	CHV: ["denomination_code", "check_count"],
	TSC: ["card_type_code"],
	TPP: ["card_type"],
	TDR: ["reward_type"],
	TCV: ["value_type_code"],
	OBA: ["artwork_type_code"],
	DIN: ["development_type_code"],
};

const CORE_OP_REQUIRED = [
	"client_rfc",
	"operation_date",
	"branch_postal_code",
	"amount",
	"currency",
	"payment_form_code_1",
	"payment_amount_1",
];

// ── CSV parser ────────────────────────────────────────────────────────────────
function parseCsv(text) {
	const lines = text
		.replace(/\r\n/g, "\n")
		.replace(/\r/g, "\n")
		.split("\n")
		.filter((l) => l.trim());
	if (lines.length < 2) return { headers: [], rows: [] };
	const headers = lines[0].split(",").map((h) => h.trim());
	const rows = lines.slice(1).map((line) => {
		const cells = [];
		let cur = "",
			inQuote = false;
		for (let i = 0; i < line.length; i++) {
			const ch = line[i];
			if (ch === '"') {
				if (inQuote && line[i + 1] === '"') {
					cur += '"';
					i++;
				} else {
					inQuote = !inQuote;
				}
			} else if (ch === "," && !inQuote) {
				cells.push(cur);
				cur = "";
			} else {
				cur += ch;
			}
		}
		cells.push(cur);
		const row = {};
		headers.forEach((h, i) => {
			row[h] = (cells[i] || "").trim();
		});
		return row;
	});
	return { headers, rows };
}

function loadCsv(filename) {
	const text = readFileSync(join(OUT, filename), "utf-8");
	return parseCsv(text);
}

// ── Test harness ──────────────────────────────────────────────────────────────
let errors = 0;
let warnings = 0;

function fail(file, row, msg) {
	console.error(`  ✗ [${file}] row ${row}: ${msg}`);
	errors++;
}
function warn(file, row, msg) {
	console.warn(`  ⚠ [${file}] row ${row}: ${msg}`);
	warnings++;
}
function pass(msg) {
	console.log(`  ✓ ${msg}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// VALIDATE CLIENTS
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n── Validating clients.csv ──────────────────────────────────");
const { headers: cHeaders, rows: clients } = loadCsv("clients.csv");

// Header check
const EXPECTED_CLIENT_HEADERS = [
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
for (const h of EXPECTED_CLIENT_HEADERS) {
	if (!cHeaders.includes(h))
		fail("clients.csv", "header", `Missing column: ${h}`);
}
pass(`clients.csv headers present (${cHeaders.length} columns)`);

// Row count
if (clients.length !== 100)
	fail("clients.csv", "-", `Expected 100 rows, got ${clients.length}`);
else pass(`clients.csv has 100 rows`);

// Segment counts
const physCount = clients.filter((r) => r.person_type === "physical").length;
const moralCount = clients.filter((r) => r.person_type === "moral").length;
const trustCount = clients.filter((r) => r.person_type === "trust").length;
if (physCount !== 70)
	fail("clients.csv", "-", `Expected 70 physical, got ${physCount}`);
if (moralCount !== 25)
	fail("clients.csv", "-", `Expected 25 moral, got ${moralCount}`);
if (trustCount !== 5)
	fail("clients.csv", "-", `Expected 5 trust, got ${trustCount}`);
pass(
	`Segment counts: physical=${physCount}, moral=${moralCount}, trust=${trustCount}`,
);

// Per-row validation
const rfcSet = new Set();
for (let i = 0; i < clients.length; i++) {
	const r = clients[i];
	const row = i + 2; // 1-indexed + header
	const pt = r.person_type?.toLowerCase();

	// Uniqueness
	if (rfcSet.has(r.rfc)) fail("clients.csv", row, `Duplicate RFC: ${r.rfc}`);
	rfcSet.add(r.rfc);

	if (pt === "physical") {
		// Required fields
		for (const f of [
			"rfc",
			"first_name",
			"last_name",
			"birth_date",
			"curp",
			"email",
			"phone",
			"country",
			"state_code",
			"city",
			"municipality",
			"neighborhood",
			"street",
			"external_number",
			"postal_code",
		]) {
			if (!r[f]) fail("clients.csv", row, `Missing required field: ${f}`);
		}
		// RFC format
		if (r.rfc && !RFC_PHYS.test(r.rfc))
			fail("clients.csv", row, `Invalid physical RFC: "${r.rfc}"`);
		if (r.rfc && r.rfc.length !== 13)
			fail(
				"clients.csv",
				row,
				`Physical RFC must be 13 chars, got ${r.rfc.length}: "${r.rfc}"`,
			);
		// CURP format & length
		if (r.curp && r.curp.length !== 18)
			fail("clients.csv", row, `CURP must be 18 chars, got ${r.curp.length}`);
		if (r.curp && !CURP_RE.test(r.curp))
			fail("clients.csv", row, `Invalid CURP: "${r.curp}"`);
		// Birth date
		if (r.birth_date && !DATE_RE.test(r.birth_date))
			fail("clients.csv", row, `Invalid birth_date: "${r.birth_date}"`);
		// Gender
		if (r.gender && !["M", "F", "OTHER"].includes(r.gender.toUpperCase()))
			fail("clients.csv", row, `Invalid gender: "${r.gender}"`);
		// Marital status
		if (
			r.marital_status &&
			!["SINGLE", "MARRIED", "DIVORCED", "WIDOWED", "OTHER"].includes(
				r.marital_status.toUpperCase(),
			)
		)
			fail("clients.csv", row, `Invalid marital_status: "${r.marital_status}"`);
	} else if (pt === "moral" || pt === "trust") {
		for (const f of [
			"rfc",
			"business_name",
			"incorporation_date",
			"email",
			"phone",
			"country",
			"state_code",
			"city",
			"municipality",
			"neighborhood",
			"street",
			"external_number",
			"postal_code",
		]) {
			if (!r[f]) fail("clients.csv", row, `Missing required field: ${f}`);
		}
		// RFC format
		if (r.rfc && !RFC_MORAL.test(r.rfc))
			fail("clients.csv", row, `Invalid moral/trust RFC: "${r.rfc}"`);
		if (r.rfc && r.rfc.length !== 12)
			fail(
				"clients.csv",
				row,
				`Moral/trust RFC must be 12 chars, got ${r.rfc.length}: "${r.rfc}"`,
			);
		// Incorporation date
		if (r.incorporation_date && !DATE_RE.test(r.incorporation_date))
			fail(
				"clients.csv",
				row,
				`Invalid incorporation_date: "${r.incorporation_date}"`,
			);
	} else {
		fail("clients.csv", row, `Unknown person_type: "${r.person_type}"`);
	}

	// Email
	if (r.email && !EMAIL_RE.test(r.email))
		fail("clients.csv", row, `Invalid email: "${r.email}"`);
}
pass(`Per-row validation complete for clients.csv`);

// Special client scenarios
const minors = clients.filter((r) => {
	if (r.person_type !== "physical" || !r.birth_date) return false;
	const age = new Date("2026-02-19") - new Date(r.birth_date);
	return age < 18 * 365.25 * 24 * 3600 * 1000;
});
if (minors.length < 2)
	warn(
		"clients.csv",
		"-",
		`Expected at least 2 minor clients, found ${minors.length}`,
	);
else pass(`Found ${minors.length} minor clients (birth_date makes age < 18)`);

const noEco = clients.filter(
	(r) => r.person_type === "physical" && !r.economic_activity_code,
);
if (noEco.length < 5)
	warn(
		"clients.csv",
		"-",
		`Expected ≥5 physical clients with no economic_activity_code, found ${noEco.length}`,
	);
else
	pass(
		`Found ${noEco.length} physical clients without economic_activity_code (profile_mismatch seed)`,
	);

// Shared address
const addrMap = {};
for (const r of clients) {
	const key = `${r.street}|${r.external_number}|${r.postal_code}`;
	addrMap[key] = (addrMap[key] || 0) + 1;
}
const sharedGroups = Object.values(addrMap).filter((c) => c >= 2);
if (sharedGroups.length < 1)
	warn(
		"clients.csv",
		"-",
		"No shared addresses found (needed for shared_address_analysis seeker)",
	);
else
	pass(
		`Found ${sharedGroups.length} address group(s) with 2+ clients (shared_address_analysis)`,
	);

// ─────────────────────────────────────────────────────────────────────────────
// VALIDATE OPERATIONS
// ─────────────────────────────────────────────────────────────────────────────
const ACTIVITIES = [
	"VEH",
	"INM",
	"MJR",
	"AVI",
	"JYS",
	"ARI",
	"BLI",
	"DON",
	"MPC",
	"FEP",
	"FES",
	"SPR",
	"CHV",
	"TSC",
	"TPP",
	"TDR",
	"TCV",
	"OBA",
	"DIN",
];

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
const UMA = 117.31;
function mxn(u) {
	return u * UMA;
}

for (const act of ACTIVITIES) {
	const filename = `operations_${act.toLowerCase()}.csv`;
	console.log(`\n── Validating ${filename} ──────────────────────────────────`);
	const { headers: oHeaders, rows: opRows } = loadCsv(filename);

	if (opRows.length === 0) {
		fail(filename, "-", "No rows found");
		continue;
	}
	pass(`${filename} has ${opRows.length} rows`);

	// Check core required headers exist
	for (const h of [...CORE_OP_REQUIRED, ...(ACT_REQUIRED[act] || [])]) {
		if (!oHeaders.includes(h))
			fail(filename, "header", `Missing required column: ${h}`);
	}

	// Check all operation RFCs exist in clients pool
	for (let i = 0; i < opRows.length; i++) {
		const r = opRows[i];
		const row = i + 2;

		// Required core fields
		for (const f of CORE_OP_REQUIRED) {
			if (!r[f] || r[f].trim() === "")
				fail(filename, row, `Missing required field: ${f}`);
		}
		// Activity-specific required fields
		for (const f of ACT_REQUIRED[act] || []) {
			if (!r[f] || r[f].trim() === "")
				fail(filename, row, `Missing activity required field: ${f}`);
		}
		// client_rfc must exist in clients.csv
		if (
			r.client_rfc &&
			!rfcSet.has(r.client_rfc.toUpperCase()) &&
			!rfcSet.has(r.client_rfc)
		)
			fail(
				filename,
				row,
				`client_rfc "${r.client_rfc}" not found in clients.csv`,
			);

		// Date format
		if (r.operation_date && !DATE_RE.test(r.operation_date))
			fail(filename, row, `Invalid operation_date: "${r.operation_date}"`);

		// Amount must be positive number
		if (r.amount) {
			const amt = parseFloat(r.amount);
			if (isNaN(amt) || amt <= 0)
				fail(filename, row, `Invalid amount: "${r.amount}"`);
		}
		// payment_amount_1 must be positive number
		if (r.payment_amount_1) {
			const pa = parseFloat(r.payment_amount_1);
			if (isNaN(pa) || pa <= 0)
				fail(
					filename,
					row,
					`Invalid payment_amount_1: "${r.payment_amount_1}"`,
				);
		}
		// payment_form_code_1 should be 1-5
		if (
			r.payment_form_code_1 &&
			!["1", "2", "3", "4", "5"].includes(r.payment_form_code_1)
		)
			warn(
				filename,
				row,
				`Unusual payment_form_code_1: "${r.payment_form_code_1}"`,
			);
	}
	pass(`Per-row validation done for ${filename}`);

	// Scenario coverage checks
	const notes = opRows.map((r) => r.notes || "");

	// Threshold scenarios
	const noticeMxn = NOTICE_UMA[act] !== null ? mxn(NOTICE_UMA[act]) : null;
	if (noticeMxn !== null) {
		const directRows = opRows.filter((r) => {
			const a = parseFloat(r.amount);
			return (
				a >= noticeMxn * 0.95 && notes[opRows.indexOf(r)].includes("notice")
			);
		});
		if (directRows.length < 1)
			warn(
				filename,
				"-",
				"No row at/above notice threshold found — direct seeker not covered",
			);
		else pass(`Direct notice threshold scenario present`);

		const aggRows = opRows.filter((r) => r.notes?.includes("aggregate"));
		if (aggRows.length < 3)
			warn(
				filename,
				"-",
				`Aggregate scenario rows: ${aggRows.length} (expected ≥3)`,
			);
		else pass(`Aggregate scenario: ${aggRows.length} rows found`);

		const structRows = opRows.filter((r) => r.notes?.includes("structuring"));
		if (structRows.length < 3)
			warn(
				filename,
				"-",
				`Structuring rows: ${structRows.length} (expected ≥3)`,
			);
		else pass(`Structuring scenario: ${structRows.length} rows found`);
	}

	const cashRows = opRows.filter((r) => r.notes?.includes("cash"));
	const foreignRows = opRows.filter((r) => r.notes?.includes("foreign"));
	const splitRows = opRows.filter((r) => r.notes?.includes("split"));
	const freqRows = opRows.filter((r) => r.notes?.includes("frequent"));
	const refundRows = opRows.filter((r) => r.notes?.includes("refund"));
	const profileRows = opRows.filter((r) => r.notes?.includes("profile"));
	const minorRows = opRows.filter((r) => r.notes?.includes("minor"));

	if (cashRows.length < 1)
		warn(filename, "-", "No cash scenario rows (cash_high_value seeker)");
	if (foreignRows.length < 1)
		warn(filename, "-", "No foreign currency cash rows");
	if (splitRows.length < 1) warn(filename, "-", "No split payment rows");
	if (freqRows.length < 3)
		warn(filename, "-", `Only ${freqRows.length} frequent op rows (need 3)`);
	if (refundRows.length < 2)
		warn(filename, "-", `Only ${refundRows.length} refund rows (need 2)`);
	if (profileRows.length < 1) warn(filename, "-", "No profile mismatch rows");
	if (minorRows.length < 1) warn(filename, "-", "No minor client rows");

	pass(`Scenario coverage check done for ${filename}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// SUMMARY
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n═══════════════════════════════════════════════════════════");
if (errors === 0 && warnings === 0) {
	console.log("  ✓ ALL CHECKS PASSED — 0 errors, 0 warnings");
} else if (errors === 0) {
	console.log(`  ✓ NO ERRORS  (${warnings} warnings — non-blocking)`);
} else {
	console.log(`  ✗ FAILED: ${errors} error(s), ${warnings} warning(s)`);
}
console.log("═══════════════════════════════════════════════════════════\n");
process.exit(errors > 0 ? 1 : 0);
