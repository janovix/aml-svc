#!/usr/bin/env node
/**
 * Seed Transactions
 *
 * Generates synthetic transaction data for dev/preview environments.
 * This is SEED data (not real data) and should NOT run in production.
 */

import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { writeFileSync, unlinkSync } from "node:fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function seedTransactions() {
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
			`🌱 Seeding transactions (${isRemote ? "remote" : "local"})...`,
		);

		// Check if transactions already exist
		const checkSql = "SELECT COUNT(*) as count FROM transactions;";
		const checkFile = join(
			__dirname,
			`temp-check-transactions-${Date.now()}.sql`,
		);
		try {
			writeFileSync(checkFile, checkSql);
			const checkCommand = isRemote
				? `wrangler d1 execute DB ${configFlag} --remote --file "${checkFile}"`
				: `wrangler d1 execute DB ${configFlag} --local --file "${checkFile}"`;
			const checkOutput = execSync(checkCommand, { encoding: "utf-8" });
			// Parse the count from output (format may vary)
			const countMatch = checkOutput.match(/count\s*\|\s*(\d+)/i);
			if (countMatch && parseInt(countMatch[1], 10) > 0) {
				console.log(`⏭️  Transactions already exist. Skipping seed.`);
				return;
			}
		} catch {
			// If check fails, continue with seeding
			console.warn(
				"⚠️  Could not check existing transactions, proceeding with seed...",
			);
		} finally {
			try {
				unlinkSync(checkFile);
			} catch {
				// Ignore cleanup errors
			}
		}

		// TODO: Implement transaction seeding logic
		// Generate synthetic transactions with realistic data for testing
		// Note: Requires clients to exist first
		// For now, skip if no transactions exist
		console.log(
			"✅ Transaction seeding completed (no synthetic data generated)",
		);
	} catch (error) {
		console.error("❌ Error seeding transactions:", error);
		throw error;
	}
}

// Export for use in all.mjs
export { seedTransactions };

// If run directly, execute seed
if (import.meta.url === `file://${process.argv[1]}`) {
	seedTransactions().catch((error) => {
		console.error("Fatal error:", error);
		process.exit(1);
	});
}
