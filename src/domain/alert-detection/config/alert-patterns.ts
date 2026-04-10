/**
 * Universal Alert Pattern Configuration
 *
 * Maps generic seeker patterns to activity-specific alert codes.
 * Each pattern represents a detectable behavior; the alert code
 * varies by vulnerable activity (VA).
 *
 * A null mapping means the pattern is not applicable to that VA.
 * The "100" code ("Sin alerta") is used for UMA threshold alerts.
 */

/** All vulnerable activity codes */
export type VulnerableActivityCode =
	| "VEH"
	| "INM"
	| "MJR"
	| "AVI"
	| "JYS"
	| "ARI"
	| "BLI"
	| "DON"
	| "MPC"
	| "FEP"
	| "FES"
	| "SPR"
	| "CHV"
	| "TSC"
	| "TPP"
	| "TDR"
	| "TCV"
	| "OBA"
	| "DIN";

/** Supported pattern types */
export type PatternType =
	// Tier 1: Low complexity
	| "operation_amount_uma"
	| "aggregate_amount_uma"
	| "frequent_operations"
	| "foreign_transfer_payment"
	| "foreign_currency_cash"
	| "virtual_currency_payment"
	| "cash_high_value"
	| "third_party_payer"
	| "quick_refund_pattern"
	| "minor_client"
	| "multiple_cards_requests"
	| "address_changes"
	| "split_payment"
	| "quick_fund_movement"
	// Tier 2: Medium complexity
	| "profile_mismatch"
	| "structuring_detection"
	| "shared_address_analysis"
	| "price_anomaly"
	// Tier 3: External integration
	| "pep_screening"
	| "sanctions_screening"
	| "adverse_media";

export type AlertSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface PatternConfig {
	name: string;
	description: string;
	/** Which VAs this pattern applies to. Uses ALL_ACTIVITY_CODES if omitted. */
	applicableActivities?: string[];
	/** Maps VA code -> alert code. null = not applicable. */
	alertCodeMapping: Partial<Record<string, string | null>>;
	defaultSeverity: AlertSeverity;
	/** Key used to find matching alert rules in the database */
	configKey: string;
	/** Tier for phased implementation */
	tier: 1 | 2 | 3;
}

/**
 * Master pattern configuration.
 *
 * Alert codes sourced from pld-alert-types.csv.
 * "100" is the generic "no additional alert" code for UMA threshold crossing.
 */
