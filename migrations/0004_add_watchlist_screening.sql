-- Migration 0004: Shareholder/Beneficial Controller restructuring + Watchlist screening
-- Created: 2026-02-16
-- Updated: 2026-02-17
-- Purpose:
--   1. Separate shareholders (cap table) from beneficial controllers (AML requirement)
--   2. Implement 2-level shareholder depth tracking (for companies owned by companies)
--   3. Add Anexo 3 fields (BC identification docs: INE/passport, CURP, RFC) per LFPIORPI
--   4. Add Anexo 4 fields (shareholder company docs: acta constitutiva, representative)
--   5. Add identification criteria tracking (BENEFIT, CONTROL, FALLBACK) per CFF 32-B
--   6. Enable automated watchlist screening integration with watchlist-svc
--   7. Add screening enrichment flags to clients and BCs (only BCs get screened)
--   8. Remove obsolete PEP detail columns

-- ============================================
-- CLIENTS TABLE: Add screening columns
-- ============================================
ALTER TABLE clients ADD COLUMN watchlist_query_id TEXT;
ALTER TABLE clients ADD COLUMN ofac_sanctioned INTEGER NOT NULL DEFAULT 0 CHECK(ofac_sanctioned IN (0, 1));
ALTER TABLE clients ADD COLUMN unsc_sanctioned INTEGER NOT NULL DEFAULT 0 CHECK(unsc_sanctioned IN (0, 1));
ALTER TABLE clients ADD COLUMN sat69b_listed INTEGER NOT NULL DEFAULT 0 CHECK(sat69b_listed IN (0, 1));
ALTER TABLE clients ADD COLUMN adverse_media_flagged INTEGER NOT NULL DEFAULT 0 CHECK(adverse_media_flagged IN (0, 1));
ALTER TABLE clients ADD COLUMN screening_result TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE clients ADD COLUMN screened_at TEXT;

-- Drop obsolete PEP detail indexes and columns from clients
DROP INDEX IF EXISTS idx_clients_pep_status;
DROP INDEX IF EXISTS idx_clients_pep_checked_at;
ALTER TABLE clients DROP COLUMN pep_status;
ALTER TABLE clients DROP COLUMN pep_details;
ALTER TABLE clients DROP COLUMN pep_match_confidence;
ALTER TABLE clients DROP COLUMN pep_checked_at;
ALTER TABLE clients DROP COLUMN pep_check_source;

-- ============================================
-- NEW TABLE: SHAREHOLDERS (Cap Table)
-- ============================================
CREATE TABLE shareholders (
    id TEXT PRIMARY KEY NOT NULL,
    client_id TEXT NOT NULL,
    parent_shareholder_id TEXT,
    entity_type TEXT NOT NULL CHECK(entity_type IN ('PERSON', 'COMPANY')),
    -- PERSON fields
    first_name TEXT,
    last_name TEXT,
    second_last_name TEXT,
    rfc TEXT,
    -- COMPANY fields
    business_name TEXT,
    tax_id TEXT,
    incorporation_date DATETIME,
    nationality TEXT,
    -- COMPANY Anexo 4: representative of the moral entity
    representative_name TEXT,
    representative_curp TEXT,
    representative_rfc TEXT,
    -- COMPANY Anexo 4: document references
    acta_constitutiva_doc_id TEXT,
    cedula_fiscal_doc_id TEXT,
    address_proof_doc_id TEXT,
    power_of_attorney_doc_id TEXT,
    -- Ownership (required)
    ownership_percentage NUMERIC NOT NULL,
    -- Contact
    email TEXT,
    phone TEXT,
    -- Timestamps
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_shareholder_id) REFERENCES shareholders(id) ON DELETE CASCADE,
    FOREIGN KEY (acta_constitutiva_doc_id) REFERENCES client_documents(id) ON DELETE SET NULL,
    FOREIGN KEY (cedula_fiscal_doc_id) REFERENCES client_documents(id) ON DELETE SET NULL,
    FOREIGN KEY (address_proof_doc_id) REFERENCES client_documents(id) ON DELETE SET NULL,
    FOREIGN KEY (power_of_attorney_doc_id) REFERENCES client_documents(id) ON DELETE SET NULL
);

CREATE INDEX idx_shareholders_client_id ON shareholders(client_id);
CREATE INDEX idx_shareholders_parent_shareholder_id ON shareholders(parent_shareholder_id);
CREATE INDEX idx_shareholders_entity_type ON shareholders(entity_type);

