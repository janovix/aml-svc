-- Migration: Split vehicle-brands catalog into three separate catalogs by vehicle type
-- This migration adds the allowNewItems column to catalogs and creates three new vehicle brand catalogs

-- Step 1: Add allowNewItems column to catalogs table
ALTER TABLE catalogs ADD COLUMN allowNewItems INTEGER NOT NULL DEFAULT 0;

-- Step 2: Create terrestrial-vehicle-brands catalog (open catalog)
INSERT OR IGNORE INTO catalogs (id, key, name, active, allowNewItems, createdAt, updatedAt)
VALUES (
    lower(hex(randomblob(16))),
    'terrestrial-vehicle-brands',
    'Marcas de Vehículos Terrestres',
    1,
    1,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

-- Step 3: Create maritime-vehicle-brands catalog (open catalog)
INSERT OR IGNORE INTO catalogs (id, key, name, active, allowNewItems, createdAt, updatedAt)
VALUES (
    lower(hex(randomblob(16))),
    'maritime-vehicle-brands',
    'Marcas de Vehículos Marítimos',
    1,
    1,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

-- Step 4: Create air-vehicle-brands catalog (open catalog)
INSERT OR IGNORE INTO catalogs (id, key, name, active, allowNewItems, createdAt, updatedAt)
VALUES (
    lower(hex(randomblob(16))),
    'air-vehicle-brands',
    'Marcas de Vehículos Aéreos',
    1,
    1,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

-- Step 5: Migrate existing vehicle-brands items to terrestrial-vehicle-brands
-- Copy all items from vehicle-brands catalog to terrestrial-vehicle-brands
INSERT INTO catalog_items (id, catalogId, name, normalizedName, active, metadata, createdAt, updatedAt)
SELECT 
    lower(hex(randomblob(16))),
    (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands'),
    ci.name,
    ci.normalizedName,
    ci.active,
    ci.metadata,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM catalog_items ci
INNER JOIN catalogs c ON ci.catalogId = c.id
WHERE c.key = 'vehicle-brands'
AND NOT EXISTS (
    SELECT 1 FROM catalog_items existing
    WHERE existing.catalogId = (SELECT id FROM catalogs WHERE key = 'terrestrial-vehicle-brands')
    AND existing.normalizedName = ci.normalizedName
);

-- Step 6: Mark the old vehicle-brands catalog as allowing new items (for backward compatibility)
UPDATE catalogs SET allowNewItems = 1 WHERE key = 'vehicle-brands';

-- Step 7: Set allowNewItems = 0 for closed catalogs (countries, states, etc.)
UPDATE catalogs SET allowNewItems = 0 WHERE key IN ('countries', 'states', 'currencies', 'economic-activities', 'business-activities', 'armor-levels', 'payment-methods', 'payment-forms', 'vulnerable-activities', 'veh-operation-types');

