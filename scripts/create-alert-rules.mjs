/**
 * Script to create alert rules based on Janovix AV Vehículos requirements
 * Run with: node scripts/create-alert-rules.mjs
 */

const API_BASE_URL = process.env.API_URL || "http://localhost:8787";
const API_TOKEN = process.env.API_TOKEN || ""; // Add auth token if needed

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
			umaDailyValue: null, // Debe configurarse manualmente cada año
			// Campo calculado: UMBRAL_AVISO = 6420 * UMA_diaria_vigente
			evaluationType: "individual", // Cada operación se evalúa individualmente
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
			umaDailyValue: null, // Debe configurarse manualmente cada año
			timeWindow: "6_months",
			timeWindowType: "rolling", // Periodo móvil desde la primera operación
			minTransactions: 2, // Mínimo 2 operaciones para acumular
			groupBy: "client", // Agrupar por RFC del cliente
			operationTypes: ["PURCHASE", "SALE"], // Puede incluir ambos tipos
			resetAfterAviso: true, // Reiniciar acumulación después del aviso
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
			maxCashAmount: null, // Debe configurarse según límite legal
			currency: "MXN",
			action: "reject", // La operación debe rechazarse
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
			detectionWindow: "30_days", // Ventana de detección
			minCashPayments: 2, // Mínimo 2 pagos en efectivo
			checkMultiplePayers: true, // Verificar diferentes pagadores
			checkSameBuyer: true, // Todos para el mismo comprador
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
			checkPaymentMethods: true, // Verificar en todos los métodos de pago
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
			requirePEPFlag: true, // Cliente debe estar marcado como PEP
			requireEnhancedMonitoring: true,
			requireManualReview: true, // Revisión manual obligatoria por REC
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
			requireDocumentation: true, // Documentación reforzada de origen de recursos
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
			minTransactions: 3, // Mínimo 3 operaciones
			requireAccumulationCheck: true, // Verificar acumulación
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
			minTransactionAmount: null, // Debe configurarse según valor "muy alto"
			requireNoPreviousTransactions: true,
			requireEnhancedDueDiligence: true,
			requireResourceDocumentation: true, // Documentación adicional de origen de recursos
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
			action: "reject_or_enhanced_dd", // Rechazo o DD reforzada
		},
		metadata: {
			category: "operaciones_inusuales",
			obligation: "rechazo_o_dd_reforzada",
			risk: "prestanombres",
		},
	},
];

async function createAlertRule(rule) {
	const url = `${API_BASE_URL}/api/v1/alert-rules`;
	const response = await fetch(url, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			...(API_TOKEN && { Authorization: `Bearer ${API_TOKEN}` }),
		},
		body: JSON.stringify(rule),
	});

	if (!response.ok) {
		const error = await response.text();
		throw new Error(
			`Failed to create rule "${rule.name}": ${response.status} ${error}`,
		);
	}

	return response.json();
}

async function main() {
	console.log(
		"Creating alert rules based on Janovix AV Vehículos requirements...\n",
	);

	for (const rule of alertRules) {
		try {
			console.log(`Creating: ${rule.name}...`);
			const created = await createAlertRule(rule);
			console.log(`✓ Created with ID: ${created.id}\n`);
		} catch (error) {
			console.error(`✗ Error: ${error.message}\n`);
		}
	}

	console.log("Done!");
}

main().catch(console.error);
