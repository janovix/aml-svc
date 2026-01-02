-- Migration: Initial AML Core Schema
-- Description: Complete AML Core schema with all domains (clients, catalogs, transactions, alerts, UMA, organization settings)
-- This is a consolidated migration combining all previous migrations into a single fresh migration

-- Drop legacy tables if they exist
DROP TABLE IF EXISTS tasks;

-- Drop all existing AML Core tables to ensure clean state
DROP TABLE IF EXISTS transaction_payment_methods;
DROP TABLE IF EXISTS transactions;
DROP TABLE IF EXISTS alerts;
DROP TABLE IF EXISTS alert_rule_config;
DROP TABLE IF EXISTS alert_rules;
DROP TABLE IF EXISTS uma_values;
DROP TABLE IF EXISTS organization_settings;
DROP TABLE IF EXISTS catalog_items;
DROP TABLE IF EXISTS catalogs;
DROP TABLE IF EXISTS client_addresses;
DROP TABLE IF EXISTS client_documents;
DROP TABLE IF EXISTS clients;

-- ============================================================================
-- Clients Domain
-- ============================================================================

CREATE TABLE clients (
    id TEXT PRIMARY KEY NOT NULL,
    rfc TEXT NOT NULL UNIQUE,
    organizationId TEXT NOT NULL,
    personType TEXT NOT NULL CHECK(personType IN ('PHYSICAL','MORAL','TRUST')),
    firstName TEXT,
    lastName TEXT,
    secondLastName TEXT,
    birthDate DATETIME,
    curp TEXT,
    businessName TEXT,
    incorporationDate DATETIME,
    nationality TEXT,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    country TEXT NOT NULL,
    stateCode TEXT NOT NULL,
    city TEXT NOT NULL,
    municipality TEXT NOT NULL,
    neighborhood TEXT NOT NULL,
    street TEXT NOT NULL,
    externalNumber TEXT NOT NULL,
    internalNumber TEXT,
    postalCode TEXT NOT NULL,
    reference TEXT,
    notes TEXT,
    countryCode TEXT,
    economicActivityCode TEXT,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deletedAt DATETIME
);

CREATE TABLE client_documents (
    id TEXT PRIMARY KEY NOT NULL,
    clientId TEXT NOT NULL,
    documentType TEXT NOT NULL CHECK(documentType IN ('PASSPORT','NATIONAL_ID','DRIVERS_LICENSE','TAX_ID','PROOF_OF_ADDRESS','OTHER')),
    documentNumber TEXT NOT NULL,
    issuingCountry TEXT,
    issueDate DATETIME,
    expiryDate DATETIME,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','VERIFIED','REJECTED','EXPIRED')),
    fileUrl TEXT,
    metadata TEXT,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (clientId) REFERENCES clients(id) ON DELETE CASCADE
);

CREATE TABLE client_addresses (
    id TEXT PRIMARY KEY NOT NULL,
    clientId TEXT NOT NULL,
    addressType TEXT NOT NULL DEFAULT 'RESIDENTIAL' CHECK(addressType IN ('RESIDENTIAL','BUSINESS','MAILING','OTHER')),
    street1 TEXT NOT NULL,
    street2 TEXT,
    city TEXT NOT NULL,
    state TEXT,
    postalCode TEXT,
    country TEXT NOT NULL,
    isPrimary INTEGER NOT NULL DEFAULT 0 CHECK(isPrimary IN (0, 1)),
    verifiedAt DATETIME,
    reference TEXT,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (clientId) REFERENCES clients(id) ON DELETE CASCADE
);

-- ============================================================================
-- Catalogs Domain
-- ============================================================================

CREATE TABLE catalogs (
    id TEXT PRIMARY KEY NOT NULL,
    key TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0, 1)),
    allowNewItems INTEGER NOT NULL DEFAULT 0 CHECK(allowNewItems IN (0, 1)),
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE catalog_items (
    id TEXT PRIMARY KEY NOT NULL,
    catalogId TEXT NOT NULL,
    name TEXT NOT NULL,
    normalizedName TEXT NOT NULL,
    active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0, 1)),
    metadata TEXT,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (catalogId) REFERENCES catalogs(id) ON DELETE CASCADE
);

-- ============================================================================
-- Transactions Domain
-- ============================================================================

CREATE TABLE transactions (
    id TEXT PRIMARY KEY NOT NULL,
    organizationId TEXT NOT NULL,
    clientId TEXT NOT NULL,
    operationDate DATETIME NOT NULL,
    operationType TEXT NOT NULL CHECK(operationType IN ('PURCHASE','SALE')),
    branchPostalCode TEXT NOT NULL,
    vehicleType TEXT NOT NULL CHECK(vehicleType IN ('LAND','MARINE','AIR')),
    brandId TEXT NOT NULL,
    model TEXT NOT NULL,
    year INTEGER NOT NULL,
    armorLevel TEXT,
    engineNumber TEXT,
    plates TEXT,
    registrationNumber TEXT,
    flagCountryId TEXT,
    amount NUMERIC NOT NULL,
    currency TEXT NOT NULL,
    operationTypeCode TEXT,
    currencyCode TEXT,
    umaValue NUMERIC,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deletedAt DATETIME,
    FOREIGN KEY (clientId) REFERENCES clients(id) ON DELETE CASCADE
);

