-- Tear down existing objects (FK order; OFF avoids ordering mistakes on complex graphs)
PRAGMA foreign_keys = OFF;

DROP TABLE IF EXISTS "import_row_results";
DROP TABLE IF EXISTS "imports";
DROP TABLE IF EXISTS "alerts";
DROP TABLE IF EXISTS "alert_rule_config";
DROP TABLE IF EXISTS "alert_rules";
DROP TABLE IF EXISTS "reports";
DROP TABLE IF EXISTS "notice_events";
DROP TABLE IF EXISTS "notices";
DROP TABLE IF EXISTS "kyc_session_events";
DROP TABLE IF EXISTS "kyc_sessions";
DROP TABLE IF EXISTS "organization_settings";
DROP TABLE IF EXISTS "uma_values";
DROP TABLE IF EXISTS "operation_development";
DROP TABLE IF EXISTS "operation_art";
DROP TABLE IF EXISTS "operation_valuables";
DROP TABLE IF EXISTS "operation_rewards";
DROP TABLE IF EXISTS "operation_prepaid";
DROP TABLE IF EXISTS "operation_cards";
DROP TABLE IF EXISTS "operation_traveler_checks";
DROP TABLE IF EXISTS "operation_professional";
DROP TABLE IF EXISTS "operation_notary";
DROP TABLE IF EXISTS "operation_officials";
DROP TABLE IF EXISTS "operation_loans";
DROP TABLE IF EXISTS "operation_donations";
DROP TABLE IF EXISTS "operation_armoring";
DROP TABLE IF EXISTS "operation_rentals";
DROP TABLE IF EXISTS "operation_gambling";
DROP TABLE IF EXISTS "operation_virtual_assets";
DROP TABLE IF EXISTS "operation_jewelry";
DROP TABLE IF EXISTS "operation_real_estate";
DROP TABLE IF EXISTS "operation_vehicles";
DROP TABLE IF EXISTS "operation_payments";
DROP TABLE IF EXISTS "operations";
DROP TABLE IF EXISTS "invoice_items";
DROP TABLE IF EXISTS "invoices";
DROP TABLE IF EXISTS "catalog_items";
DROP TABLE IF EXISTS "catalogs";
DROP TABLE IF EXISTS "beneficial_controllers";
DROP TABLE IF EXISTS "shareholders";
DROP TABLE IF EXISTS "client_addresses";
DROP TABLE IF EXISTS "client_documents";
DROP TABLE IF EXISTS "upload_links";
DROP TABLE IF EXISTS "clients";

PRAGMA foreign_keys = ON;

-- CreateTable
CREATE TABLE "clients" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "rfc" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "person_type" TEXT NOT NULL,
    "first_name" TEXT,
    "last_name" TEXT,
    "second_last_name" TEXT,
    "birth_date" DATETIME,
    "curp" TEXT,
    "business_name" TEXT,
    "incorporation_date" DATETIME,
    "nationality" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "state_code" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "municipality" TEXT NOT NULL,
    "neighborhood" TEXT NOT NULL,
    "street" TEXT NOT NULL,
    "external_number" TEXT NOT NULL,
    "internal_number" TEXT,
    "postal_code" TEXT NOT NULL,
    "reference" TEXT,
    "notes" TEXT,
    "country_code" TEXT,
    "economic_activity_code" TEXT,
    "gender" TEXT,
    "occupation" TEXT,
    "marital_status" TEXT,
    "source_of_funds" TEXT,
    "source_of_wealth" TEXT,
    "kyc_status" TEXT NOT NULL DEFAULT 'INCOMPLETE',
    "kyc_completed_at" DATETIME,
    "completeness_status" TEXT NOT NULL DEFAULT 'INCOMPLETE',
    "missing_fields" TEXT,
    "kyc_completion_pct" INTEGER NOT NULL DEFAULT 0,
    "documents_complete" INTEGER NOT NULL DEFAULT 0,
    "documents_count" INTEGER NOT NULL DEFAULT 0,
    "documents_required" INTEGER NOT NULL DEFAULT 0,
    "shareholders_count" INTEGER NOT NULL DEFAULT 0,
    "beneficial_controllers_count" INTEGER NOT NULL DEFAULT 0,
    "identification_required" BOOLEAN NOT NULL DEFAULT true,
    "identification_tier" TEXT NOT NULL DEFAULT 'ALWAYS',
    "identification_threshold_mxn" DECIMAL,
    "notice_threshold_mxn" DECIMAL,
    "is_pep" BOOLEAN NOT NULL DEFAULT false,
    "watchlist_query_id" TEXT,
    "ofac_sanctioned" BOOLEAN NOT NULL DEFAULT false,
    "unsc_sanctioned" BOOLEAN NOT NULL DEFAULT false,
    "sat69b_listed" BOOLEAN NOT NULL DEFAULT false,
    "adverse_media_flagged" BOOLEAN NOT NULL DEFAULT false,
    "screening_result" TEXT NOT NULL DEFAULT 'pending',
    "screened_at" DATETIME,
    "resolved_names" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "deleted_at" DATETIME
);

