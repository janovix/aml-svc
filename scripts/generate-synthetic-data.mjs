#!/usr/bin/env node
/**
 * Generate Synthetic Data
 *
 * Generates synthetic data (clients, transactions, etc.) for a user account.
 * This script can be run locally or from GitHub Actions.
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
 *   WRANGLER_CONFIG - Wrangler config file (optional, defaults to wrangler.preview.jsonc)
 *   CLOUDFLARE_API_TOKEN - Cloudflare API token for D1 access (required for remote)
 *   CLOUDFLARE_ACCOUNT_ID - Cloudflare account ID (required for remote)
 */

import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { readFileSync } from "node:fs";

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
const wranglerConfigFile =
	process.env.WRANGLER_CONFIG || "wrangler.preview.jsonc";

// Determine if we're running locally or remotely
const isRemote = process.env.CI === "true" || process.env.REMOTE === "true";

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

const models = modelsStr.split(",").map((m) => m.trim().toLowerCase());
const validModels = ["clients", "transactions"];
const invalidModels = models.filter((m) => !validModels.includes(m));

if (invalidModels.length > 0) {
	console.error(
		`❌ Error: Invalid models: ${invalidModels.join(", ")}. Valid models are: ${validModels.join(", ")}`,
	);
	process.exit(1);
}

/**
 * Creates a D1Database instance
 * For remote: uses Cloudflare REST API
 * For local: requires wrangler dev to be running
 */
async function getD1Database() {
	// Read wrangler config
	const configPath = join(__dirname, "..", wranglerConfigFile);
	let config;
	try {
		const configContent = readFileSync(configPath, "utf-8");

		// Parse JSONC manually - handle comments and trailing commas
		// This is a simple parser that handles the common cases
		let jsonContent = configContent;
		let inString = false;
		let escapeNext = false;
		let result = "";

		// Process character by character to properly handle strings
		for (let i = 0; i < jsonContent.length; i++) {
			const char = jsonContent[i];
			const nextChar = jsonContent[i + 1];

			if (escapeNext) {
				result += char;
				escapeNext = false;
				continue;
			}

			if (char === "\\" && inString) {
				result += char;
				escapeNext = true;
				continue;
			}

			if (char === '"' && !escapeNext) {
				inString = !inString;
				result += char;
				continue;
			}

			// Outside strings, handle comments and trailing commas
			if (!inString) {
				// Single-line comment
				if (char === "/" && nextChar === "/") {
					// Skip until end of line
					while (i < jsonContent.length && jsonContent[i] !== "\n") {
						i++;
					}
					continue;
				}

				// Multi-line comment
				if (char === "/" && nextChar === "*") {
					// Skip until */
					i += 2;
					while (i < jsonContent.length - 1) {
						if (jsonContent[i] === "*" && jsonContent[i + 1] === "/") {
							i++;
							break;
						}
						i++;
					}
					continue;
				}

				// Remove trailing commas before } or ]
				if (char === ",") {
					// Look ahead to see if next non-whitespace is } or ]
					let j = i + 1;
					let isTrailing = false;
					while (j < jsonContent.length) {
						const next = jsonContent[j];
						if (next === "}" || next === "]") {
							isTrailing = true;
							break;
						}
						if (
							next !== " " &&
							next !== "\t" &&
							next !== "\n" &&
							next !== "\r"
						) {
							break;
						}
						j++;
					}
					if (isTrailing) {
						// Skip trailing comma
						continue;
					}
				}
			}

			result += char;
		}

		jsonContent = result;
		config = JSON.parse(jsonContent);
	} catch (error) {
		console.error(
			`❌ Error reading wrangler config from ${wranglerConfigFile}:`,
			error,
		);
		if (error instanceof SyntaxError) {
			console.error(
				"   Tip: Make sure the config file is valid JSONC (JSON with Comments)",
			);
		}
		process.exit(1);
	}

	// Get D1 database config
	const d1Database = config.d1_databases?.find((db) => db.binding === "DB");
	if (!d1Database) {
		console.error("❌ Error: No D1 database with binding 'DB' found in config");
		process.exit(1);
	}

	if (isRemote) {
		console.log(
			`📡 Connecting to remote D1 database: ${d1Database.database_name}`,
		);

		if (!process.env.CLOUDFLARE_API_TOKEN) {
			throw new Error(
				"CLOUDFLARE_API_TOKEN is required for remote D1 connection",
			);
		}
		if (!process.env.CLOUDFLARE_ACCOUNT_ID) {
			throw new Error(
				"CLOUDFLARE_ACCOUNT_ID is required for remote D1 connection",
			);
		}

		// Create remote D1Database implementation using Cloudflare REST API
		return createRemoteD1Database(
			process.env.CLOUDFLARE_ACCOUNT_ID,
			d1Database.database_id,
			process.env.CLOUDFLARE_API_TOKEN,
		);
	} else {
		console.log(
			`💾 Connecting to local D1 database: ${d1Database.database_name}`,
		);
		console.log("   Note: This requires wrangler dev to be running");

		// For local, we need wrangler dev to be running
		// We can't easily create a local D1 instance without wrangler dev
		// So we'll throw an error and suggest using REMOTE=true
		throw new Error(
			"Local D1 connection requires wrangler dev to be running.\n" +
				"   For GitHub Actions, use REMOTE=true with CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID",
		);
	}
}

