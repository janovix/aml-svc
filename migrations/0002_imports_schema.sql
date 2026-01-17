-- Migration: Imports Schema
-- Description: Bulk data import functionality for clients and transactions
-- All column names use snake_case for consistency across all services

-- ============================================================================
-- Imports Domain (Bulk Data Import)
-- ============================================================================

CREATE TABLE IF NOT EXISTS imports (
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

CREATE TABLE IF NOT EXISTS import_row_results (
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

-- Imports indexes
CREATE INDEX IF NOT EXISTS idx_imports_organization_id ON imports(organization_id);
CREATE INDEX IF NOT EXISTS idx_imports_status ON imports(status);
CREATE INDEX IF NOT EXISTS idx_imports_entity_type ON imports(entity_type);
CREATE INDEX IF NOT EXISTS idx_imports_created_at ON imports(created_at);
CREATE INDEX IF NOT EXISTS idx_imports_created_by ON imports(created_by);

-- Import row results indexes
CREATE INDEX IF NOT EXISTS idx_import_row_results_import_id ON import_row_results(import_id);
CREATE INDEX IF NOT EXISTS idx_import_row_results_status ON import_row_results(status);
CREATE INDEX IF NOT EXISTS idx_import_row_results_row_number ON import_row_results(row_number);
