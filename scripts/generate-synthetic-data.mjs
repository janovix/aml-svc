#!/usr/bin/env node
/**
 * Generate Synthetic Data
 *
 * Generates synthetic data (clients, operations, etc.) for a user account.
 * This script can be run locally or from GitHub Actions.
 *
 * Usage:
 *   node scripts/generate-synthetic-data.mjs
 *
 * Environment Variables:
 *   USER_ID - User ID for which to generate data (required)
 *   ORGANIZATION_ID - Organization ID for which to generate data (required)
 *   MODELS - Comma-separated list of models: clients,operations
 *   CLIENTS_COUNT - Number of clients to generate (default: 10)
 *   CLIENTS_INCLUDE_DOCUMENTS - Include documents for clients (default: false)
 *   CLIENTS_INCLUDE_ADDRESSES - Include addresses for clients (default: false)
 *   OPERATIONS_COUNT - Number of operations to generate (default: 0; use with MODELS=clients,operations)
 *   OPERATIONS_PER_CLIENT - Number of operations per client (optional)
 *   WRANGLER_CONFIG - Wrangler config file (optional, auto-detected based on environment)
 *   CLOUDFLARE_API_TOKEN - Cloudflare API token for remote bindings (when REMOTE=true)
 *   CLOUDFLARE_ACCOUNT_ID - Cloudflare account ID (when REMOTE=true)
 *   RISK_MIX - Optional JSON object of synthetic risk profile weights, e.g.
 *     {"LOW":40,"MEDIUM":30,"MEDIUM_HIGH":15,"PEP":10,"SANCTIONED":5}
 *   INCLUDE_PEP - Set to "false" to exclude PEP profiles from the mix (default: true)
 *   INCLUDE_SANCTIONED - Set to "false" to exclude sanctioned profiles (default: true)
 */

import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { getPlatformProxy } from "wrangler";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Parse environment variables
const userId = process.env.USER_ID;
const organizationId = process.env.ORGANIZATION_ID;
const modelsStr = process.env.MODELS || "";
const clientsCount = parseInt(process.env.CLIENTS_COUNT || "10", 10);
const clientsIncludeDocuments =
	process.env.CLIENTS_INCLUDE_DOCUMENTS === "true";
const clientsIncludeAddresses =
	process.env.CLIENTS_INCLUDE_ADDRESSES === "true";
// Default 0 — the generator auto-adjusts to ensure every client has at least one operation
const operationsCount = parseInt(process.env.OPERATIONS_COUNT || "0", 10);
const operationsPerClient = process.env.OPERATIONS_PER_CLIENT
	? parseInt(process.env.OPERATIONS_PER_CLIENT, 10)
	: undefined;

let riskMix = undefined;
if (process.env.RISK_MIX) {
	try {
		riskMix = JSON.parse(process.env.RISK_MIX);
		if (riskMix !== null && typeof riskMix !== "object") {
			throw new Error("RISK_MIX must be a JSON object");
		}
	} catch (e) {
		console.error(
			"❌ Error: RISK_MIX must be valid JSON (e.g. {\"LOW\":40,\"MEDIUM\":30})",
		);
		console.error(e);
		process.exit(1);
	}
}
const includePep = process.env.INCLUDE_PEP !== "false";
const includeSanctioned = process.env.INCLUDE_SANCTIONED !== "false";
let wranglerConfigFile = process.env.WRANGLER_CONFIG;
if (!wranglerConfigFile) {
	if (
		process.env.CF_PAGES_BRANCH ||
		(process.env.WORKERS_CI_BRANCH &&
			process.env.WORKERS_CI_BRANCH !== "main") ||
		process.env.PREVIEW === "true"
	) {
		wranglerConfigFile = "wrangler.preview.jsonc";
	}
}
const resolvedWranglerConfigFile = wranglerConfigFile || "wrangler.jsonc";

// Determine if we're running locally or remotely
const isRemote = process.env.CI === "true" || process.env.REMOTE === "true";

// Validate required parameters
if (!userId) {
	console.error("❌ Error: USER_ID environment variable is required");
	process.exit(1);
}

if (!organizationId) {
	console.error("❌ Error: ORGANIZATION_ID environment variable is required");
	process.exit(1);
}

if (!modelsStr) {
	console.error("❌ Error: MODELS environment variable is required");
	console.error("   Example: MODELS=clients,operations");
	process.exit(1);
}

const models = modelsStr.split(",").map((m) => m.trim().toLowerCase());
const validModels = ["clients", "operations"];
const invalidModels = models.filter((m) => !validModels.includes(m));

if (invalidModels.length > 0) {
	console.error(
		`❌ Error: Invalid models: ${invalidModels.join(", ")}. Valid models are: ${validModels.join(", ")}`,
	);
	process.exit(1);
}

async function openDatabaseProxy() {
	const configPath = resolve(
		process.cwd(),
		join(__dirname, "..", resolvedWranglerConfigFile),
	);
	console.log(
		`📦 Wrangler bindings (${isRemote ? "remote" : "local persisted"}): ${configPath}`,
	);
	return getPlatformProxy({
		configPath,
		remoteBindings: isRemote,
	});
}

async function generateSyntheticData() {
	console.log(`🔧 Generating synthetic data for user: ${userId}`);
	console.log(`   Organization: ${organizationId}`);
	console.log(`   Environment: ${isRemote ? "remote" : "local"}`);
	console.log(`   Config: ${resolvedWranglerConfigFile}`);
	console.log(`   Models: ${models.join(", ")}`);
	console.log("");

	// Build options
	const options = {};

	if (models.includes("clients")) {
		options.clients = {
			count: clientsCount,
			includeDocuments: clientsIncludeDocuments,
			includeAddresses: clientsIncludeAddresses,
			...(riskMix ? { riskMix } : {}),
			includePep,
			includeSanctioned,
		};
		console.log(
			`   Clients: ${clientsCount} (documents: ${clientsIncludeDocuments}, addresses: ${clientsIncludeAddresses})`,
		);
	}
	if (models.includes("operations")) {
		options.operations = {
			count: operationsCount,
			perClient: operationsPerClient,
		};
		console.log(
			`   Operations: ${operationsCount}${operationsPerClient ? ` (${operationsPerClient} per client)` : ""}`,
		);
	}
	console.log("");

	try {
		const { env, dispose } = await openDatabaseProxy();
		try {
			const db = env.DB;

			const { SyntheticDataGenerator } = await import(
				"../src/lib/synthetic-data-generator.ts"
			);
			const { getPrismaClient } = await import("../src/lib/prisma.ts");

			const prisma = getPrismaClient(db);
			const generator = new SyntheticDataGenerator(prisma, organizationId);

			console.log("⏳ Generating synthetic data...");
			const result = await generator.generate(options);

			console.log("✅ Synthetic data generation completed!");
			console.log(`   Clients created: ${result.clients.created}`);
			console.log(`   Operations created: ${result.operations.created}`);
		} finally {
			await dispose();
		}

		process.exit(0);
	} catch (error) {
		console.error("❌ Error generating synthetic data:", error);
		if (error instanceof Error) {
			console.error("   Message:", error.message);
			if (error.stack) {
				console.error("   Stack:", error.stack);
			}
		}
		process.exit(1);
	}
}

generateSyntheticData().catch((error) => {
	console.error("Fatal error:", error);
	process.exit(1);
});