-- CreateTable
CREATE TABLE "upload_links" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organization_id" TEXT NOT NULL,
    "client_id" TEXT,
    "created_by" TEXT NOT NULL,
    "doc_svc_link_id" TEXT NOT NULL,
    "expires_at" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "required_documents" TEXT,
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "upload_links_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "client_documents" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "client_id" TEXT NOT NULL,
    "document_type" TEXT NOT NULL,
    "document_number" TEXT NOT NULL,
    "issuing_country" TEXT,
    "issue_date" DATETIME,
    "expiry_date" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "file_url" TEXT,
    "metadata" TEXT,
    "doc_svc_document_id" TEXT,
    "upload_link_id" TEXT,
    "verified_at" DATETIME,
    "verified_by" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "client_documents_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "client_documents_upload_link_id_fkey" FOREIGN KEY ("upload_link_id") REFERENCES "upload_links" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "client_addresses" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "client_id" TEXT NOT NULL,
    "address_type" TEXT NOT NULL DEFAULT 'RESIDENTIAL',
    "street1" TEXT NOT NULL,
    "street2" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT,
    "postal_code" TEXT,
    "country" TEXT NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "verified_at" DATETIME,
    "reference" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "client_addresses_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "shareholders" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "client_id" TEXT NOT NULL,
    "parent_shareholder_id" TEXT,
    "entity_type" TEXT NOT NULL,
    "first_name" TEXT,
    "last_name" TEXT,
    "second_last_name" TEXT,
    "rfc" TEXT,
    "business_name" TEXT,
    "tax_id" TEXT,
    "incorporation_date" DATETIME,
    "nationality" TEXT,
    "representative_name" TEXT,
    "representative_curp" TEXT,
    "representative_rfc" TEXT,
    "acta_constitutiva_doc_id" TEXT,
    "cedula_fiscal_doc_id" TEXT,
    "address_proof_doc_id" TEXT,
    "power_of_attorney_doc_id" TEXT,
    "ownership_percentage" DECIMAL NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "shareholders_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "shareholders_parent_shareholder_id_fkey" FOREIGN KEY ("parent_shareholder_id") REFERENCES "shareholders" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "shareholders_acta_constitutiva_doc_id_fkey" FOREIGN KEY ("acta_constitutiva_doc_id") REFERENCES "client_documents" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "shareholders_cedula_fiscal_doc_id_fkey" FOREIGN KEY ("cedula_fiscal_doc_id") REFERENCES "client_documents" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "shareholders_address_proof_doc_id_fkey" FOREIGN KEY ("address_proof_doc_id") REFERENCES "client_documents" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "shareholders_power_of_attorney_doc_id_fkey" FOREIGN KEY ("power_of_attorney_doc_id") REFERENCES "client_documents" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "beneficial_controllers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "client_id" TEXT NOT NULL,
    "shareholder_id" TEXT,
    "bc_type" TEXT NOT NULL,
    "identification_criteria" TEXT NOT NULL,
    "control_mechanism" TEXT,
    "is_legal_representative" BOOLEAN NOT NULL DEFAULT false,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "second_last_name" TEXT,
    "birth_date" DATETIME,
    "birth_country" TEXT,
    "nationality" TEXT,
    "occupation" TEXT,
    "curp" TEXT,
    "rfc" TEXT,
    "id_document_type" TEXT,
    "id_document_number" TEXT,
    "id_document_authority" TEXT,
    "id_copy_doc_id" TEXT,
    "curp_copy_doc_id" TEXT,
    "cedula_fiscal_doc_id" TEXT,
    "address_proof_doc_id" TEXT,
    "constancia_bc_doc_id" TEXT,
    "power_of_attorney_doc_id" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "country" TEXT,
    "state_code" TEXT,
    "city" TEXT,
    "street" TEXT,
    "postal_code" TEXT,
    "is_pep" BOOLEAN NOT NULL DEFAULT false,
    "watchlist_query_id" TEXT,
    "ofac_sanctioned" BOOLEAN NOT NULL DEFAULT false,
    "unsc_sanctioned" BOOLEAN NOT NULL DEFAULT false,
    "sat69b_listed" BOOLEAN NOT NULL DEFAULT false,
    "adverse_media_flagged" BOOLEAN NOT NULL DEFAULT false,
    "screening_result" TEXT NOT NULL DEFAULT 'pending',
    "screened_at" DATETIME,
    "verified_at" DATETIME,
    "verified_by" TEXT,
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "beneficial_controllers_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "beneficial_controllers_shareholder_id_fkey" FOREIGN KEY ("shareholder_id") REFERENCES "shareholders" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "beneficial_controllers_id_copy_doc_id_fkey" FOREIGN KEY ("id_copy_doc_id") REFERENCES "client_documents" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "beneficial_controllers_curp_copy_doc_id_fkey" FOREIGN KEY ("curp_copy_doc_id") REFERENCES "client_documents" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "beneficial_controllers_cedula_fiscal_doc_id_fkey" FOREIGN KEY ("cedula_fiscal_doc_id") REFERENCES "client_documents" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "beneficial_controllers_address_proof_doc_id_fkey" FOREIGN KEY ("address_proof_doc_id") REFERENCES "client_documents" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "beneficial_controllers_constancia_bc_doc_id_fkey" FOREIGN KEY ("constancia_bc_doc_id") REFERENCES "client_documents" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "beneficial_controllers_power_of_attorney_doc_id_fkey" FOREIGN KEY ("power_of_attorney_doc_id") REFERENCES "client_documents" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "catalogs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "allow_new_items" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "catalog_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "catalog_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "normalized_name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "metadata" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "catalog_items_catalog_id_fkey" FOREIGN KEY ("catalog_id") REFERENCES "catalogs" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organization_id" TEXT NOT NULL,
    "uuid" TEXT,
    "version" TEXT NOT NULL DEFAULT '4.0',
    "series" TEXT,
    "folio" TEXT,
    "issuer_rfc" TEXT NOT NULL,
    "issuer_name" TEXT NOT NULL,
    "issuer_tax_regime_code" TEXT NOT NULL,
    "receiver_rfc" TEXT NOT NULL,
    "receiver_name" TEXT NOT NULL,
    "receiver_usage_code" TEXT,
    "receiver_tax_regime_code" TEXT,
    "receiver_postal_code" TEXT,
    "subtotal" DECIMAL NOT NULL,
    "discount" DECIMAL DEFAULT 0,
    "total" DECIMAL NOT NULL,
    "currency_code" TEXT NOT NULL DEFAULT 'MXN',
    "exchange_rate" DECIMAL DEFAULT 1,
    "payment_form_code" TEXT,
    "payment_method_code" TEXT,
    "voucher_type_code" TEXT NOT NULL DEFAULT 'I',
    "issue_date" DATETIME NOT NULL,
    "certification_date" DATETIME,
    "export_code" TEXT DEFAULT '01',
    "tfd_uuid" TEXT,
    "tfd_sat_certificate" TEXT,
    "tfd_signature" TEXT,
    "tfd_stamp_date" DATETIME,
    "xml_content" TEXT,
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "deleted_at" DATETIME
);

