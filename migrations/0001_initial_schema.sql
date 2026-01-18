-- Migration: Initial AML Core Schema
-- Description: Complete AML Core schema with all domains (clients, catalogs, transactions, alerts, UMA, organization settings, reports, notices)
-- All column names use snake_case for consistency across all services

-- ============================================================================
-- Clients Domain
-- ============================================================================

DROP TABLE IF EXISTS clients;
DROP TABLE IF EXISTS client_documents;
DROP TABLE IF EXISTS client_addresses;
DROP TABLE IF EXISTS catalogs;
DROP TABLE IF EXISTS catalog_items;
DROP TABLE IF EXISTS transactions;
DROP TABLE IF EXISTS transaction_payment_methods;
DROP TABLE IF EXISTS uma_values;
DROP TABLE IF EXISTS organization_settings;
DROP TABLE IF EXISTS reports;
DROP TABLE IF EXISTS notices;
DROP TABLE IF EXISTS alert_rules;
DROP TABLE IF EXISTS alert_rule_config;
DROP TABLE IF EXISTS alerts;
DROP TABLE IF EXISTS imports;
DROP TABLE IF EXISTS import_row_results;


CREATE TABLE clients (
    id TEXT PRIMARY KEY NOT NULL,
    rfc TEXT NOT NULL, -- RFC is unique per organization, not globally
    organization_id TEXT NOT NULL,
    person_type TEXT NOT NULL CHECK(person_type IN ('PHYSICAL','MORAL','TRUST')),
    first_name TEXT,
    last_name TEXT,
    second_last_name TEXT,
    birth_date DATETIME,
    curp TEXT,
    business_name TEXT,
    incorporation_date DATETIME,
    nationality TEXT,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    country TEXT NOT NULL,
    state_code TEXT NOT NULL,
    city TEXT NOT NULL,
    municipality TEXT NOT NULL,
    neighborhood TEXT NOT NULL,
    street TEXT NOT NULL,
    external_number TEXT NOT NULL,
    internal_number TEXT,
    postal_code TEXT NOT NULL,
    reference TEXT,
    notes TEXT,
    country_code TEXT,
    economic_activity_code TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME
);

CREATE TABLE client_documents (
    id TEXT PRIMARY KEY NOT NULL,
    client_id TEXT NOT NULL,
    document_type TEXT NOT NULL CHECK(document_type IN ('PASSPORT','NATIONAL_ID','DRIVERS_LICENSE','TAX_ID','PROOF_OF_ADDRESS','OTHER')),
    document_number TEXT NOT NULL,
    issuing_country TEXT,
    issue_date DATETIME,
    expiry_date DATETIME,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','VERIFIED','REJECTED','EXPIRED')),
    file_url TEXT,
    metadata TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

CREATE TABLE client_addresses (
    id TEXT PRIMARY KEY NOT NULL,
    client_id TEXT NOT NULL,
    address_type TEXT NOT NULL DEFAULT 'RESIDENTIAL' CHECK(address_type IN ('RESIDENTIAL','BUSINESS','MAILING','OTHER')),
    street1 TEXT NOT NULL,
    street2 TEXT,
    city TEXT NOT NULL,
    state TEXT,
    postal_code TEXT,
    country TEXT NOT NULL,
    is_primary INTEGER NOT NULL DEFAULT 0 CHECK(is_primary IN (0, 1)),
    verified_at DATETIME,
    reference TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

-- ============================================================================
-- Catalogs Domain
-- ============================================================================

CREATE TABLE catalogs (
    id TEXT PRIMARY KEY NOT NULL,
    key TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0, 1)),
    allow_new_items INTEGER NOT NULL DEFAULT 0 CHECK(allow_new_items IN (0, 1)),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE catalog_items (
    id TEXT PRIMARY KEY NOT NULL,
    catalog_id TEXT NOT NULL,
    name TEXT NOT NULL,
    normalized_name TEXT NOT NULL,
    active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0, 1)),
    metadata TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (catalog_id) REFERENCES catalogs(id) ON DELETE CASCADE
);

-- ============================================================================
-- Transactions Domain
-- ============================================================================

