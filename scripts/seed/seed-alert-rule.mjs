#!/usr/bin/env node
/**
 * Seed Alert Rules
 *
 * Generates synthetic alert rule data for dev/preview environments.
 * This is SEED data (not real data) and should NOT run in production.
 *
 * Note: Real alert rules should be created via the API or create-alert-rules script.
 */

import { PrismaD1 } from "@prisma/adapter-d1";
import { PrismaClient } from "@prisma/client";

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

async function seedAlertRules(db) {
	const adapter = new PrismaD1(db);
	const prisma = new PrismaClient({ adapter });

	try {
		console.log("🌱 Seeding alert rules...");

		const existingCount = await prisma.alertRule.count();
		if (existingCount > 0) {
			console.log(
				`⏭️  ${existingCount} alert rule(s) already exist. Skipping seed.`,
			);
			return;
		}

		console.log(`Creating ${alertRules.length} alert rule(s)...`);

		for (const rule of alertRules) {
			await prisma.alertRule.create({
				data: {
					name: rule.name,
					description: rule.description,
					active: rule.active,
					severity: rule.severity,
					ruleConfig: JSON.stringify(rule.ruleConfig),
					metadata: rule.metadata ? JSON.stringify(rule.metadata) : null,
				},
			});
			console.log(`  ✓ Created: ${rule.name}`);
		}

		console.log(
			`✅ Alert rule seeding completed: ${alertRules.length} rule(s) created`,
		);
	} catch (error) {
		console.error("❌ Error seeding alert rules:", error);
		throw error;
	} finally {
		await prisma.$disconnect();
	}
}

// Export for use in all.mjs
export { seedAlertRules };

// If run directly, execute seed
if (import.meta.url === `file://${process.argv[1]}`) {
	// This would need D1 database access - handled by all.mjs instead
	console.log("Run via: pnpm seed");
	process.exit(0);
}
