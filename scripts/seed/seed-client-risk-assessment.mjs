#!/usr/bin/env node
/**
 * Seed Client Risk Assessment
 *
 * Inserts one idempotent dev row when at least one client exists (INSERT ... SELECT).
 */

import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { writeFileSync, unlinkSync } from "node:fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SEED_ID = "cra_seed_dev_001";

async function seedClientRiskAssessment() {
	const isRemote = process.env.CI === "true" || process.env.REMOTE === "true";
	let configFile = process.env.WRANGLER_CONFIG;
	if (!configFile) {
		if (
			process.env.CF_PAGES_BRANCH ||
			(process.env.WORKERS_CI_BRANCH &&
				process.env.WORKERS_CI_BRANCH !== "main") ||
			process.env.PREVIEW === "true"
		) {
			configFile = "wrangler.preview.jsonc";
		}
	}
	const configFlag = configFile ? `--config ${configFile}` : "";

	try {
		console.log(
			`🌱 Seeding client risk assessments (${isRemote ? "remote" : "local"})...`,
		);

		const checkSql = `SELECT COUNT(*) as count FROM client_risk_assessments WHERE id = '${SEED_ID}';`;
		const checkFile = join(__dirname, `temp-check-cra-${Date.now()}.sql`);
		try {
			writeFileSync(checkFile, checkSql);
			const wranglerCmd =
				process.env.CI === "true" ? "pnpm wrangler" : "wrangler";
			const checkCommand = isRemote
				? `${wranglerCmd} d1 execute DB ${configFlag} --remote --file "${checkFile}"`
				: `${wranglerCmd} d1 execute DB ${configFlag} --local --file "${checkFile}"`;
			const checkOutput = execSync(checkCommand, { encoding: "utf-8" });
			const countMatch = checkOutput.match(/count\s*\|\s*(\d+)/i);
			if (countMatch && parseInt(countMatch[1], 10) > 0) {
				console.log(
					`⏭️  Client risk assessment seed already applied. Skipping.`,
				);
				return;
			}
		} finally {
			try {
				unlinkSync(checkFile);
			} catch {
				// ignore
			}
		}

		const clientsCheck = "SELECT COUNT(*) as count FROM clients;";
		const clientsFile = join(
			__dirname,
			`temp-check-clients-cra-${Date.now()}.sql`,
		);
		try {
			writeFileSync(clientsFile, clientsCheck);
			const wranglerCmd =
				process.env.CI === "true" ? "pnpm wrangler" : "wrangler";
			const checkCommand = isRemote
				? `${wranglerCmd} d1 execute DB ${configFlag} --remote --file "${clientsFile}"`
				: `${wranglerCmd} d1 execute DB ${configFlag} --local --file "${clientsFile}"`;
			const out = execSync(checkCommand, { encoding: "utf-8" });
			const countMatch = out.match(/count\s*\|\s*(\d+)/i);
			if (!countMatch || parseInt(countMatch[1], 10) === 0) {
				console.log(
					`⏭️  No clients in database; skip client risk assessment seed.`,
				);
				return;
			}
		} finally {
			try {
				unlinkSync(clientsFile);
			} catch {
				// ignore
			}
		}

		const sql = `
INSERT OR IGNORE INTO client_risk_assessments (
  id, client_id, organization_id, inherent_risk_score, residual_risk_score,
  risk_level, due_diligence_level, client_factors, geographic_factors, activity_factors,
  transaction_factors, mitigant_factors, assessed_at, next_review_at, assessed_by, version, created_at, updated_at
)
SELECT
  '${SEED_ID}',
  c.id,
  c.organization_id,
  5.5,
  4.2,
  'MEDIUM',
  'STANDARD',
  '{}',
  '{}',
  '{}',
  '{}',
  '{}',
  CURRENT_TIMESTAMP,
  datetime('now', '+1 year'),
  'seed-script',
  1,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM clients c
LIMIT 1;
`;

		const sqlFile = join(__dirname, `temp-seed-cra-${Date.now()}.sql`);
		try {
			writeFileSync(sqlFile, sql);
			const wranglerCmd =
				process.env.CI === "true" ? "pnpm wrangler" : "wrangler";
			const command = isRemote
				? `${wranglerCmd} d1 execute DB ${configFlag} --remote --file "${sqlFile}"`
				: `${wranglerCmd} d1 execute DB ${configFlag} --local --file "${sqlFile}"`;
			execSync(command, { stdio: "inherit" });
			console.log(`✅ Client risk assessment seed completed`);
		} finally {
			try {
				unlinkSync(sqlFile);
			} catch {
				// ignore
			}
		}
	} catch (error) {
		console.error("❌ Error seeding client risk assessments:", error);
		process.exit(1);
	}
}

seedClientRiskAssessment().catch((error) => {
	console.error("Fatal error:", error);
	process.exit(1);
});
