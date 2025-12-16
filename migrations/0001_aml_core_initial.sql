-- Migration: AML Core Initial Schema
-- Description: Complete AML Core schema with clients, catalogs, and transactions domains

-- Drop legacy tasks table if it exists
DROP TABLE IF EXISTS tasks;

-- Drop any existing AML Core tables to ensure clean state
DROP TABLE IF EXISTS transactions;
DROP TABLE IF EXISTS catalog_items;
DROP TABLE IF EXISTS catalogs;
DROP TABLE IF EXISTS client_addresses;
DROP TABLE IF EXISTS client_documents;
DROP TABLE IF EXISTS clients;

-- Create clients table
CREATE TABLE IF NOT EXISTS clients (
    id TEXT PRIMARY KEY NOT NULL,
    personType TEXT NOT NULL CHECK(personType IN ('PHYSICAL','MORAL','TRUST')),
    firstName TEXT,
    lastName TEXT,
    secondLastName TEXT,
    birthDate DATETIME,
    curp TEXT,
    businessName TEXT,
    incorporationDate DATETIME,
    rfc TEXT NOT NULL,
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

-- Create client_documents table
CREATE TABLE IF NOT EXISTS client_documents (
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
    FOREIGN KEY (clientId) REFERENCES clients(id) ON DELETE CASCADE
);

-- Create client_addresses table
CREATE TABLE IF NOT EXISTS client_addresses (
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
    FOREIGN KEY (clientId) REFERENCES clients(id) ON DELETE CASCADE
);

-- Create catalogs table
CREATE TABLE IF NOT EXISTS catalogs (
    id TEXT PRIMARY KEY NOT NULL,
    key TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    active INTEGER NOT NULL DEFAULT 1,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create catalog_items table
CREATE TABLE IF NOT EXISTS catalog_items (
    id TEXT PRIMARY KEY NOT NULL,
    catalogId TEXT NOT NULL,
    name TEXT NOT NULL,
    normalizedName TEXT NOT NULL,
    active INTEGER NOT NULL DEFAULT 1,
    metadata TEXT,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (catalogId) REFERENCES catalogs(id) ON DELETE CASCADE
);

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
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
    FOREIGN KEY (clientId) REFERENCES clients(id) ON DELETE CASCADE
);

-- Create indexes for clients table
CREATE INDEX IF NOT EXISTS idx_clients_rfc ON clients(rfc);
CREATE INDEX IF NOT EXISTS idx_clients_personType ON clients(personType);
CREATE INDEX IF NOT EXISTS idx_clients_deletedAt ON clients(deletedAt);

-- Create indexes for client_documents table
CREATE INDEX IF NOT EXISTS idx_client_documents_clientId ON client_documents(clientId);
CREATE INDEX IF NOT EXISTS idx_client_documents_documentType ON client_documents(documentType);
CREATE INDEX IF NOT EXISTS idx_client_documents_status ON client_documents(status);
CREATE INDEX IF NOT EXISTS idx_client_documents_expiryDate ON client_documents(expiryDate);

-- Create indexes for client_addresses table
CREATE INDEX IF NOT EXISTS idx_client_addresses_clientId ON client_addresses(clientId);
CREATE INDEX IF NOT EXISTS idx_client_addresses_addressType ON client_addresses(addressType);
CREATE INDEX IF NOT EXISTS idx_client_addresses_country ON client_addresses(country);

-- Create indexes for catalogs table
CREATE INDEX IF NOT EXISTS idx_catalogs_active ON catalogs(active);

-- Create indexes for catalog_items table
CREATE INDEX IF NOT EXISTS idx_catalog_items_catalogId ON catalog_items(catalogId);
CREATE INDEX IF NOT EXISTS idx_catalog_items_normalizedName ON catalog_items(normalizedName);
CREATE INDEX IF NOT EXISTS idx_catalog_items_active ON catalog_items(active);

-- Create indexes for transactions table
CREATE INDEX IF NOT EXISTS idx_transactions_clientId ON transactions(clientId);
CREATE INDEX IF NOT EXISTS idx_transactions_operationDate ON transactions(operationDate);
CREATE INDEX IF NOT EXISTS idx_transactions_operationType ON transactions(operationType);
CREATE INDEX IF NOT EXISTS idx_transactions_vehicleType ON transactions(vehicleType);
