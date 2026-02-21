-- Migration 0007: Add KYC progress persistence to clients table
-- Created: 2026-02-20
-- Purpose:
--   Persist KYC progress data (documents, shareholders, beneficial controllers, overall percentage)
--   directly on the clients table so client list views don't require additional API calls.
--   Add threshold-aware KYC columns (Art. 17 LFPIORPI) computed from org settings and UMA.

-- ============================================
-- CLIENTS TABLE: Add KYC progress columns
-- ============================================

-- Overall KYC completion percentage (0-100)
ALTER TABLE clients ADD COLUMN kyc_completion_pct INTEGER NOT NULL DEFAULT 0 CHECK(kyc_completion_pct >= 0 AND kyc_completion_pct <= 100);

-- Document tracking
ALTER TABLE clients ADD COLUMN documents_complete INTEGER NOT NULL DEFAULT 0 CHECK(documents_complete IN (0, 1));
ALTER TABLE clients ADD COLUMN documents_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE clients ADD COLUMN documents_required INTEGER NOT NULL DEFAULT 0;

-- Entity tracking
ALTER TABLE clients ADD COLUMN shareholders_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE clients ADD COLUMN beneficial_controllers_count INTEGER NOT NULL DEFAULT 0;

-- Threshold-aware KYC (Art. 17 LFPIORPI)
ALTER TABLE clients ADD COLUMN identification_required INTEGER NOT NULL DEFAULT 1 CHECK(identification_required IN (0, 1));
ALTER TABLE clients ADD COLUMN identification_tier TEXT NOT NULL DEFAULT 'ALWAYS' CHECK(identification_tier IN ('ALWAYS','ABOVE_THRESHOLD','BELOW_THRESHOLD'));
ALTER TABLE clients ADD COLUMN identification_threshold_mxn REAL;
ALTER TABLE clients ADD COLUMN notice_threshold_mxn REAL;

-- ============================================
-- Add indexes for new columns
-- ============================================
CREATE INDEX idx_clients_kyc_completion_pct ON clients(kyc_completion_pct);
CREATE INDEX idx_clients_identification_tier ON clients(identification_tier);
