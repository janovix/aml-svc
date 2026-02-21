-- Migration 0005: KYC Self-Service Module
-- Created: 2026-02-17
-- Purpose:
--   1. Add self-service configuration fields to organization_settings
--   2. Create kyc_sessions table for managing client self-service sessions
--   3. Create kyc_session_events table for audit trail (Art. 18-IV compliance)

-- ============================================
-- ORGANIZATION_SETTINGS: Add self-service fields
-- ============================================
ALTER TABLE organization_settings ADD COLUMN self_service_mode TEXT NOT NULL DEFAULT 'disabled';
ALTER TABLE organization_settings ADD COLUMN self_service_expiry_hours INTEGER NOT NULL DEFAULT 72;
ALTER TABLE organization_settings ADD COLUMN self_service_required_sections TEXT;

-- ============================================
-- KYC_SESSIONS: New table for KYC sessions
-- ============================================
CREATE TABLE IF NOT EXISTS kyc_sessions (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  expires_at TEXT NOT NULL,
  created_by TEXT NOT NULL,
  email_sent_at TEXT,
  started_at TEXT,
  submitted_at TEXT,
  reviewed_at TEXT,
  reviewed_by TEXT,
  rejection_reason TEXT,
  editable_sections TEXT,
  upload_link_id TEXT,
  identification_tier TEXT NOT NULL DEFAULT 'ALWAYS',
  threshold_amount_mxn REAL,
  client_cumulative_mxn REAL,
  completed_sections TEXT,
  last_activity_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_kyc_sessions_organization_id ON kyc_sessions(organization_id);
CREATE INDEX IF NOT EXISTS idx_kyc_sessions_client_id ON kyc_sessions(client_id);
CREATE INDEX IF NOT EXISTS idx_kyc_sessions_token ON kyc_sessions(token);
CREATE INDEX IF NOT EXISTS idx_kyc_sessions_status ON kyc_sessions(status);
CREATE INDEX IF NOT EXISTS idx_kyc_sessions_expires_at ON kyc_sessions(expires_at);

-- ============================================
-- KYC_SESSION_EVENTS: Audit trail table (Art. 18-IV)
-- ============================================
CREATE TABLE IF NOT EXISTS kyc_session_events (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  actor_ip TEXT,
  actor_type TEXT NOT NULL DEFAULT 'client',
  actor_id TEXT,
  payload TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (session_id) REFERENCES kyc_sessions(id)
);

CREATE INDEX IF NOT EXISTS idx_kyc_session_events_session_id ON kyc_session_events(session_id);
CREATE INDEX IF NOT EXISTS idx_kyc_session_events_event_type ON kyc_session_events(event_type);
CREATE INDEX IF NOT EXISTS idx_kyc_session_events_created_at ON kyc_session_events(created_at);
