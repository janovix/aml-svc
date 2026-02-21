-- Migration: Add activity_code to imports and catalog name resolution columns
-- Date: 2026-02-09
-- Description: 
--   1. Adds activity_code column to support activity-specific operation imports
--   2. Adds brand_name and resolved_names columns for catalog name embedding

-- ============================================================================
-- Part 1: Add activity_code column to imports table
-- ============================================================================

-- Add activity_code column to imports table
ALTER TABLE imports ADD COLUMN activity_code TEXT;

-- Add comment explaining the column
-- activity_code: Stores the vulnerable activity code (VEH, INM, MJR, etc.) for OPERATION imports
-- This is NULL for CLIENT imports and required for OPERATION imports

-- ============================================================================
-- Part 2: Add catalog name resolution columns
-- ============================================================================

-- Add resolved_names column to clients table
ALTER TABLE clients ADD COLUMN resolved_names TEXT;

-- Add brand_name and resolved_names columns to operation_vehicles
ALTER TABLE operation_vehicles ADD COLUMN brand_name TEXT;
ALTER TABLE operation_vehicles ADD COLUMN resolved_names TEXT;

-- Add resolved_names column to all other extension tables
ALTER TABLE operation_real_estate ADD COLUMN resolved_names TEXT;
ALTER TABLE operation_jewelry ADD COLUMN brand_name TEXT;
ALTER TABLE operation_jewelry ADD COLUMN resolved_names TEXT;
ALTER TABLE operation_virtual_assets ADD COLUMN resolved_names TEXT;
ALTER TABLE operation_gambling ADD COLUMN resolved_names TEXT;
ALTER TABLE operation_rentals ADD COLUMN resolved_names TEXT;
ALTER TABLE operation_armoring ADD COLUMN resolved_names TEXT;
ALTER TABLE operation_donations ADD COLUMN resolved_names TEXT;
ALTER TABLE operation_loans ADD COLUMN resolved_names TEXT;
ALTER TABLE operation_officials ADD COLUMN resolved_names TEXT;
ALTER TABLE operation_notary ADD COLUMN resolved_names TEXT;
ALTER TABLE operation_professional ADD COLUMN resolved_names TEXT;
ALTER TABLE operation_traveler_checks ADD COLUMN resolved_names TEXT;
ALTER TABLE operation_cards ADD COLUMN resolved_names TEXT;
ALTER TABLE operation_prepaid ADD COLUMN resolved_names TEXT;
ALTER TABLE operation_rewards ADD COLUMN resolved_names TEXT;
ALTER TABLE operation_valuables ADD COLUMN resolved_names TEXT;
ALTER TABLE operation_art ADD COLUMN resolved_names TEXT;
ALTER TABLE operation_development ADD COLUMN resolved_names TEXT;

-- Comments:
-- brand_name: Resolved display name for brand field (open catalogs like vehicle-brands, jewelry-brands)
-- resolved_names: JSON map of resolved catalog names for *Code fields (e.g., {"armorLevelCode": "Nivel 9", "countryCode": "México"})