CREATE TABLE transactions (
    id TEXT PRIMARY KEY NOT NULL,
    organization_id TEXT NOT NULL,
    client_id TEXT NOT NULL,
    operation_date DATETIME NOT NULL,
    operation_type TEXT NOT NULL CHECK(operation_type IN ('PURCHASE','SALE')),
    branch_postal_code TEXT NOT NULL,
    vehicle_type TEXT NOT NULL CHECK(vehicle_type IN ('LAND','MARINE','AIR')),
    brand_id TEXT NOT NULL,
    model TEXT NOT NULL,
    year INTEGER NOT NULL,
    armor_level TEXT,
    engine_number TEXT,
    plates TEXT,
    registration_number TEXT,
    flag_country_id TEXT,
    amount NUMERIC NOT NULL,
    currency TEXT NOT NULL,
    operation_type_code TEXT,
    currency_code TEXT,
    uma_value NUMERIC,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

CREATE TABLE transaction_payment_methods (
    id TEXT PRIMARY KEY NOT NULL,
    transaction_id TEXT NOT NULL,
    method TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE
);

-- ============================================================================
-- UMA Values Domain
-- ============================================================================

CREATE TABLE uma_values (
    id TEXT PRIMARY KEY NOT NULL,
    year INTEGER NOT NULL UNIQUE,
    daily_value NUMERIC NOT NULL,
    effective_date DATETIME NOT NULL,
    end_date DATETIME,
    approved_by TEXT,
    notes TEXT,
    active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0, 1)),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- Organization Settings Domain
-- ============================================================================