-- CreateTable
CREATE TABLE "invoice_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "invoice_id" TEXT NOT NULL,
    "product_service_code" TEXT NOT NULL,
    "product_service_id" TEXT,
    "quantity" DECIMAL NOT NULL,
    "unit_code" TEXT NOT NULL,
    "unit_name" TEXT,
    "description" TEXT NOT NULL,
    "unit_price" DECIMAL NOT NULL,
    "amount" DECIMAL NOT NULL,
    "discount" DECIMAL DEFAULT 0,
    "tax_object_code" TEXT NOT NULL DEFAULT '02',
    "transferred_tax_amount" DECIMAL DEFAULT 0,
    "withheld_tax_amount" DECIMAL DEFAULT 0,
    "metadata" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "invoice_items_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "operations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organization_id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "invoice_id" TEXT,
    "activity_code" TEXT NOT NULL,
    "operation_type_code" TEXT,
    "operation_date" DATETIME NOT NULL,
    "branch_postal_code" TEXT NOT NULL,
    "amount" DECIMAL NOT NULL,
    "currency_code" TEXT NOT NULL DEFAULT 'MXN',
    "exchange_rate" DECIMAL DEFAULT 1,
    "amount_mxn" DECIMAL,
    "uma_value" DECIMAL,
    "uma_daily_value" DECIMAL,
    "alert_type_code" TEXT NOT NULL DEFAULT '100',
    "alert_description" TEXT,
    "watchlist_status" TEXT DEFAULT 'PENDING',
    "watchlist_checked_at" DATETIME,
    "watchlist_result" TEXT,
    "watchlist_flags" TEXT,
    "priority_code" TEXT DEFAULT '2',
    "data_source" TEXT NOT NULL DEFAULT 'MANUAL',
    "completeness_status" TEXT NOT NULL DEFAULT 'COMPLETE',
    "missing_fields" TEXT,
    "reference_number" TEXT,
    "notes" TEXT,
    "import_hash" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "deleted_at" DATETIME,
    CONSTRAINT "operations_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "operations_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "operation_payments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "operation_id" TEXT NOT NULL,
    "payment_date" DATETIME NOT NULL,
    "payment_form_code" TEXT NOT NULL,
    "monetary_instrument_code" TEXT,
    "currency_code" TEXT NOT NULL DEFAULT 'MXN',
    "amount" DECIMAL NOT NULL,
    "exchange_rate" DECIMAL,
    "bank_name" TEXT,
    "account_number_masked" TEXT,
    "check_number" TEXT,
    "reference" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "operation_payments_operation_id_fkey" FOREIGN KEY ("operation_id") REFERENCES "operations" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "operation_vehicles" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "operation_id" TEXT NOT NULL,
    "vehicle_type" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "brand_name" TEXT,
    "model" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "vin" TEXT,
    "repuve" TEXT,
    "plates" TEXT,
    "serial_number" TEXT,
    "flag_country_code" TEXT,
    "registration_number" TEXT,
    "armor_level_code" TEXT,
    "engine_number" TEXT,
    "description" TEXT,
    "resolved_names" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "operation_vehicles_operation_id_fkey" FOREIGN KEY ("operation_id") REFERENCES "operations" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "operation_real_estate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "operation_id" TEXT NOT NULL,
    "property_type_code" TEXT NOT NULL,
    "street" TEXT,
    "external_number" TEXT,
    "internal_number" TEXT,
    "neighborhood" TEXT,
    "postal_code" TEXT,
    "municipality" TEXT,
    "state_code" TEXT,
    "country_code" TEXT DEFAULT 'MEX',
    "registry_folio" TEXT,
    "registry_date" DATETIME,
    "land_area_m2" DECIMAL,
    "construction_area_m2" DECIMAL,
    "client_figure_code" TEXT,
    "person_figure_code" TEXT,
    "description" TEXT,
    "resolved_names" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "operation_real_estate_operation_id_fkey" FOREIGN KEY ("operation_id") REFERENCES "operations" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "operation_jewelry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "operation_id" TEXT NOT NULL,
    "item_type_code" TEXT NOT NULL,
    "metal_type" TEXT,
    "weight_grams" DECIMAL,
    "purity" TEXT,
    "jewelry_description" TEXT,
    "brand" TEXT,
    "serial_number" TEXT,
    "trade_unit_code" TEXT,
    "quantity" DECIMAL DEFAULT 1,
    "unit_price" DECIMAL,
    "brand_name" TEXT,
    "resolved_names" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "operation_jewelry_operation_id_fkey" FOREIGN KEY ("operation_id") REFERENCES "operations" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "operation_virtual_assets" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "operation_id" TEXT NOT NULL,
    "asset_type_code" TEXT NOT NULL,
    "asset_name" TEXT,
    "wallet_address_origin" TEXT,
    "wallet_address_destination" TEXT,
    "exchange_name" TEXT,
    "exchange_country_code" TEXT,
    "asset_quantity" DECIMAL,
    "asset_unit_price" DECIMAL,
    "blockchain_tx_hash" TEXT,
    "resolved_names" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "operation_virtual_assets_operation_id_fkey" FOREIGN KEY ("operation_id") REFERENCES "operations" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "operation_gambling" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "operation_id" TEXT NOT NULL,
    "game_type_code" TEXT,
    "business_line_code" TEXT,
    "operation_method_code" TEXT,
    "prize_amount" DECIMAL,
    "bet_amount" DECIMAL,
    "ticket_number" TEXT,
    "event_name" TEXT,
    "event_date" DATETIME,
    "property_type_code" TEXT,
    "property_description" TEXT,
    "resolved_names" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "operation_gambling_operation_id_fkey" FOREIGN KEY ("operation_id") REFERENCES "operations" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "operation_rentals" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "operation_id" TEXT NOT NULL,
    "property_type_code" TEXT NOT NULL,
    "rental_period_months" INTEGER,
    "monthly_rent" DECIMAL,
    "deposit_amount" DECIMAL,
    "contract_start_date" DATETIME,
    "contract_end_date" DATETIME,
    "street" TEXT,
    "external_number" TEXT,
    "internal_number" TEXT,
    "neighborhood" TEXT,
    "postal_code" TEXT,
    "municipality" TEXT,
    "state_code" TEXT,
    "is_prepaid" BOOLEAN DEFAULT false,
    "prepaid_months" INTEGER,
    "description" TEXT,
    "resolved_names" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "operation_rentals_operation_id_fkey" FOREIGN KEY ("operation_id") REFERENCES "operations" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "operation_armoring" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "operation_id" TEXT NOT NULL,
    "item_type" TEXT NOT NULL,
    "item_status_code" TEXT,
    "armor_level_code" TEXT NOT NULL,
    "armored_part_code" TEXT,
    "vehicle_type" TEXT,
    "vehicle_brand" TEXT,
    "vehicle_model" TEXT,
    "vehicle_year" INTEGER,
    "vehicle_vin" TEXT,
    "vehicle_plates" TEXT,
    "service_description" TEXT,
    "resolved_names" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "operation_armoring_operation_id_fkey" FOREIGN KEY ("operation_id") REFERENCES "operations" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "operation_donations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "operation_id" TEXT NOT NULL,
    "donation_type" TEXT NOT NULL,
    "purpose" TEXT,
    "item_type_code" TEXT,
    "item_description" TEXT,
    "item_value" DECIMAL,
    "is_anonymous" BOOLEAN DEFAULT false,
    "campaign_name" TEXT,
    "resolved_names" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "operation_donations_operation_id_fkey" FOREIGN KEY ("operation_id") REFERENCES "operations" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "operation_loans" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "operation_id" TEXT NOT NULL,
    "loan_type_code" TEXT,
    "guarantee_type_code" TEXT,
    "principal_amount" DECIMAL NOT NULL,
    "interest_rate" DECIMAL,
    "term_months" INTEGER,
    "monthly_payment" DECIMAL,
    "disbursement_date" DATETIME,
    "maturity_date" DATETIME,
    "guarantee_description" TEXT,
    "guarantee_value" DECIMAL,
    "resolved_names" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "operation_loans_operation_id_fkey" FOREIGN KEY ("operation_id") REFERENCES "operations" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "operation_officials" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "operation_id" TEXT NOT NULL,
    "act_type_code" TEXT NOT NULL,
    "instrument_number" TEXT,
    "instrument_date" DATETIME,
    "trust_type_code" TEXT,
    "trust_identifier" TEXT,
    "trust_purpose" TEXT,
    "movement_type_code" TEXT,
    "assignment_type_code" TEXT,
    "merger_type_code" TEXT,
    "incorporation_reason_code" TEXT,
    "patrimony_modification_type_code" TEXT,
    "power_of_attorney_type_code" TEXT,
    "granting_type_code" TEXT,
    "shareholder_position_code" TEXT,
    "share_percentage" DECIMAL,
    "item_type_code" TEXT,
    "item_description" TEXT,
    "item_value" DECIMAL,
    "resolved_names" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "operation_officials_operation_id_fkey" FOREIGN KEY ("operation_id") REFERENCES "operations" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "operation_notary" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "operation_id" TEXT NOT NULL,
    "act_type_code" TEXT NOT NULL,
    "notary_number" TEXT,
    "notary_state_code" TEXT,
    "instrument_number" TEXT,
    "instrument_date" DATETIME,
    "legal_entity_type_code" TEXT,
    "person_character_type_code" TEXT,
    "incorporation_reason_code" TEXT,
    "patrimony_modification_type_code" TEXT,
    "power_of_attorney_type_code" TEXT,
    "granting_type_code" TEXT,
    "shareholder_position_code" TEXT,
    "share_percentage" DECIMAL,
    "item_type_code" TEXT,
    "item_description" TEXT,
    "appraisal_value" DECIMAL,
    "guarantee_type_code" TEXT,
    "resolved_names" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "operation_notary_operation_id_fkey" FOREIGN KEY ("operation_id") REFERENCES "operations" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "operation_professional" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "operation_id" TEXT NOT NULL,
    "service_type_code" TEXT NOT NULL,
    "service_area_code" TEXT,
    "client_figure_code" TEXT,
    "contribution_reason_code" TEXT,
    "assignment_type_code" TEXT,
    "merger_type_code" TEXT,
    "incorporation_reason_code" TEXT,
    "shareholder_position_code" TEXT,
    "share_percentage" DECIMAL,
    "managed_asset_type_code" TEXT,
    "management_status_code" TEXT,
    "financial_institution_type_code" TEXT,
    "financial_institution_name" TEXT,
    "occupation_code" TEXT,
    "service_description" TEXT,
    "resolved_names" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "operation_professional_operation_id_fkey" FOREIGN KEY ("operation_id") REFERENCES "operations" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "operation_traveler_checks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "operation_id" TEXT NOT NULL,
    "denomination_code" TEXT NOT NULL,
    "check_count" INTEGER NOT NULL,
    "serial_numbers" TEXT,
    "issuer_name" TEXT,
    "issuer_country_code" TEXT,
    "resolved_names" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "operation_traveler_checks_operation_id_fkey" FOREIGN KEY ("operation_id") REFERENCES "operations" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "operation_cards" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "operation_id" TEXT NOT NULL,
    "card_type_code" TEXT NOT NULL,
    "card_number_masked" TEXT,
    "card_brand" TEXT,
    "issuer_name" TEXT,
    "credit_limit" DECIMAL,
    "transaction_type" TEXT,
    "resolved_names" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "operation_cards_operation_id_fkey" FOREIGN KEY ("operation_id") REFERENCES "operations" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "operation_prepaid" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "operation_id" TEXT NOT NULL,
    "card_type" TEXT NOT NULL,
    "card_number_masked" TEXT,
    "is_initial_load" BOOLEAN DEFAULT true,
    "reload_amount" DECIMAL,
    "current_balance" DECIMAL,
    "issuer_name" TEXT,
    "resolved_names" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "operation_prepaid_operation_id_fkey" FOREIGN KEY ("operation_id") REFERENCES "operations" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "operation_rewards" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "operation_id" TEXT NOT NULL,
    "reward_type" TEXT NOT NULL,
    "program_name" TEXT,
    "points_amount" DECIMAL,
    "points_value" DECIMAL,
    "points_expiry_date" DATETIME,
    "redemption_type" TEXT,
    "redemption_description" TEXT,
    "resolved_names" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "operation_rewards_operation_id_fkey" FOREIGN KEY ("operation_id") REFERENCES "operations" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "operation_valuables" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "operation_id" TEXT NOT NULL,
    "value_type_code" TEXT NOT NULL,
    "service_type_code" TEXT,
    "transport_method" TEXT,
    "origin_address" TEXT,
    "destination_address" TEXT,
    "custody_start_date" DATETIME,
    "custody_end_date" DATETIME,
    "storage_location" TEXT,
    "declared_value" DECIMAL,
    "insured_value" DECIMAL,
    "description" TEXT,
    "resolved_names" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "operation_valuables_operation_id_fkey" FOREIGN KEY ("operation_id") REFERENCES "operations" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "operation_art" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "operation_id" TEXT NOT NULL,
    "artwork_type_code" TEXT NOT NULL,
    "title" TEXT,
    "artist" TEXT,
    "year_created" INTEGER,
    "medium" TEXT,
    "dimensions" TEXT,
    "provenance" TEXT,
    "certificate_authenticity" TEXT,
    "previous_owner" TEXT,
    "is_antique" BOOLEAN DEFAULT false,
    "auction_house" TEXT,
    "lot_number" TEXT,
    "resolved_names" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "operation_art_operation_id_fkey" FOREIGN KEY ("operation_id") REFERENCES "operations" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "operation_development" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "operation_id" TEXT NOT NULL,
    "development_type_code" TEXT NOT NULL,
    "credit_type_code" TEXT,
    "project_name" TEXT,
    "project_location" TEXT,
    "contribution_type" TEXT,
    "contribution_amount" DECIMAL,
    "third_party_type_code" TEXT,
    "third_party_name" TEXT,
    "financial_institution_type_code" TEXT,
    "financial_institution_name" TEXT,
    "resolved_names" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "operation_development_operation_id_fkey" FOREIGN KEY ("operation_id") REFERENCES "operations" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "uma_values" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "year" INTEGER NOT NULL,
    "daily_value" DECIMAL NOT NULL,
    "effective_date" DATETIME NOT NULL,
    "end_date" DATETIME,
    "approved_by" TEXT,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "organization_settings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organization_id" TEXT NOT NULL,
    "obligated_subject_key" TEXT NOT NULL,
    "activity_key" TEXT NOT NULL,
    "self_service_mode" TEXT NOT NULL DEFAULT 'automatic',
    "self_service_expiry_hours" INTEGER NOT NULL DEFAULT 72,
    "self_service_required_sections" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "kyc_sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organization_id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "expires_at" DATETIME NOT NULL,
    "created_by" TEXT NOT NULL,
    "email_sent_at" DATETIME,
    "started_at" DATETIME,
    "submitted_at" DATETIME,
    "reviewed_at" DATETIME,
    "reviewed_by" TEXT,
    "rejection_reason" TEXT,
    "editable_sections" TEXT,
    "upload_link_id" TEXT,
    "identification_tier" TEXT NOT NULL DEFAULT 'ALWAYS',
    "threshold_amount_mxn" REAL,
    "client_cumulative_mxn" REAL,
    "completed_sections" TEXT,
    "last_activity_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "kyc_session_events" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "session_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "actor_ip" TEXT,
    "actor_type" TEXT NOT NULL DEFAULT 'client',
    "actor_id" TEXT,
    "payload" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "kyc_session_events_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "kyc_sessions" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "notices" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "activity_code" TEXT NOT NULL DEFAULT 'VEH',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "period_start" DATETIME NOT NULL,
    "period_end" DATETIME NOT NULL,
    "reported_month" TEXT NOT NULL,
    "record_count" INTEGER NOT NULL DEFAULT 0,
    "xml_file_url" TEXT,
    "file_size" INTEGER,
    "generated_at" DATETIME,
    "submitted_at" DATETIME,
    "amendment_cycle" INTEGER NOT NULL DEFAULT 0,
    "created_by" TEXT,
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "notice_events" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "notice_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "from_status" TEXT,
    "to_status" TEXT NOT NULL,
    "cycle" INTEGER NOT NULL DEFAULT 0,
    "pdf_document_id" TEXT,
    "xml_file_url" TEXT,
    "file_size" INTEGER,
    "notes" TEXT,
    "created_by" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notice_events_notice_id_fkey" FOREIGN KEY ("notice_id") REFERENCES "notices" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "reports" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "template" TEXT NOT NULL DEFAULT 'CUSTOM',
    "period_type" TEXT NOT NULL DEFAULT 'CUSTOM',
    "period_start" DATETIME NOT NULL,
    "period_end" DATETIME NOT NULL,
    "comparison_period_start" DATETIME,
    "comparison_period_end" DATETIME,
    "data_sources" TEXT NOT NULL DEFAULT '["ALERTS"]',
    "filters" TEXT NOT NULL DEFAULT '{}',
    "client_id" TEXT,
    "charts" TEXT NOT NULL DEFAULT '[]',
    "include_summary_cards" BOOLEAN NOT NULL DEFAULT true,
    "include_detail_tables" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "pdf_file_url" TEXT,
    "file_size" INTEGER,
    "generated_at" DATETIME,
    "created_by" TEXT,
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "reports_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "alert_rules" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "severity" TEXT NOT NULL DEFAULT 'MEDIUM',
    "rule_type" TEXT,
    "is_manual_only" BOOLEAN NOT NULL DEFAULT false,
    "activity_code" TEXT NOT NULL DEFAULT 'VEH',
    "metadata" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "alert_rule_config" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "alert_rule_id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "is_hardcoded" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "alert_rule_config_alert_rule_id_fkey" FOREIGN KEY ("alert_rule_id") REFERENCES "alert_rules" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "alerts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organization_id" TEXT NOT NULL,
    "alert_rule_id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "report_id" TEXT,
    "notice_id" TEXT,
    "operation_id" TEXT,
    "activity_code" TEXT NOT NULL DEFAULT 'VEH',
    "status" TEXT NOT NULL DEFAULT 'DETECTED',
    "severity" TEXT NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "context_hash" TEXT NOT NULL,
    "metadata" TEXT NOT NULL,
    "is_manual" BOOLEAN NOT NULL DEFAULT false,
    "submission_deadline" DATETIME,
    "file_generated_at" DATETIME,
    "submitted_at" DATETIME,
    "sat_acknowledgment_receipt" TEXT,
    "sat_folio_number" TEXT,
    "is_overdue" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "reviewed_at" DATETIME,
    "reviewed_by" TEXT,
    "cancelled_at" DATETIME,
    "cancelled_by" TEXT,
    "cancellation_reason" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "alerts_alert_rule_id_fkey" FOREIGN KEY ("alert_rule_id") REFERENCES "alert_rules" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "alerts_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "alerts_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "reports" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "alerts_notice_id_fkey" FOREIGN KEY ("notice_id") REFERENCES "notices" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "alerts_operation_id_fkey" FOREIGN KEY ("operation_id") REFERENCES "operations" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "imports" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organization_id" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "activity_code" TEXT,
    "file_name" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "total_rows" INTEGER NOT NULL DEFAULT 0,
    "processed_rows" INTEGER NOT NULL DEFAULT 0,
    "success_count" INTEGER NOT NULL DEFAULT 0,
    "warning_count" INTEGER NOT NULL DEFAULT 0,
    "error_count" INTEGER NOT NULL DEFAULT 0,
    "skipped_count" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,
    "column_mapping" TEXT,
    "created_by" TEXT NOT NULL,
    "started_at" DATETIME,
    "completed_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "import_row_results" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "import_id" TEXT NOT NULL,
    "row_number" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "raw_data" TEXT NOT NULL,
    "entity_id" TEXT,
    "message" TEXT,
    "errors" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "import_row_results_import_id_fkey" FOREIGN KEY ("import_id") REFERENCES "imports" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "clients_organization_id_idx" ON "clients"("organization_id");