/**
 * Creates a D1Database instance that connects to Cloudflare D1 via REST API
 * This implementation matches the Workers runtime D1Database interface
 */
function createRemoteD1Database(accountId, databaseId, apiToken) {
	const baseUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}`;

	class RemoteD1PreparedStatement {
		constructor(query, db) {
			this.query = query;
			this.db = db;
			this.boundValues = [];
		}

		bind(...values) {
			this.boundValues = values;
			return this;
		}

		async first(colName) {
			const result = await this.all();
			if (!result.results || result.results.length === 0) {
				return null;
			}
			const first = result.results[0];
			if (colName) {
				return first[colName] ?? null;
			}
			return first;
		}

		async run() {
			return this.executeQuery();
		}

		async all() {
			return this.executeQuery();
		}

		async raw() {
			const result = await this.executeQuery();
			return result.results || [];
		}

		async executeQuery() {
			const response = await fetch(`${baseUrl}/query`, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${apiToken}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					sql: this.query,
					params: this.boundValues,
				}),
			});

			if (!response.ok) {
				const errorText = await response.text();
				let errorMessage = `D1 query failed: ${errorText}`;
				try {
					const errorJson = JSON.parse(errorText);
					errorMessage = errorJson.errors?.[0]?.message || errorMessage;
				} catch {
					// Use the text as-is
				}
				throw new Error(errorMessage);
			}

			const data = await response.json();

			// Cloudflare D1 REST API returns: { success: true, meta: {...}, results: [...] }
			// Handle both direct response and wrapped response formats
			const result = data.result || data;

			// Ensure all required meta fields are present with proper types
			const meta = result.meta || {};

			return {
				success: result.success !== false,
				meta: {
					duration: Number(meta.duration) || 0,
					rows_read: Number(meta.rows_read) || 0,
					rows_written: Number(meta.rows_written) || 0,
					last_row_id: Number(meta.last_row_id) || 0,
					changed_db: Boolean(meta.changed_db),
					changes: Number(meta.changes) || 0,
					size_after: Number(meta.size_after) || 0,
				},
				results: Array.isArray(result.results) ? result.results : [],
			};
		}
	}

	return {
		prepare(query) {
			return new RemoteD1PreparedStatement(query, this);
		},

		async exec(query) {
			const response = await fetch(`${baseUrl}/query`, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${apiToken}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					sql: query,
				}),
			});

			if (!response.ok) {
				const error = await response.text();
				throw new Error(`D1 exec failed: ${error}`);
			}

			const data = await response.json();
			return {
				count: data.meta?.changes ?? 0,
				duration: data.meta?.duration ?? 0,
			};
		},

		async batch(statements) {
			// Execute statements sequentially since Cloudflare D1 REST API doesn't have a true batch endpoint
			// Prisma will call this for transactions, so we need to handle them properly
			const results = [];
			for (const stmt of statements) {
				const result = await stmt.run();
				results.push(result);
			}
			return results;
		},
	};
}

async function generateSyntheticData() {
	console.log(`🔧 Generating synthetic data for user: ${userId}`);
	console.log(`   Environment: ${isRemote ? "remote" : "local"}`);
	console.log(`   Models: ${models.join(", ")}`);
	console.log("");

	// Build options
	const options = {};

	if (models.includes("clients")) {
		options.clients = {
			count: clientsCount,
			includeDocuments: clientsIncludeDocuments,
			includeAddresses: clientsIncludeAddresses,
		};
		console.log(
			`   Clients: ${clientsCount} (documents: ${clientsIncludeDocuments}, addresses: ${clientsIncludeAddresses})`,
		);
	}
	if (models.includes("transactions")) {
		options.transactions = {
			count: transactionsCount,
			perClient: transactionsPerClient,
		};
		console.log(
			`   Transactions: ${transactionsCount}${transactionsPerClient ? ` (${transactionsPerClient} per client)` : ""}`,
		);
	}
	console.log("");

	try {
		// Get D1 database connection
		const db = await getD1Database();

		// Import the generator and Prisma client
		const { SyntheticDataGenerator } = await import(
			"../src/lib/synthetic-data-generator.ts"
		);
		const { getPrismaClient } = await import("../src/lib/prisma.ts");

		// Create Prisma client with D1 adapter
		const prisma = getPrismaClient(db);
		const generator = new SyntheticDataGenerator(prisma);

		// Generate synthetic data
		console.log("⏳ Generating synthetic data...");
		const result = await generator.generate(options);

		console.log("✅ Synthetic data generation completed!");
		console.log(`   Clients created: ${result.clients.created}`);
		console.log(`   Transactions created: ${result.transactions.created}`);

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
