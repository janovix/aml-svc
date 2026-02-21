#!/usr/bin/env node
/**
 * Seed KYC Session Events
 *
 * Generates synthetic KYC session event data for dev/preview environments.
 * This is SEED data (not real data) and should NOT run in production.
 */

import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { writeFileSync, unlinkSync } from "node:fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function seedKycSessionEvents() {
	const isRemote = process.env.CI === "true" || process.env.REMOTE === "true";
	// Use WRANGLER_CONFIG if set, otherwise detect preview environment
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
			`🌱 Seeding KYC session events (${isRemote ? "remote" : "local"})...`,
		);

		// Check if KYC session events already exist
		const checkSql = "SELECT COUNT(*) as count FROM kyc_session_events;";
		const checkFile = join(
			__dirname,
			`temp-check-kyc-session-events-${Date.now()}.sql`,
		);
		try {
			writeFileSync(checkFile, checkSql);
			const wranglerCmd =
				process.env.CI === "true" ? "pnpm wrangler" : "wrangler";
			const checkCommand = isRemote
				? `${wranglerCmd} d1 execute DB ${configFlag} --remote --file "${checkFile}"`
				: `${wranglerCmd} d1 execute DB ${configFlag} --local --file "${checkFile}"`;
			const checkOutput = execSync(checkCommand, { encoding: "utf-8" });
			// Parse the count from output (format may vary)
			const countMatch = checkOutput.match(/count\s*\|\s*(\d+)/i);
			if (countMatch && parseInt(countMatch[1], 10) > 0) {
				console.log(`⏭️  KYC session events already exist. Skipping seed.`);
				return;
			}
		} catch {
			// If check fails, continue with seeding
			console.warn(
				"⚠️  Could not check existing KYC session events, proceeding with seed...",
			);
		} finally {
			try {
				unlinkSync(checkFile);
			} catch {
				// Ignore cleanup errors
			}
		}

		// TODO: Implement KYC session event seeding logic
		// Generate synthetic KYC session events with realistic data for testing
		// For now, skip if no events exist
		console.log(
			"✅ KYC session event seeding completed (no synthetic data generated)",
		);
	} catch (error) {
		console.error("❌ Error seeding KYC session events:", error);
		throw error;
	}
}

// Export for use in all.mjs
export { seedKycSessionEvents };

// If run directly, execute seed
// Compare normalized paths for cross-platform compatibility
const isDirectRun =
	process.argv[1] && __filename.toLowerCase() === process.argv[1].toLowerCase();

if (isDirectRun) {
	seedKycSessionEvents().catch((error) => {
		console.error("Fatal error:", error);
		process.exit(1);
	});
}