-- CreateIndex
CREATE INDEX "clients_rfc_idx" ON "clients"("rfc");

-- CreateIndex
CREATE INDEX "clients_person_type_idx" ON "clients"("person_type");

-- CreateIndex
CREATE INDEX "clients_deleted_at_idx" ON "clients"("deleted_at");

-- CreateIndex
CREATE INDEX "clients_country_code_idx" ON "clients"("country_code");

-- CreateIndex
CREATE INDEX "clients_economic_activity_code_idx" ON "clients"("economic_activity_code");

-- CreateIndex
CREATE INDEX "clients_kyc_status_idx" ON "clients"("kyc_status");

-- CreateIndex
CREATE INDEX "clients_screening_result_idx" ON "clients"("screening_result");

-- CreateIndex
CREATE INDEX "upload_links_organization_id_idx" ON "upload_links"("organization_id");

-- CreateIndex
CREATE INDEX "upload_links_client_id_idx" ON "upload_links"("client_id");

-- CreateIndex
CREATE INDEX "upload_links_doc_svc_link_id_idx" ON "upload_links"("doc_svc_link_id");

-- CreateIndex
CREATE INDEX "upload_links_status_idx" ON "upload_links"("status");

-- CreateIndex
CREATE INDEX "upload_links_expires_at_idx" ON "upload_links"("expires_at");

