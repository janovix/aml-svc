-- Migration 0008: Notice Module Overhaul
-- - Add amendment_cycle to notices
-- - Remove vestigial columns: sat_folio_number, submit_pdf_document_id, ack_pdf_document_id
-- - Create notice_events table for full lifecycle audit trail

-- Add amendment_cycle column
ALTER TABLE notices ADD COLUMN amendment_cycle INTEGER NOT NULL DEFAULT 0;

-- Remove deprecated columns (D1/SQLite 3.35+ supports DROP COLUMN)
ALTER TABLE notices DROP COLUMN sat_folio_number;
ALTER TABLE notices DROP COLUMN submit_pdf_document_id;
ALTER TABLE notices DROP COLUMN ack_pdf_document_id;

-- Create notice_events table
CREATE TABLE IF NOT EXISTS notice_events (
  id TEXT PRIMARY KEY,
  notice_id TEXT NOT NULL,
  organization_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT NOT NULL,
  cycle INTEGER NOT NULL DEFAULT 0,
  pdf_document_id TEXT,
  xml_file_url TEXT,
  file_size INTEGER,
  notes TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (notice_id) REFERENCES notices(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_notice_events_notice_id ON notice_events(notice_id);
CREATE INDEX IF NOT EXISTS idx_notice_events_organization_id ON notice_events(organization_id);
CREATE INDEX IF NOT EXISTS idx_notice_events_event_type ON notice_events(event_type);
