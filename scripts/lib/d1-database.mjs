/**
 * Shared D1 wiring for Node scripts (remote Cloudflare REST API).
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function stripJsoncComments(content) {
	let jsonContent = content;
	let inString = false;
	let escapeNext = false;
	let result = "";

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

		if (!inString) {
			if (char === "/" && nextChar === "/") {
				while (i < jsonContent.length && jsonContent[i] !== "\n") {
					i++;
				}
				continue;
			}

			if (char === "/" && nextChar === "*") {
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

			if (char === ",") {
				let j = i + 1;
				let isTrailing = false;
				while (j < jsonContent.length) {
					const next = jsonContent[j];
					if (next === "}" || next === "]") {
						isTrailing = true;
						break;
					}
					if (next !== " " && next !== "\t" && next !== "\n" && next !== "\r") {
						break;
					}
					j++;
				}
				if (isTrailing) {
					continue;
				}
			}
		}

		result += char;
	}

	return result;
}

/**
 * @param {string} amlSvcRoot Absolute path to aml-svc directory
 * @param {string} resolvedWranglerConfigFile e.g. wrangler.jsonc
 */
export function createRemoteD1Database(accountId, databaseId, apiToken) {
	const baseUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}`;

	class RemoteD1PreparedStatement {
		constructor(query) {
			this.query = query;
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
				const error = await response.text();
				throw new Error(`D1 query failed: ${error}`);
			}

			const data = await response.json();
			return {
				success: data.success ?? true,
				meta: {
					duration: data.meta?.duration ?? 0,
					rows_read: data.meta?.rows_read ?? 0,
					rows_written: data.meta?.rows_written ?? 0,
					last_row_id: data.meta?.last_row_id ?? 0,
					changed_db: data.meta?.changed_db ?? false,
					changes: data.meta?.changes ?? 0,
					size_after: data.meta?.size_after ?? 0,
				},
				results: data.results || [],
			};
		}
	}

	return {
		prepare(query) {
			return new RemoteD1PreparedStatement(query);
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
			const queries = statements.map((stmt) => {
				return {
					sql: stmt.query,
					params: stmt.boundValues,
				};
			});

			const response = await fetch(`${baseUrl}/batch`, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${apiToken}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify(queries),
			});

			if (!response.ok) {
				const error = await response.text();
				throw new Error(`D1 batch failed: ${error}`);
			}

			const data = await response.json();
			return (data.results || []).map((result) => ({
				success: true,
				meta: {
					duration: 0,
					rows_read: 0,
					rows_written: 0,
					last_row_id: 0,
					changed_db: false,
					changes: 0,
					size_after: 0,
				},
				results: result || [],
			}));
		},
	};
}

/**
 * Open D1 binding — currently remote REST only (matches legacy generate-synthetic-data script).
 * @param {{ amlSvcRoot: string, resolvedWranglerConfigFile: string, isRemote: boolean }} opts
 */
export async function openD1Database(opts) {
	const { amlSvcRoot, resolvedWranglerConfigFile, isRemote } = opts;
	const configPath = join(amlSvcRoot, resolvedWranglerConfigFile);
	let config;
	try {
		const configContent = readFileSync(configPath, "utf-8");
		config = JSON.parse(stripJsoncComments(configContent));
	} catch (error) {
		console.error(
			`❌ Error reading wrangler config from ${resolvedWranglerConfigFile}:`,
			error,
		);
		process.exit(1);
	}

	const d1Database = config.d1_databases?.find((db) => db.binding === "DB");
	if (!d1Database) {
		console.error("❌ Error: No D1 database with binding 'DB' found in config");
		process.exit(1);
	}

	if (!isRemote) {
		console.log(
			`💾 Local D1 (${d1Database.database_name}): requires wrangler dev or use REMOTE=true`,
		);
		throw new Error(
			"Local D1 connection from Node scripts is not configured.\n" +
				"   Use REMOTE=true with CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID,\n" +
				"   or run via wrangler pipelines that inject D1.",
		);
	}

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

	return createRemoteD1Database(
		process.env.CLOUDFLARE_ACCOUNT_ID,
		d1Database.database_id,
		process.env.CLOUDFLARE_API_TOKEN,
	);
}

export function getAmlSvcRootFromScriptsLib() {
	return join(__dirname, "..", "..");
}