CREATE TABLE transaction_payment_methods (
    id TEXT PRIMARY KEY NOT NULL,
    transactionId TEXT NOT NULL,
    method TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (transactionId) REFERENCES transactions(id) ON DELETE CASCADE
);

-- ============================================================================
-- Alert System Domain
-- ============================================================================

CREATE TABLE alert_rules (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0, 1)),
    severity TEXT NOT NULL DEFAULT 'MEDIUM' CHECK(severity IN ('LOW','MEDIUM','HIGH','CRITICAL')),
    ruleType TEXT,
    isManualOnly INTEGER NOT NULL DEFAULT 0 CHECK(isManualOnly IN (0, 1)),
    activityCode TEXT NOT NULL DEFAULT 'VEH',
    metadata TEXT,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE alert_rule_config (
    id TEXT PRIMARY KEY NOT NULL,
    alertRuleId TEXT NOT NULL,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    isHardcoded INTEGER NOT NULL DEFAULT 0 CHECK(isHardcoded IN (0, 1)),
    description TEXT,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (alertRuleId) REFERENCES alert_rules(id) ON DELETE CASCADE
);

CREATE TABLE alerts (
    id TEXT PRIMARY KEY NOT NULL,
    organizationId TEXT NOT NULL,
    alertRuleId TEXT NOT NULL,
    clientId TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'DETECTED' CHECK(status IN ('DETECTED','FILE_GENERATED','SUBMITTED','OVERDUE','CANCELLED')),
    severity TEXT NOT NULL CHECK(severity IN ('LOW','MEDIUM','HIGH','CRITICAL')),
    idempotencyKey TEXT NOT NULL UNIQUE,
    contextHash TEXT NOT NULL,
    metadata TEXT NOT NULL,
    transactionId TEXT,
    isManual INTEGER NOT NULL DEFAULT 0 CHECK(isManual IN (0, 1)),
    submissionDeadline DATETIME,
    fileGeneratedAt DATETIME,
    satFileUrl TEXT,
    submittedAt DATETIME,
    satAcknowledgmentReceipt TEXT,
    satFolioNumber TEXT,
    isOverdue INTEGER NOT NULL DEFAULT 0 CHECK(isOverdue IN (0, 1)),
    notes TEXT,
    reviewedAt DATETIME,
    reviewedBy TEXT,
    cancelledAt DATETIME,
    cancelledBy TEXT,
    cancellationReason TEXT,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (alertRuleId) REFERENCES alert_rules(id) ON DELETE RESTRICT,
    FOREIGN KEY (clientId) REFERENCES clients(id) ON DELETE CASCADE
);

-- ============================================================================
-- UMA Values Domain
-- ============================================================================

CREATE TABLE uma_values (
    id TEXT PRIMARY KEY NOT NULL,
    year INTEGER NOT NULL UNIQUE,
    dailyValue NUMERIC NOT NULL,
    effectiveDate DATETIME NOT NULL,
    endDate DATETIME,
    approvedBy TEXT,
    notes TEXT,
    active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0, 1)),
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- Organization Settings Domain
-- ============================================================================

