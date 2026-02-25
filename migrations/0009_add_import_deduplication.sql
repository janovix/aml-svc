-- Migration: Add import deduplication support
-- Adds import_hash to operations for content-based duplicate detection during imports
-- Adds skipped_count to imports for tracking duplicates separately from errors

ALTER TABLE operations ADD COLUMN import_hash TEXT;

CREATE INDEX idx_operations_import_hash ON operations(organization_id, import_hash);

ALTER TABLE imports ADD COLUMN skipped_count INTEGER NOT NULL DEFAULT 0;
