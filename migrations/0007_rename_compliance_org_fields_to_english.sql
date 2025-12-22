-- Migration: Rename compliance_organizations columns from Spanish to English
-- Description: Rename claveSujetoObligado -> obligatedSubjectKey and claveActividad -> activityKey
-- This aligns the database schema with English field names used in the codebase

-- SQLite doesn't support ALTER TABLE RENAME COLUMN directly, so we need to:
-- 1. Create a new table with the new column names
-- 2. Copy data from old table to new table
-- 3. Drop old table
-- 4. Rename new table to original name

-- Step 1: Create new table with English column names
CREATE TABLE IF NOT EXISTS compliance_organizations_new (
    id TEXT PRIMARY KEY NOT NULL,
    userId TEXT NOT NULL UNIQUE,
    obligatedSubjectKey TEXT NOT NULL, -- Renamed from claveSujetoObligado
    activityKey TEXT NOT NULL, -- Renamed from claveActividad
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Step 2: Copy data from old table to new table
INSERT INTO compliance_organizations_new (id, userId, obligatedSubjectKey, activityKey, createdAt, updatedAt)
SELECT id, userId, claveSujetoObligado, claveActividad, createdAt, updatedAt
FROM compliance_organizations;

-- Step 3: Drop old table
DROP TABLE IF EXISTS compliance_organizations;

-- Step 4: Rename new table to original name
ALTER TABLE compliance_organizations_new RENAME TO compliance_organizations;

-- Step 5: Recreate indexes with new column names
CREATE INDEX IF NOT EXISTS idx_compliance_organizations_userId ON compliance_organizations(userId);
CREATE INDEX IF NOT EXISTS idx_compliance_organizations_obligatedSubjectKey ON compliance_organizations(obligatedSubjectKey);
CREATE INDEX IF NOT EXISTS idx_compliance_organizations_activityKey ON compliance_organizations(activityKey);
