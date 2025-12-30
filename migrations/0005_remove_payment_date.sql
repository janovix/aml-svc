-- Migration: Remove paymentDate from transactions
-- Description: Remove paymentDate column from transactions table

-- Note: SQLite doesn't support DROP COLUMN directly, so we need to recreate the transactions table
-- Create new transactions table without paymentDate column
CREATE TABLE IF NOT EXISTS transactions_new (
    id TEXT PRIMARY KEY NOT NULL,
    clientId TEXT NOT NULL,
    operationDate DATETIME NOT NULL,
    operationType TEXT NOT NULL CHECK(operationType IN ('PURCHASE','SALE')),
    branchPostalCode TEXT NOT NULL,
    vehicleType TEXT NOT NULL CHECK(vehicleType IN ('LAND','MARINE','AIR')),
    brandId TEXT NOT NULL,
    model TEXT NOT NULL,
    year INTEGER NOT NULL,
    armorLevel TEXT,
    engineNumber TEXT,
    plates TEXT,
    registrationNumber TEXT,
    flagCountryId TEXT,
    amount NUMERIC NOT NULL,
    currency TEXT NOT NULL,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deletedAt DATETIME,
    FOREIGN KEY (clientId) REFERENCES clients(rfc) ON DELETE CASCADE
);

-- Copy data from old transactions table (excluding paymentDate)
INSERT INTO transactions_new (
    id, clientId, operationDate, operationType, branchPostalCode, vehicleType,
    brandId, model, year, armorLevel, engineNumber, plates,
    registrationNumber, flagCountryId, amount, currency,
    createdAt, updatedAt, deletedAt
)
SELECT 
    id, clientId, operationDate, operationType, branchPostalCode, vehicleType,
    brandId, model, year, armorLevel, engineNumber, plates,
    registrationNumber, flagCountryId, amount, currency,
    createdAt, updatedAt, deletedAt
FROM transactions;

-- Drop old transactions table
DROP TABLE IF EXISTS transactions;

-- Rename new table to original name
ALTER TABLE transactions_new RENAME TO transactions;

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_transactions_clientId ON transactions(clientId);
CREATE INDEX IF NOT EXISTS idx_transactions_operationDate ON transactions(operationDate);
CREATE INDEX IF NOT EXISTS idx_transactions_operationType ON transactions(operationType);
CREATE INDEX IF NOT EXISTS idx_transactions_vehicleType ON transactions(vehicleType);
