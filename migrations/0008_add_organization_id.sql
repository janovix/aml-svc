-- Migration: Add organizationId for multi-tenant architecture
-- This adds organizationId to all tenant-scoped tables for data isolation

-- Add organizationId to clients table
ALTER TABLE clients ADD COLUMN organizationId TEXT NOT NULL DEFAULT '';
CREATE INDEX IF NOT EXISTS idx_clients_organizationId ON clients(organizationId);

-- Add organizationId to transactions table
ALTER TABLE transactions ADD COLUMN organizationId TEXT NOT NULL DEFAULT '';
CREATE INDEX IF NOT EXISTS idx_transactions_organizationId ON transactions(organizationId);

-- Add organizationId to alert_rules table
ALTER TABLE alert_rules ADD COLUMN organizationId TEXT NOT NULL DEFAULT '';
CREATE INDEX IF NOT EXISTS idx_alert_rules_organizationId ON alert_rules(organizationId);

-- Add organizationId to alerts table
ALTER TABLE alerts ADD COLUMN organizationId TEXT NOT NULL DEFAULT '';
CREATE INDEX IF NOT EXISTS idx_alerts_organizationId ON alerts(organizationId);

-- Rename compliance_organizations to organization_settings and change key from userId to organizationId
-- Drop the old table and create new one (SQLite doesn't support renaming columns easily)

-- Create new organization_settings table
CREATE TABLE IF NOT EXISTS organization_settings (
    id TEXT PRIMARY KEY NOT NULL,
    organizationId TEXT NOT NULL UNIQUE,
    obligatedSubjectKey TEXT NOT NULL,
    activityKey TEXT NOT NULL,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_organization_settings_organizationId ON organization_settings(organizationId);
CREATE INDEX IF NOT EXISTS idx_organization_settings_obligatedSubjectKey ON organization_settings(obligatedSubjectKey);
CREATE INDEX IF NOT EXISTS idx_organization_settings_activityKey ON organization_settings(activityKey);

-- Drop old compliance_organizations table (fresh start approach)
DROP TABLE IF EXISTS compliance_organizations;

