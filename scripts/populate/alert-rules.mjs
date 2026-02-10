#!/usr/bin/env node
/**
 * Populate Alert Rules
 *
 * Populates VEH (Vehículos) alert rules for all environments.
 * Alert rules are global and based on LFPIORPI legal requirements.
 * These are the official SAT alert codes for vulnerable activities.
 *
 * This is REFERENCE DATA (not synthetic data) and runs in all environments.
 */

import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { getWranglerConfig, executeSql } from "./lib/shared.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// VEH Alert Rules based on SAT/LFPIORPI requirements
// Codes 100, 2501-2521, 9999 for vehicles (VEH) vulnerable activity
const alertRules = [
	{
		id: "100",
		name: "Sin alerta",
		description: "Operación normal sin indicadores de alerta.",
		active: false, // Inactive by default - this is the "no alert" code
		severity: "LOW",
		ruleType: null, // No automatic detection
		isManualOnly: true,
		activityCode: "VEH",
		metadata: {
			category: "sin_alerta",
			legalBasis: "LFPIORPI",
		},
	},
	{
		id: "2501",
		name: "El cliente o usuario se rehúsa a proporcionar documentos personales que lo identifiquen",
		description:
			"El cliente se niega a proporcionar la documentación necesaria para su identificación.",
		active: true,
		severity: "HIGH",
		ruleType: null, // Manual-only
		isManualOnly: true,
		activityCode: "VEH",
		metadata: {
			category: "debida_diligencia",
			obligation: "rechazo_operacion",
			legalBasis: "LFPIORPI Art. 18",
		},
	},
	{
		id: "2502",
		name: "La operación es pagada, en parte o en su totalidad, por uno o más terceros sin relación aparente con el cliente o usuario",
		description:
			"Detecta cuando el pagador no coincide con el comprador, indicando posible riesgo de testaferro.",
		active: true,
		severity: "MEDIUM",
		ruleType: "payer_buyer_mismatch", // Has seeker
		isManualOnly: false,
		activityCode: "VEH",
		metadata: {
			category: "debida_diligencia",
			obligation: "debida_diligencia_reforzada",
			risk: "testaferro",
			legalBasis: "LFPIORPI",
		},
	},
	{
		id: "2503",
		name: "El cliente o usuario solicita el reembolso del pago del vehículo poco tiempo después de ser adquirido",
		description:
			"Cliente solicita reembolso rápido después de la compra, posible indicador de lavado.",
		active: true,
		severity: "HIGH",
		ruleType: null, // Manual-only
		isManualOnly: true,
		activityCode: "VEH",
		metadata: {
			category: "operaciones_inusuales",
			risk: "lavado_activos",
			legalBasis: "LFPIORPI",
		},
	},
	{
		id: "2504",
		name: "El cliente o usuario compra múltiples vehículos en un periodo muy corto de tiempo, sin tener la preocupación sobre el costo, condiciones o tipo de vehículos",
		description:
			"Detecta cuando un cliente realiza múltiples operaciones en un corto período.",
		active: true,
		severity: "MEDIUM",
		ruleType: "frequent_transactions", // Has seeker
		isManualOnly: false,
		activityCode: "VEH",
		metadata: {
			category: "operaciones_inusuales",
			risk: "estructuracion",
			legalBasis: "LFPIORPI",
		},
	},
	{
		id: "2505",
		name: "De acuerdo con medios informativos u otras fuentes de información pública, se tiene conocimiento o sospecha de que el cliente, un familiar o persona relacionada, está vinculado con actividades ilícitas o se encuentra bajo proceso de investigación",
		description:
			"Cliente vinculado con actividades ilícitas según fuentes públicas.",
		active: true,
		severity: "CRITICAL",
		ruleType: null, // Manual-only
		isManualOnly: true,
		activityCode: "VEH",
		metadata: {
			category: "pep_seguimiento",
			obligation: "aviso_sospecha",
			risk: "alto_riesgo",
			legalBasis: "LFPIORPI",
		},
	},
	{
		id: "2506",
		name: "El cliente o usuario no quiere ser relacionado con la compra del vehículo",
		description:
			"Cliente intenta ocultar su relación con la operación de compra.",
		active: true,
		severity: "HIGH",
		ruleType: null, // Manual-only
		isManualOnly: true,
		activityCode: "VEH",
		metadata: {
			category: "operaciones_inusuales",
			risk: "testaferro",
			legalBasis: "LFPIORPI",
		},
	},
	{
		id: "2507",
		name: "La operación no es acorde con la actividad económica o giro mercantil declarado por el cliente o usuario",
		description:
			"La operación no corresponde con el perfil económico del cliente.",
		active: true,
		severity: "MEDIUM",
		ruleType: null, // Manual-only
		isManualOnly: true,
		activityCode: "VEH",
		metadata: {
			category: "operaciones_inusuales",
			obligation: "debida_diligencia_reforzada",
			legalBasis: "LFPIORPI",
		},
	},
	{
		id: "2508",
		name: "El cliente o usuario vende su vehículo a precios muy por debajo del precio de mercado (aplica para Sujetos Obligados que se dedican a la compra de autos)",
		description:
			"Venta de vehículo a precio significativamente inferior al mercado.",
		active: true,
		severity: "MEDIUM",
		ruleType: null, // Manual-only
		isManualOnly: true,
		activityCode: "VEH",
		metadata: {
			category: "operaciones_inusuales",
			risk: "subvaluacion",
			legalBasis: "LFPIORPI",
		},
	},
	{
		id: "2509",
		name: "Hay indicios, o certeza, que las partes no están actuando en nombre propio y están tratando de ocultar la identidad del cliente o usuario real",
		description:
			"Indicios de que se está ocultando la identidad del cliente real.",
		active: true,
		severity: "HIGH",
		ruleType: "third_party_accounts", // Has seeker
		isManualOnly: false,
		activityCode: "VEH",
		metadata: {
			category: "operaciones_inusuales",
			obligation: "rechazo_o_dd_reforzada",
			risk: "prestanombres",
			legalBasis: "LFPIORPI",
		},
	},
	{
		id: "2510",
		name: "Uso de divisas en efectivo sin justificación alguna",
		description:
			"Uso de moneda extranjera en efectivo sin justificación documentada.",
		active: true,
		severity: "HIGH",
		ruleType: null, // Manual-only
		isManualOnly: true,
		activityCode: "VEH",
		metadata: {
			category: "pago_efectivo",
			risk: "lavado_activos",
			legalBasis: "LFPIORPI",
		},
	},
	{
		id: "2511",
		name: "El cliente o usuario liquida la operación por medio de una transferencia proveniente de un país extranjero",
		description: "Pago mediante transferencia internacional.",
		active: true,
		severity: "MEDIUM",
		ruleType: null, // Manual-only
		isManualOnly: true,
		activityCode: "VEH",
		metadata: {
			category: "operaciones_inusuales",
			obligation: "debida_diligencia_reforzada",
			legalBasis: "LFPIORPI",
		},
	},
	{
		id: "2512",
		name: "El cliente o usuario insiste en liquidar/pagar la operación en efectivo rebasando el umbral permitido en la Ley",
		description:
			"Cliente intenta pagar en efectivo excediendo el límite legal.",
		active: true,
		severity: "HIGH",
		ruleType: "cash_payment_limit", // Has seeker
		isManualOnly: false,
		activityCode: "VEH",
		metadata: {
			category: "pago_efectivo",
			obligation: "rechazo_operacion",
			legalBasis: "LFPIORPI Art. 32",
		},
	},
	{
		id: "2513",
		name: "El cliente o usuario intenta sobornar, extorsionar o amenaza con el fin de realizar la operación fuera de los parámetros establecidos, o con la finalidad de evitar el envío del Aviso",
		description:
			"Intento de soborno, extorsión o amenaza para evadir controles.",
		active: true,
		severity: "CRITICAL",
		ruleType: null, // Manual-only
		isManualOnly: true,
		activityCode: "VEH",
		metadata: {
			category: "operaciones_inusuales",
			obligation: "aviso_sospecha",
			risk: "alto_riesgo",
			legalBasis: "LFPIORPI",
		},
	},
	{
		id: "2514",
		name: "La información y documentación presentada por el cliente o usuario es inconsistente o de difícil verificación por parte del Sujeto Obligado",
		description: "Documentación inconsistente o no verificable.",
		active: true,
		severity: "MEDIUM",
		ruleType: null, // Manual-only
		isManualOnly: true,
		activityCode: "VEH",
		metadata: {
			category: "debida_diligencia",
			obligation: "debida_diligencia_reforzada",
			legalBasis: "LFPIORPI",
		},
	},
	{
		id: "2515",
		name: "Al cliente o usuario parece no importarle pagar precios superiores a los del mercado con la finalidad de que la operación se realice fuera de los parámetros establecidos",
		description:
			"Cliente dispuesto a pagar más del mercado para evadir controles.",
		active: true,
		severity: "HIGH",
		ruleType: null, // Manual-only
		isManualOnly: true,
		activityCode: "VEH",
		metadata: {
			category: "operaciones_inusuales",
			risk: "lavado_activos",
			legalBasis: "LFPIORPI",
		},
	},
	{
		id: "2516",
		name: "El cliente o usuario o personas relacionadas con él realizan múltiples operaciones en un periodo muy corto de tiempo sin razón aparente",
		description: "Múltiples operaciones en corto tiempo sin justificación.",
		active: true,
		severity: "MEDIUM",
		ruleType: "frequent_transactions", // Has seeker (same as 2504)
		isManualOnly: false,
		activityCode: "VEH",
		metadata: {
			category: "operaciones_inusuales",
			risk: "estructuracion",
			legalBasis: "LFPIORPI",
		},
	},
	{
		id: "2517",
		name: "El cliente o usuario registra el mismo domicilio que otros clientes sin que exista relación aparente entre ellos",
		description: "Mismo domicilio registrado por clientes sin relación.",
		active: true,
		severity: "MEDIUM",
		ruleType: null, // Manual-only
		isManualOnly: true,
		activityCode: "VEH",
		metadata: {
			category: "operaciones_inusuales",
			risk: "prestanombres",
			legalBasis: "LFPIORPI",
		},
	},
	{
		id: "2518",
		name: "El cliente o usuario es menor de edad y no cuenta con la capacidad de decisión ni la documentación necesaria para realizar la operación",
		description: "Cliente menor de edad sin capacidad legal para la operación.",
		active: true,
		severity: "HIGH",
		ruleType: null, // Manual-only
		isManualOnly: true,
		activityCode: "VEH",
		metadata: {
			category: "debida_diligencia",
			obligation: "rechazo_operacion",
			legalBasis: "LFPIORPI",
		},
	},
	{
		id: "2519",
		name: "Hay indicios o certeza de que los vehículos adquiridos son para exportación",
		description: "Indicios de que el vehículo será exportado.",
		active: true,
		severity: "MEDIUM",
		ruleType: null, // Manual-only
		isManualOnly: true,
		activityCode: "VEH",
		metadata: {
			category: "operaciones_inusuales",
			legalBasis: "LFPIORPI",
		},
	},
	{
		id: "2520",
		name: "El cliente o usuario solicita que la operación se realice en un lugar distinto al establecimiento sin que exista causa justificada",
		description: "Solicitud de operación fuera del establecimiento.",
		active: true,
		severity: "MEDIUM",
		ruleType: null, // Manual-only
		isManualOnly: true,
		activityCode: "VEH",
		metadata: {
			category: "operaciones_inusuales",
			legalBasis: "LFPIORPI",
		},
	},
	{
		id: "2521",
		name: "El cliente o usuario pretende liquidar la operación con monedas virtuales",
		description: "Intento de pago con criptomonedas u otras monedas virtuales.",
		active: true,
		severity: "HIGH",
		ruleType: null, // Manual-only
		isManualOnly: true,
		activityCode: "VEH",
		metadata: {
			category: "pago_efectivo",
			obligation: "rechazo_operacion",
			legalBasis: "LFPIORPI",
		},
	},
	{
		id: "9999",
		name: "Otra alerta",
		description:
			"Alerta por otro motivo no especificado en los códigos anteriores.",
		active: true,
		severity: "MEDIUM",
		ruleType: null, // Manual-only
		isManualOnly: true,
		activityCode: "VEH",
		metadata: {
			category: "otra",
			legalBasis: "LFPIORPI",
		},
	},
	// Additional rules for automatic seekers that don't have a direct SAT code
	{
		id: "AUTO_UMA",
		name: "Monto igual o superior a 6,420 UMA – Aviso Obligatorio",
		description:
			"Se dispara cuando el precio total del vehículo es igual o superior a 6,420 UMA. Genera aviso obligatorio al SAT.",
		active: true,
		severity: "HIGH",
		ruleType: "transaction_amount_uma", // Has seeker
		isManualOnly: false,
		activityCode: "VEH",
		metadata: {
			category: "aviso_obligatorio",
			obligation: "generar_aviso_sat",
			deadline: "dia_17_mes_siguiente",
			retention: "10_anios",
			legalBasis: "LFPIORPI Art. 17",
		},
	},
	{
		id: "AUTO_AGGREGATE",
		name: "Acumulación de operaciones que alcanza el umbral de aviso",
		description:
			"Detecta cuando 2 o más operaciones de un mismo cliente suman >= 6,420 UMA en un periodo móvil de 6 meses.",
		active: true,
		severity: "HIGH",
		ruleType: "aggregate_amount_uma", // Has seeker
		isManualOnly: false,
		activityCode: "VEH",
		metadata: {
			category: "aviso_obligatorio",
			obligation: "generar_aviso_sat",
			legalBasis: "LFPIORPI Art. 17",
		},
	},
	{
		id: "AUTO_CASH_FRAG",
		name: "Sistema detecta fraccionamiento de efectivo",
		description:
			"Detecta cuando el cliente usa múltiples depósitos en efectivo o diferentes personas realizan depósitos en efectivo a nombre del comprador.",
		active: true,
		severity: "MEDIUM",
		ruleType: "cash_fragmentation", // Has seeker
		isManualOnly: false,
		activityCode: "VEH",
		metadata: {
			category: "pago_efectivo",
			obligation: "rechazo_operacion",
			risk: "estructuracion",
			legalBasis: "LFPIORPI Art. 32",
		},
	},
	{
		id: "AUTO_PEP_THRESHOLD",
		name: "Operación de PEP por encima del umbral de aviso – seguimiento reforzado",
		description:
			"Identifica cuando un cliente PEP realiza una operación por encima del umbral de aviso, requiriendo seguimiento intensificado.",
		active: true,
		severity: "CRITICAL",
		ruleType: "pep_above_threshold", // Has seeker
		isManualOnly: false,
		activityCode: "VEH",
		metadata: {
			category: "pep_seguimiento",
			obligation: "seguimiento_intensificado",
			risk: "alto_riesgo",
			legalBasis: "LFPIORPI",
		},
	},
	{
		id: "AUTO_PEP_HIGH_RISK",
		name: "Cliente PEP o de Alto Riesgo – Seguimiento Intensificado",
		description:
			"Todas las operaciones de clientes PEP o de alto riesgo requieren seguimiento intensificado y revisión manual.",
		active: true,
		severity: "HIGH",
		ruleType: "pep_or_high_risk", // Has seeker
		isManualOnly: false,
		activityCode: "VEH",
		metadata: {
			category: "seguimiento_intensificado",
			obligation: "monitoreo_estricto",
			risk: "alto_riesgo",
			legalBasis: "LFPIORPI",
		},
	},
];

