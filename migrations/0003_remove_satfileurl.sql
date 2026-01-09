-- Migration: Remove satFileUrl from alerts table
-- XML is now generated at report level only, not per-alert

-- Drop the satFileUrl column from alerts table
ALTER TABLE alerts DROP COLUMN satFileUrl;

