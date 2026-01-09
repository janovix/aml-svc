-- ============================================================================
-- Migration: 0002_add_reports
-- Description: Add Report model for monthly SAT reports (XML) and internal reports (PDF)
-- ============================================================================

-- ============================================================================
-- Reports Domain
-- ============================================================================

CREATE TABLE reports (
    id TEXT PRIMARY KEY NOT NULL,
    organizationId TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'MONTHLY' CHECK(type IN ('MONTHLY','QUARTERLY','ANNUAL','CUSTOM')),
    status TEXT NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','GENERATED','SUBMITTED','ACKNOWLEDGED')),
    periodStart DATETIME NOT NULL,
    periodEnd DATETIME NOT NULL,
    reportedMonth TEXT NOT NULL,
    recordCount INTEGER NOT NULL DEFAULT 0,
    xmlFileUrl TEXT,
    pdfFileUrl TEXT,
    fileSize INTEGER,
    pdfFileSize INTEGER,
    generatedAt DATETIME,
    submittedAt DATETIME,
    satFolioNumber TEXT,
    createdBy TEXT,
    notes TEXT,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- Add reportId to alerts table
-- ============================================================================

ALTER TABLE alerts ADD COLUMN reportId TEXT REFERENCES reports(id) ON DELETE SET NULL;

-- ============================================================================
-- Reports Indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_reports_organizationId ON reports(organizationId);
CREATE INDEX IF NOT EXISTS idx_reports_type ON reports(type);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_periodStart ON reports(periodStart);
CREATE INDEX IF NOT EXISTS idx_reports_periodEnd ON reports(periodEnd);
CREATE INDEX IF NOT EXISTS idx_reports_reportedMonth ON reports(reportedMonth);

-- Alert reportId index
CREATE INDEX IF NOT EXISTS idx_alerts_reportId ON alerts(reportId);

