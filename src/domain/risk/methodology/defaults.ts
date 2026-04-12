/**
 * System Default Methodology
 *
 * Captures all previously-hardcoded scoring parameters as the SYSTEM-scope
 * methodology seed. This is the ultimate fallback when no ACTIVITY or
 * ORGANIZATION override exists.
 *
 * Values sourced from:
 * - types.ts (element weights, thresholds, DD mappings, review months)
 * - client/factors.ts (client/geo/activity/tx factor weights + scoring rules)
 * - client/factors.ts scoreMitigants (client mitigant config)
 */

import type { MethodologyCreateInput } from "./types";

export const SYSTEM_DEFAULT_METHODOLOGY: MethodologyCreateInput = {
	scope: "SYSTEM",
	name: "ENR 2023 Default",
	description:
		"System default methodology aligned with ENR 2023 and GAFI R.1. Scores on 0-9 scale.",
	createdBy: "SYSTEM",
	categories: [
		{
			name: "CLIENTS",
			displayName: "Clientes / Usuarios",
			weight: 0.3,
			factors: [
				{
					name: "pep_status",
					displayName: "Estatus PEP",
					weight: 0.25,
					factorType: "BOOLEAN",
					dataSource: "client.isPep",
					scoreMaps: [
						{
							conditionType: "BOOLEAN",
							conditionValue: "true",
							score: 8.0,
							label: "PEP",
						},
						{
							conditionType: "BOOLEAN",
							conditionValue: "false",
							score: 0,
							label: "No PEP",
						},
					],
				},
				{
					name: "nationality_risk",
					displayName: "Riesgo por Nacionalidad",
					weight: 0.15,
					factorType: "LOOKUP",
					dataSource: "client.countryCode",
					description:
						"Jurisdiction risk score from reference data; default 2.0 when not found",
					scoreMaps: [
						{
							conditionType: "FORMULA",
							conditionValue: "lookup:jurisdiction",
							score: 2.0,
							label: "Default score",
						},
					],
				},
				{
					name: "person_type",
					displayName: "Tipo de Persona",
					weight: 0.1,
					factorType: "ENUM",
					dataSource: "client.personType",
					scoreMaps: [
						{
							conditionType: "EQUALS",
							conditionValue: "TRUST",
							score: 7.0,
							label: "Fideicomiso",
						},
						{
							conditionType: "EQUALS",
							conditionValue: "MORAL",
							score: 5.0,
							label: "Persona Moral",
						},
						{
							conditionType: "EQUALS",
							conditionValue: "PHYSICAL",
							score: 2.0,
							label: "Persona Física",
						},
					],
				},
				{
					name: "screening_result",
					displayName: "Resultado de Monitoreo",
					weight: 0.25,
					factorType: "ENUM",
					dataSource: "client.screeningResult",
					scoreMaps: [
						{
							conditionType: "EQUALS",
							conditionValue: "ofac_sanctioned",
							score: 9.0,
							label: "OFAC/UNSC sanctioned",
						},
						{
							conditionType: "EQUALS",
							conditionValue: "sat69b_listed",
							score: 8.0,
							label: "SAT Art. 69-B",
						},
						{
							conditionType: "EQUALS",
							conditionValue: "adverse_media",
							score: 6.0,
							label: "Medios adversos",
						},
						{
							conditionType: "EQUALS",
							conditionValue: "flagged",
							score: 5.0,
							label: "Flagged",
						},
						{
							conditionType: "EQUALS",
							conditionValue: "clear",
							score: 0,
							label: "Sin alertas",
						},
					],
				},
				{
					name: "bc_complexity",
					displayName: "Complejidad de Beneficiarios Controladores",
					weight: 0.1,
					factorType: "NUMERIC_RANGE",
					dataSource: "client.bcCount",
					description: "Score = min(bcCount * 1.5, 9)",
					scoreMaps: [
						{
							conditionType: "RANGE",
							conditionValue: "0-0",
							score: 0,
							label: "Sin BC",
						},
						{
							conditionType: "RANGE",
							conditionValue: "1-2",
							score: 3.0,
							label: "1-2 BC",
						},
						{
							conditionType: "RANGE",
							conditionValue: "3-4",
							score: 6.0,
							label: "3-4 BC",
						},
						{
							conditionType: "RANGE",
							conditionValue: "5-999",
							score: 9.0,
							label: "5+ BC",
						},
					],
				},
				{
					name: "client_age",
					displayName: "Antigüedad del Cliente",
					weight: 0.15,
					factorType: "NUMERIC_RANGE",
					dataSource: "client.monthsSinceCreation",
					scoreMaps: [
						{
							conditionType: "RANGE",
							conditionValue: "0-5",
							score: 6.0,
							label: "< 6 meses",
						},
						{
							conditionType: "RANGE",
							conditionValue: "6-11",
							score: 4.0,
							label: "6-12 meses",
						},
						{
							conditionType: "RANGE",
							conditionValue: "12-999",
							score: 1.0,
							label: "> 12 meses",
						},
					],
				},
			],
		},
		{
			name: "GEOGRAPHY",
			displayName: "Geografía",
			weight: 0.2,
			factors: [
				{
					name: "domicile_state_risk",
					displayName: "Riesgo por Estado de Domicilio",
					weight: 0.3,
					factorType: "LOOKUP",
					dataSource: "geographic.clientStateCode",
					description:
						"Geographic risk zone score from ENR reference data; default 3.0",
					scoreMaps: [
						{
							conditionType: "FORMULA",
							conditionValue: "lookup:geo",
							score: 3.0,
							label: "Default score",
						},
					],
				},
				{
					name: "operation_location_risk",
					displayName: "Riesgo por Ubicación de Operaciones",
					weight: 0.25,
					factorType: "LOOKUP",
					dataSource: "geographic.operationStateCodes",
					description: "Average geo risk of operation states; default 3.0",
					scoreMaps: [
						{
							conditionType: "FORMULA",
							conditionValue: "lookup:geo_avg",
							score: 3.0,
							label: "Default score",
						},
					],
				},
				{
					name: "cross_border",
					displayName: "Operaciones Transfronterizas",
					weight: 0.25,
					factorType: "BOOLEAN",
					dataSource: "geographic.hasCrossBorderOps",
					scoreMaps: [
						{
							conditionType: "BOOLEAN",
							conditionValue: "true",
							score: 6.0,
							label: "Sí",
						},
						{
							conditionType: "BOOLEAN",
							conditionValue: "false",
							score: 0,
							label: "No",
						},
					],
				},
				{
					name: "country_risk",
					displayName: "Riesgo por País de Origen",
					weight: 0.2,
					factorType: "LOOKUP",
					dataSource: "geographic.clientCountryCode",
					description: "Jurisdiction risk from GAFI list; default 2.0",
					scoreMaps: [
						{
							conditionType: "FORMULA",
							conditionValue: "lookup:jurisdiction",
							score: 2.0,
							label: "Default score",
						},
					],
				},
			],
		},
		{
			name: "PRODUCTS",
			displayName: "Productos / Servicios",
			weight: 0.25,
			factors: [
				{
					name: "activity_enr_risk",
					displayName: "Riesgo ENR por Actividad",
					weight: 0.6,
					factorType: "LOOKUP",
					dataSource: "activity.activityCodes",
					description: "Average activity risk from ENR matrix; default 3.0",
					scoreMaps: [
						{
							conditionType: "FORMULA",
							conditionValue: "lookup:activity_avg",
							score: 3.0,
							label: "Default score",
						},
					],
				},
				{
					name: "activity_diversity",
					displayName: "Diversidad de Actividades",
					weight: 0.4,
					factorType: "NUMERIC_RANGE",
					dataSource: "activity.activityCodeCount",
					description: "Score = min(count * 1.0, 6)",
					scoreMaps: [
						{
							conditionType: "RANGE",
							conditionValue: "0-1",
							score: 1.0,
							label: "1 actividad",
						},
						{
							conditionType: "RANGE",
							conditionValue: "2-3",
							score: 3.0,
							label: "2-3 actividades",
						},
						{
							conditionType: "RANGE",
							conditionValue: "4-5",
							score: 5.0,
							label: "4-5 actividades",
						},
						{
							conditionType: "RANGE",
							conditionValue: "6-999",
							score: 6.0,
							label: "6+ actividades",
						},
					],
				},
			],
		},
		{
			name: "TRANSACTIONS",
			displayName: "Transacciones",
			weight: 0.25,
			factors: [
				{
					name: "cash_ratio",
					displayName: "Proporción de Efectivo",
					weight: 0.25,
					factorType: "NUMERIC_RANGE",
					dataSource: "transaction.cashRatio",
					description: "Score = min(cashRatio * 9, 9)",
					scoreMaps: [
						{
							conditionType: "RANGE",
							conditionValue: "0-0.1",
							score: 1.0,
							label: "< 10%",
						},
						{
							conditionType: "RANGE",
							conditionValue: "0.1-0.3",
							score: 3.0,
							label: "10-30%",
						},
						{
							conditionType: "RANGE",
							conditionValue: "0.3-0.6",
							score: 5.0,
							label: "30-60%",
						},
						{
							conditionType: "RANGE",
							conditionValue: "0.6-1.0",
							score: 8.0,
							label: "> 60%",
						},
					],
				},
				{
					name: "near_threshold_ratio",
					displayName: "Operaciones Cercanas a Umbral",
					weight: 0.25,
					factorType: "NUMERIC_RANGE",
					dataSource: "transaction.nearThresholdRatio",
					description: "Score = min(ratio * 15, 9)",
					scoreMaps: [
						{
							conditionType: "RANGE",
							conditionValue: "0-0.05",
							score: 0,
							label: "< 5%",
						},
						{
							conditionType: "RANGE",
							conditionValue: "0.05-0.15",
							score: 3.0,
							label: "5-15%",
						},
						{
							conditionType: "RANGE",
							conditionValue: "0.15-0.4",
							score: 6.0,
							label: "15-40%",
						},
						{
							conditionType: "RANGE",
							conditionValue: "0.4-1.0",
							score: 9.0,
							label: "> 40%",
						},
					],
				},
				{
					name: "third_party_ratio",
					displayName: "Operaciones por Terceros",
					weight: 0.2,
					factorType: "NUMERIC_RANGE",
					dataSource: "transaction.thirdPartyRatio",
					description: "Score = min(ratio * 12, 9)",
					scoreMaps: [
						{
							conditionType: "RANGE",
							conditionValue: "0-0.05",
							score: 0,
							label: "< 5%",
						},
						{
							conditionType: "RANGE",
							conditionValue: "0.05-0.2",
							score: 3.0,
							label: "5-20%",
						},
						{
							conditionType: "RANGE",
							conditionValue: "0.2-0.5",
							score: 6.0,
							label: "20-50%",
						},
						{
							conditionType: "RANGE",
							conditionValue: "0.5-1.0",
							score: 9.0,
							label: "> 50%",
						},
					],
				},
				{
					name: "operation_frequency",
					displayName: "Frecuencia de Operaciones",
					weight: 0.15,
					factorType: "NUMERIC_RANGE",
					dataSource: "transaction.avgFrequencyPerMonth",
					scoreMaps: [
						{
							conditionType: "RANGE",
							conditionValue: "0-5",
							score: 1.0,
							label: "Baja",
						},
						{
							conditionType: "RANGE",
							conditionValue: "5-10",
							score: 3.0,
							label: "Moderada",
						},
						{
							conditionType: "RANGE",
							conditionValue: "10-20",
							score: 5.0,
							label: "Alta",
						},
						{
							conditionType: "RANGE",
							conditionValue: "20-999999",
							score: 7.0,
							label: "Muy alta",
						},
					],
				},
				{
					name: "volume",
					displayName: "Volumen Total (MXN)",
					weight: 0.15,
					factorType: "NUMERIC_RANGE",
					dataSource: "transaction.totalAmountMxn",
					scoreMaps: [
						{
							conditionType: "RANGE",
							conditionValue: "0-100000",
							score: 2.0,
							label: "< $100K",
						},
						{
							conditionType: "RANGE",
							conditionValue: "100000-1000000",
							score: 4.0,
							label: "$100K-$1M",
						},
						{
							conditionType: "RANGE",
							conditionValue: "1000000-10000000",
							score: 6.0,
							label: "$1M-$10M",
						},
						{
							conditionType: "RANGE",
							conditionValue: "10000000-999999999999",
							score: 8.0,
							label: "> $10M",
						},
					],
				},
			],
		},
	],
	thresholds: [
		{
			riskLevel: "LOW",
			minScore: 0,
			maxScore: 3,
			ddLevel: "SIMPLIFIED",
			reviewMonths: 12,
		},
		{
			riskLevel: "MEDIUM_LOW",
			minScore: 3,
			maxScore: 5,
			ddLevel: "STANDARD",
			reviewMonths: 6,
		},
		{
			riskLevel: "MEDIUM",
			minScore: 5,
			maxScore: 7,
			ddLevel: "STANDARD",
			reviewMonths: 3,
		},
		{
			riskLevel: "HIGH",
			minScore: 7,
			maxScore: 9,
			ddLevel: "ENHANCED",
			reviewMonths: 1,
		},
	],
	mitigants: [
		{
			mitigantKey: "kyc_completeness",
			displayName: "Completitud del proceso KYC",
			maxEffect: 1.0,
			weight: 0.3,
			dataSource: "mitigants.kycComplete",
		},
		{
			mitigantKey: "documents_verified",
			displayName: "Verificación de documentos",
			maxEffect: 0.8,
			weight: 0.25,
			dataSource: "mitigants.documentsVerified",
		},
		{
			mitigantKey: "relationship_length",
			displayName: "Antigüedad de la relación",
			maxEffect: 0.6,
			weight: 0.2,
			dataSource: "mitigants.relationshipMonths",
		},
		{
			mitigantKey: "regulated_counterparty",
			displayName: "Contraparte regulada",
			maxEffect: 0.5,
			weight: 0.25,
			dataSource: "mitigants.regulatedCounterparty",
		},
	],
};
