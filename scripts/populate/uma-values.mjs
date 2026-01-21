#!/usr/bin/env node
/**
 * Populate UMA Values
 *
 * Ensures there's always an active UMA value in the database.
 * Creates a default UMA value for 2025 if none exists.
 * This is essential for the application to function properly.
 * Runs as part of the populate process (reference data, not test data).
 */

import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { writeFileSync, unlinkSync } from "node:fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Default UMA value for 2025 (from INEGI official data)
// Source: https://www.inegi.org.mx/contenidos/saladeprensa/boletines/2025/uma/uma2025.pdf
const DEFAULT_UMA_VALUE = {
	year: 2025,
	dailyValue: 113.14,
	effectiveDate: "2025-01-01T00:00:00Z",
	endDate: "2026-01-31T23:59:59Z", // Ends January 31, 2026 (2026 UMA starts Feb 1)
	notes:
		"UMA value for 2025 - Source: INEGI. Verified against official PDF: https://www.inegi.org.mx/contenidos/saladeprensa/boletines/2025/uma/uma2025.pdf. Note: 2026 UMA starts February 1st.",
	active: true,
};

function escapeSqlString(str) {
	if (str === null || str === undefined) return "NULL";
	return `'${String(str).replace(/'/g, "''")}'`;
}

function generateId() {
	// Generate a deterministic ID based on year for UMA values
	// Format: UMA + year (e.g., UMA2025)
	// This ensures we can update the same record if it exists
	return `UMA${DEFAULT_UMA_VALUE.year}`;
}

function generateSql() {
	const id = escapeSqlString(generateId());
	const year = DEFAULT_UMA_VALUE.year;
	const dailyValue = DEFAULT_UMA_VALUE.dailyValue;
	const effectiveDate = escapeSqlString(DEFAULT_UMA_VALUE.effectiveDate);
	const endDate = DEFAULT_UMA_VALUE.endDate
		? escapeSqlString(DEFAULT_UMA_VALUE.endDate)
		: "NULL";
	const notes = DEFAULT_UMA_VALUE.notes
		? escapeSqlString(DEFAULT_UMA_VALUE.notes)
		: "NULL";
	const active = DEFAULT_UMA_VALUE.active ? 1 : 0;

	// First, deactivate all existing UMA values if we're setting this as active
	// Then insert or replace the UMA value for 2025
	const sql = `
-- Deactivate all existing UMA values if we're setting this as active
UPDATE uma_values SET active = 0 WHERE active = 1 AND id != ${id};

-- Insert or replace UMA value for 2025
INSERT OR REPLACE INTO uma_values (id, year, daily_value, effective_date, end_date, notes, active, created_at, updated_at)
VALUES (
	${id},
	${year},
	${dailyValue},
	${effectiveDate},
	${endDate},
	${notes},
	${active},
	COALESCE((SELECT created_at FROM uma_values WHERE id = ${id}), CURRENT_TIMESTAMP),
	CURRENT_TIMESTAMP
);
`;

	return sql;
}

async function populateUmaValues() {
	const isRemote = process.env.CI === "true" || process.env.REMOTE === "true";
	// Use WRANGLER_CONFIG if set, otherwise detect preview environment
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
	const configFlag = configFile ? `--config ${configFile}` : "";

	try {
		console.log(
			`📦 Populating UMA values (${isRemote ? "remote" : "local"})...`,
		);

		// Check if there's already an active UMA value
		const checkSql =
			"SELECT COUNT(*) as count FROM uma_values WHERE active = 1;";
		const checkFile = join(__dirname, `temp-check-uma-${Date.now()}.sql`);
		try {
			writeFileSync(checkFile, checkSql);
			const checkCommand = isRemote
				? `wrangler d1 execute DB ${configFlag} --remote --file "${checkFile}"`
				: `wrangler d1 execute DB ${configFlag} --local --file "${checkFile}"`;
			const checkOutput = execSync(checkCommand, { encoding: "utf-8" });
			// Parse the count from output (format may vary)
			const countMatch = checkOutput.match(/count\s*\|\s*(\d+)/i);
			if (countMatch && parseInt(countMatch[1], 10) > 0) {
				console.log(`⏭️  Active UMA value already exists. Skipping populate.`);
				return;
			}
		} catch {
			// If check fails, continue with populating
			console.warn(
				"⚠️  Could not check existing UMA values, proceeding with populate...",
			);
		} finally {
			try {
				unlinkSync(checkFile);
			} catch {
				// Ignore cleanup errors
			}
		}

		// Generate SQL
		const sql = generateSql();
		const sqlFile = join(__dirname, `temp-uma-value-${Date.now()}.sql`);

		try {
			writeFileSync(sqlFile, sql);

			// Execute SQL
			const command = isRemote
				? `wrangler d1 execute DB ${configFlag} --remote --file "${sqlFile}"`
				: `wrangler d1 execute DB ${configFlag} --local --file "${sqlFile}"`;

			execSync(command, { stdio: "inherit" });

			console.log(
				`✅ UMA value populated: Created/updated UMA value for ${DEFAULT_UMA_VALUE.year} (${DEFAULT_UMA_VALUE.dailyValue})`,
			);
		} finally {
			// Clean up temp file
			try {
				unlinkSync(sqlFile);
			} catch {
				// Ignore cleanup errors
			}
		}
	} catch (error) {
		console.error("❌ Error populating UMA values:", error);
		throw error;
	}
}

// Export for use in all.mjs
export { populateUmaValues };

// If run directly, execute populate
if (import.meta.url === `file://${process.argv[1]}`) {
	populateUmaValues().catch((error) => {
		console.error("Fatal error:", error);
		process.exit(1);
	});
}