CREATE TABLE organization_settings (
    id TEXT PRIMARY KEY NOT NULL,
    organization_id TEXT NOT NULL UNIQUE,
    obligated_subject_key TEXT NOT NULL,
    activity_key TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- Reports Domain (Analytics and Business Intelligence)
-- ============================================================================

CREATE TABLE reports (
    id TEXT PRIMARY KEY NOT NULL,
    organization_id TEXT NOT NULL,
    name TEXT NOT NULL,
    template TEXT NOT NULL DEFAULT 'CUSTOM' CHECK(template IN ('EXECUTIVE_SUMMARY','COMPLIANCE_STATUS','TRANSACTION_ANALYSIS','CLIENT_RISK_PROFILE','ALERT_BREAKDOWN','PERIOD_COMPARISON','CUSTOM')),
    period_type TEXT NOT NULL DEFAULT 'CUSTOM' CHECK(period_type IN ('MONTHLY','QUARTERLY','ANNUAL','CUSTOM')),
    period_start DATETIME NOT NULL,
    period_end DATETIME NOT NULL,
    comparison_period_start DATETIME,
    comparison_period_end DATETIME,
    data_sources TEXT NOT NULL DEFAULT '["ALERTS"]',
    filters TEXT NOT NULL DEFAULT '{}',
    client_id TEXT REFERENCES clients(id) ON DELETE SET NULL,
    charts TEXT NOT NULL DEFAULT '[]',
    include_summary_cards INTEGER NOT NULL DEFAULT 1,
    include_detail_tables INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','GENERATED')),
    pdf_file_url TEXT,
    file_size INTEGER,
    generated_at DATETIME,
    created_by TEXT,
    notes TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- Notices Domain (SAT Regulatory Submissions)
-- ============================================================================

CREATE TABLE notices (
    id TEXT PRIMARY KEY NOT NULL,
    organization_id TEXT NOT NULL,
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','GENERATED','SUBMITTED','ACKNOWLEDGED')),
    period_start DATETIME NOT NULL,
    period_end DATETIME NOT NULL,
    reported_month TEXT NOT NULL,
    record_count INTEGER NOT NULL DEFAULT 0,
    xml_file_url TEXT,
    file_size INTEGER,
    generated_at DATETIME,
    submitted_at DATETIME,
    sat_folio_number TEXT,
    created_by TEXT,
    notes TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- Alert System Domain (created after reports/notices for FK references)
-- ============================================================================

CREATE TABLE alert_rules (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0, 1)),
    severity TEXT NOT NULL DEFAULT 'MEDIUM' CHECK(severity IN ('LOW','MEDIUM','HIGH','CRITICAL')),
    rule_type TEXT,
    is_manual_only INTEGER NOT NULL DEFAULT 0 CHECK(is_manual_only IN (0, 1)),
    activity_code TEXT NOT NULL DEFAULT 'VEH',
    metadata TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE alert_rule_config (
    id TEXT PRIMARY KEY NOT NULL,
    alert_rule_id TEXT NOT NULL,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    is_hardcoded INTEGER NOT NULL DEFAULT 0 CHECK(is_hardcoded IN (0, 1)),
    description TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(alert_rule_id, key),
    FOREIGN KEY (alert_rule_id) REFERENCES alert_rules(id) ON DELETE CASCADE
);

CREATE TABLE alerts (
    id TEXT PRIMARY KEY NOT NULL,
    organization_id TEXT NOT NULL,
    alert_rule_id TEXT NOT NULL,
    client_id TEXT NOT NULL,
    report_id TEXT REFERENCES reports(id) ON DELETE SET NULL,
    notice_id TEXT REFERENCES notices(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'DETECTED' CHECK(status IN ('DETECTED','FILE_GENERATED','SUBMITTED','OVERDUE','CANCELLED')),
    severity TEXT NOT NULL CHECK(severity IN ('LOW','MEDIUM','HIGH','CRITICAL')),
    idempotency_key TEXT NOT NULL UNIQUE,
    context_hash TEXT NOT NULL,
    metadata TEXT NOT NULL,
    transaction_id TEXT,
    is_manual INTEGER NOT NULL DEFAULT 0 CHECK(is_manual IN (0, 1)),
    submission_deadline DATETIME,
    file_generated_at DATETIME,
    submitted_at DATETIME,
    sat_acknowledgment_receipt TEXT,
    sat_folio_number TEXT,
    is_overdue INTEGER NOT NULL DEFAULT 0 CHECK(is_overdue IN (0, 1)),
    notes TEXT,
    reviewed_at DATETIME,
    reviewed_by TEXT,
    cancelled_at DATETIME,
    cancelled_by TEXT,
    cancellation_reason TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (alert_rule_id) REFERENCES alert_rules(id) ON DELETE RESTRICT,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

-- ============================================================================
-- Imports Domain (Bulk Data Import)
-- ============================================================================

CREATE TABLE imports (
    id TEXT PRIMARY KEY NOT NULL,
    organization_id TEXT NOT NULL,
    entity_type TEXT NOT NULL CHECK(entity_type IN ('CLIENT','TRANSACTION')),
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','VALIDATING','PROCESSING','COMPLETED','FAILED')),
    total_rows INTEGER NOT NULL DEFAULT 0,
    processed_rows INTEGER NOT NULL DEFAULT 0,
    success_count INTEGER NOT NULL DEFAULT 0,
    warning_count INTEGER NOT NULL DEFAULT 0,
    error_count INTEGER NOT NULL DEFAULT 0,
    error_message TEXT,
    created_by TEXT NOT NULL,
    started_at DATETIME,
    completed_at DATETIME,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE import_row_results (
    id TEXT PRIMARY KEY NOT NULL,
    import_id TEXT NOT NULL,
    row_number INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','SUCCESS','WARNING','ERROR','SKIPPED')),
    raw_data TEXT NOT NULL,
    entity_id TEXT,
    message TEXT,
    errors TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (import_id) REFERENCES imports(id) ON DELETE CASCADE
);

-- ============================================================================
-- Indexes
-- ============================================================================

-- Clients indexes
CREATE UNIQUE INDEX idx_clients_organization_id_rfc ON clients(organization_id, rfc); -- RFC is unique per organization
CREATE INDEX idx_clients_organization_id ON clients(organization_id);
CREATE INDEX idx_clients_rfc ON clients(rfc);
CREATE INDEX idx_clients_person_type ON clients(person_type);
CREATE INDEX idx_clients_deleted_at ON clients(deleted_at);
CREATE INDEX idx_clients_country_code ON clients(country_code);
CREATE INDEX idx_clients_economic_activity_code ON clients(economic_activity_code);

-- Client documents indexes
CREATE INDEX idx_client_documents_client_id ON client_documents(client_id);
CREATE INDEX idx_client_documents_document_type ON client_documents(document_type);
CREATE INDEX idx_client_documents_status ON client_documents(status);
CREATE INDEX idx_client_documents_expiry_date ON client_documents(expiry_date);

-- Client addresses indexes
CREATE INDEX idx_client_addresses_client_id ON client_addresses(client_id);
CREATE INDEX idx_client_addresses_address_type ON client_addresses(address_type);
CREATE INDEX idx_client_addresses_country ON client_addresses(country);

-- Catalogs indexes
CREATE INDEX idx_catalogs_active ON catalogs(active);

-- Catalog items indexes
CREATE INDEX idx_catalog_items_catalog_id ON catalog_items(catalog_id);
CREATE INDEX idx_catalog_items_normalized_name ON catalog_items(normalized_name);
CREATE INDEX idx_catalog_items_active ON catalog_items(active);

-- Transactions indexes
CREATE INDEX idx_transactions_organization_id ON transactions(organization_id);
CREATE INDEX idx_transactions_client_id ON transactions(client_id);
CREATE INDEX idx_transactions_operation_date ON transactions(operation_date);
CREATE INDEX idx_transactions_operation_type ON transactions(operation_type);
CREATE INDEX idx_transactions_vehicle_type ON transactions(vehicle_type);
CREATE INDEX idx_transactions_operation_type_code ON transactions(operation_type_code);
CREATE INDEX idx_transactions_currency_code ON transactions(currency_code);

-- Transaction payment methods indexes
CREATE INDEX idx_transaction_payment_methods_transaction_id ON transaction_payment_methods(transaction_id);

-- UMA values indexes
CREATE INDEX idx_uma_values_year ON uma_values(year);
CREATE INDEX idx_uma_values_active ON uma_values(active);
CREATE INDEX idx_uma_values_effective_date ON uma_values(effective_date);

-- Organization settings indexes
CREATE INDEX idx_organization_settings_organization_id ON organization_settings(organization_id);
CREATE INDEX idx_organization_settings_obligated_subject_key ON organization_settings(obligated_subject_key);
CREATE INDEX idx_organization_settings_activity_key ON organization_settings(activity_key);

-- Reports indexes
CREATE INDEX idx_reports_organization_id ON reports(organization_id);
CREATE INDEX idx_reports_template ON reports(template);
CREATE INDEX idx_reports_period_type ON reports(period_type);
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_period_start ON reports(period_start);
CREATE INDEX idx_reports_period_end ON reports(period_end);
CREATE INDEX idx_reports_client_id ON reports(client_id);

-- Notices indexes
CREATE INDEX idx_notices_organization_id ON notices(organization_id);
CREATE INDEX idx_notices_status ON notices(status);
CREATE INDEX idx_notices_period_start ON notices(period_start);
CREATE INDEX idx_notices_period_end ON notices(period_end);
CREATE INDEX idx_notices_reported_month ON notices(reported_month);

-- Alert rules indexes
CREATE INDEX idx_alert_rules_active ON alert_rules(active);
CREATE INDEX idx_alert_rules_severity ON alert_rules(severity);
CREATE INDEX idx_alert_rules_rule_type ON alert_rules(rule_type);
CREATE INDEX idx_alert_rules_activity_code ON alert_rules(activity_code);
CREATE INDEX idx_alert_rules_is_manual_only ON alert_rules(is_manual_only);

-- Alert rule config indexes
CREATE UNIQUE INDEX idx_alert_rule_config_alert_rule_id_key ON alert_rule_config(alert_rule_id, key);
CREATE INDEX idx_alert_rule_config_alert_rule_id ON alert_rule_config(alert_rule_id);
CREATE INDEX idx_alert_rule_config_key ON alert_rule_config(key);
CREATE INDEX idx_alert_rule_config_is_hardcoded ON alert_rule_config(is_hardcoded);

-- Alerts indexes
CREATE INDEX idx_alerts_organization_id ON alerts(organization_id);
CREATE INDEX idx_alerts_alert_rule_id ON alerts(alert_rule_id);
CREATE INDEX idx_alerts_client_id ON alerts(client_id);
CREATE INDEX idx_alerts_report_id ON alerts(report_id);
CREATE INDEX idx_alerts_notice_id ON alerts(notice_id);
CREATE INDEX idx_alerts_status ON alerts(status);
CREATE INDEX idx_alerts_severity ON alerts(severity);
CREATE INDEX idx_alerts_created_at ON alerts(created_at);
CREATE UNIQUE INDEX idx_alerts_idempotency_key ON alerts(idempotency_key);
CREATE INDEX idx_alerts_submission_deadline ON alerts(submission_deadline);
CREATE INDEX idx_alerts_is_overdue ON alerts(is_overdue);
CREATE INDEX idx_alerts_submitted_at ON alerts(submitted_at);
CREATE INDEX idx_alerts_transaction_id ON alerts(transaction_id);
CREATE INDEX idx_alerts_is_manual ON alerts(is_manual);

-- Imports indexes
CREATE INDEX idx_imports_organization_id ON imports(organization_id);
CREATE INDEX idx_imports_status ON imports(status);
CREATE INDEX idx_imports_entity_type ON imports(entity_type);
CREATE INDEX idx_imports_created_at ON imports(created_at);
CREATE INDEX idx_imports_created_by ON imports(created_by);

-- Import row results indexes
CREATE INDEX idx_import_row_results_import_id ON import_row_results(import_id);
CREATE INDEX idx_import_row_results_status ON import_row_results(status);
CREATE INDEX idx_import_row_results_row_number ON import_row_results(row_number);
