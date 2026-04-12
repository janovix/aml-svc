#!/usr/bin/env node
/**
 * Seed Activity Risk Profiles (reference catalog)
 *
 * ENR 2023 rows are normally applied via migrations. This script is a dev fallback.
 */

import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { writeFileSync, unlinkSync } from "node:fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function seedActivityRiskProfiles() {
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
			`🌱 Checking activity risk profiles (${isRemote ? "remote" : "local"})...`,
		);

		const checkSql = "SELECT COUNT(*) as count FROM activity_risk_profiles;";
		const checkFile = join(__dirname, `temp-check-arp-${Date.now()}.sql`);
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
					`⏭️  Activity risk profiles already populated. Skipping seed.`,
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

		const sql = `INSERT OR IGNORE INTO activity_risk_profiles (id, activity_key, activity_name, risk_level, risk_score, liquidity_factor, anonymity_factor, value_transfer_factor, cash_intensity_factor, source, updated_at)
VALUES ('arp_seed_dev', 'VEH', 'Vehículos (seed)', 'MEDIUM', 5.0, 5.0, 4.0, 7.0, 5.0, 'SEED', CURRENT_TIMESTAMP);`;
		const sqlFile = join(__dirname, `temp-seed-arp-${Date.now()}.sql`);
		try {
			writeFileSync(sqlFile, sql);
			const wranglerCmd =
				process.env.CI === "true" ? "pnpm wrangler" : "wrangler";
			const command = isRemote
				? `${wranglerCmd} d1 execute DB ${configFlag} --remote --file "${sqlFile}"`
				: `${wranglerCmd} d1 execute DB ${configFlag} --local --file "${sqlFile}"`;
			execSync(command, { stdio: "inherit" });
			console.log(`✅ Activity risk profile fallback seed applied`);
		} finally {
			try {
				unlinkSync(sqlFile);
			} catch {
				// ignore
			}
		}
	} catch (error) {
		console.error("❌ Error seeding activity risk profiles:", error);
		process.exit(1);
	}
}

seedActivityRiskProfiles().catch((error) => {
	console.error("Fatal error:", error);
	process.exit(1);
});
