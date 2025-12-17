-- Migration: RFC as Primary Key
-- Description: Change clients table to use RFC as primary key instead of id

-- Step 1: Drop foreign key constraints that reference clients.id
-- Note: SQLite doesn't support DROP CONSTRAINT, so we need to recreate tables

-- Step 2: Create new tables with RFC as primary key
-- We'll use a temporary approach: create new tables, copy data, drop old, rename new

-- Create temporary clients table with RFC as primary key
CREATE TABLE IF NOT EXISTS clients_new (
    rfc TEXT PRIMARY KEY NOT NULL,
    personType TEXT NOT NULL CHECK(personType IN ('PHYSICAL','MORAL','TRUST')),
    firstName TEXT,
    lastName TEXT,
    secondLastName TEXT,
    birthDate DATETIME,
    curp TEXT,
    businessName TEXT,
    incorporationDate DATETIME,
    nationality TEXT,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    country TEXT NOT NULL,
    stateCode TEXT NOT NULL,
    city TEXT NOT NULL,
    municipality TEXT NOT NULL,
    neighborhood TEXT NOT NULL,
    street TEXT NOT NULL,
    externalNumber TEXT NOT NULL,
    internalNumber TEXT,
    postalCode TEXT NOT NULL,
    reference TEXT,
    notes TEXT,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deletedAt DATETIME
);

-- Copy data from old table to new table (using RFC as the key)
INSERT INTO clients_new (
    rfc, personType, firstName, lastName, secondLastName, birthDate, curp,
    businessName, incorporationDate, nationality, email, phone, country,
    stateCode, city, municipality, neighborhood, street, externalNumber,
    internalNumber, postalCode, reference, notes, createdAt, updatedAt, deletedAt
)
SELECT 
    rfc, personType, firstName, lastName, secondLastName, birthDate, curp,
    businessName, incorporationDate, nationality, email, phone, country,
    stateCode, city, municipality, neighborhood, street, externalNumber,
    internalNumber, postalCode, reference, notes, createdAt, updatedAt, deletedAt
FROM clients;

-- Create temporary client_documents table with RFC reference
CREATE TABLE IF NOT EXISTS client_documents_new (
    id TEXT PRIMARY KEY NOT NULL,
    clientId TEXT NOT NULL,
    documentType TEXT NOT NULL CHECK(documentType IN ('PASSPORT','NATIONAL_ID','DRIVERS_LICENSE','TAX_ID','PROOF_OF_ADDRESS','OTHER')),
    documentNumber TEXT NOT NULL,
    issuingCountry TEXT,
    issueDate DATETIME,
    expiryDate DATETIME,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','VERIFIED','REJECTED','EXPIRED')),
    fileUrl TEXT,
    metadata TEXT,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (clientId) REFERENCES clients_new(rfc) ON DELETE CASCADE
);

-- Copy data from old client_documents to new, mapping old clientId (UUID) to RFC
INSERT INTO client_documents_new (
    id, clientId, documentType, documentNumber, issuingCountry, issueDate,
    expiryDate, status, fileUrl, metadata, createdAt, updatedAt
)
SELECT 
    cd.id, c.rfc, cd.documentType, cd.documentNumber, cd.issuingCountry, cd.issueDate,
    cd.expiryDate, cd.status, cd.fileUrl, cd.metadata, cd.createdAt, cd.updatedAt
FROM client_documents cd
INNER JOIN clients c ON cd.clientId = c.id;

-- Create temporary client_addresses table with RFC reference
CREATE TABLE IF NOT EXISTS client_addresses_new (
    id TEXT PRIMARY KEY NOT NULL,
    clientId TEXT NOT NULL,
    addressType TEXT NOT NULL DEFAULT 'RESIDENTIAL' CHECK(addressType IN ('RESIDENTIAL','BUSINESS','MAILING','OTHER')),
    street1 TEXT NOT NULL,
    street2 TEXT,
    city TEXT NOT NULL,
    state TEXT,
    postalCode TEXT,
    country TEXT NOT NULL,
    isPrimary INTEGER NOT NULL DEFAULT 0,
    verifiedAt DATETIME,
    reference TEXT,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (clientId) REFERENCES clients_new(rfc) ON DELETE CASCADE
);

