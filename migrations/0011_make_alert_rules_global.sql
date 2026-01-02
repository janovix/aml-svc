-- Migration: Make alert_rules global and add alert_rule_config table
-- Description: Remove organizationId from alert_rules (rules are global/legal requirements),
--              remove ruleConfig (seekers are hardcoded), add ruleType, isManualOnly, activityCode,
--              create alert_rule_config table for configurable values,
--              update alerts table (rename fields, add isManual)

-- ============================================================================
-- Step 1: Recreate alert_rules table without organizationId and ruleConfig
-- ============================================================================

-- Create new alert_rules table with updated structure
-- Note: Using alert codes as primary keys (100, 2501-2521, 9999)
CREATE TABLE alert_rules_new (
    id TEXT PRIMARY KEY NOT NULL, -- Alert code (e.g., "2501", "2502", "9999")
    name TEXT NOT NULL,
    description TEXT,
    active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0, 1)),
    severity TEXT NOT NULL DEFAULT 'MEDIUM' CHECK(severity IN ('LOW','MEDIUM','HIGH','CRITICAL')),
    ruleType TEXT, -- Matches seeker's ruleType (null for manual-only rules)
    isManualOnly INTEGER NOT NULL DEFAULT 0 CHECK(isManualOnly IN (0, 1)), -- True if only manual triggers
    activityCode TEXT NOT NULL DEFAULT 'VEH', -- VEH, JYS, INM, JOY, ART
    metadata TEXT, -- Additional metadata as JSON (legal basis, category, etc.)
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Migrate existing data (extract ruleType from ruleConfig JSON if possible)
-- Note: Existing rules will be replaced by seed script with proper codes
INSERT INTO alert_rules_new (id, name, description, active, severity, ruleType, isManualOnly, activityCode, metadata, createdAt, updatedAt)
SELECT 
    id,
    name,
    description,
    active,
    severity,
    json_extract(ruleConfig, '$.type') as ruleType, -- Extract type from old ruleConfig
    0 as isManualOnly, -- Existing rules are not manual-only
    'VEH' as activityCode, -- Default to VEH for existing rules
    metadata,
    createdAt,
    updatedAt
FROM alert_rules;

-- Drop old table and rename new one
DROP TABLE alert_rules;
ALTER TABLE alert_rules_new RENAME TO alert_rules;

-- Recreate indexes (without organizationId index)
CREATE INDEX IF NOT EXISTS idx_alert_rules_active ON alert_rules(active);
CREATE INDEX IF NOT EXISTS idx_alert_rules_severity ON alert_rules(severity);
CREATE INDEX IF NOT EXISTS idx_alert_rules_ruleType ON alert_rules(ruleType);
CREATE INDEX IF NOT EXISTS idx_alert_rules_activityCode ON alert_rules(activityCode);
CREATE INDEX IF NOT EXISTS idx_alert_rules_isManualOnly ON alert_rules(isManualOnly);

-- ============================================================================
-- Step 2: Create alert_rule_config table for configurable values
-- ============================================================================

CREATE TABLE IF NOT EXISTS alert_rule_config (
    id TEXT PRIMARY KEY NOT NULL,
    alertRuleId TEXT NOT NULL,
    key TEXT NOT NULL, -- Config key (e.g., "uma_threshold", "max_cash_amount")
    value TEXT NOT NULL, -- JSON string value
    isHardcoded INTEGER NOT NULL DEFAULT 0 CHECK(isHardcoded IN (0, 1)), -- True if should not be updated via API
    description TEXT,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (alertRuleId) REFERENCES alert_rules(id) ON DELETE CASCADE
);

-- Create unique constraint on alertRuleId + key combination
CREATE UNIQUE INDEX IF NOT EXISTS idx_alert_rule_config_alertRuleId_key ON alert_rule_config(alertRuleId, key);
CREATE INDEX IF NOT EXISTS idx_alert_rule_config_alertRuleId ON alert_rule_config(alertRuleId);
CREATE INDEX IF NOT EXISTS idx_alert_rule_config_key ON alert_rule_config(key);
CREATE INDEX IF NOT EXISTS idx_alert_rule_config_isHardcoded ON alert_rule_config(isHardcoded);

-- ============================================================================
-- Step 3: Update alerts table (rename fields, add isManual)
-- ============================================================================

-- Create new alerts table with updated structure
CREATE TABLE alerts_new (
    id TEXT PRIMARY KEY NOT NULL,
    organizationId TEXT NOT NULL, -- Alerts remain organization-specific
    alertRuleId TEXT NOT NULL,
    clientId TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'DETECTED' CHECK(status IN ('DETECTED','FILE_GENERATED','SUBMITTED','OVERDUE','CANCELLED')),
    severity TEXT NOT NULL CHECK(severity IN ('LOW','MEDIUM','HIGH','CRITICAL')),
    idempotencyKey TEXT NOT NULL UNIQUE, -- Ensures no duplicate alerts
    contextHash TEXT NOT NULL, -- Hash of the specific data that triggered this alert
    metadata TEXT NOT NULL, -- Renamed from alertData: JSON string with alert-specific data
    transactionId TEXT, -- Renamed from triggerTransactionId: Optional reference to the transaction
    isManual INTEGER NOT NULL DEFAULT 0 CHECK(isManual IN (0, 1)), -- True if manually created
    
    -- SAT Submission tracking
    submissionDeadline DATETIME,
    fileGeneratedAt DATETIME,
    satFileUrl TEXT,
    submittedAt DATETIME,
    satAcknowledgmentReceipt TEXT,
    satFolioNumber TEXT,
    isOverdue INTEGER NOT NULL DEFAULT 0 CHECK(isOverdue IN (0, 1)),
    
    -- Review and cancellation
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

-- Migrate existing data
INSERT INTO alerts_new (
    id, organizationId, alertRuleId, clientId, status, severity, idempotencyKey, contextHash,
    metadata, transactionId, isManual,
    submissionDeadline, fileGeneratedAt, satFileUrl, submittedAt, satAcknowledgmentReceipt,
    satFolioNumber, isOverdue, notes, reviewedAt, reviewedBy, cancelledAt, cancelledBy,
    cancellationReason, createdAt, updatedAt
)
SELECT 
    id, organizationId, alertRuleId, clientId, status, severity, idempotencyKey, contextHash,
    alertData as metadata, -- Rename alertData to metadata
    triggerTransactionId as transactionId, -- Rename triggerTransactionId to transactionId
    0 as isManual, -- Existing alerts are not manual
    submissionDeadline, fileGeneratedAt, satFileUrl, submittedAt, satAcknowledgmentReceipt,
    satFolioNumber, isOverdue, notes, reviewedAt, reviewedBy, cancelledAt, cancelledBy,
    cancellationReason, createdAt, updatedAt
FROM alerts;

-- Drop old table and rename new one
DROP TABLE alerts;
ALTER TABLE alerts_new RENAME TO alerts;

-- Recreate indexes
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

-- ============================================================================
-- Step 4: Clear existing alert_rules data (will be repopulated by seed script)
-- ============================================================================
-- Note: The seed script will insert the proper VEH alert rules with codes 100, 2501-2521, 9999
-- We delete existing rules since they have old UUIDs as IDs instead of codes
DELETE FROM alert_rules;