-- CreateIndex
CREATE INDEX "client_documents_client_id_idx" ON "client_documents"("client_id");

-- CreateIndex
CREATE INDEX "client_documents_document_type_idx" ON "client_documents"("document_type");

-- CreateIndex
CREATE INDEX "client_documents_status_idx" ON "client_documents"("status");

-- CreateIndex
CREATE INDEX "client_documents_expiry_date_idx" ON "client_documents"("expiry_date");

-- CreateIndex
CREATE INDEX "client_documents_doc_svc_document_id_idx" ON "client_documents"("doc_svc_document_id");

-- CreateIndex
CREATE INDEX "client_documents_upload_link_id_idx" ON "client_documents"("upload_link_id");

-- CreateIndex
CREATE INDEX "client_addresses_client_id_idx" ON "client_addresses"("client_id");

-- CreateIndex
CREATE INDEX "client_addresses_address_type_idx" ON "client_addresses"("address_type");

-- CreateIndex
CREATE INDEX "client_addresses_country_idx" ON "client_addresses"("country");

-- CreateIndex
CREATE INDEX "shareholders_client_id_idx" ON "shareholders"("client_id");

-- CreateIndex
CREATE INDEX "shareholders_parent_shareholder_id_idx" ON "shareholders"("parent_shareholder_id");

