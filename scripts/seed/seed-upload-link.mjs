#!/usr/bin/env node
/**
 * Seed UploadLinks
 *
 * Generates synthetic upload link data for dev/preview environments.
 * This is SEED data (not real data) and should NOT run in production.
 */

import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { writeFileSync, unlinkSync } from "node:fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function seedUploadLinks() {
	// Production guard - refuse to seed in production
	const isProd =
		process.env.NODE_ENV === "production" ||
		process.env.ENVIRONMENT === "production";
	if (isProd) {
		throw new Error("Refusing to seed upload links in production.");
	}

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
	const configArgs = configFile ? ["--config", configFile] : [];

	try {
		console.log(
			`🌱 Seeding upload links (${isRemote ? "remote" : "local"})...`,
		);

		// Check if upload links already exist
		const checkSql = "SELECT COUNT(*) as count FROM upload_links;";
		const checkFile = join(
			__dirname,
			`temp-check-upload-links-${Date.now()}.sql`,
		);
		try {
			writeFileSync(checkFile, checkSql);
			const usePnpm = process.env.CI === "true";
			const wranglerCmd = usePnpm ? "pnpm" : "wrangler";
			const baseArgs = usePnpm ? ["wrangler"] : [];
			const checkArgs = [
				...baseArgs,
				"d1",
				"execute",
				"DB",
				...configArgs,
				isRemote ? "--remote" : "--local",
				"--file",
				checkFile,
			];
			const checkOutput = execFileSync(wranglerCmd, checkArgs, {
				encoding: "utf-8",
			});
			// Parse the count from output (format may vary)
			const countMatch = checkOutput.match(/count\s*\|\s*(\d+)/i);
			if (countMatch && parseInt(countMatch[1], 10) > 0) {
				console.log(`⏭️  Upload links already exist. Skipping seed.`);
				return;
			}
		} catch {
			// If check fails, continue with seeding
			console.warn(
				"⚠️  Could not check existing upload links, proceeding with seed...",
			);
		} finally {
			try {
				unlinkSync(checkFile);
			} catch {
				// Ignore cleanup errors
			}
		}

		// TODO: Implement upload link seeding logic
		// Generate synthetic upload links with realistic data for testing
		// Note: UploadLinks reference doc-svc upload links and may be linked to clients
		// For now, skip if no upload links exist
		console.log(
			"✅ Upload link seeding completed (no synthetic data generated)",
		);
	} catch (error) {
		console.error("❌ Error seeding upload links:", error);
		throw error;
	}
}

// Export for use in all.mjs
export { seedUploadLinks };

// If run directly, execute seed
// Compare normalized paths for cross-platform compatibility
const isDirectRun =
	process.argv[1] &&
	resolve(__filename).toLowerCase() === resolve(process.argv[1]).toLowerCase();

if (isDirectRun) {
	seedUploadLinks().catch((error) => {
		console.error("Fatal error:", error);
		process.exit(1);
	});
}
