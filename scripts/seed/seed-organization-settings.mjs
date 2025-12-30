#!/usr/bin/env node
/**
 * Seed Organization Settings
 *
 * Generates synthetic organization settings data for dev/preview environments.
 * This is SEED data (not real data) and should NOT run in production.
 *
 * Note: Organization settings link 1:1 to organizations from auth-svc.
 * This seed creates test organization settings for development purposes.
 */

import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { writeFileSync, unlinkSync } from "node:fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Test organization settings for development
const organizationSettings = [
	{
		organizationId: "test-org-1",
		obligatedSubjectKey: "ABC123456789", // RFC format: 12 characters
		activityKey: "VEH", // Vulnerable activity code for vehicles
	},
	{
		organizationId: "test-org-2",
		obligatedSubjectKey: "XYZ987654321",
		activityKey: "VEH",
	},
];

async function seedOrganizationSettings() {
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
			`🌱 Seeding organization settings (${isRemote ? "remote" : "local"})...`,
		);

		// Check if organization settings already exist
		const checkSql = "SELECT COUNT(*) as count FROM organization_settings;";
		const checkFile = join(
			__dirname,
			`temp-check-org-settings-${Date.now()}.sql`,
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
				console.log(`⏭️  Organization settings already exist. Skipping seed.`);
				return;
			}
		} finally {
			try {
				unlinkSync(checkFile);
			} catch {
				// Ignore cleanup errors
			}
		}

		// Build SQL insert statements
		const sqlStatements = organizationSettings.map((settings) => {
			const id = `lower(hex(randomblob(16)))`;
			return `INSERT OR IGNORE INTO organization_settings (id, organizationId, obligatedSubjectKey, activityKey, createdAt, updatedAt)
VALUES (${id}, '${settings.organizationId}', '${settings.obligatedSubjectKey}', '${settings.activityKey}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);`;
		});

		const sql = sqlStatements.join("\n");
		const sqlFile = join(__dirname, `temp-seed-org-settings-${Date.now()}.sql`);

		try {
			writeFileSync(sqlFile, sql);
			const command = isRemote
				? `wrangler d1 execute DB ${configFlag} --remote --file "${sqlFile}"`
				: `wrangler d1 execute DB ${configFlag} --local --file "${sqlFile}"`;

			execSync(command, { stdio: "inherit" });
			console.log(
				`✅ Seeded ${organizationSettings.length} organization setting(s)`,
			);
		} finally {
			try {
				unlinkSync(sqlFile);
			} catch {
				// Ignore cleanup errors
			}
		}
	} catch (error) {
		console.error("❌ Failed to seed organization settings:", error);
		process.exit(1);
	}
}

seedOrganizationSettings().catch((error) => {
	console.error("Fatal error:", error);
	process.exit(1);
});