-- CreateIndex
CREATE INDEX "shareholders_entity_type_idx" ON "shareholders"("entity_type");

-- CreateIndex
CREATE INDEX "beneficial_controllers_client_id_idx" ON "beneficial_controllers"("client_id");

-- CreateIndex
CREATE INDEX "beneficial_controllers_shareholder_id_idx" ON "beneficial_controllers"("shareholder_id");

-- CreateIndex
CREATE INDEX "beneficial_controllers_bc_type_idx" ON "beneficial_controllers"("bc_type");

-- CreateIndex
CREATE INDEX "beneficial_controllers_identification_criteria_idx" ON "beneficial_controllers"("identification_criteria");

-- CreateIndex
CREATE INDEX "beneficial_controllers_screening_result_idx" ON "beneficial_controllers"("screening_result");

-- CreateIndex
CREATE UNIQUE INDEX "catalogs_key_key" ON "catalogs"("key");

-- CreateIndex
CREATE INDEX "catalogs_active_idx" ON "catalogs"("active");

-- CreateIndex
CREATE INDEX "catalog_items_catalog_id_idx" ON "catalog_items"("catalog_id");

-- CreateIndex
CREATE INDEX "catalog_items_normalized_name_idx" ON "catalog_items"("normalized_name");

-- CreateIndex
CREATE INDEX "catalog_items_active_idx" ON "catalog_items"("active");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_uuid_key" ON "invoices"("uuid");

-- CreateIndex
CREATE INDEX "invoices_organization_id_idx" ON "invoices"("organization_id");

-- CreateIndex
CREATE INDEX "invoices_uuid_idx" ON "invoices"("uuid");

-- CreateIndex
CREATE INDEX "invoices_issuer_rfc_idx" ON "invoices"("issuer_rfc");

-- CreateIndex
CREATE INDEX "invoices_receiver_rfc_idx" ON "invoices"("receiver_rfc");

-- CreateIndex
CREATE INDEX "invoices_issue_date_idx" ON "invoices"("issue_date");

-- CreateIndex
CREATE INDEX "invoices_voucher_type_code_idx" ON "invoices"("voucher_type_code");

-- CreateIndex
CREATE INDEX "invoices_deleted_at_idx" ON "invoices"("deleted_at");

-- CreateIndex
CREATE INDEX "invoice_items_invoice_id_idx" ON "invoice_items"("invoice_id");

-- CreateIndex
CREATE INDEX "invoice_items_product_service_code_idx" ON "invoice_items"("product_service_code");

-- CreateIndex
CREATE INDEX "operations_organization_id_idx" ON "operations"("organization_id");

-- CreateIndex
CREATE INDEX "operations_client_id_idx" ON "operations"("client_id");

-- CreateIndex
CREATE INDEX "operations_invoice_id_idx" ON "operations"("invoice_id");

-- CreateIndex
CREATE INDEX "operations_activity_code_idx" ON "operations"("activity_code");

-- CreateIndex
CREATE INDEX "operations_operation_type_code_idx" ON "operations"("operation_type_code");

-- CreateIndex
CREATE INDEX "operations_operation_date_idx" ON "operations"("operation_date");

-- CreateIndex
CREATE INDEX "operations_currency_code_idx" ON "operations"("currency_code");

-- CreateIndex
CREATE INDEX "operations_alert_type_code_idx" ON "operations"("alert_type_code");

-- CreateIndex
CREATE INDEX "operations_watchlist_status_idx" ON "operations"("watchlist_status");

-- CreateIndex
CREATE INDEX "operations_deleted_at_idx" ON "operations"("deleted_at");

-- CreateIndex
CREATE INDEX "operations_organization_id_import_hash_idx" ON "operations"("organization_id", "import_hash");

-- CreateIndex
CREATE INDEX "operation_payments_operation_id_idx" ON "operation_payments"("operation_id");

