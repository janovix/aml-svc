-- ============================================================================
-- Migration: 0005_add_audit_logs
-- Description: Add audit_logs table for tamper-evident cryptographic audit trail
-- 
-- This implements an industry-standard hash-chained audit log where:
-- - Each entry contains a SHA-256 hash of its content (dataHash)
-- - Each entry references the signature of the previous entry (previousSignature)
-- - Each entry is signed with HMAC-SHA256 (signature)
-- - The chain can be verified to detect any tampering
-- ============================================================================

-- ============================================================================
-- Create audit_logs table for cryptographic audit trail
-- ============================================================================

CREATE TABLE audit_logs (
    id TEXT PRIMARY KEY NOT NULL,
    organizationId TEXT NOT NULL,
    
    -- What changed
    entityType TEXT NOT NULL,           -- CLIENT, TRANSACTION, ALERT, etc.
    entityId TEXT NOT NULL,             -- ID of the affected entity
    action TEXT NOT NULL CHECK(action IN ('CREATE', 'UPDATE', 'DELETE', 'READ', 'EXPORT', 'VERIFY', 'LOGIN', 'LOGOUT', 'SUBMIT', 'GENERATE')),
    
    -- Who/when
    actorId TEXT,                       -- User ID who made the change (null for system actions)
    actorType TEXT NOT NULL CHECK(actorType IN ('USER', 'SYSTEM', 'API', 'SERVICE_BINDING')),
    timestamp DATETIME NOT NULL,        -- ISO timestamp of action
    
    -- Change data (immutable snapshot)
    oldData TEXT,                       -- JSON: previous state (null for CREATE/READ)
    newData TEXT,                       -- JSON: new state (null for DELETE/READ)
    
    -- Cryptographic integrity chain
    sequenceNumber INTEGER NOT NULL,    -- Monotonic per organization
    dataHash TEXT NOT NULL,             -- SHA-256 hash of content
    previousSignature TEXT,             -- Signature of previous entry (null for first entry in org)
    signature TEXT NOT NULL,            -- HMAC-SHA256(dataHash + previousSignature, SECRET_KEY)
    
    -- Context metadata
    ipAddress TEXT,                     -- Client IP address
    userAgent TEXT,                     -- Client user agent
    metadata TEXT,                      -- Additional JSON context (e.g., reason, notes)
    
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- Indexes for audit_logs table
-- ============================================================================

-- Primary query patterns
CREATE INDEX IF NOT EXISTS idx_audit_logs_organizationId ON audit_logs(organizationId);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entityType ON audit_logs(entityType);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entityId ON audit_logs(entityId);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actorId ON audit_logs(actorId);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actorType ON audit_logs(actorType);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_org_entity ON audit_logs(organizationId, entityType, entityId);
CREATE INDEX IF NOT EXISTS idx_audit_logs_org_timestamp ON audit_logs(organizationId, timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_org_sequence ON audit_logs(organizationId, sequenceNumber);

-- Chain verification - need to quickly find by sequence number
CREATE UNIQUE INDEX IF NOT EXISTS idx_audit_logs_org_sequence_unique ON audit_logs(organizationId, sequenceNumber);

-- ============================================================================
-- End of migration
-- ============================================================================
