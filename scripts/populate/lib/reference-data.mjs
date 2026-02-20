/**
 * Reference Data SQL Generation
 *
 * Consolidates all non-catalog reference data:
 * - Alert rules
 * - Alert rule configs
 * - CFDI-PLD catalog mappings
 * - UMA values
 */

import { escapeSql } from "./shared.mjs";
import { createHash } from "node:crypto";

// ============================================================================
// ALERT RULES
// ============================================================================

const alertRules = [
	{
		id: "100",
		name: "Sin alerta",
		description: "Operación normal sin indicadores de alerta.",
		active: false,
		severity: "LOW",
		ruleType: null,
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
		ruleType: null,
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
		ruleType: "payer_buyer_mismatch",
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
		ruleType: null,
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
		ruleType: "frequent_transactions",
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
		ruleType: null,
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
		ruleType: null,
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
		ruleType: null,
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
		ruleType: null,
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
		ruleType: "third_party_accounts",
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
		ruleType: null,
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
		ruleType: null,
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
		ruleType: "cash_payment_limit",
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
		ruleType: null,
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
		ruleType: null,
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
		ruleType: null,
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
		ruleType: "frequent_transactions",
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
		ruleType: null,
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
		ruleType: null,
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
		ruleType: null,
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
		ruleType: null,
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
		ruleType: null,
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
		ruleType: null,
		isManualOnly: true,
		activityCode: "VEH",
		metadata: {
			category: "otra",
			legalBasis: "LFPIORPI",
		},
	},
	{
		id: "AUTO_UMA",
		name: "Monto igual o superior a 6,420 UMA – Aviso Obligatorio",
		description:
			"Se dispara cuando el precio total del vehículo es igual o superior a 6,420 UMA. Genera aviso obligatorio al SAT.",
		active: true,
		severity: "HIGH",
		ruleType: "operation_amount_uma",
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
		ruleType: "aggregate_amount_uma",
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
		ruleType: "cash_fragmentation",
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
		ruleType: "pep_above_threshold",
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
		ruleType: "pep_or_high_risk",
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

// ============================================================================
// ALERT RULE CONFIGS
// ============================================================================

const alertRuleConfigs = [
	{
		alertRuleId: "AUTO_UMA",
		key: "uma_threshold",
		value: JSON.stringify(6420),
		isHardcoded: true,
		description: "UMA threshold for mandatory SAT report (Art. 17 LFPIORPI)",
	},
	{
		alertRuleId: "AUTO_AGGREGATE",
		key: "uma_threshold",
		value: JSON.stringify(6420),
		isHardcoded: true,
		description:
			"UMA threshold for aggregate amount mandatory SAT report (Art. 17 LFPIORPI)",
	},
	{
		alertRuleId: "AUTO_AGGREGATE",
		key: "aggregation_window_days",
		value: JSON.stringify(180),
		isHardcoded: true,
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
	{
		alertRuleId: "2512",
		key: "max_cash_amount",
		value: JSON.stringify(null),
		isHardcoded: false,
		description:
			"Maximum cash payment amount allowed (configurable per vulnerable activity)",
	},
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
	{
		alertRuleId: "AUTO_PEP_THRESHOLD",
		key: "uma_threshold",
		value: JSON.stringify(6420),
		isHardcoded: true,
		description: "UMA threshold for PEP above threshold alert",
	},
];

// ============================================================================
// CFDI-PLD MAPPINGS
// ============================================================================

const PAYMENT_FORM_MAPPINGS = [
	{ cfdiCode: "01", pldCode: "EFE", notes: "Efectivo" },
	{ cfdiCode: "02", pldCode: "CHE", notes: "Cheque nominativo" },
	{
		cfdiCode: "03",
		pldCode: "TRA",
		notes: "Transferencia electrónica de fondos",
	},
	{ cfdiCode: "04", pldCode: "TAR", notes: "Tarjeta de crédito" },
	{ cfdiCode: "05", pldCode: "MON", notes: "Monedero electrónico" },
	{ cfdiCode: "06", pldCode: "OTR", notes: "Dinero electrónico" },
	{ cfdiCode: "08", pldCode: "OTR", notes: "Vales de despensa" },
	{ cfdiCode: "12", pldCode: "OTR", notes: "Dación en pago" },
	{ cfdiCode: "13", pldCode: "OTR", notes: "Pago por subrogación" },
	{ cfdiCode: "14", pldCode: "OTR", notes: "Pago por consignación" },
	{ cfdiCode: "15", pldCode: "OTR", notes: "Condonación" },
	{ cfdiCode: "17", pldCode: "OTR", notes: "Compensación" },
	{ cfdiCode: "23", pldCode: "OTR", notes: "Novación" },
	{ cfdiCode: "24", pldCode: "OTR", notes: "Confusión" },
	{ cfdiCode: "25", pldCode: "OTR", notes: "Remisión de deuda" },
	{ cfdiCode: "26", pldCode: "OTR", notes: "Prescripción o caducidad" },
	{ cfdiCode: "27", pldCode: "OTR", notes: "A satisfacción del acreedor" },
	{ cfdiCode: "28", pldCode: "TAR", notes: "Tarjeta de débito" },
	{ cfdiCode: "29", pldCode: "TAR", notes: "Tarjeta de servicios" },
	{ cfdiCode: "30", pldCode: "OTR", notes: "Aplicación de anticipos" },
	{ cfdiCode: "31", pldCode: "OTR", notes: "Intermediario pagos" },
	{ cfdiCode: "99", pldCode: "OTR", notes: "Por definir" },
];

const CURRENCY_MAPPINGS = [
	{ cfdiCode: "MXN", pldCode: "MXN", notes: "Peso Mexicano" },
	{ cfdiCode: "USD", pldCode: "USD", notes: "Dólar Estadounidense" },
	{ cfdiCode: "EUR", pldCode: "EUR", notes: "Euro" },
	{ cfdiCode: "GBP", pldCode: "GBP", notes: "Libra Esterlina" },
	{ cfdiCode: "CAD", pldCode: "CAD", notes: "Dólar Canadiense" },
	{ cfdiCode: "JPY", pldCode: "JPY", notes: "Yen Japonés" },
	{ cfdiCode: "CHF", pldCode: "CHF", notes: "Franco Suizo" },
	{
		cfdiCode: "XXX",
		pldCode: "MXN",
		notes: "Sin moneda (usar MXN por defecto)",
	},
];

const COUNTRY_MAPPINGS = [
	{ cfdiCode: "MEX", pldCode: "MX", notes: "México" },
	{ cfdiCode: "USA", pldCode: "US", notes: "Estados Unidos" },
	{ cfdiCode: "CAN", pldCode: "CA", notes: "Canadá" },
];

// ============================================================================
// UMA VALUES
// ============================================================================

const DEFAULT_UMA_VALUE = {
	year: 2025,
	dailyValue: 113.14,
	effectiveDate: "2025-01-01T00:00:00Z",
	endDate: "2026-01-31T23:59:59Z",
	notes:
		"UMA value for 2025 - Source: INEGI. Verified against official PDF: https://www.inegi.org.mx/contenidos/saladeprensa/boletines/2025/uma/uma2025.pdf. Note: 2026 UMA starts February 1st.",
	active: true,
};

// ============================================================================
// SQL GENERATION
// ============================================================================

function generateMappingId(cfdiCatalog, cfdiCode, pldCatalog) {
	const combined = `${cfdiCatalog}-${cfdiCode}-${pldCatalog}`;
	return createHash("md5").update(combined).digest("hex");
}

export function generateReferenceDataSql() {
	const sql = [];

	sql.push(
		`-- ============================================================================`,
	);
	sql.push(`-- REFERENCE DATA SQL DUMP`);
	sql.push(`-- Generated: ${new Date().toISOString()}`);
	sql.push(
		`-- ============================================================================`,
	);
	sql.push("");

	// ========================================================================
	// 1. ALERT RULES
	// ========================================================================
	sql.push(`-- Alert Rules (${alertRules.length} rules)`);
	sql.push(
		`-- Uses ON CONFLICT DO UPDATE to preserve FK constraints from alerts table`,
	);
	sql.push("");

	for (const rule of alertRules) {
		const id = escapeSql(rule.id);
		const name = escapeSql(rule.name);
		const description = rule.description ? escapeSql(rule.description) : "NULL";
		const active = rule.active ? 1 : 0;
		const severity = escapeSql(rule.severity);
		const ruleType = rule.ruleType ? escapeSql(rule.ruleType) : "NULL";
		const isManualOnly = rule.isManualOnly ? 1 : 0;
		const activityCode = escapeSql(rule.activityCode);
		const metadata = rule.metadata
			? escapeSql(JSON.stringify(rule.metadata))
			: "NULL";

		sql.push(
			`INSERT INTO alert_rules (id, name, description, active, severity, rule_type, is_manual_only, activity_code, metadata, created_at, updated_at)`,
		);
		sql.push(
			`VALUES (${id}, ${name}, ${description}, ${active}, ${severity}, ${ruleType}, ${isManualOnly}, ${activityCode}, ${metadata}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
		);
		sql.push(`ON CONFLICT(id) DO UPDATE SET`);
		sql.push(`  name = excluded.name,`);
		sql.push(`  description = excluded.description,`);
		sql.push(`  active = excluded.active,`);
		sql.push(`  severity = excluded.severity,`);
		sql.push(`  rule_type = excluded.rule_type,`);
		sql.push(`  is_manual_only = excluded.is_manual_only,`);
		sql.push(`  activity_code = excluded.activity_code,`);
		sql.push(`  metadata = excluded.metadata,`);
		sql.push(`  updated_at = CURRENT_TIMESTAMP;`);
		sql.push("");
	}

	// ========================================================================
	// 2. ALERT RULE CONFIGS
	// ========================================================================
	sql.push(`-- Alert Rule Configs (${alertRuleConfigs.length} configs)`);
	sql.push("");

	// Get unique alert rule IDs and delete their existing configs
	const alertRuleIds = [
		...new Set(alertRuleConfigs.map((config) => config.alertRuleId)),
	];
	if (alertRuleIds.length > 0) {
		const alertRuleIdsList = alertRuleIds.map((id) => escapeSql(id)).join(", ");
		sql.push(
			`DELETE FROM alert_rule_config WHERE alert_rule_id IN (${alertRuleIdsList});`,
		);
		sql.push("");
	}

	for (const config of alertRuleConfigs) {
		const id = createHash("md5")
			.update(`arc-${config.alertRuleId}-${config.key}`)
			.digest("hex");
		const alertRuleId = escapeSql(config.alertRuleId);
		const key = escapeSql(config.key);
		const value = escapeSql(config.value);
		const isHardcoded = config.isHardcoded ? 1 : 0;
		const description = config.description
			? escapeSql(config.description)
			: "NULL";

		sql.push(
			`INSERT INTO alert_rule_config (id, alert_rule_id, key, value, is_hardcoded, description, created_at, updated_at)`,
		);
		sql.push(
			`VALUES ('${id}', ${alertRuleId}, ${key}, ${value}, ${isHardcoded}, ${description}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);`,
		);
	}
	sql.push("");

	// ========================================================================
	// 3. CATALOG MAPPINGS
	// ========================================================================
	sql.push(`-- Catalog Mappings (CFDI-PLD)`);
	sql.push(`-- Create table if not exists (for compatibility)`);
	sql.push("");

	sql.push(`CREATE TABLE IF NOT EXISTS catalog_mappings (`);
	sql.push(`  id TEXT PRIMARY KEY,`);
	sql.push(`  cfdi_catalog TEXT NOT NULL,`);
	sql.push(`  cfdi_code TEXT NOT NULL,`);
	sql.push(`  pld_catalog TEXT NOT NULL,`);
	sql.push(`  pld_code TEXT NOT NULL,`);
	sql.push(`  notes TEXT,`);
	sql.push(`  created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,`);
	sql.push(`  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,`);
	sql.push(`  UNIQUE(cfdi_catalog, cfdi_code, pld_catalog)`);
	sql.push(`);`);
	sql.push("");

	// Payment form mappings
	for (const mapping of PAYMENT_FORM_MAPPINGS) {
		const id = generateMappingId(
			"cfdi-payment-forms",
			mapping.cfdiCode,
			"monetary-instruments",
		);
		sql.push(
			`INSERT OR REPLACE INTO catalog_mappings (id, cfdi_catalog, cfdi_code, pld_catalog, pld_code, notes, updated_at)`,
		);
		sql.push(
			`VALUES ('${id}', 'cfdi-payment-forms', '${mapping.cfdiCode}', 'monetary-instruments', '${mapping.pldCode}', ${escapeSql(mapping.notes)}, CURRENT_TIMESTAMP);`,
		);
	}
	sql.push("");

	// Currency mappings
	for (const mapping of CURRENCY_MAPPINGS) {
		const id = generateMappingId("currencies", mapping.cfdiCode, "currencies");
		sql.push(
			`INSERT OR REPLACE INTO catalog_mappings (id, cfdi_catalog, cfdi_code, pld_catalog, pld_code, notes, updated_at)`,
		);
		sql.push(
			`VALUES ('${id}', 'currencies', '${mapping.cfdiCode}', 'currencies', '${mapping.pldCode}', ${escapeSql(mapping.notes)}, CURRENT_TIMESTAMP);`,
		);
	}
	sql.push("");

	// Country mappings
	for (const mapping of COUNTRY_MAPPINGS) {
		const id = generateMappingId("countries", mapping.cfdiCode, "countries");
		sql.push(
			`INSERT OR REPLACE INTO catalog_mappings (id, cfdi_catalog, cfdi_code, pld_catalog, pld_code, notes, updated_at)`,
		);
		sql.push(
			`VALUES ('${id}', 'countries', '${mapping.cfdiCode}', 'countries', '${mapping.pldCode}', ${escapeSql(mapping.notes)}, CURRENT_TIMESTAMP);`,
		);
	}
	sql.push("");

	// ========================================================================
	// 4. UMA VALUES
	// ========================================================================
	sql.push(`-- UMA Values (1 value for ${DEFAULT_UMA_VALUE.year})`);
	sql.push("");

	const umaId = `UMA${DEFAULT_UMA_VALUE.year}`;
	sql.push(
		`UPDATE uma_values SET active = 0 WHERE active = 1 AND id != '${umaId}';`,
	);
	sql.push("");

	sql.push(
		`INSERT OR REPLACE INTO uma_values (id, year, daily_value, effective_date, end_date, notes, active, created_at, updated_at)`,
	);
	sql.push(`VALUES (`);
	sql.push(`  '${umaId}',`);
	sql.push(`  ${DEFAULT_UMA_VALUE.year},`);
	sql.push(`  ${DEFAULT_UMA_VALUE.dailyValue},`);
	sql.push(`  ${escapeSql(DEFAULT_UMA_VALUE.effectiveDate)},`);
	sql.push(`  ${escapeSql(DEFAULT_UMA_VALUE.endDate)},`);
	sql.push(`  ${escapeSql(DEFAULT_UMA_VALUE.notes)},`);
	sql.push(`  ${DEFAULT_UMA_VALUE.active ? 1 : 0},`);
	sql.push(
		`  COALESCE((SELECT created_at FROM uma_values WHERE id = '${umaId}'), CURRENT_TIMESTAMP),`,
	);
	sql.push(`  CURRENT_TIMESTAMP`);
	sql.push(`);`);
	sql.push("");

	// ========================================================================
	// FOOTER
	// ========================================================================
	sql.push(
		`-- ============================================================================`,
	);
	sql.push(`-- REFERENCE DATA COMPLETE`);
	sql.push(`-- Alert Rules: ${alertRules.length}`);
	sql.push(`-- Alert Rule Configs: ${alertRuleConfigs.length}`);
	sql.push(
		`-- Catalog Mappings: ${PAYMENT_FORM_MAPPINGS.length + CURRENCY_MAPPINGS.length + COUNTRY_MAPPINGS.length}`,
	);
	sql.push(`-- UMA Values: 1`);
	sql.push(
		`-- ============================================================================`,
	);

	return sql.join("\n");
}
