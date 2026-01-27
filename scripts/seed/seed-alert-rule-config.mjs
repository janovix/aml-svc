#!/usr/bin/env node
/**
 * Seed Alert Rule Config
 *
 * Populates configurable values for alert seekers.
 * Some values are hardcoded (cannot be changed via API), others are configurable.
 */

import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { writeFileSync, unlinkSync } from "node:fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Alert rule configurations
// Link configs to alert rules by alertRuleId (using the rule codes/IDs)
const alertRuleConfigs = [
	// UMA threshold for aviso obligatorio (6,420 UMA)
	{
		alertRuleId: "AUTO_UMA",
		key: "uma_threshold",
		value: JSON.stringify(6420),
		isHardcoded: true, // Legal requirement, cannot be changed
		description: "UMA threshold for mandatory SAT report (Art. 17 LFPIORPI)",
	},
	{
		alertRuleId: "AUTO_AGGREGATE",
		key: "uma_threshold",
		value: JSON.stringify(6420),
		isHardcoded: true, // Legal requirement, cannot be changed
		description:
			"UMA threshold for aggregate amount mandatory SAT report (Art. 17 LFPIORPI)",
	},
	{
		alertRuleId: "AUTO_AGGREGATE",
		key: "aggregation_window_days",
		value: JSON.stringify(180), // 6 months
		isHardcoded: true, // Legal requirement
		description:
			"Time window in days for aggregating transactions (6 months per LFPIORPI)",
	},
	{
		alertRuleId: "AUTO_AGGREGATE",
		key: "min_transactions",
		value: JSON.stringify(2),
		isHardcoded: true,
		description: "Minimum number of transactions to trigger aggregate alert",
	},
	// Cash payment limit (configurable - depends on activity)
	{
		alertRuleId: "2512",
		key: "max_cash_amount",
		value: JSON.stringify(null), // Must be configured per activity
		isHardcoded: false, // Configurable
		description:
			"Maximum cash payment amount allowed (configurable per vulnerable activity)",
	},
	// Frequent transactions
	{
		alertRuleId: "2504",
		key: "frequent_transaction_window_days",
		value: JSON.stringify(30),
		isHardcoded: true,
		description: "Time window in days for detecting frequent transactions",
	},
	{
		alertRuleId: "2504",
		key: "frequent_transaction_min_count",
		value: JSON.stringify(3),
		isHardcoded: true,
		description:
			"Minimum number of transactions to trigger frequent transactions alert",
	},
	{
		alertRuleId: "2516",
		key: "frequent_transaction_window_days",
		value: JSON.stringify(30),
		isHardcoded: true,
		description: "Time window in days for detecting frequent transactions",
	},
	{
		alertRuleId: "2516",
		key: "frequent_transaction_min_count",
		value: JSON.stringify(3),
		isHardcoded: true,
		description:
			"Minimum number of transactions to trigger frequent transactions alert",
	},
	// Cash fragmentation
	{
		alertRuleId: "AUTO_CASH_FRAG",
		key: "cash_fragmentation_window_days",
		value: JSON.stringify(30),
		isHardcoded: true,
		description: "Time window in days for detecting cash fragmentation",
	},
	{
		alertRuleId: "AUTO_CASH_FRAG",
		key: "cash_fragmentation_min_payments",
		value: JSON.stringify(2),
		isHardcoded: true,
		description:
			"Minimum number of cash payments to trigger fragmentation alert",
	},
	// PEP threshold
	{
		alertRuleId: "AUTO_PEP_THRESHOLD",
		key: "uma_threshold",
		value: JSON.stringify(6420),
		isHardcoded: true,
		description: "UMA threshold for PEP above threshold alert",
	},
];

function escapeSqlString(str) {
	if (str === null || str === undefined) return "NULL";
	return `'${String(str).replace(/'/g, "''")}'`;
}

function generateId() {
	// Generate a simple ID: ARC + random hex
	const randomHex = Math.random().toString(16).substring(2, 11);
	return `ARC${randomHex}`;
}

function generateSql() {
	const sql = [];

	// Get unique set of alert rule IDs we're seeding configs for
	const alertRuleIds = [
		...new Set(alertRuleConfigs.map((config) => config.alertRuleId)),
	];

	// Delete existing configs only for the alert rules we're seeding
	// This preserves configs for other alert rules that might exist
	if (alertRuleIds.length > 0) {
		const alertRuleIdsList = alertRuleIds
			.map((id) => escapeSqlString(id))
			.join(", ");
		sql.push(`
-- Clear existing configs for alert rules we're seeding (preserves other configs)
DELETE FROM alert_rule_config
WHERE alert_rule_id IN (${alertRuleIdsList});
`);
	}

	// Insert configs
	for (const config of alertRuleConfigs) {
		const id = escapeSqlString(generateId());
		const alertRuleId = escapeSqlString(config.alertRuleId);
		const key = escapeSqlString(config.key);
		const value = escapeSqlString(config.value);
		const isHardcoded = config.isHardcoded ? 1 : 0;
		const description = config.description
			? escapeSqlString(config.description)
			: "NULL";

		sql.push(`
INSERT INTO alert_rule_config (id, alert_rule_id, key, value, is_hardcoded, description, created_at, updated_at)
VALUES (
	${id},
	${alertRuleId},
	${key},
	${value},
	${isHardcoded},
	${description},
	CURRENT_TIMESTAMP,
	CURRENT_TIMESTAMP
);
`);
	}

	return sql.join("\n");
}

async function seedAlertRuleConfig() {
	const isRemote = process.env.CI === "true" || process.env.REMOTE === "true";
	// Check if config is explicitly set (this takes precedence)
	let configFile = process.env.WRANGLER_CONFIG;
	// If not explicitly set, check if we're in preview environment
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
			`🌱 Seeding alert rule configs (${isRemote ? "remote" : "local"})...`,
		);
		console.log(`Creating ${alertRuleConfigs.length} config(s)...`);

		// Generate SQL
		const sql = generateSql();
		const sqlFile = join(__dirname, `temp-alert-rule-config-${Date.now()}.sql`);

		try {
			writeFileSync(sqlFile, sql);

			// Execute SQL
			const wranglerCmd =
				process.env.CI === "true" ? "pnpm wrangler" : "wrangler";
			const command = isRemote
				? `${wranglerCmd} d1 execute DB ${configFlag} --remote --file "${sqlFile}"`
				: `${wranglerCmd} d1 execute DB ${configFlag} --local --file "${sqlFile}"`;

			execSync(command, { stdio: "inherit" });

			console.log(
				`✅ Alert rule config seeding completed: ${alertRuleConfigs.length} config(s) created`,
			);
		} finally {
			try {
				unlinkSync(sqlFile);
			} catch {
				// Ignore cleanup errors
			}
		}
	} catch (error) {
		console.error("❌ Error seeding alert rule configs:", error);
		throw error;
	}
}

// Export for use in all.mjs
export { seedAlertRuleConfig };

// If run directly, execute seed
if (import.meta.url === `file://${process.argv[1]}`) {
	seedAlertRuleConfig().catch((error) => {
		console.error("Fatal error:", error);
		process.exit(1);
	});
}
