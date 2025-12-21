-- Migration: Add UMA Values Support
-- Description: Add uma_values table to store UMA (Unidad de Medida y Actualización) values that change annually

-- Create uma_values table
CREATE TABLE IF NOT EXISTS uma_values (
    id TEXT PRIMARY KEY NOT NULL,
    year INTEGER NOT NULL UNIQUE, -- Year this UMA value applies to (e.g., 2025)
    dailyValue NUMERIC NOT NULL, -- UMA daily value for the year
    effectiveDate DATETIME NOT NULL, -- Date when this UMA value becomes effective
    endDate DATETIME, -- Optional: date when this UMA value expires (usually end of year)
    approvedBy TEXT, -- User who approved/configured this value (Compliance Officer)
    notes TEXT, -- Optional notes about the UMA value
    active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0, 1)), -- Whether this is the current active UMA value
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for uma_values
CREATE INDEX IF NOT EXISTS idx_uma_values_year ON uma_values(year);
CREATE INDEX IF NOT EXISTS idx_uma_values_active ON uma_values(active);
CREATE INDEX IF NOT EXISTS idx_uma_values_effectiveDate ON uma_values(effectiveDate);
