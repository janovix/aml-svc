#!/usr/bin/env node
/**
 * Seed synthetic clients via SyntheticDataGenerator (AML Core).
 * Requires remote D1 access (REMOTE=true) like generate-synthetic-data.
 */

import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { writeFileSync, unlinkSync } from "node:fs";
import { execSync } from "node:child_process";
import { openD1Database } from "../lib/d1-database.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const amlSvcRoot = join(__dirname, "..", "..");

function wranglerConfigFromEnv() {
	if (process.env.WRANGLER_CONFIG) return process.env.WRANGLER_CONFIG;
	if (
		process.env.CF_PAGES_BRANCH ||
		(process.env.WORKERS_CI_BRANCH &&
			process.env.WORKERS_CI_BRANCH !== "main") ||
		process.env.PREVIEW === "true"
	) {
		return "wrangler.preview.jsonc";
	}
	return "wrangler.jsonc";
}

async function seedClients() {
	const isRemote = process.env.CI === "true" || process.env.REMOTE === "true";
	const configFile = wranglerConfigFromEnv();
	const organizationId =
		process.env.SEED_ORGANIZATION_ID ||
		process.env.ORGANIZATION_ID ||
		process.env.AML_ORGANIZATION_ID;
	const clientsCount = parseInt(
		process.env.CLIENTS_COUNT || process.env.SEED_CLIENTS_COUNT || "50",
		10,
	);

	if (!organizationId) {
		console.warn(
			"⏭️  Skipping client seed: set SEED_ORGANIZATION_ID or ORGANIZATION_ID",
		);
		return;
	}

	console.log(
		`🌱 Seeding ${clientsCount} synthetic clients (${isRemote ? "remote" : "local"})…`,
	);

	const checkSql = `SELECT COUNT(*) as count FROM clients WHERE organization_id = '${organizationId.replace(/'/g, "''")}' AND deleted_at IS NULL;`;
	let checkFile = null;
	try {
		checkFile = join(__dirname, `temp-check-clients-${Date.now()}.sql`);
		writeFileSync(checkFile, checkSql);
		const wranglerCmd =
			process.env.CI === "true" ? "pnpm wrangler" : "pnpm wrangler";
		const configFlag = `--config ${configFile}`;
		const checkCommand = isRemote
			? `${wranglerCmd} d1 execute DB ${configFlag} --remote --file "${checkFile}"`
			: `${wranglerCmd} d1 execute DB ${configFlag} --local --file "${checkFile}"`;
		const checkOutput = execSync(checkCommand, { encoding: "utf-8" });
		const countMatch = checkOutput.match(/count\s*\|\s*(\d+)/i);
		if (countMatch && parseInt(countMatch[1], 10) > 0) {
			console.log(`⏭️  Clients already exist for org. Skipping seed.`);
			return;
		}
	} catch {
		console.warn(
			"⚠️  Could not check existing clients via wrangler; attempting Prisma path…",
		);
	} finally {
		if (checkFile) {
			try {
				unlinkSync(checkFile);
			} catch {
				// ignore
			}
		}
	}

	const db = await openD1Database({
		amlSvcRoot,
		resolvedWranglerConfigFile: configFile,
		isRemote,
	});

	const { SyntheticDataGenerator } = await import(
		"../../src/lib/synthetic-data-generator.ts"
	);
	const { getPrismaClient } = await import("../../src/lib/prisma.ts");

	const prisma = getPrismaClient(db);
	const tenantEnvironment =
		process.env.TENANT_ENVIRONMENT === "staging" ||
		process.env.TENANT_ENVIRONMENT === "development"
			? process.env.TENANT_ENVIRONMENT
			: "production";

	const generator = new SyntheticDataGenerator(
		prisma,
		organizationId,
		tenantEnvironment,
	);

	let riskMix;
	if (process.env.RISK_MIX) {
		riskMix = JSON.parse(process.env.RISK_MIX);
	}

	const result = await generator.generate({
		clients: {
			count: clientsCount,
			includeDocuments: process.env.SEED_CLIENT_DOCUMENTS === "true",
			includeAddresses: process.env.SEED_CLIENT_ADDRESSES === "true",
			riskMix,
			includePep: process.env.INCLUDE_PEP !== "false",
			includeSanctioned: process.env.INCLUDE_SANCTIONED !== "false",
		},
	});

	console.log(
		`✅ Client seed complete — created ${result.clients.created} client(s)`,
	);
}

export { seedClients };

const isDirectRun =
	process.argv[1] && __filename.toLowerCase() === process.argv[1].toLowerCase();

if (isDirectRun) {
	seedClients().catch((error) => {
		console.error("Fatal error:", error);
		process.exit(1);
	});
}