function escapeSqlString(str) {
	if (str === null || str === undefined) return "NULL";
	return `'${String(str).replace(/'/g, "''")}'`;
}

function generateSql() {
	const sql = [];

	// Use INSERT ... ON CONFLICT DO UPDATE (SQLite upsert) to update existing rules or insert new ones
	// This properly handles the case where alerts reference these rules (onDelete: Restrict)
	// Unlike INSERT OR REPLACE, ON CONFLICT DO UPDATE does NOT delete the row first,
	// so it won't trigger the RESTRICT constraint on alerts.alertRuleId
	for (const rule of alertRules) {
		const id = escapeSqlString(rule.id);
		const name = escapeSqlString(rule.name);
		const description = rule.description
			? escapeSqlString(rule.description)
			: "NULL";
		const active = rule.active ? 1 : 0;
		const severity = escapeSqlString(rule.severity);
		const ruleType = rule.ruleType ? escapeSqlString(rule.ruleType) : "NULL";
		const isManualOnly = rule.isManualOnly ? 1 : 0;
		const activityCode = escapeSqlString(rule.activityCode);
		const metadata = rule.metadata
			? escapeSqlString(JSON.stringify(rule.metadata))
			: "NULL";

		sql.push(`
INSERT INTO alert_rules (id, name, description, active, severity, rule_type, is_manual_only, activity_code, metadata, created_at, updated_at)
VALUES (
	${id},
	${name},
	${description},
	${active},
	${severity},
	${ruleType},
	${isManualOnly},
	${activityCode},
	${metadata},
	CURRENT_TIMESTAMP,
	CURRENT_TIMESTAMP
)
ON CONFLICT(id) DO UPDATE SET
	name = excluded.name,
	description = excluded.description,
	active = excluded.active,
	severity = excluded.severity,
	rule_type = excluded.rule_type,
	is_manual_only = excluded.is_manual_only,
	activity_code = excluded.activity_code,
	metadata = excluded.metadata,
	updated_at = CURRENT_TIMESTAMP;
`);
	}

	return sql.join("\n");
}

async function populateAlertRules() {
	const { isRemote } = getWranglerConfig();

	try {
		console.log(
			`📦 Populating alert rules (${isRemote ? "remote" : "local"})...`,
		);
		console.log(`Creating ${alertRules.length} alert rule(s)...`);

		// Generate SQL
		const sql = generateSql();

		// Execute SQL using shared utility
		executeSql(sql, "alert-rules");

		console.log(
			`✅ Alert rules populated: ${alertRules.length} rule(s) created`,
		);
	} catch (error) {
		console.error("❌ Error populating alert rules:", error);
		throw error;
	}
}

// Export for use in all.mjs
export { populateAlertRules };

// If run directly, execute populate
const isDirectRun =
	process.argv[1] && __filename.toLowerCase() === process.argv[1].toLowerCase();

if (isDirectRun) {
	populateAlertRules().catch((error) => {
		console.error("Fatal error:", error);
		process.exit(1);
	});
}
