#!/usr/bin/env node
/**
 * Generate Synthetic Data
 *
 * Generates synthetic data (clients, transactions, etc.) for a user account.
 * This script is intended to be run from GitHub Actions via workflow_dispatch.
 *
 * Usage:
 *   node scripts/generate-synthetic-data.mjs
 *
 * Environment Variables:
 *   USER_ID - User ID for which to generate data (required)
 *   MODELS - Comma-separated list of models to generate: clients,transactions (required)
 *   CLIENTS_COUNT - Number of clients to generate (default: 10)
 *   CLIENTS_INCLUDE_DOCUMENTS - Include documents for clients (default: false)
 *   CLIENTS_INCLUDE_ADDRESSES - Include addresses for clients (default: false)
 *   TRANSACTIONS_COUNT - Number of transactions to generate (default: 50)
 *   TRANSACTIONS_PER_CLIENT - Number of transactions per client (optional)
 *   WRANGLER_CONFIG - Wrangler config file (optional, auto-detected)
 *   REMOTE - Set to "true" to use remote database (default: false)
 *   SYNTHETIC_DATA_SECRET - Secret token for authentication (required)
 *   WORKER_URL - URL of the worker (optional, will use wrangler dev if not set)
 */

import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Parse environment variables
const userId = process.env.USER_ID;
const modelsStr = process.env.MODELS || "";
const clientsCount = parseInt(process.env.CLIENTS_COUNT || "10", 10);
const clientsIncludeDocuments =
	process.env.CLIENTS_INCLUDE_DOCUMENTS === "true";
const clientsIncludeAddresses =
	process.env.CLIENTS_INCLUDE_ADDRESSES === "true";
const transactionsCount = parseInt(process.env.TRANSACTIONS_COUNT || "50", 10);
const transactionsPerClient = process.env.TRANSACTIONS_PER_CLIENT
	? parseInt(process.env.TRANSACTIONS_PER_CLIENT, 10)
	: undefined;
const secret = process.env.SYNTHETIC_DATA_SECRET;
const workerUrl = process.env.WORKER_URL;

// Validate required parameters
if (!userId) {
	console.error("❌ Error: USER_ID environment variable is required");
	process.exit(1);
}

if (!modelsStr) {
	console.error("❌ Error: MODELS environment variable is required");
	console.error("   Example: MODELS=clients,transactions");
	process.exit(1);
}

if (!secret) {
	console.error(
		"❌ Error: SYNTHETIC_DATA_SECRET environment variable is required",
	);
	process.exit(1);
}

const models = modelsStr.split(",").map((m) => m.trim().toLowerCase());
const validModels = ["clients", "transactions"];
const invalidModels = models.filter((m) => !validModels.includes(m));

if (invalidModels.length > 0) {
	console.error(
		`❌ Error: Invalid models: ${invalidModels.join(", ")}. Valid models are: ${validModels.join(", ")}`,
	);
	process.exit(1);
}

// Determine if we're running locally or remotely
const isRemote = process.env.CI === "true" || process.env.REMOTE === "true";

function generateSyntheticData() {
	console.log(`🔧 Generating synthetic data for user: ${userId}`);
	console.log(`   Environment: ${isRemote ? "remote" : "local"}`);
	console.log(`   Models: ${models.join(", ")}`);
	console.log("");

	// Build the request body
	const requestBody = {
		userId,
		models,
		options: {},
	};

	if (models.includes("clients")) {
		requestBody.options.clients = {
			count: clientsCount,
			includeDocuments: clientsIncludeDocuments,
			includeAddresses: clientsIncludeAddresses,
		};
		console.log(
			`   Clients: ${clientsCount} (documents: ${clientsIncludeDocuments}, addresses: ${clientsIncludeAddresses})`,
		);
	}
	if (models.includes("transactions")) {
		requestBody.options.transactions = {
			count: transactionsCount,
			perClient: transactionsPerClient,
		};
		console.log(
			`   Transactions: ${transactionsCount}${transactionsPerClient ? ` (${transactionsPerClient} per client)` : ""}`,
		);
	}
	console.log("");

	// If WORKER_URL is provided, use it directly
	if (workerUrl) {
		console.log(`⏳ Calling worker at ${workerUrl}...`);
		fetch(`${workerUrl}/internal/synthetic-data`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-Synthetic-Data-Secret": secret,
			},
			body: JSON.stringify(requestBody),
		})
			.then(async (response) => {
				const result = await response.json();

				if (!response.ok) {
					console.error("❌ Error:", result.error || result.message);
					process.exit(1);
				}

				console.log("✅ Synthetic data generation completed!");
				console.log(`   Clients created: ${result.summary.clientsCreated}`);
				console.log(
					`   Transactions created: ${result.summary.transactionsCreated}`,
				);
				process.exit(0);
			})
			.catch((error) => {
				console.error("❌ Error calling worker:", error);
				process.exit(1);
			});
		return;
	}

	// Otherwise, try to make request to localhost if not remote
	if (!isRemote) {
		const localUrl = "http://localhost:8787";
		console.log(`⏳ Attempting to call worker at ${localUrl}...`);
		console.log("   (Make sure the worker is running: pnpm dev)");

		fetch(`${localUrl}/internal/synthetic-data`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-Synthetic-Data-Secret": secret,
			},
			body: JSON.stringify(requestBody),
		})
			.then(async (response) => {
				const result = await response.json();

				if (!response.ok) {
					console.error("❌ Error:", result.error || result.message);
					console.error("   Make sure the worker is running: pnpm dev");
					process.exit(1);
				}

				console.log("✅ Synthetic data generation completed!");
				console.log(`   Clients created: ${result.summary.clientsCreated}`);
				console.log(
					`   Transactions created: ${result.summary.transactionsCreated}`,
				);
				process.exit(0);
			})
			.catch((error) => {
				console.error("❌ Error calling worker:", error.message);
				console.error("   Make sure the worker is running: pnpm dev");
				console.error("   Or set WORKER_URL to the worker URL");
				process.exit(1);
			});
	} else {
		// For remote, WORKER_URL is required
		console.error("❌ Remote execution requires WORKER_URL to be set");
		console.error("   Set WORKER_URL to your deployed worker URL");
		console.error(
			"   Example: WORKER_URL=https://aml-svc.your-domain.workers.dev",
		);
		process.exit(1);
	}
}

generateSyntheticData().catch((error) => {
	console.error("Fatal error:", error);
	process.exit(1);
});
