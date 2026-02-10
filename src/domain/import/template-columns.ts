/**
 * Import Template Column Definitions
 * Defines CSV column mappings for each vulnerable activity
 */

import type { ActivityCode as OperationActivityCode } from "../operation/types";

export type ActivityCode = OperationActivityCode;

/**
 * Core operation columns (shared by all activities)
 */
export const CORE_OPERATION_COLUMNS = [
	"client_rfc",
	"operation_date",
	"operation_type_code",
	"branch_postal_code",
	"amount",
	"currency",
	"exchange_rate",
	"alert_type_code",
	"reference_number",
	"notes",
] as const;

/**
 * Payment columns (shared by all activities, up to 5 payments)
 */
export const PAYMENT_COLUMNS = [
	"payment_date_1",
	"payment_form_code_1",
	"payment_amount_1",
	"payment_currency_1",
	"payment_exchange_rate_1",
	"payment_date_2",
	"payment_form_code_2",
	"payment_amount_2",
	"payment_currency_2",
	"payment_exchange_rate_2",
	"payment_date_3",
	"payment_form_code_3",
	"payment_amount_3",
	"payment_currency_3",
	"payment_exchange_rate_3",
	"payment_date_4",
	"payment_form_code_4",
	"payment_amount_4",
	"payment_currency_4",
	"payment_exchange_rate_4",
	"payment_date_5",
	"payment_form_code_5",
	"payment_amount_5",
	"payment_currency_5",
	"payment_exchange_rate_5",
] as const;

/**
 * Activity-specific extension columns
 */
export const ACTIVITY_EXTENSION_COLUMNS: Record<
	ActivityCode,
	readonly string[]
