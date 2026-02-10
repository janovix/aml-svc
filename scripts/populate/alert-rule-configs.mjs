#!/usr/bin/env node
/**
 * Populate Alert Rule Configs
 *
 * Populates configurable values for alert seekers.
 * Some values are hardcoded (cannot be changed via API), others are configurable.
 *
 * This is REFERENCE DATA (not synthetic data) and runs in all environments.
 */

import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { getWranglerConfig, executeSql } from "./lib/shared.mjs";

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

	// Get unique set of alert rule IDs we're populating configs for
	const alertRuleIds = [
		...new Set(alertRuleConfigs.map((config) => config.alertRuleId)),
	];

	// Delete existing configs only for the alert rules we're populating
	// This preserves configs for other alert rules that might exist
	if (alertRuleIds.length > 0) {
		const alertRuleIdsList = alertRuleIds
			.map((id) => escapeSqlString(id))
			.join(", ");
		sql.push(`
-- Clear existing configs for alert rules we're populating (preserves other configs)
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

async function populateAlertRuleConfigs() {
	const { isRemote } = getWranglerConfig();

	try {
		console.log(
			`📦 Populating alert rule configs (${isRemote ? "remote" : "local"})...`,
		);
		console.log(`Creating ${alertRuleConfigs.length} config(s)...`);

		// Generate SQL
		const sql = generateSql();

		// Execute SQL using shared utility
		executeSql(sql, "alert-rule-configs");

		console.log(
			`✅ Alert rule configs populated: ${alertRuleConfigs.length} config(s) created`,
		);
	} catch (error) {
		console.error("❌ Error populating alert rule configs:", error);
		throw error;
	}
}

// Export for use in all.mjs
export { populateAlertRuleConfigs };

// If run directly, execute populate
const isDirectRun =
	process.argv[1] && __filename.toLowerCase() === process.argv[1].toLowerCase();

if (isDirectRun) {
	populateAlertRuleConfigs().catch((error) => {
		console.error("Fatal error:", error);
		process.exit(1);
	});
}