CREATE TABLE organization_settings (
    id TEXT PRIMARY KEY NOT NULL,
    organizationId TEXT NOT NULL UNIQUE,
    obligatedSubjectKey TEXT NOT NULL,
    activityKey TEXT NOT NULL,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- Indexes
-- ============================================================================

-- Clients indexes
CREATE INDEX IF NOT EXISTS idx_clients_organizationId ON clients(organizationId);
CREATE INDEX IF NOT EXISTS idx_clients_rfc ON clients(rfc);
CREATE INDEX IF NOT EXISTS idx_clients_personType ON clients(personType);
CREATE INDEX IF NOT EXISTS idx_clients_deletedAt ON clients(deletedAt);
CREATE INDEX IF NOT EXISTS idx_clients_countryCode ON clients(countryCode);
CREATE INDEX IF NOT EXISTS idx_clients_economicActivityCode ON clients(economicActivityCode);

-- Client documents indexes
CREATE INDEX IF NOT EXISTS idx_client_documents_clientId ON client_documents(clientId);
CREATE INDEX IF NOT EXISTS idx_client_documents_documentType ON client_documents(documentType);
CREATE INDEX IF NOT EXISTS idx_client_documents_status ON client_documents(status);
CREATE INDEX IF NOT EXISTS idx_client_documents_expiryDate ON client_documents(expiryDate);

-- Client addresses indexes
CREATE INDEX IF NOT EXISTS idx_client_addresses_clientId ON client_addresses(clientId);
CREATE INDEX IF NOT EXISTS idx_client_addresses_addressType ON client_addresses(addressType);
CREATE INDEX IF NOT EXISTS idx_client_addresses_country ON client_addresses(country);

-- Catalogs indexes
CREATE INDEX IF NOT EXISTS idx_catalogs_active ON catalogs(active);

-- Catalog items indexes
CREATE INDEX IF NOT EXISTS idx_catalog_items_catalogId ON catalog_items(catalogId);
CREATE INDEX IF NOT EXISTS idx_catalog_items_normalizedName ON catalog_items(normalizedName);
CREATE INDEX IF NOT EXISTS idx_catalog_items_active ON catalog_items(active);

-- Transactions indexes
CREATE INDEX IF NOT EXISTS idx_transactions_organizationId ON transactions(organizationId);
CREATE INDEX IF NOT EXISTS idx_transactions_clientId ON transactions(clientId);
CREATE INDEX IF NOT EXISTS idx_transactions_operationDate ON transactions(operationDate);
CREATE INDEX IF NOT EXISTS idx_transactions_operationType ON transactions(operationType);
CREATE INDEX IF NOT EXISTS idx_transactions_vehicleType ON transactions(vehicleType);
CREATE INDEX IF NOT EXISTS idx_transactions_operationTypeCode ON transactions(operationTypeCode);
CREATE INDEX IF NOT EXISTS idx_transactions_currencyCode ON transactions(currencyCode);

-- Transaction payment methods indexes
CREATE INDEX IF NOT EXISTS idx_transaction_payment_methods_transactionId ON transaction_payment_methods(transactionId);

-- Alert rules indexes
CREATE INDEX IF NOT EXISTS idx_alert_rules_active ON alert_rules(active);
CREATE INDEX IF NOT EXISTS idx_alert_rules_severity ON alert_rules(severity);
CREATE INDEX IF NOT EXISTS idx_alert_rules_ruleType ON alert_rules(ruleType);
CREATE INDEX IF NOT EXISTS idx_alert_rules_activityCode ON alert_rules(activityCode);
CREATE INDEX IF NOT EXISTS idx_alert_rules_isManualOnly ON alert_rules(isManualOnly);

-- Alert rule config indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_alert_rule_config_alertRuleId_key ON alert_rule_config(alertRuleId, key);
CREATE INDEX IF NOT EXISTS idx_alert_rule_config_alertRuleId ON alert_rule_config(alertRuleId);
CREATE INDEX IF NOT EXISTS idx_alert_rule_config_key ON alert_rule_config(key);
CREATE INDEX IF NOT EXISTS idx_alert_rule_config_isHardcoded ON alert_rule_config(isHardcoded);

-- Alerts indexes
CREATE INDEX IF NOT EXISTS idx_alerts_organizationId ON alerts(organizationId);
CREATE INDEX IF NOT EXISTS idx_alerts_alertRuleId ON alerts(alertRuleId);
CREATE INDEX IF NOT EXISTS idx_alerts_clientId ON alerts(clientId);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity);
CREATE INDEX IF NOT EXISTS idx_alerts_createdAt ON alerts(createdAt);
CREATE UNIQUE INDEX IF NOT EXISTS idx_alerts_idempotencyKey ON alerts(idempotencyKey);
CREATE INDEX IF NOT EXISTS idx_alerts_submissionDeadline ON alerts(submissionDeadline);
CREATE INDEX IF NOT EXISTS idx_alerts_isOverdue ON alerts(isOverdue);
CREATE INDEX IF NOT EXISTS idx_alerts_submittedAt ON alerts(submittedAt);
CREATE INDEX IF NOT EXISTS idx_alerts_transactionId ON alerts(transactionId);
CREATE INDEX IF NOT EXISTS idx_alerts_isManual ON alerts(isManual);

-- UMA values indexes
CREATE INDEX IF NOT EXISTS idx_uma_values_year ON uma_values(year);
CREATE INDEX IF NOT EXISTS idx_uma_values_active ON uma_values(active);
CREATE INDEX IF NOT EXISTS idx_uma_values_effectiveDate ON uma_values(effectiveDate);

-- Organization settings indexes
CREATE INDEX IF NOT EXISTS idx_organization_settings_organizationId ON organization_settings(organizationId);
CREATE INDEX IF NOT EXISTS idx_organization_settings_obligatedSubjectKey ON organization_settings(obligatedSubjectKey);
CREATE INDEX IF NOT EXISTS idx_organization_settings_activityKey ON organization_settings(activityKey);

