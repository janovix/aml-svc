-- Seed script for air-brands catalog
-- This script creates the air-brands catalog and populates it with common aircraft brands

-- First, create the catalog if it doesn't exist
INSERT OR IGNORE INTO catalogs (id, key, name, active, createdAt, updatedAt)
VALUES (
    lower(hex(randomblob(16))),
    'air-brands',
    'Air Brands',
    1,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

-- Note: This catalog will be populated via CSV import script
-- Placeholder entries can be added here if needed
