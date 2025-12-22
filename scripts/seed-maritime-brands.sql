-- Seed script for maritime-brands catalog
-- This script creates the maritime-brands catalog and populates it with common maritime vehicle brands

-- First, create the catalog if it doesn't exist
INSERT OR IGNORE INTO catalogs (id, key, name, active, createdAt, updatedAt)
VALUES (
    lower(hex(randomblob(16))),
    'maritime-brands',
    'Maritime Brands',
    1,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

-- Note: This catalog will be populated via CSV import script
-- Placeholder entries can be added here if needed
