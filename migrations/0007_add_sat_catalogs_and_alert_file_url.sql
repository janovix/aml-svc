-- Migration: Add SAT Catalogs
-- Description: Add SAT catalog tables for XML generation
-- Note: satFileUrl column was already added in migration 0006

-- Create sat_catalogs table
CREATE TABLE IF NOT EXISTS sat_catalogs (
    id TEXT PRIMARY KEY NOT NULL,
    code TEXT NOT NULL UNIQUE, -- Catalog code (e.g., "CAT_TIPO_SUJETO_OBLIGADO")
    name TEXT NOT NULL,
    description TEXT,
    active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0, 1)),
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create sat_catalog_items table
CREATE TABLE IF NOT EXISTS sat_catalog_items (
    id TEXT PRIMARY KEY NOT NULL,
    catalogId TEXT NOT NULL,
    code TEXT NOT NULL, -- Catalog item code (the value used in XML)
    name TEXT NOT NULL, -- Human-readable name
    description TEXT,
    active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0, 1)),
    metadata TEXT, -- Additional metadata as JSON
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (catalogId) REFERENCES sat_catalogs(id) ON DELETE CASCADE,
    UNIQUE(catalogId, code) -- Unique code per catalog
);

-- Create indexes for sat_catalogs
CREATE INDEX IF NOT EXISTS idx_sat_catalogs_code ON sat_catalogs(code);
CREATE INDEX IF NOT EXISTS idx_sat_catalogs_active ON sat_catalogs(active);

-- Create indexes for sat_catalog_items
CREATE INDEX IF NOT EXISTS idx_sat_catalog_items_catalogId ON sat_catalog_items(catalogId);
CREATE INDEX IF NOT EXISTS idx_sat_catalog_items_code ON sat_catalog_items(code);
CREATE INDEX IF NOT EXISTS idx_sat_catalog_items_active ON sat_catalog_items(active);
