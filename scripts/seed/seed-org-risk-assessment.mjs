#!/usr/bin/env node
/**
 * Seed Organization Risk Assessment (plus elements and mitigants for this assessment)
 *
 * Creates one synthetic ACTIVE assessment for test-org-1 used in dev/preview.
 * Element and mitigant rows use fixed ids so reruns stay idempotent.
 */

import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { writeFileSync, unlinkSync } from "node:fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SEED_ASSESSMENT_ID = "ora_seed_dev_001";

async function seedOrgRiskAssessment() {
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
			`🌱 Seeding org risk assessment (${isRemote ? "remote" : "local"})...`,
		);

		const checkSql = `SELECT COUNT(*) as count FROM org_risk_assessments WHERE id = '${SEED_ASSESSMENT_ID}';`;
		const checkFile = join(__dirname, `temp-check-ora-${Date.now()}.sql`);
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
				console.log(`⏭️  Org risk assessment seed already applied. Skipping.`);
				return;
			}
		} finally {
			try {
				unlinkSync(checkFile);
			} catch {
				// ignore
			}
		}

		const sql = `
INSERT OR IGNORE INTO org_risk_assessments (
  id, organization_id, status, inherent_risk_score, residual_risk_score, risk_level,
  required_audit_type, fp_risk_level, fp_risk_justification,
  period_start_date, period_end_date, assessed_by, next_review_deadline, version, created_at, updated_at
) VALUES (
  '${SEED_ASSESSMENT_ID}',
  'test-org-1',
  'ACTIVE',
  6.5,
  5.0,
  'MEDIUM',
  'INTERNAL',
  'LOW',
  'Synthetic seed row',
  datetime('now'),
  datetime('now', '+1 year'),
  'seed-script',
  datetime('now', '+1 year'),
  1,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO org_risk_elements (id, assessment_id, element_type, weight, risk_score, risk_level, factor_breakdown, justification) VALUES
('ore_seed_001', '${SEED_ASSESSMENT_ID}', 'CLIENTS', 0.25, 6.0, 'MEDIUM', '{}', NULL),
('ore_seed_002', '${SEED_ASSESSMENT_ID}', 'GEOGRAPHY', 0.25, 6.0, 'MEDIUM', '{}', NULL),
('ore_seed_003', '${SEED_ASSESSMENT_ID}', 'PRODUCTS', 0.25, 6.0, 'MEDIUM', '{}', NULL),
('ore_seed_004', '${SEED_ASSESSMENT_ID}', 'TRANSACTIONS', 0.25, 6.0, 'MEDIUM', '{}', NULL);

INSERT OR IGNORE INTO org_mitigants (id, assessment_id, mitigant_key, mitigant_name, exists, effectiveness_score, risk_effect, justification) VALUES
('om_seed_001', '${SEED_ASSESSMENT_ID}', 'AML_PROGRAM', 'Programa AML', 1, 0.8, 0.5, NULL),
('om_seed_002', '${SEED_ASSESSMENT_ID}', 'TRAINING', 'Capacitación', 1, 0.7, 0.3, NULL);
`;

		const sqlFile = join(__dirname, `temp-seed-ora-${Date.now()}.sql`);
		try {
			writeFileSync(sqlFile, sql);
			const wranglerCmd =
				process.env.CI === "true" ? "pnpm wrangler" : "wrangler";
			const command = isRemote
				? `${wranglerCmd} d1 execute DB ${configFlag} --remote --file "${sqlFile}"`
				: `${wranglerCmd} d1 execute DB ${configFlag} --local --file "${sqlFile}"`;
			execSync(command, { stdio: "inherit" });
			console.log(`✅ Org risk assessment seed completed`);
		} finally {
			try {
				unlinkSync(sqlFile);
			} catch {
				// ignore
			}
		}
	} catch (error) {
		console.error("❌ Error seeding org risk assessment:", error);
		process.exit(1);
	}
}

seedOrgRiskAssessment().catch((error) => {
	console.error("Fatal error:", error);
	process.exit(1);
});