-- CreateIndex
CREATE INDEX "operation_payments_payment_form_code_idx" ON "operation_payments"("payment_form_code");

-- CreateIndex
CREATE UNIQUE INDEX "operation_vehicles_operation_id_key" ON "operation_vehicles"("operation_id");

-- CreateIndex
CREATE INDEX "operation_vehicles_vehicle_type_idx" ON "operation_vehicles"("vehicle_type");

-- CreateIndex
CREATE INDEX "operation_vehicles_vin_idx" ON "operation_vehicles"("vin");

-- CreateIndex
CREATE UNIQUE INDEX "operation_real_estate_operation_id_key" ON "operation_real_estate"("operation_id");

-- CreateIndex
CREATE INDEX "operation_real_estate_property_type_code_idx" ON "operation_real_estate"("property_type_code");

-- CreateIndex
CREATE INDEX "operation_real_estate_postal_code_idx" ON "operation_real_estate"("postal_code");

-- CreateIndex
CREATE UNIQUE INDEX "operation_jewelry_operation_id_key" ON "operation_jewelry"("operation_id");

-- CreateIndex
CREATE INDEX "operation_jewelry_item_type_code_idx" ON "operation_jewelry"("item_type_code");

-- CreateIndex
CREATE UNIQUE INDEX "operation_virtual_assets_operation_id_key" ON "operation_virtual_assets"("operation_id");

-- CreateIndex
CREATE INDEX "operation_virtual_assets_asset_type_code_idx" ON "operation_virtual_assets"("asset_type_code");

-- CreateIndex
CREATE UNIQUE INDEX "operation_gambling_operation_id_key" ON "operation_gambling"("operation_id");

-- CreateIndex
CREATE INDEX "operation_gambling_game_type_code_idx" ON "operation_gambling"("game_type_code");

-- CreateIndex
CREATE UNIQUE INDEX "operation_rentals_operation_id_key" ON "operation_rentals"("operation_id");

-- CreateIndex
CREATE INDEX "operation_rentals_property_type_code_idx" ON "operation_rentals"("property_type_code");

-- CreateIndex
CREATE UNIQUE INDEX "operation_armoring_operation_id_key" ON "operation_armoring"("operation_id");

-- CreateIndex
CREATE INDEX "operation_armoring_armor_level_code_idx" ON "operation_armoring"("armor_level_code");

-- CreateIndex
CREATE UNIQUE INDEX "operation_donations_operation_id_key" ON "operation_donations"("operation_id");

-- CreateIndex
CREATE INDEX "operation_donations_donation_type_idx" ON "operation_donations"("donation_type");

-- CreateIndex
CREATE UNIQUE INDEX "operation_loans_operation_id_key" ON "operation_loans"("operation_id");

-- CreateIndex
CREATE INDEX "operation_loans_loan_type_code_idx" ON "operation_loans"("loan_type_code");

-- CreateIndex
CREATE UNIQUE INDEX "operation_officials_operation_id_key" ON "operation_officials"("operation_id");

-- CreateIndex
CREATE INDEX "operation_officials_act_type_code_idx" ON "operation_officials"("act_type_code");

-- CreateIndex
CREATE UNIQUE INDEX "operation_notary_operation_id_key" ON "operation_notary"("operation_id");

-- CreateIndex
CREATE INDEX "operation_notary_act_type_code_idx" ON "operation_notary"("act_type_code");

-- CreateIndex
CREATE UNIQUE INDEX "operation_professional_operation_id_key" ON "operation_professional"("operation_id");

-- CreateIndex
CREATE INDEX "operation_professional_service_type_code_idx" ON "operation_professional"("service_type_code");

-- CreateIndex
CREATE UNIQUE INDEX "operation_traveler_checks_operation_id_key" ON "operation_traveler_checks"("operation_id");

-- CreateIndex
CREATE INDEX "operation_traveler_checks_denomination_code_idx" ON "operation_traveler_checks"("denomination_code");

-- CreateIndex
CREATE UNIQUE INDEX "operation_cards_operation_id_key" ON "operation_cards"("operation_id");

-- CreateIndex
CREATE INDEX "operation_cards_card_type_code_idx" ON "operation_cards"("card_type_code");

-- CreateIndex
CREATE UNIQUE INDEX "operation_prepaid_operation_id_key" ON "operation_prepaid"("operation_id");

-- CreateIndex
CREATE INDEX "operation_prepaid_card_type_idx" ON "operation_prepaid"("card_type");

-- CreateIndex
CREATE UNIQUE INDEX "operation_rewards_operation_id_key" ON "operation_rewards"("operation_id");

-- CreateIndex
CREATE INDEX "operation_rewards_reward_type_idx" ON "operation_rewards"("reward_type");

-- CreateIndex
CREATE UNIQUE INDEX "operation_valuables_operation_id_key" ON "operation_valuables"("operation_id");

-- CreateIndex
CREATE INDEX "operation_valuables_value_type_code_idx" ON "operation_valuables"("value_type_code");

-- CreateIndex
CREATE UNIQUE INDEX "operation_art_operation_id_key" ON "operation_art"("operation_id");

-- CreateIndex
CREATE INDEX "operation_art_artwork_type_code_idx" ON "operation_art"("artwork_type_code");

-- CreateIndex
CREATE UNIQUE INDEX "operation_development_operation_id_key" ON "operation_development"("operation_id");

-- CreateIndex
CREATE INDEX "operation_development_development_type_code_idx" ON "operation_development"("development_type_code");

-- CreateIndex
CREATE UNIQUE INDEX "uma_values_year_key" ON "uma_values"("year");

-- CreateIndex
CREATE INDEX "uma_values_year_idx" ON "uma_values"("year");

-- CreateIndex
CREATE INDEX "uma_values_active_idx" ON "uma_values"("active");

-- CreateIndex
CREATE INDEX "uma_values_effective_date_idx" ON "uma_values"("effective_date");

-- CreateIndex
CREATE UNIQUE INDEX "organization_settings_organization_id_key" ON "organization_settings"("organization_id");

-- CreateIndex
CREATE INDEX "organization_settings_organization_id_idx" ON "organization_settings"("organization_id");

-- CreateIndex
CREATE INDEX "organization_settings_obligated_subject_key_idx" ON "organization_settings"("obligated_subject_key");

-- CreateIndex
CREATE INDEX "organization_settings_activity_key_idx" ON "organization_settings"("activity_key");

