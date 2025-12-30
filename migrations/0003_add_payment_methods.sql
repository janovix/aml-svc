-- Migration: Add Payment Methods Support
-- Description: Remove paymentMethod column from transactions and add transaction_payment_methods table

-- Create transaction_payment_methods table
CREATE TABLE IF NOT EXISTS transaction_payment_methods (
    id TEXT PRIMARY KEY NOT NULL,
    transactionId TEXT NOT NULL,
    method TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (transactionId) REFERENCES transactions(id) ON DELETE CASCADE
);

-- Create index for transactionId
CREATE INDEX IF NOT EXISTS idx_transaction_payment_methods_transactionId ON transaction_payment_methods(transactionId);

-- Migrate existing paymentMethod data to payment methods table
-- This assumes existing transactions have a single payment method
INSERT INTO transaction_payment_methods (id, transactionId, method, amount, createdAt, updatedAt)
SELECT 
    lower(hex(randomblob(16))) as id,
    id as transactionId,
    paymentMethod as method,
    amount as amount,
    createdAt,
    updatedAt
FROM transactions
WHERE paymentMethod IS NOT NULL AND paymentMethod != '';

-- Note: SQLite doesn't support DROP COLUMN directly, so we need to recreate the transactions table
-- Create new transactions table without paymentMethod column
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
    serialNumber TEXT NOT NULL,
    armorLevel TEXT,
    engineNumber TEXT,
    plates TEXT,
    registrationNumber TEXT,
    flagCountryId TEXT,
    amount NUMERIC NOT NULL,
    currency TEXT NOT NULL,
    paymentDate DATETIME NOT NULL,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deletedAt DATETIME,
    FOREIGN KEY (clientId) REFERENCES clients(rfc) ON DELETE CASCADE
);

-- Copy data from old transactions table (excluding paymentMethod)
INSERT INTO transactions_new (
    id, clientId, operationDate, operationType, branchPostalCode, vehicleType,
    brandId, model, year, serialNumber, armorLevel, engineNumber, plates,
    registrationNumber, flagCountryId, amount, currency, paymentDate,
    createdAt, updatedAt, deletedAt
)
SELECT 
    id, clientId, operationDate, operationType, branchPostalCode, vehicleType,
    brandId, model, year, serialNumber, armorLevel, engineNumber, plates,
    registrationNumber, flagCountryId, amount, currency, paymentDate,
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
