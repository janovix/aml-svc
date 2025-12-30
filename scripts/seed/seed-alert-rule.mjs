#!/usr/bin/env node
/**
 * Seed Alert Rules
 *
 * Generates synthetic alert rule data for dev/preview environments.
 * This is SEED data (not real data) and should NOT run in production.
 *
 * Note: Real alert rules should be created via the API or create-alert-rules script.
 */

import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { writeFileSync, unlinkSync } from "node:fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Alert rules based on Janovix AV Vehículos requirements
const alertRules = [
	{
		name: "Monto igual o superior a 6,420 UMA – Aviso Obligatorio",
		description:
			"Se dispara cuando el precio total del vehículo es igual o superior a 6,420 UMA. Genera aviso obligatorio al SAT.",
		active: true,
		severity: "HIGH",
		ruleConfig: {
			type: "transaction_amount_uma",
			threshold: 6420,
			currency: "MXN",
			umaDailyValue: null,
			evaluationType: "individual",
			requiresCompleteFile: true,
			checklist: [
				"client_identification",
				"activity_or_occupation",
				"beneficial_owner",
			],
		},
		metadata: {
			category: "aviso_obligatorio",
			obligation: "generar_aviso_sat",
			deadline: "dia_17_mes_siguiente",
			retention: "10_anios",
		},
	},
	{
		name: "Acumulación de operaciones que alcanza el umbral de aviso",
		description:
			"Detecta cuando 2 o más operaciones de un mismo cliente suman >= 6,420 UMA en un periodo móvil de 6 meses.",
		active: true,
		severity: "HIGH",
		ruleConfig: {
			type: "aggregate_amount_uma",
			threshold: 6420,
			currency: "MXN",
			umaDailyValue: null,
			timeWindow: "6_months",
			timeWindowType: "rolling",
			minTransactions: 2,
			groupBy: "client",
			operationTypes: ["PURCHASE", "SALE"],
			resetAfterAviso: true,
		},
		metadata: {
			category: "aviso_obligatorio",
			obligation: "generar_aviso_sat",
			detectionTypes: [
				"multiple_units_same_client",
				"payments_different_agencies",
				"third_party_payments",
			],
		},
	},
	{
		name: "Intento de pago en efectivo superior al monto permitido",
		description:
			"Se dispara cuando el cliente intenta pagar en efectivo una cantidad mayor a la permitida para esta actividad vulnerable.",
		active: true,
		severity: "HIGH",
		ruleConfig: {
			type: "cash_payment_limit",
			maxCashAmount: null,
			currency: "MXN",
			action: "reject",
		},
		metadata: {
			category: "pago_efectivo",
			obligation: "rechazo_operacion",
			legalBasis: "Art_32_LFPIORPI",
		},
	},
	{
		name: "Sistema detecta fraccionamiento de efectivo",
		description:
			"Detecta cuando el cliente usa múltiples depósitos en efectivo o diferentes personas realizan depósitos en efectivo a nombre del comprador.",
		active: true,
		severity: "MEDIUM",
		ruleConfig: {
			type: "cash_fragmentation",
			detectionWindow: "30_days",
			minCashPayments: 2,
			checkMultiplePayers: true,
			checkSameBuyer: true,
		},
		metadata: {
			category: "pago_efectivo",
			obligation: "rechazo_operacion",
			risk: "estructuracion",
		},
	},
	{
		name: "El pagador no coincide con el comprador",
		description:
			"Janovix detecta cuando el pagador no coincide con el comprador, indicando posible riesgo de testaferro.",
		active: true,
		severity: "MEDIUM",
		ruleConfig: {
			type: "payer_buyer_mismatch",
			requireEnhancedDueDiligence: true,
			checkPaymentMethods: true,
		},
		metadata: {
			category: "debida_diligencia",
			obligation: "debida_diligencia_reforzada",
			risk: "testaferro",
		},
	},
	{
		name: "Operación de PEP por encima del umbral de aviso – seguimiento reforzado",
		description:
			"Identifica cuando un cliente PEP realiza una operación por encima del umbral de aviso, requiriendo seguimiento intensificado.",
		active: true,
		severity: "CRITICAL",
		ruleConfig: {
			type: "pep_above_threshold",
			threshold: 6420,
			umaDailyValue: null,
			requirePEPFlag: true,
			requireEnhancedMonitoring: true,
			requireManualReview: true,
		},
		metadata: {
			category: "pep_seguimiento",
			obligation: "seguimiento_intensificado",
			risk: "alto_riesgo",
		},
	},
	{
		name: "Cliente PEP o de Alto Riesgo – Seguimiento Intensificado",
		description:
			"Todas las operaciones de clientes PEP o de alto riesgo requieren seguimiento intensificado y revisión manual.",
		active: true,
		severity: "HIGH",
		ruleConfig: {
			type: "pep_or_high_risk",
			requirePEPFlag: true,
			requireHighRiskFlag: true,
			requireEnhancedMonitoring: true,
			requireManualReview: true,
			requireDocumentation: true,
		},
		metadata: {
			category: "seguimiento_intensificado",
			obligation: "monitoreo_estricto",
			risk: "alto_riesgo",
		},
	},
	{
		name: "Operaciones frecuentes en corto plazo",
		description:
			"Detecta cuando un cliente realiza múltiples operaciones en un corto período, posible estructuración o intento de evasión de umbrales.",
		active: true,
		severity: "MEDIUM",
		ruleConfig: {
			type: "frequent_transactions",
			timeWindow: "30_days",
			minTransactions: 3,
			requireAccumulationCheck: true,
		},
		metadata: {
			category: "operaciones_inusuales",
			risk: "estructuracion",
		},
	},
	{
		name: "Cliente sin historial adquiriendo vehículo de muy alto valor",
		description:
			"Cliente sin historial previo que adquiere un vehículo de muy alto valor, indicando posible riesgo de lavado de activos.",
		active: true,
		severity: "HIGH",
		ruleConfig: {
			type: "new_client_high_value",
			minTransactionAmount: null,
			requireNoPreviousTransactions: true,
			requireEnhancedDueDiligence: true,
			requireResourceDocumentation: true,
		},
		metadata: {
			category: "operaciones_inusuales",
			obligation: "debida_diligencia_reforzada",
			risk: "lavado_activos",
		},
	},
	{
		name: "Uso de cuentas de terceros no relacionados",
		description:
			"Detecta cuando se usan cuentas de terceros no relacionados para el pago, indicando posible uso de prestanombres.",
		active: true,
		severity: "HIGH",
		ruleConfig: {
			type: "third_party_accounts",
			requireRelationshipCheck: true,
			action: "reject_or_enhanced_dd",
		},
		metadata: {
			category: "operaciones_inusuales",
			obligation: "rechazo_o_dd_reforzada",
			risk: "prestanombres",
		},
	},
];