-- CreateIndex
CREATE UNIQUE INDEX "kyc_sessions_token_key" ON "kyc_sessions"("token");

-- CreateIndex
CREATE INDEX "kyc_sessions_organization_id_idx" ON "kyc_sessions"("organization_id");

-- CreateIndex
CREATE INDEX "kyc_sessions_client_id_idx" ON "kyc_sessions"("client_id");

-- CreateIndex
CREATE INDEX "kyc_sessions_token_idx" ON "kyc_sessions"("token");

-- CreateIndex
CREATE INDEX "kyc_sessions_status_idx" ON "kyc_sessions"("status");

-- CreateIndex
CREATE INDEX "kyc_sessions_expires_at_idx" ON "kyc_sessions"("expires_at");

-- CreateIndex
CREATE INDEX "kyc_session_events_session_id_idx" ON "kyc_session_events"("session_id");

-- CreateIndex
CREATE INDEX "kyc_session_events_event_type_idx" ON "kyc_session_events"("event_type");

-- CreateIndex
CREATE INDEX "kyc_session_events_created_at_idx" ON "kyc_session_events"("created_at");

-- CreateIndex
CREATE INDEX "notices_organization_id_idx" ON "notices"("organization_id");

-- CreateIndex
CREATE INDEX "notices_activity_code_idx" ON "notices"("activity_code");

-- CreateIndex
CREATE INDEX "notices_status_idx" ON "notices"("status");

-- CreateIndex
CREATE INDEX "notices_period_start_idx" ON "notices"("period_start");

-- CreateIndex
CREATE INDEX "notices_period_end_idx" ON "notices"("period_end");

-- CreateIndex
CREATE INDEX "notices_reported_month_idx" ON "notices"("reported_month");

-- CreateIndex
CREATE INDEX "notice_events_notice_id_idx" ON "notice_events"("notice_id");

-- CreateIndex
CREATE INDEX "notice_events_organization_id_idx" ON "notice_events"("organization_id");

-- CreateIndex
CREATE INDEX "notice_events_event_type_idx" ON "notice_events"("event_type");

-- CreateIndex
CREATE INDEX "reports_organization_id_idx" ON "reports"("organization_id");

-- CreateIndex
CREATE INDEX "reports_template_idx" ON "reports"("template");

-- CreateIndex
CREATE INDEX "reports_period_type_idx" ON "reports"("period_type");

-- CreateIndex
CREATE INDEX "reports_status_idx" ON "reports"("status");

-- CreateIndex
CREATE INDEX "reports_period_start_idx" ON "reports"("period_start");

-- CreateIndex
CREATE INDEX "reports_period_end_idx" ON "reports"("period_end");

-- CreateIndex
CREATE INDEX "reports_client_id_idx" ON "reports"("client_id");

-- CreateIndex
CREATE INDEX "alert_rules_active_idx" ON "alert_rules"("active");

-- CreateIndex
CREATE INDEX "alert_rules_severity_idx" ON "alert_rules"("severity");

-- CreateIndex
CREATE INDEX "alert_rules_rule_type_idx" ON "alert_rules"("rule_type");

-- CreateIndex
CREATE INDEX "alert_rules_activity_code_idx" ON "alert_rules"("activity_code");

-- CreateIndex
CREATE INDEX "alert_rules_is_manual_only_idx" ON "alert_rules"("is_manual_only");

-- CreateIndex
CREATE INDEX "alert_rule_config_alert_rule_id_idx" ON "alert_rule_config"("alert_rule_id");

-- CreateIndex
CREATE INDEX "alert_rule_config_key_idx" ON "alert_rule_config"("key");

-- CreateIndex
CREATE INDEX "alert_rule_config_is_hardcoded_idx" ON "alert_rule_config"("is_hardcoded");

-- CreateIndex
CREATE UNIQUE INDEX "alert_rule_config_alert_rule_id_key_key" ON "alert_rule_config"("alert_rule_id", "key");

-- CreateIndex
CREATE UNIQUE INDEX "alerts_idempotency_key_key" ON "alerts"("idempotency_key");

-- CreateIndex
CREATE INDEX "alerts_organization_id_idx" ON "alerts"("organization_id");

-- CreateIndex
CREATE INDEX "alerts_alert_rule_id_idx" ON "alerts"("alert_rule_id");

-- CreateIndex
CREATE INDEX "alerts_client_id_idx" ON "alerts"("client_id");

-- CreateIndex
CREATE INDEX "alerts_report_id_idx" ON "alerts"("report_id");

-- CreateIndex
CREATE INDEX "alerts_notice_id_idx" ON "alerts"("notice_id");

-- CreateIndex
CREATE INDEX "alerts_operation_id_idx" ON "alerts"("operation_id");

-- CreateIndex
CREATE INDEX "alerts_activity_code_idx" ON "alerts"("activity_code");

-- CreateIndex
CREATE INDEX "alerts_status_idx" ON "alerts"("status");

-- CreateIndex
CREATE INDEX "alerts_severity_idx" ON "alerts"("severity");

-- CreateIndex
CREATE INDEX "alerts_created_at_idx" ON "alerts"("created_at");

-- CreateIndex
CREATE INDEX "alerts_idempotency_key_idx" ON "alerts"("idempotency_key");

-- CreateIndex
CREATE INDEX "alerts_submission_deadline_idx" ON "alerts"("submission_deadline");

-- CreateIndex
CREATE INDEX "alerts_is_overdue_idx" ON "alerts"("is_overdue");

-- CreateIndex
CREATE INDEX "alerts_submitted_at_idx" ON "alerts"("submitted_at");

-- CreateIndex
CREATE INDEX "alerts_is_manual_idx" ON "alerts"("is_manual");

-- CreateIndex
CREATE INDEX "imports_organization_id_idx" ON "imports"("organization_id");

-- CreateIndex
CREATE INDEX "imports_status_idx" ON "imports"("status");

-- CreateIndex
CREATE INDEX "imports_entity_type_idx" ON "imports"("entity_type");

-- CreateIndex
CREATE INDEX "imports_created_at_idx" ON "imports"("created_at");

-- CreateIndex
CREATE INDEX "imports_created_by_idx" ON "imports"("created_by");

-- CreateIndex
CREATE INDEX "import_row_results_import_id_idx" ON "import_row_results"("import_id");

-- CreateIndex
CREATE INDEX "import_row_results_status_idx" ON "import_row_results"("status");

-- CreateIndex
CREATE INDEX "import_row_results_row_number_idx" ON "import_row_results"("row_number");
