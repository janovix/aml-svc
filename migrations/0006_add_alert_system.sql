-- Migration: Add Alert Detection System
-- Description: Add alert_rules and alerts tables for dynamic alert detection

-- Create alert_rules table
CREATE TABLE IF NOT EXISTS alert_rules (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0, 1)),
    severity TEXT NOT NULL DEFAULT 'MEDIUM' CHECK(severity IN ('LOW','MEDIUM','HIGH','CRITICAL')),
    ruleConfig TEXT NOT NULL, -- JSON string containing dynamic rule configuration
    metadata TEXT, -- Additional metadata as JSON
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for alert_rules
CREATE INDEX IF NOT EXISTS idx_alert_rules_active ON alert_rules(active);
CREATE INDEX IF NOT EXISTS idx_alert_rules_severity ON alert_rules(severity);

-- Create alerts table
CREATE TABLE IF NOT EXISTS alerts (
    id TEXT PRIMARY KEY NOT NULL,
    alertRuleId TEXT NOT NULL,
    clientId TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','REVIEWED','RESOLVED','DISMISSED')),
    severity TEXT NOT NULL CHECK(severity IN ('LOW','MEDIUM','HIGH','CRITICAL')),
    idempotencyKey TEXT NOT NULL UNIQUE, -- Ensures no duplicate alerts
    contextHash TEXT NOT NULL, -- Hash of the specific data that triggered this alert
    alertData TEXT NOT NULL, -- JSON string with alert-specific data
    triggerTransactionId TEXT, -- Optional reference to the transaction that triggered the alert
    notes TEXT,
    reviewedAt DATETIME,
    reviewedBy TEXT,
    resolvedAt DATETIME,
    resolvedBy TEXT,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (alertRuleId) REFERENCES alert_rules(id) ON DELETE RESTRICT,
    FOREIGN KEY (clientId) REFERENCES clients(rfc) ON DELETE CASCADE
);

-- Create indexes for alerts
CREATE INDEX IF NOT EXISTS idx_alerts_alertRuleId ON alerts(alertRuleId);
CREATE INDEX IF NOT EXISTS idx_alerts_clientId ON alerts(clientId);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity);
CREATE INDEX IF NOT EXISTS idx_alerts_createdAt ON alerts(createdAt);
CREATE INDEX IF NOT EXISTS idx_alerts_idempotencyKey ON alerts(idempotencyKey);