export const ALERT_PATTERNS: Record<PatternType, PatternConfig> = {
	// ─────────────────────────────────────────────────────────────────────
	// TIER 1 — Low Complexity
	// ─────────────────────────────────────────────────────────────────────

	operation_amount_uma: {
		name: "Single Operation UMA Threshold",
		description:
			"Single operation meets or exceeds the notice UMA threshold for this activity",
		alertCodeMapping: {
			VEH: "100",
			INM: "100",
			MJR: "100",
			AVI: "100",
			JYS: "100",
			ARI: "100",
			BLI: "100",
			DON: "100",
			MPC: "100",
			FEP: "100",
			FES: "100",
			SPR: "100",
			CHV: "100",
			TSC: "100",
			TPP: "100",
			TDR: "100",
			TCV: "100",
			OBA: "100",
			DIN: "100",
		},
		defaultSeverity: "HIGH",
		configKey: "operation_amount_uma",
		tier: 1,
	},

	aggregate_amount_uma: {
		name: "Aggregate Operations UMA Threshold",
		description:
			"Multiple operations from the same client sum to meet or exceed the notice UMA threshold within 6 months",
		alertCodeMapping: {
			VEH: "100",
			INM: "100",
			MJR: "100",
			AVI: "100",
			JYS: "100",
			ARI: "100",
			BLI: "100",
			DON: "100",
			MPC: "100",
			FEP: "100",
			FES: "100",
			SPR: "100",
			CHV: "100",
			TSC: "100",
			TPP: "100",
			TDR: "100",
			TCV: "100",
			OBA: "100",
			DIN: "100",
		},
		defaultSeverity: "HIGH",
		configKey: "aggregate_amount_uma",
		tier: 1,
	},

	frequent_operations: {
		name: "Frequent Operations",
		description:
			"Client performs multiple operations in a short time period without apparent justification",
		alertCodeMapping: {
			VEH: "2516",
			INM: "3103",
			MJR: "2904",
			ARI: "3007",
			BLI: "2603",
			DON: "2714",
			MPC: "2805",
			JYS: "2125",
			SPR: "3409",
			FEP: "3508",
			FES: "1261",
			OBA: "3315",
			TCV: "3213",
			TSC: null,
			TPP: "2304",
			TDR: "3711",
			CHV: "301",
			DIN: "3903",
			AVI: null,
		},
		defaultSeverity: "MEDIUM",
		configKey: "frequent_operations",
		tier: 1,
	},

	foreign_transfer_payment: {
		name: "Foreign Transfer Payment",
		description: "Payment via international transfer from a foreign country",
		alertCodeMapping: {
			VEH: "2511",
			INM: "3113",
			MJR: "2910",
			ARI: "3015",
			BLI: "2612",
			DON: "2709",
			MPC: "2810",
			JYS: "2122",
			SPR: "3413",
			FEP: null,
			FES: "1258",
			OBA: "3311",
			TCV: null,
			TSC: null,
			TPP: null,
			TDR: null,
			CHV: null,
			DIN: "3907",
			AVI: "4112",
		},
		defaultSeverity: "MEDIUM",
		configKey: "foreign_transfer_payment",
		tier: 1,
	},

	foreign_currency_cash: {
		name: "Foreign Currency Cash Payment",
		description: "Cash payment in foreign currency without justification",
		alertCodeMapping: {
			VEH: "2510",
			INM: "3112",
			MJR: "2909",
			ARI: "3014",
			BLI: "2611",
			DON: null,
			MPC: null,
			JYS: "2121",
			SPR: null,
			FEP: null,
			FES: null,
			OBA: "3310",
			TCV: null,
			TSC: null,
			TPP: null,
			TDR: null,
			CHV: null,
			DIN: null,
			AVI: null,
		},
		defaultSeverity: "MEDIUM",
		configKey: "foreign_currency_cash",
		tier: 1,
	},

	virtual_currency_payment: {
		name: "Virtual Currency Payment Attempt",
		description:
			"Client attempts to pay using virtual currencies or crypto assets",
		alertCodeMapping: {
			VEH: "2521",
			INM: "3120",
			MJR: "2921",
			ARI: "3023",
			BLI: "2617",
			DON: "2719",
			MPC: "2816",
			JYS: "2126",
			SPR: "3419",
			FEP: null,
			FES: "1262",
			OBA: "3319",
			TCV: null,
			TSC: null,
			TPP: null,
			TDR: null,
			CHV: null,
			DIN: "3909",
			AVI: null, // AVI IS virtual currencies - not applicable
		},
		defaultSeverity: "MEDIUM",
		configKey: "virtual_currency_payment",
		tier: 1,
	},

	cash_high_value: {
		name: "High-Value Cash Payment",
		description:
			"Cash payment exceeding legal limit or unusually high for the activity",
		alertCodeMapping: {
			VEH: "2514",
			INM: "3116",
			MJR: "2913",
			ARI: "3016",
			BLI: "2614",
			DON: "2710",
			MPC: null,
			JYS: "2115",
			SPR: null,
			FEP: null,
			FES: null,
			OBA: "3313",
			TCV: null,
			TSC: null,
			TPP: "2302",
			TDR: null,
			CHV: "302",
			DIN: null,
			AVI: null,
		},
		defaultSeverity: "HIGH",
		configKey: "cash_high_value",
		tier: 1,
	},

	third_party_payer: {
		name: "Third-Party Payer",
		description:
			"Payer ID differs from client ID, possible straw man (testaferro)",
		alertCodeMapping: {
			VEH: "2502",
			INM: "3102",
			MJR: "2902",
			ARI: "3006",
			BLI: "2602",
			DON: "2702",
			MPC: "2802",
			JYS: "2105",
			SPR: "3404",
			FEP: null,
			FES: "1252",
			OBA: "3302",
			TCV: "3202",
			TSC: null,
			TPP: null,
			TDR: null,
			CHV: null,
			DIN: "3902",
			AVI: "4109",
		},
		defaultSeverity: "MEDIUM",
		configKey: "third_party_payer",
		tier: 1,
	},

	quick_refund_pattern: {
		name: "Quick Refund/Cancellation",
		description:
			"Refund or cancellation shortly after purchase, especially if repaid via different instrument",
		alertCodeMapping: {
			VEH: "2503",
			INM: null,
			MJR: "2903",
			ARI: "3002",
			BLI: null,
			DON: null,
			MPC: null,
			JYS: null,
			SPR: null,
			FEP: null,
			FES: null,
			OBA: "3303",
			TCV: null,
			TSC: null,
			TPP: null,
			TDR: "3708",
			CHV: null,
			DIN: null,
			AVI: null,
		},
		defaultSeverity: "MEDIUM",
		configKey: "quick_refund_pattern",
		tier: 1,
	},

	minor_client: {
		name: "Minor Client",
		description: "Client is under 18 years of age",
		alertCodeMapping: {
			VEH: "2518",
			INM: null,
			MJR: null,
			ARI: null,
			BLI: null,
			DON: null,
			MPC: null,
			JYS: null,
			SPR: null,
			FEP: null,
			FES: null,
			OBA: null,
			TCV: null,
			TSC: null,
			TPP: null,
			TDR: null,
			CHV: null,
			DIN: null,
			AVI: null,
		},
		defaultSeverity: "MEDIUM",
		configKey: "minor_client",
		tier: 1,
	},

	multiple_cards_requests: {
		name: "Multiple Card/Instrument Requests",
		description:
			"Client requests multiple similar financial instruments in a short period",
		alertCodeMapping: {
			VEH: null,
			INM: null,
			MJR: null,
			ARI: null,
			BLI: null,
			DON: null,
			MPC: null,
			JYS: null,
			SPR: null,
			FEP: null,
			FES: null,
			OBA: null,
			TCV: null,
			TSC: "2215",
			TPP: "2301",
			TDR: "3709",
			CHV: "304",
			DIN: null,
			AVI: null,
		},
		defaultSeverity: "MEDIUM",
		configKey: "multiple_cards_requests",
		tier: 1,
	},

	address_changes: {
		name: "Frequent Address/Identity Changes",
		description:
			"Client or entity frequently changes address, legal representative, or business name",
		alertCodeMapping: {
			VEH: null,
			INM: null,
			MJR: null,
			ARI: null,
			BLI: null,
			DON: null,
			MPC: "2813",
			JYS: null,
			SPR: null,
			FEP: null,
			FES: null,
			OBA: null,
			TCV: null,
			TSC: null,
			TPP: null,
			TDR: null,
			CHV: null,
			DIN: null,
			AVI: null,
		},
		defaultSeverity: "LOW",
		configKey: "address_changes",
		tier: 1,
	},

	split_payment: {
		name: "Split Payment",
		description:
			"Single operation paid with multiple instruments to stay below thresholds",
		alertCodeMapping: {
			VEH: null,
			INM: null,
			MJR: "2922",
			ARI: null,
			BLI: null,
			DON: null,
			MPC: null,
			JYS: "2112",
			SPR: null,
			FEP: null,
			FES: null,
			OBA: null,
			TCV: null,
			TSC: null,
			TPP: null,
			TDR: null,
			CHV: null,
			DIN: null,
			AVI: null,
		},
		defaultSeverity: "MEDIUM",
		configKey: "split_payment",
		tier: 1,
	},

	quick_fund_movement: {
		name: "Quick Fund Movement",
		description:
			"Funds leave account or platform very quickly after deposit, without justification",
		alertCodeMapping: {
			VEH: null,
			INM: null,
			MJR: null,
			ARI: null,
			BLI: null,
			DON: null,
			MPC: null,
			JYS: null,
			SPR: null,
			FEP: null,
			FES: null,
			OBA: null,
			TCV: null,
			TSC: null,
			TPP: null,
			TDR: null,
			CHV: null,
			DIN: null,
			AVI: "4101",
		},
		defaultSeverity: "MEDIUM",
		configKey: "quick_fund_movement",
		tier: 1,
	},

	// ─────────────────────────────────────────────────────────────────────
	// TIER 2 — Medium Complexity
	// ─────────────────────────────────────────────────────────────────────

	profile_mismatch: {
		name: "Profile Mismatch",
		description:
			"Operation inconsistent with declared economic activity or client profile",
		alertCodeMapping: {
			VEH: "2507",
			INM: "3107",
			MJR: "2907",
			ARI: "3011",
			BLI: "2607",
			DON: "2706",
			MPC: "2807",
			JYS: "2110",
			SPR: "3407",
			FEP: null,
			FES: "1257",
			OBA: "3307",
			TCV: "3207",
			TSC: "2210",
			TPP: null,
			TDR: null,
			CHV: null,
			DIN: "3906",
			AVI: "4110",
		},
		defaultSeverity: "MEDIUM",
		configKey: "profile_mismatch",
		tier: 2,
	},

	structuring_detection: {
		name: "Structuring Detection",
		description:
			"Operations appear to be structured just below the reporting threshold to avoid notices",
		alertCodeMapping: {
			VEH: null,
			INM: null,
			MJR: null,
			ARI: null,
			BLI: null,
			DON: null,
			MPC: null,
			JYS: "2111",
			SPR: null,
			FEP: null,
			FES: null,
			OBA: null,
			TCV: null,
			TSC: null,
			TPP: null,
			TDR: null,
			CHV: null,
			DIN: null,
			AVI: "4121",
		},
		defaultSeverity: "HIGH",
		configKey: "structuring_detection",
		tier: 2,
	},

	shared_address_analysis: {
		name: "Shared Address Analysis",
		description:
			"Multiple unrelated clients share the same address or representative",
		alertCodeMapping: {
			VEH: "2517",
			INM: null,
			MJR: null,
			ARI: "3022",
			BLI: null,
			DON: null,
			MPC: null,
			JYS: null,
			SPR: "3418",
			FEP: null,
			FES: null,
			OBA: null,
			TCV: null,
			TSC: null,
			TPP: null,
			TDR: null,
			CHV: null,
			DIN: null,
			AVI: null,
		},
		defaultSeverity: "MEDIUM",
		configKey: "shared_address_analysis",
		tier: 2,
	},

	price_anomaly: {
		name: "Price Anomaly",
		description:
			"Price significantly above or below market value, potentially to disguise money flow",
		alertCodeMapping: {
			VEH: "2508",
			INM: "3104",
			MJR: null,
			ARI: "3012",
			BLI: null,
			DON: null,
			MPC: null,
			JYS: null,
			SPR: null,
			FEP: null,
			FES: null,
			OBA: "3304",
			TCV: null,
			TSC: null,
			TPP: null,
			TDR: null,
			CHV: null,
			DIN: null,
			AVI: null,
		},
		defaultSeverity: "MEDIUM",
		configKey: "price_anomaly",
		tier: 2,
	},

	// ─────────────────────────────────────────────────────────────────────
	// TIER 3 — External Integration (watchlist-svc)
	// ─────────────────────────────────────────────────────────────────────

	pep_screening: {
		name: "PEP Screening",
		description: "Client identified as a Politically Exposed Person",
		alertCodeMapping: {
			VEH: "2506",
			INM: "3106",
			MJR: "2906",
			ARI: null,
			BLI: "2606",
			DON: "2705",
			MPC: "2806",
			JYS: "2109",
			SPR: "3406",
			FEP: null,
			FES: "1256",
			OBA: "3306",
			TCV: "3206",
			TSC: "2209",
			TPP: null,
			TDR: null,
			CHV: null,
			DIN: "3905",
			AVI: "4119",
		},
		defaultSeverity: "HIGH",
		configKey: "pep_screening",
		tier: 3,
	},

	sanctions_screening: {
		name: "Sanctions Screening",
		description: "Client found on OFAC, UN, or other sanctions lists",
		alertCodeMapping: {
			VEH: "2505",
			INM: "3105",
			MJR: "2905",
			ARI: "3009",
			BLI: "2605",
			DON: "2704",
			MPC: "2804",
			JYS: "2108",
			SPR: "3405",
			FEP: null,
			FES: "1255",
			OBA: "3305",
			TCV: "3205",
			TSC: "2208",
			TPP: null,
			TDR: null,
			CHV: null,
			DIN: "3904",
			AVI: "4107",
		},
		defaultSeverity: "CRITICAL",
		configKey: "sanctions_screening",
		tier: 3,
	},

	adverse_media: {
		name: "Adverse Media",
		description:
			"Client mentioned in news or public sources for illicit activities or investigations",
		alertCodeMapping: {
			VEH: "2505",
			INM: "3105",
			MJR: "2905",
			ARI: "3009",
			BLI: "2605",
			DON: "2704",
			MPC: "2804",
			JYS: "2108",
			SPR: "3405",
			FEP: null,
			FES: "1255",
			OBA: "3305",
			TCV: "3205",
			TSC: "2208",
			TPP: null,
			TDR: null,
			CHV: null,
			DIN: "3904",
			AVI: "4114",
		},
		defaultSeverity: "HIGH",
		configKey: "adverse_media",
		tier: 3,
	},
};

/**
 * Get the alert code for a pattern + activity combination.
 * Returns null if the pattern doesn't apply to the activity.
 */
export function getAlertCode(
	patternType: PatternType,
	activityCode: string,
): string | null {
	const pattern = ALERT_PATTERNS[patternType];
	if (!pattern) return null;
	return pattern.alertCodeMapping[activityCode] ?? null;
}

/**
 * Get all pattern types that apply to a given activity.
 */
export function getPatternsForActivity(activityCode: string): PatternType[] {
	return (Object.entries(ALERT_PATTERNS) as [PatternType, PatternConfig][])
		.filter(([_, config]) => {
			const code = config.alertCodeMapping[activityCode];
			return code !== null && code !== undefined;
		})
		.map(([type]) => type);
}

/**
 * Get all pattern types for a specific implementation tier.
 */
export function getPatternsByTier(tier: 1 | 2 | 3): PatternType[] {
	return (Object.entries(ALERT_PATTERNS) as [PatternType, PatternConfig][])
		.filter(([_, config]) => config.tier === tier)
		.map(([type]) => type);
}
