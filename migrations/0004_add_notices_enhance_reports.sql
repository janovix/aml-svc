-- ============================================================================
-- Migration: 0004_add_notices_enhance_reports
-- Description: Add Notice entity for SAT compliance and enhance Report for analytics
-- ============================================================================

-- ============================================================================
-- Create notices table for SAT regulatory submissions
-- ============================================================================

CREATE TABLE notices (
    id TEXT PRIMARY KEY NOT NULL,
    organizationId TEXT NOT NULL,
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','GENERATED','SUBMITTED','ACKNOWLEDGED')),
    periodStart DATETIME NOT NULL,
    periodEnd DATETIME NOT NULL,
    reportedMonth TEXT NOT NULL,
    recordCount INTEGER NOT NULL DEFAULT 0,
    xmlFileUrl TEXT,
    fileSize INTEGER,
    generatedAt DATETIME,
    submittedAt DATETIME,
    satFolioNumber TEXT,
    createdBy TEXT,
    notes TEXT,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Notices indexes
CREATE INDEX IF NOT EXISTS idx_notices_organizationId ON notices(organizationId);
CREATE INDEX IF NOT EXISTS idx_notices_status ON notices(status);
CREATE INDEX IF NOT EXISTS idx_notices_periodStart ON notices(periodStart);
CREATE INDEX IF NOT EXISTS idx_notices_periodEnd ON notices(periodEnd);
CREATE INDEX IF NOT EXISTS idx_notices_reportedMonth ON notices(reportedMonth);

-- ============================================================================
-- Add noticeId to alerts table
-- ============================================================================

ALTER TABLE alerts ADD COLUMN noticeId TEXT REFERENCES notices(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_alerts_noticeId ON alerts(noticeId);

-- ============================================================================
-- Enhance reports table for analytics
-- SQLite doesn't support DROP COLUMN easily, so we add new columns
-- Old columns (type, xmlFileUrl, submittedAt, satFolioNumber, reportedMonth, pdfFileSize)
-- will be ignored by the new code
-- ============================================================================

-- Add new columns for enhanced reporting
ALTER TABLE reports ADD COLUMN template TEXT NOT NULL DEFAULT 'CUSTOM' CHECK(template IN ('EXECUTIVE_SUMMARY','COMPLIANCE_STATUS','TRANSACTION_ANALYSIS','CLIENT_RISK_PROFILE','ALERT_BREAKDOWN','PERIOD_COMPARISON','CUSTOM'));
ALTER TABLE reports ADD COLUMN periodType TEXT NOT NULL DEFAULT 'CUSTOM' CHECK(periodType IN ('MONTHLY','QUARTERLY','ANNUAL','CUSTOM'));
ALTER TABLE reports ADD COLUMN comparisonPeriodStart DATETIME;
ALTER TABLE reports ADD COLUMN comparisonPeriodEnd DATETIME;
ALTER TABLE reports ADD COLUMN dataSources TEXT NOT NULL DEFAULT '["ALERTS"]';
ALTER TABLE reports ADD COLUMN filters TEXT NOT NULL DEFAULT '{}';
ALTER TABLE reports ADD COLUMN clientId TEXT REFERENCES clients(id) ON DELETE SET NULL;
ALTER TABLE reports ADD COLUMN charts TEXT NOT NULL DEFAULT '[]';
ALTER TABLE reports ADD COLUMN includeSummaryCards INTEGER NOT NULL DEFAULT 1;
ALTER TABLE reports ADD COLUMN includeDetailTables INTEGER NOT NULL DEFAULT 1;

-- Reports indexes for new columns
CREATE INDEX IF NOT EXISTS idx_reports_template ON reports(template);
CREATE INDEX IF NOT EXISTS idx_reports_periodType ON reports(periodType);
CREATE INDEX IF NOT EXISTS idx_reports_clientId ON reports(clientId);

-- ============================================================================
-- Migrate existing MONTHLY reports with SAT data to notices
-- ============================================================================

INSERT INTO notices (
    id,
    organizationId,
    name,
    status,
    periodStart,
    periodEnd,
    reportedMonth,
    recordCount,
    xmlFileUrl,
    fileSize,
    generatedAt,
    submittedAt,
    satFolioNumber,
    createdBy,
    notes,
    createdAt,
    updatedAt
)
SELECT 
    id,
    organizationId,
    name,
    CASE 
        WHEN status = 'ACKNOWLEDGED' THEN 'ACKNOWLEDGED'
        WHEN status = 'SUBMITTED' THEN 'SUBMITTED'
        WHEN status = 'GENERATED' THEN 'GENERATED'
        ELSE 'DRAFT'
    END as status,
    periodStart,
    periodEnd,
    reportedMonth,
    recordCount,
    xmlFileUrl,
    fileSize,
    generatedAt,
    submittedAt,
    satFolioNumber,
    createdBy,
    notes,
    createdAt,
    updatedAt
FROM reports
WHERE type = 'MONTHLY' 
  AND (submittedAt IS NOT NULL OR satFolioNumber IS NOT NULL OR status IN ('SUBMITTED', 'ACKNOWLEDGED'));

-- Update alerts to point to notices instead of reports for migrated SAT data
UPDATE alerts 
SET noticeId = reportId, reportId = NULL
WHERE reportId IN (
    SELECT id FROM reports 
    WHERE type = 'MONTHLY' 
      AND (submittedAt IS NOT NULL OR satFolioNumber IS NOT NULL OR status IN ('SUBMITTED', 'ACKNOWLEDGED'))
);

-- Delete migrated MONTHLY reports (they are now in notices)
DELETE FROM reports 
WHERE type = 'MONTHLY' 
  AND (submittedAt IS NOT NULL OR satFolioNumber IS NOT NULL OR status IN ('SUBMITTED', 'ACKNOWLEDGED'));

-- Update remaining MONTHLY reports to use CUSTOM template (they are now analytics reports)
UPDATE reports SET template = 'CUSTOM', periodType = 'MONTHLY' WHERE type = 'MONTHLY';

-- ============================================================================
-- Recreate reports table to make old columns optional (SQLite limitation)
-- ============================================================================

-- Create new reports table without NOT NULL on legacy columns
CREATE TABLE reports_new (
    id TEXT PRIMARY KEY NOT NULL,
    organizationId TEXT NOT NULL,
    name TEXT NOT NULL,
    -- Legacy columns (now optional)
    type TEXT DEFAULT 'MONTHLY' CHECK(type IN ('MONTHLY','QUARTERLY','ANNUAL','CUSTOM')),
    reportedMonth TEXT, -- Made optional
    xmlFileUrl TEXT,
    pdfFileSize INTEGER,
    submittedAt DATETIME,
    satFolioNumber TEXT,
    -- New enhanced columns
    template TEXT NOT NULL DEFAULT 'CUSTOM' CHECK(template IN ('EXECUTIVE_SUMMARY','COMPLIANCE_STATUS','TRANSACTION_ANALYSIS','CLIENT_RISK_PROFILE','ALERT_BREAKDOWN','PERIOD_COMPARISON','CUSTOM')),
    periodType TEXT NOT NULL DEFAULT 'CUSTOM' CHECK(periodType IN ('MONTHLY','QUARTERLY','ANNUAL','CUSTOM')),
    periodStart DATETIME NOT NULL,
    periodEnd DATETIME NOT NULL,
    comparisonPeriodStart DATETIME,
    comparisonPeriodEnd DATETIME,
    dataSources TEXT NOT NULL DEFAULT '["ALERTS"]',
    filters TEXT NOT NULL DEFAULT '{}',
    clientId TEXT REFERENCES clients(id) ON DELETE SET NULL,
    charts TEXT NOT NULL DEFAULT '[]',
    includeSummaryCards INTEGER NOT NULL DEFAULT 1,
    includeDetailTables INTEGER NOT NULL DEFAULT 1,
    -- Report state
    status TEXT NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','GENERATED')),
    recordCount INTEGER NOT NULL DEFAULT 0,
    pdfFileUrl TEXT,
    fileSize INTEGER,
    generatedAt DATETIME,
    createdBy TEXT,
    notes TEXT,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Copy data from old table to new table
INSERT INTO reports_new (
    id, organizationId, name, type, reportedMonth, xmlFileUrl, pdfFileSize, submittedAt, satFolioNumber,
    template, periodType, periodStart, periodEnd, comparisonPeriodStart, comparisonPeriodEnd,
    dataSources, filters, clientId, charts, includeSummaryCards, includeDetailTables,
    status, recordCount, pdfFileUrl, fileSize, generatedAt, createdBy, notes, createdAt, updatedAt
)
SELECT 
    id, organizationId, name, type, reportedMonth, xmlFileUrl, pdfFileSize, submittedAt, satFolioNumber,
    template, periodType, periodStart, periodEnd, comparisonPeriodStart, comparisonPeriodEnd,
    dataSources, filters, clientId, charts, includeSummaryCards, includeDetailTables,
    CASE WHEN status IN ('DRAFT', 'GENERATED') THEN status ELSE 'DRAFT' END,
    recordCount, pdfFileUrl, fileSize, generatedAt, createdBy, notes, createdAt, updatedAt
FROM reports;

-- Drop old table and rename new table
DROP TABLE reports;
ALTER TABLE reports_new RENAME TO reports;

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_reports_organizationId ON reports(organizationId);
CREATE INDEX IF NOT EXISTS idx_reports_template ON reports(template);
CREATE INDEX IF NOT EXISTS idx_reports_periodType ON reports(periodType);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_periodStart ON reports(periodStart);
CREATE INDEX IF NOT EXISTS idx_reports_periodEnd ON reports(periodEnd);
CREATE INDEX IF NOT EXISTS idx_reports_clientId ON reports(clientId);

-- ============================================================================
-- End of migration
-- ============================================================================