function escapeSqlString(str) {
	if (!str) return "NULL";
	return `'${String(str).replace(/'/g, "''")}'`;
}

function generateSql() {
	const sql = [];

	// Check if alert rules already exist
	sql.push(`
		-- Check if alert rules already exist
		SELECT COUNT(*) as count FROM alert_rules;
	`);

	// Insert alert rules (using INSERT OR IGNORE to prevent duplicates)
	for (const rule of alertRules) {
		const name = escapeSqlString(rule.name);
		const description = rule.description
			? escapeSqlString(rule.description)
			: "NULL";
		const active = rule.active ? 1 : 0;
		const severity = escapeSqlString(rule.severity);
		const ruleConfig = escapeSqlString(JSON.stringify(rule.ruleConfig));
		const metadata = rule.metadata
			? escapeSqlString(JSON.stringify(rule.metadata))
			: "NULL";

		sql.push(`
			INSERT OR IGNORE INTO alert_rules (id, name, description, active, severity, ruleConfig, metadata, createdAt, updatedAt)
			VALUES (
				lower(hex(randomblob(16))),
				${name},
				${description},
				${active},
				${severity},
				${ruleConfig},
				${metadata},
				CURRENT_TIMESTAMP,
				CURRENT_TIMESTAMP
			);
		`);
	}

	return sql.join("\n");
}

async function seedAlertRules() {
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
		console.log(`🌱 Seeding alert rules (${isRemote ? "remote" : "local"})...`);

		// Check if alert rules already exist
		const checkSql = "SELECT COUNT(*) as count FROM alert_rules;";
		const checkFile = join(__dirname, `temp-check-${Date.now()}.sql`);
		try {
			writeFileSync(checkFile, checkSql);
			const checkCommand = isRemote
				? `wrangler d1 execute DB ${configFlag} --remote --file "${checkFile}"`
				: `wrangler d1 execute DB ${configFlag} --local --file "${checkFile}"`;
			const checkOutput = execSync(checkCommand, { encoding: "utf-8" });
			// Parse the count from output (format may vary)
			const countMatch = checkOutput.match(/count\s*\|\s*(\d+)/i);
			if (countMatch && parseInt(countMatch[1], 10) > 0) {
				console.log(`⏭️  Alert rules already exist. Skipping seed.`);
				return;
			}
		} catch {
			// If check fails, continue with seeding
			console.warn(
				"⚠️  Could not check existing rules, proceeding with seed...",
			);
		} finally {
			try {
				unlinkSync(checkFile);
			} catch {
				// Ignore cleanup errors
			}
		}

		console.log(`Creating ${alertRules.length} alert rule(s)...`);

		// Generate SQL
		const sql = generateSql();
		const sqlFile = join(__dirname, `temp-alert-rules-${Date.now()}.sql`);

		try {
			writeFileSync(sqlFile, sql);

			// Execute SQL
			const command = isRemote
				? `wrangler d1 execute DB ${configFlag} --remote --file "${sqlFile}"`
				: `wrangler d1 execute DB ${configFlag} --local --file "${sqlFile}"`;

			execSync(command, { stdio: "inherit" });

			console.log(
				`✅ Alert rule seeding completed: ${alertRules.length} rule(s) created`,
			);
		} finally {
			// Clean up temp file
			try {
				unlinkSync(sqlFile);
			} catch {
				// Ignore cleanup errors
			}
		}
	} catch (error) {
		console.error("❌ Error seeding alert rules:", error);
		throw error;
	}
}

// Export for use in all.mjs
export { seedAlertRules };

// If run directly, execute seed
if (import.meta.url === `file://${process.argv[1]}`) {
	seedAlertRules().catch((error) => {
		console.error("Fatal error:", error);
		process.exit(1);
	});
}