-- Copy data from old client_addresses to new, mapping old clientId (UUID) to RFC
INSERT INTO client_addresses_new (
    id, clientId, addressType, street1, street2, city, state, postalCode,
    country, isPrimary, verifiedAt, reference, createdAt, updatedAt
)
SELECT 
    ca.id, c.rfc, ca.addressType, ca.street1, ca.street2, ca.city, ca.state, ca.postalCode,
    ca.country, ca.isPrimary, ca.verifiedAt, ca.reference, ca.createdAt, ca.updatedAt
FROM client_addresses ca
INNER JOIN clients c ON ca.clientId = c.id;

-- Create temporary transactions table with RFC reference
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
    paymentMethod TEXT NOT NULL,
    paymentDate DATETIME NOT NULL,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deletedAt DATETIME,
    FOREIGN KEY (clientId) REFERENCES clients_new(rfc) ON DELETE CASCADE
);

-- Copy data from old transactions to new, mapping old clientId (UUID) to RFC
INSERT INTO transactions_new (
    id, clientId, operationDate, operationType, branchPostalCode, vehicleType,
    brandId, model, year, serialNumber, armorLevel, engineNumber, plates,
    registrationNumber, flagCountryId, amount, currency, paymentMethod,
    paymentDate, createdAt, updatedAt, deletedAt
)
SELECT 
    t.id, c.rfc, t.operationDate, t.operationType, t.branchPostalCode, t.vehicleType,
    t.brandId, t.model, t.year, t.serialNumber, t.armorLevel, t.engineNumber, t.plates,
    t.registrationNumber, t.flagCountryId, t.amount, t.currency, t.paymentMethod,
    t.paymentDate, t.createdAt, t.updatedAt, t.deletedAt
FROM transactions t
INNER JOIN clients c ON t.clientId = c.id;

-- Drop old tables
DROP TABLE IF EXISTS transactions;
DROP TABLE IF EXISTS client_addresses;
DROP TABLE IF EXISTS client_documents;
DROP TABLE IF EXISTS clients;

-- Rename new tables to original names
ALTER TABLE clients_new RENAME TO clients;
ALTER TABLE client_documents_new RENAME TO client_documents;
ALTER TABLE client_addresses_new RENAME TO client_addresses;
ALTER TABLE transactions_new RENAME TO transactions;

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_clients_personType ON clients(personType);
CREATE INDEX IF NOT EXISTS idx_clients_deletedAt ON clients(deletedAt);

CREATE INDEX IF NOT EXISTS idx_client_documents_clientId ON client_documents(clientId);
CREATE INDEX IF NOT EXISTS idx_client_documents_documentType ON client_documents(documentType);
CREATE INDEX IF NOT EXISTS idx_client_documents_status ON client_documents(status);
CREATE INDEX IF NOT EXISTS idx_client_documents_expiryDate ON client_documents(expiryDate);

CREATE INDEX IF NOT EXISTS idx_client_addresses_clientId ON client_addresses(clientId);
CREATE INDEX IF NOT EXISTS idx_client_addresses_addressType ON client_addresses(addressType);
CREATE INDEX IF NOT EXISTS idx_client_addresses_country ON client_addresses(country);

CREATE INDEX IF NOT EXISTS idx_transactions_clientId ON transactions(clientId);
CREATE INDEX IF NOT EXISTS idx_transactions_operationDate ON transactions(operationDate);
CREATE INDEX IF NOT EXISTS idx_transactions_operationType ON transactions(operationType);
CREATE INDEX IF NOT EXISTS idx_transactions_vehicleType ON transactions(vehicleType);
