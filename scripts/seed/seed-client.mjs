#!/usr/bin/env node
/**
 * Seed Clients — invokes SyntheticDataGenerator via generate-synthetic-data.mjs
 *
 * Requires USER_ID / ORGANIZATION_ID unless SEED_USER_ID / SEED_ORGANIZATION_ID are set.
 * Default client count: SEED_CLIENTS_COUNT (default 50).
 */

import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { writeFileSync, unlinkSync } from "node:fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const __filepath = resolve(__filename);
const repoRoot = join(__dirname, "..", "..");
const genScript = join(repoRoot, "scripts", "generate-synthetic-data.mjs");

async function seedClients() {
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
		console.log(`🌱 Seeding clients (${isRemote ? "remote" : "local"})...`);

		const checkSql = "SELECT COUNT(*) as count FROM clients;";
		let checkFile = "";
		try {
			checkFile = join(__dirname, `temp-check-clients-${Date.now()}.sql`);
			writeFileSync(checkFile, checkSql);
			const wranglerCmd =
				process.env.CI === "true" ? "pnpm wrangler" : "wrangler";
			const checkCommand = isRemote
				? `${wranglerCmd} d1 execute DB ${configFlag} --remote --file "${checkFile}"`
				: `${wranglerCmd} d1 execute DB ${configFlag} --local --file "${checkFile}"`;
			const checkOutput = execSync(checkCommand, { encoding: "utf-8" });
			const countMatch = checkOutput.match(/count\s*\|\s*(\d+)/i);
			if (countMatch && parseInt(countMatch[1], 10) > 0) {
				console.log(`⏭️  Clients already exist. Skipping seed.`);
				return;
			}
		} catch {
			console.warn(
				"⚠️  Could not check existing clients, proceeding with seed...",
			);
		} finally {
			if (checkFile) {
				try {
					unlinkSync(checkFile);
				} catch {
					/* ignore */
				}
			}
		}

		const userId =
			process.env.USER_ID ||
			process.env.SEED_USER_ID ||
			"seed-local-user";
		const organizationId =
			process.env.ORGANIZATION_ID ||
			process.env.SEED_ORGANIZATION_ID ||
			"seed-local-org";
		const clientsCount =
			process.env.SEED_CLIENTS_COUNT ||
			process.env.CLIENTS_COUNT ||
			"50";

		const env = {
			...process.env,
			USER_ID: userId,
			ORGANIZATION_ID: organizationId,
			MODELS: "clients",
			CLIENTS_COUNT: clientsCount,
			REMOTE: isRemote ? "true" : process.env.REMOTE ?? "false",
			...(configFile ? { WRANGLER_CONFIG: configFile } : {}),
		};

		execSync(`node "${genScript}"`, {
			cwd: repoRoot,
			stdio: "inherit",
			env,
		});

		console.log("✅ Client seeding completed.");
	} catch (error) {
		console.error("❌ Error seeding clients:", error);
		throw error;
	}
}

export { seedClients };

if (process.argv[1] && resolve(process.argv[1]) === __filepath) {
	seedClients().catch(() => process.exit(1));
}