-- ============================================
-- NEW TABLE: BENEFICIAL_CONTROLLERS (Beneficiarios Controladores)
-- ============================================
CREATE TABLE beneficial_controllers (
    id TEXT PRIMARY KEY NOT NULL,
    client_id TEXT NOT NULL,
    shareholder_id TEXT,
    -- BC classification
    bc_type TEXT NOT NULL CHECK(bc_type IN ('SHAREHOLDER', 'LEGAL_REP', 'TRUSTEE', 'SETTLOR', 'TRUST_BENEFICIARY', 'DIRECTOR')),
    identification_criteria TEXT NOT NULL CHECK(identification_criteria IN ('BENEFIT', 'CONTROL', 'FALLBACK')),
    control_mechanism TEXT,
    is_legal_representative INTEGER NOT NULL DEFAULT 0 CHECK(is_legal_representative IN (0, 1)),
    -- Anexo 3: personal data (all BCs are natural persons)
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    second_last_name TEXT,
    birth_date DATETIME,
    birth_country TEXT,
    nationality TEXT,
    occupation TEXT,
    curp TEXT,
    rfc TEXT,
    -- Anexo 3: identification document
    id_document_type TEXT,
    id_document_number TEXT,
    id_document_authority TEXT,
    -- Anexo 3: document copy references
    id_copy_doc_id TEXT,
    curp_copy_doc_id TEXT,
    cedula_fiscal_doc_id TEXT,
    address_proof_doc_id TEXT,
    constancia_bc_doc_id TEXT,
    power_of_attorney_doc_id TEXT,
    -- Contact
    email TEXT,
    phone TEXT,
    -- Address (Anexo 3 requires full address)
    country TEXT,
    state_code TEXT,
    city TEXT,
    street TEXT,
    postal_code TEXT,
    -- Watchlist screening
    is_pep INTEGER NOT NULL DEFAULT 0 CHECK(is_pep IN (0, 1)),
    watchlist_query_id TEXT,
    ofac_sanctioned INTEGER NOT NULL DEFAULT 0 CHECK(ofac_sanctioned IN (0, 1)),
    unsc_sanctioned INTEGER NOT NULL DEFAULT 0 CHECK(unsc_sanctioned IN (0, 1)),
    sat69b_listed INTEGER NOT NULL DEFAULT 0 CHECK(sat69b_listed IN (0, 1)),
    adverse_media_flagged INTEGER NOT NULL DEFAULT 0 CHECK(adverse_media_flagged IN (0, 1)),
    screening_result TEXT NOT NULL DEFAULT 'pending',
    screened_at TEXT,
    -- Verification
    verified_at DATETIME,
    verified_by TEXT,
    notes TEXT,
    -- Timestamps
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    FOREIGN KEY (shareholder_id) REFERENCES shareholders(id) ON DELETE SET NULL,
    FOREIGN KEY (id_copy_doc_id) REFERENCES client_documents(id) ON DELETE SET NULL,
    FOREIGN KEY (curp_copy_doc_id) REFERENCES client_documents(id) ON DELETE SET NULL,
    FOREIGN KEY (cedula_fiscal_doc_id) REFERENCES client_documents(id) ON DELETE SET NULL,
    FOREIGN KEY (address_proof_doc_id) REFERENCES client_documents(id) ON DELETE SET NULL,
    FOREIGN KEY (constancia_bc_doc_id) REFERENCES client_documents(id) ON DELETE SET NULL,
    FOREIGN KEY (power_of_attorney_doc_id) REFERENCES client_documents(id) ON DELETE SET NULL
);

CREATE INDEX idx_beneficial_controllers_client_id ON beneficial_controllers(client_id);
CREATE INDEX idx_beneficial_controllers_shareholder_id ON beneficial_controllers(shareholder_id);
CREATE INDEX idx_beneficial_controllers_bc_type ON beneficial_controllers(bc_type);
CREATE INDEX idx_beneficial_controllers_identification_criteria ON beneficial_controllers(identification_criteria);
CREATE INDEX idx_beneficial_controllers_screening_result ON beneficial_controllers(screening_result);

-- ============================================
-- DATA MIGRATION from ultimate_beneficial_owners
-- ============================================
-- Step 1: Migrate SHAREHOLDER relationship types to shareholders table (level 1, no parent)
-- Note: old UBO table only had person fields, so we default entity_type to 'PERSON'
INSERT INTO shareholders (
    id, client_id, parent_shareholder_id, entity_type,
    first_name, last_name, second_last_name, rfc,
    ownership_percentage, email, phone,
    created_at, updated_at
)
SELECT 
    id, client_id, NULL, 'PERSON',
    first_name, last_name, second_last_name, rfc,
    COALESCE(ownership_percentage, 0), email, phone,
    created_at, updated_at
FROM ultimate_beneficial_owners
WHERE relationship_type = 'SHAREHOLDER';

-- Step 2: Migrate all UBOs to beneficial_controllers table
-- Map relationship types to bc_type
-- SHAREHOLDER -> SHAREHOLDER
-- LEGAL_REP -> LEGAL_REP (with is_legal_representative = 1)
-- Others -> keep same
-- Default identification_criteria to 'BENEFIT' (first criterion)
INSERT INTO beneficial_controllers (
    id, client_id, shareholder_id, bc_type, identification_criteria,
    control_mechanism, is_legal_representative,
    first_name, last_name, second_last_name,
    birth_date, nationality, curp, rfc,
    email, phone,
    country, state_code, city, street, postal_code,
    id_copy_doc_id, address_proof_doc_id,
    is_pep,
    created_at, updated_at
)
SELECT 
    'BC' || SUBSTR(id, 4), -- Generate new BC ID (replace UBO prefix with BC)
    client_id,
    CASE WHEN relationship_type = 'SHAREHOLDER' THEN id ELSE NULL END, -- Link to shareholder if SHAREHOLDER type
    relationship_type, -- bc_type
    'BENEFIT', -- Default identification_criteria
    NULL, -- control_mechanism
    CASE WHEN relationship_type = 'LEGAL_REP' THEN 1 ELSE 0 END, -- is_legal_representative
    COALESCE(first_name, 'Unknown'), -- BC must have first_name
    COALESCE(last_name, 'Unknown'), -- BC must have last_name
    second_last_name,
    birth_date, nationality, curp, rfc,
    email, phone,
    country, state_code, city, street, postal_code,
    id_document_id, -- map old id_document_id to id_copy_doc_id
    address_proof_id, -- map old address_proof_id to address_proof_doc_id
    is_pep,
    created_at, updated_at
FROM ultimate_beneficial_owners;

-- Step 3: Drop old table
DROP TABLE ultimate_beneficial_owners;

-- ============================================
-- CLIENTS TABLE: Add index for screening_result
-- ============================================
CREATE INDEX idx_clients_screening_result ON clients(screening_result);
