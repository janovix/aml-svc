-- Add environment column to all org-scoped tables for per-environment data isolation.
-- Existing data defaults to 'production'. Child tables (documents, addresses,
-- shareholders, operation extensions, etc.) inherit isolation through their parent FK.

-- Core entities
ALTER TABLE clients ADD COLUMN environment TEXT NOT NULL DEFAULT 'production';
CREATE INDEX idx_clients_org_env ON clients(organization_id, environment);

ALTER TABLE invoices ADD COLUMN environment TEXT NOT NULL DEFAULT 'production';
CREATE INDEX idx_invoices_org_env ON invoices(organization_id, environment);

ALTER TABLE operations ADD COLUMN environment TEXT NOT NULL DEFAULT 'production';
CREATE INDEX idx_operations_org_env ON operations(organization_id, environment);

ALTER TABLE upload_links ADD COLUMN environment TEXT NOT NULL DEFAULT 'production';
CREATE INDEX idx_upload_links_org_env ON upload_links(organization_id, environment);

-- Alert system
ALTER TABLE alerts ADD COLUMN environment TEXT NOT NULL DEFAULT 'production';
CREATE INDEX idx_alerts_org_env ON alerts(organization_id, environment);

-- Notices
ALTER TABLE notices ADD COLUMN environment TEXT NOT NULL DEFAULT 'production';
CREATE INDEX idx_notices_org_env ON notices(organization_id, environment);

ALTER TABLE notice_events ADD COLUMN environment TEXT NOT NULL DEFAULT 'production';
CREATE INDEX idx_notice_events_org_env ON notice_events(organization_id, environment);

-- Reports
ALTER TABLE reports ADD COLUMN environment TEXT NOT NULL DEFAULT 'production';
CREATE INDEX idx_reports_org_env ON reports(organization_id, environment);

-- Imports
ALTER TABLE imports ADD COLUMN environment TEXT NOT NULL DEFAULT 'production';
CREATE INDEX idx_imports_org_env ON imports(organization_id, environment);

-- Organization settings
ALTER TABLE organization_settings ADD COLUMN environment TEXT NOT NULL DEFAULT 'production';
CREATE INDEX idx_org_settings_org_env ON organization_settings(organization_id, environment);

-- KYC sessions
ALTER TABLE kyc_sessions ADD COLUMN environment TEXT NOT NULL DEFAULT 'production';
CREATE INDEX idx_kyc_sessions_org_env ON kyc_sessions(organization_id, environment);

-- Risk assessments
ALTER TABLE org_risk_assessments ADD COLUMN environment TEXT NOT NULL DEFAULT 'production';
CREATE INDEX idx_org_risk_org_env ON org_risk_assessments(organization_id, environment);

ALTER TABLE client_risk_assessments ADD COLUMN environment TEXT NOT NULL DEFAULT 'production';
CREATE INDEX idx_client_risk_org_env ON client_risk_assessments(organization_id, environment);

-- Risk methodologies (organizationId can be null for global scope)
ALTER TABLE risk_methodologies ADD COLUMN environment TEXT NOT NULL DEFAULT 'production';