> = {
	// VEH - Vehicles
	VEH: [
		"vehicle_type",
		"brand",
		"model",
		"year",
		"vin",
		"repuve",
		"plates",
		"serial_number",
		"flag_country_code",
		"registration_number",
		"armor_level_code",
		"engine_number",
		"description",
	],

	// INM - Real Estate
	INM: [
		"property_type_code",
		"street",
		"external_number",
		"internal_number",
		"neighborhood",
		"postal_code",
		"municipality",
		"state_code",
		"country_code",
		"registry_folio",
		"registry_date",
		"land_area_m2",
		"construction_area_m2",
		"client_figure_code",
		"person_figure_code",
		"description",
	],

	// MJR - Jewelry
	MJR: [
		"item_type_code",
		"metal_type",
		"weight_grams",
		"purity",
		"jewelry_description",
		"brand",
		"serial_number",
		"trade_unit_code",
		"quantity",
		"unit_price",
	],

	// AVI - Virtual Assets
	AVI: [
		"asset_type_code",
		"asset_name",
		"wallet_address_origin",
		"wallet_address_destination",
		"exchange_name",
		"exchange_country_code",
		"asset_quantity",
		"asset_unit_price",
		"blockchain_tx_hash",
	],

	// JYS - Gambling
	JYS: [
		"game_type_code",
		"business_line_code",
		"operation_method_code",
		"prize_amount",
		"bet_amount",
		"ticket_number",
		"event_name",
		"event_date",
		"property_type_code",
		"property_description",
	],

	// ARI - Rentals
	ARI: [
		"property_type_code",
		"rental_period_months",
		"monthly_rent",
		"deposit_amount",
		"contract_start_date",
		"contract_end_date",
		"street",
		"external_number",
		"internal_number",
		"neighborhood",
		"postal_code",
		"municipality",
		"state_code",
		"is_prepaid",
		"prepaid_months",
		"description",
	],

	// BLI - Armoring
	BLI: [
		"item_type",
		"item_status_code",
		"armor_level_code",
		"armored_part_code",
		"vehicle_type",
		"vehicle_brand",
		"vehicle_model",
		"vehicle_year",
		"vehicle_vin",
		"vehicle_plates",
		"service_description",
	],

	// DON - Donations
	DON: [
		"donation_type",
		"purpose",
		"item_type_code",
		"item_description",
		"item_value",
		"is_anonymous",
		"campaign_name",
	],

	// MPC - Loans
	MPC: [
		"loan_type_code",
		"guarantee_type_code",
		"principal_amount",
		"interest_rate",
		"term_months",
		"monthly_payment",
		"disbursement_date",
		"maturity_date",
		"guarantee_description",
		"guarantee_value",
	],

	// FEP - Public Officials (Notarios)
	FEP: [
		"act_type_code",
		"instrument_number",
		"instrument_date",
		"trust_type_code",
		"trust_identifier",
		"trust_purpose",
		"movement_type_code",
		"assignment_type_code",
		"merger_type_code",
		"incorporation_reason_code",
		"patrimony_modification_type_code",
		"power_of_attorney_type_code",
		"granting_type_code",
		"shareholder_position_code",
		"share_percentage",
		"item_type_code",
		"item_description",
		"item_value",
	],

	// FES - Notary (Corredores)
	FES: [
		"act_type_code",
		"notary_number",
		"notary_state_code",
		"instrument_number",
		"instrument_date",
		"legal_entity_type_code",
		"person_character_type_code",
		"incorporation_reason_code",
		"patrimony_modification_type_code",
		"power_of_attorney_type_code",
		"granting_type_code",
		"shareholder_position_code",
		"share_percentage",
		"item_type_code",
		"item_description",
		"appraisal_value",
		"guarantee_type_code",
	],

	// SPR - Professional Services
	SPR: [
		"service_type_code",
		"service_area_code",
		"client_figure_code",
		"contribution_reason_code",
		"assignment_type_code",
		"merger_type_code",
		"incorporation_reason_code",
		"shareholder_position_code",
		"share_percentage",
		"managed_asset_type_code",
		"management_status_code",
		"financial_institution_type_code",
		"financial_institution_name",
		"occupation_code",
		"service_description",
	],

	// CHV - Traveler Checks
	CHV: [
		"denomination_code",
		"check_count",
		"serial_numbers",
		"issuer_name",
		"issuer_country_code",
	],

	// TSC - Credit Cards
	TSC: [
		"card_type_code",
		"card_number_masked",
		"card_brand",
		"issuer_name",
		"credit_limit",
		"transaction_type",
	],

	// TPP - Prepaid Cards
	TPP: [
		"card_type",
		"card_number_masked",
		"is_initial_load",
		"reload_amount",
		"current_balance",
		"issuer_name",
	],

	// TDR - Rewards
	TDR: [
		"reward_type",
		"program_name",
		"points_amount",
		"points_value",
		"points_expiry_date",
		"redemption_type",
		"redemption_description",
	],

	// TCV - Valuables
	TCV: [
		"value_type_code",
		"service_type_code",
		"transport_method",
		"origin_address",
		"destination_address",
		"custody_start_date",
		"custody_end_date",
		"storage_location",
		"declared_value",
		"insured_value",
		"description",
	],

	// OBA - Art
	OBA: [
		"artwork_type_code",
		"title",
		"artist",
		"year_created",
		"medium",
		"dimensions",
		"provenance",
		"certificate_authenticity",
		"previous_owner",
		"is_antique",
		"auction_house",
		"lot_number",
	],

	// DIN - Development
	DIN: [
		"development_type_code",
		"credit_type_code",
		"project_name",
		"project_location",
		"contribution_type",
		"contribution_amount",
		"third_party_type_code",
		"third_party_name",
		"financial_institution_type_code",
		"financial_institution_name",
	],
};

/**
 * Get all columns for a specific activity (core + extension + payments)
 */
export function getActivityColumns(activityCode: ActivityCode): string[] {
	return [
		...CORE_OPERATION_COLUMNS,
		...ACTIVITY_EXTENSION_COLUMNS[activityCode],
		...PAYMENT_COLUMNS,
	];
}

/**
 * Get required columns for a specific activity
 * (These are the minimum required fields for the operation to be valid)
 */
export function getRequiredColumns(activityCode: ActivityCode): string[] {
	const coreRequired = [
		"client_rfc",
		"operation_date",
		"branch_postal_code",
		"amount",
		"currency",
		"payment_form_code_1",
		"payment_amount_1",
	];

	// Activity-specific required fields
	const activityRequired: Record<ActivityCode, string[]> = {
		VEH: ["vehicle_type", "brand", "model", "year"],
		INM: ["property_type_code"],
		MJR: ["item_type_code"],
		AVI: ["asset_type_code"],
		JYS: [],
		ARI: ["property_type_code"],
		BLI: ["item_type", "armor_level_code"],
		DON: ["donation_type"],
		MPC: ["principal_amount"],
		FEP: ["act_type_code"],
		FES: ["act_type_code"],
		SPR: ["service_type_code"],
		CHV: ["denomination_code", "check_count"],
		TSC: ["card_type_code"],
		TPP: ["card_type"],
		TDR: ["reward_type"],
		TCV: ["value_type_code"],
		OBA: ["artwork_type_code"],
		DIN: ["development_type_code"],
	};

	return [...coreRequired, ...activityRequired[activityCode]];
}
