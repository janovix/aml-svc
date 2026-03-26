-- Migration: Initial AML Core Schema
-- Description: Complete AML Core schema with all domains (clients, catalogs, invoices, operations, alerts, UMA, organization settings, reports, notices)
-- All column names use snake_case for consistency across all services
-- Supports all 20 SAT vulnerable activities with activity-specific extension tables

-- ============================================================================
-- Drop Tables (in dependency order)
-- ============================================================================

DROP TABLE IF EXISTS import_row_results;
DROP TABLE IF EXISTS imports;
DROP TABLE IF EXISTS alerts;
DROP TABLE IF EXISTS alert_rule_config;
DROP TABLE IF EXISTS alert_rules;
DROP TABLE IF EXISTS notices;
DROP TABLE IF EXISTS reports;
DROP TABLE IF EXISTS organization_settings;
DROP TABLE IF EXISTS uma_values;
DROP TABLE IF EXISTS catalog_items;
DROP TABLE IF EXISTS catalogs;

-- Operation extension tables (all 20 activities)
DROP TABLE IF EXISTS operation_vehicles;
DROP TABLE IF EXISTS operation_real_estate;
DROP TABLE IF EXISTS operation_jewelry;
DROP TABLE IF EXISTS operation_virtual_assets;
DROP TABLE IF EXISTS operation_gambling;
DROP TABLE IF EXISTS operation_rentals;
DROP TABLE IF EXISTS operation_armoring;
DROP TABLE IF EXISTS operation_donations;
DROP TABLE IF EXISTS operation_loans;
DROP TABLE IF EXISTS operation_officials;
DROP TABLE IF EXISTS operation_notary;
DROP TABLE IF EXISTS operation_professional;
DROP TABLE IF EXISTS operation_traveler_checks;
DROP TABLE IF EXISTS operation_cards;
DROP TABLE IF EXISTS operation_prepaid;
DROP TABLE IF EXISTS operation_rewards;
DROP TABLE IF EXISTS operation_valuables;
DROP TABLE IF EXISTS operation_art;
DROP TABLE IF EXISTS operation_development;

DROP TABLE IF EXISTS operation_payments;
DROP TABLE IF EXISTS operations;
DROP TABLE IF EXISTS invoice_items;
DROP TABLE IF EXISTS invoices;

DROP TABLE IF EXISTS ultimate_beneficial_owners;
DROP TABLE IF EXISTS client_addresses;
DROP TABLE IF EXISTS client_documents;
DROP TABLE IF EXISTS upload_links;
DROP TABLE IF EXISTS clients;

-- ============================================================================
-- Clients Domain
-- ============================================================================

CREATE TABLE clients (
    id TEXT PRIMARY KEY NOT NULL,
    rfc TEXT NOT NULL, -- RFC is unique per organization, not globally
    organization_id TEXT NOT NULL,
    person_type TEXT NOT NULL CHECK(person_type IN ('PHYSICAL','MORAL','TRUST')),
    first_name TEXT,
    last_name TEXT,
    second_last_name TEXT,
    birth_date DATETIME,
    curp TEXT,
    business_name TEXT,
    incorporation_date DATETIME,
    nationality TEXT,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    country TEXT NOT NULL,
    state_code TEXT NOT NULL,
    city TEXT NOT NULL,
    municipality TEXT NOT NULL,
    neighborhood TEXT NOT NULL,
    street TEXT NOT NULL,
    external_number TEXT NOT NULL,
    internal_number TEXT,
    postal_code TEXT NOT NULL,
    reference TEXT,
    notes TEXT,
    country_code TEXT,
    economic_activity_code TEXT,
    -- Enhanced KYC fields
    gender TEXT, -- M, F, OTHER
    occupation TEXT,
    marital_status TEXT, -- SINGLE, MARRIED, DIVORCED, WIDOWED, OTHER
    source_of_funds TEXT,
    source_of_wealth TEXT,
    -- KYC status tracking
    kyc_status TEXT NOT NULL DEFAULT 'INCOMPLETE' CHECK(kyc_status IN ('INCOMPLETE','PENDING_VERIFICATION','COMPLETE','EXPIRED')),
    kyc_completed_at DATETIME,
    -- Data completeness tracking
    completeness_status TEXT NOT NULL DEFAULT 'INCOMPLETE', -- COMPLETE, INCOMPLETE, MINIMUM
    missing_fields TEXT, -- JSON array of missing field names, e.g. ["curp","birthDate"]
    -- PEP status tracking
    is_pep INTEGER NOT NULL DEFAULT 0 CHECK(is_pep IN (0, 1)),
    pep_status TEXT NOT NULL DEFAULT 'PENDING' CHECK(pep_status IN ('PENDING','CONFIRMED','NOT_PEP','ERROR')),
    pep_details TEXT,
    pep_match_confidence TEXT, -- exact, possible
    pep_checked_at DATETIME,
    pep_check_source TEXT, -- VECTORIZE, GROK
    -- Timestamps
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME
);

-- Upload Links - shareable links for document uploads via doc-svc
CREATE TABLE upload_links (
    id TEXT PRIMARY KEY NOT NULL,
    organization_id TEXT NOT NULL,
    client_id TEXT REFERENCES clients(id) ON DELETE SET NULL,
    created_by TEXT NOT NULL,
    doc_svc_link_id TEXT NOT NULL, -- Reference to doc-svc upload link
    expires_at DATETIME NOT NULL,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE','EXPIRED','COMPLETED')),
    required_documents TEXT, -- JSON array of required document types
    notes TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE client_documents (
    id TEXT PRIMARY KEY NOT NULL,
    client_id TEXT NOT NULL,
    document_type TEXT NOT NULL CHECK(document_type IN ('PASSPORT','NATIONAL_ID','DRIVERS_LICENSE','CEDULA_PROFESIONAL','CARTILLA_MILITAR','TAX_ID','PROOF_OF_ADDRESS','UTILITY_BILL','BANK_STATEMENT','ACTA_CONSTITUTIVA','PODER_NOTARIAL','TRUST_AGREEMENT','CORPORATE_BYLAWS','OTHER')),
    document_number TEXT NOT NULL,
    issuing_country TEXT,
    issue_date DATETIME,
    expiry_date DATETIME,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','VERIFIED','REJECTED','EXPIRED')),
    file_url TEXT,
    metadata TEXT,
    -- doc-svc integration fields (simplified MVP)
    doc_svc_document_id TEXT, -- Reference to doc-svc document
    upload_link_id TEXT REFERENCES upload_links(id) ON DELETE SET NULL,
    verified_at DATETIME,
    verified_by TEXT, -- User who verified
    -- Timestamps
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

CREATE TABLE client_addresses (
    id TEXT PRIMARY KEY NOT NULL,
    client_id TEXT NOT NULL,
    address_type TEXT NOT NULL DEFAULT 'RESIDENTIAL' CHECK(address_type IN ('RESIDENTIAL','BUSINESS','MAILING','OTHER')),
    street1 TEXT NOT NULL,
    street2 TEXT,
    city TEXT NOT NULL,
    state TEXT,
    postal_code TEXT,
    country TEXT NOT NULL,
    is_primary INTEGER NOT NULL DEFAULT 0 CHECK(is_primary IN (0, 1)),
    verified_at DATETIME,
    reference TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

-- Ultimate Beneficial Owners - for MORAL and TRUST entities
-- Required by LFPIORPI for entities where a single person owns 25%+ shares
CREATE TABLE ultimate_beneficial_owners (
    id TEXT PRIMARY KEY NOT NULL,
    client_id TEXT NOT NULL,
    -- Personal information
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    second_last_name TEXT,
    birth_date DATETIME,
    nationality TEXT,
    curp TEXT, -- Mexican CURP if applicable
    rfc TEXT, -- Mexican RFC if applicable
    -- Ownership/relationship details
    ownership_percentage NUMERIC, -- Percentage of ownership (for shareholders)
    relationship_type TEXT NOT NULL CHECK(relationship_type IN ('SHAREHOLDER','DIRECTOR','LEGAL_REP','TRUSTEE','SETTLOR','BENEFICIARY','CONTROLLER')),
    position TEXT, -- Job title or position description
    -- Contact information
    email TEXT,
    phone TEXT,
    -- Address
    country TEXT,
    state_code TEXT,
    city TEXT,
    street TEXT,
    postal_code TEXT,
    -- Document references
    id_document_id TEXT REFERENCES client_documents(id) ON DELETE SET NULL,
    address_proof_id TEXT REFERENCES client_documents(id) ON DELETE SET NULL,
    -- PEP status tracking (UBOs also need PEP checking)
    is_pep INTEGER NOT NULL DEFAULT 0 CHECK(is_pep IN (0, 1)),
    pep_status TEXT NOT NULL DEFAULT 'PENDING' CHECK(pep_status IN ('PENDING','CONFIRMED','NOT_PEP','ERROR')),
    pep_details TEXT,
    pep_match_confidence TEXT,
    pep_checked_at DATETIME,
    -- Verification
    verified_at DATETIME,
    verified_by TEXT,
    notes TEXT,
    -- Timestamps
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

-- ============================================================================
-- Catalogs Domain
-- ============================================================================

CREATE TABLE catalogs (
    id TEXT PRIMARY KEY NOT NULL,
    key TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0, 1)),
    allow_new_items INTEGER NOT NULL DEFAULT 0 CHECK(allow_new_items IN (0, 1)),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE catalog_items (
    id TEXT PRIMARY KEY NOT NULL,
    catalog_id TEXT NOT NULL,
    name TEXT NOT NULL,
    normalized_name TEXT NOT NULL,
    active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0, 1)),
    metadata TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (catalog_id) REFERENCES catalogs(id) ON DELETE CASCADE
);

-- ============================================================================
-- Invoices Domain (CFDI v4.0 Compliant)
-- ============================================================================

CREATE TABLE invoices (
    id TEXT PRIMARY KEY NOT NULL,
    organization_id TEXT NOT NULL,
    -- CFDI Core fields
    uuid TEXT UNIQUE, -- TimbreFiscalDigital UUID
    version TEXT NOT NULL DEFAULT '4.0',
    series TEXT,
    folio TEXT,
    -- Issuer (Emisor)
    issuer_rfc TEXT NOT NULL,
    issuer_name TEXT NOT NULL,
    issuer_tax_regime_code TEXT NOT NULL, -- c_RegimenFiscal
    -- Receiver (Receptor)
    receiver_rfc TEXT NOT NULL,
    receiver_name TEXT NOT NULL,
    receiver_usage_code TEXT, -- c_UsoCFDI
    receiver_tax_regime_code TEXT, -- c_RegimenFiscal
    receiver_postal_code TEXT,
    -- Financial
    subtotal NUMERIC NOT NULL,
    discount NUMERIC DEFAULT 0,
    total NUMERIC NOT NULL,
    currency_code TEXT NOT NULL DEFAULT 'MXN', -- c_Moneda
    exchange_rate NUMERIC DEFAULT 1,
    -- Payment
    payment_form_code TEXT, -- c_FormaPago (01=Efectivo, 02=Cheque, 03=Transferencia, etc.)
    payment_method_code TEXT, -- c_MetodoPago (PUE=Una exhibición, PPD=Parcialidades)
    -- Type and dates
    voucher_type_code TEXT NOT NULL DEFAULT 'I', -- c_TipoDeComprobante (I=Ingreso, E=Egreso, etc.)
    issue_date DATETIME NOT NULL,
    certification_date DATETIME,
    -- Export
    export_code TEXT DEFAULT '01', -- c_Exportacion
    -- TimbreFiscalDigital (TFD) complement
    tfd_uuid TEXT, -- Same as uuid, but explicitly from TFD
    tfd_sat_certificate TEXT,
    tfd_signature TEXT,
    tfd_stamp_date DATETIME,
    -- Original XML storage
    xml_content TEXT, -- Full original CFDI XML
    -- Metadata
    notes TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME
);

CREATE TABLE invoice_items (
    id TEXT PRIMARY KEY NOT NULL,
    invoice_id TEXT NOT NULL,
    -- Concepto fields
    product_service_code TEXT NOT NULL, -- c_ClaveProdServ
    product_service_id TEXT, -- NoIdentificacion (optional internal ID)
    quantity NUMERIC NOT NULL,
    unit_code TEXT NOT NULL, -- c_ClaveUnidad
    unit_name TEXT, -- Unidad (description)
    description TEXT NOT NULL,
    unit_price NUMERIC NOT NULL,
    amount NUMERIC NOT NULL, -- quantity * unit_price
    discount NUMERIC DEFAULT 0,
    tax_object_code TEXT NOT NULL DEFAULT '02', -- c_ObjetoImp (01=No objeto, 02=Sí objeto)
    -- Taxes (summary, details can be in separate table if needed)
    transferred_tax_amount NUMERIC DEFAULT 0,
    withheld_tax_amount NUMERIC DEFAULT 0,
    -- Metadata for PLD extraction
    metadata TEXT, -- JSON for activity-specific hints (vehicle VIN, property folio, etc.)
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
);

-- ============================================================================
-- Operations Domain (Core AML Entity - Replaces Transactions)
-- ============================================================================

CREATE TABLE operations (
    id TEXT PRIMARY KEY NOT NULL,
    organization_id TEXT NOT NULL,
    client_id TEXT NOT NULL,
    invoice_id TEXT, -- Optional link to CFDI invoice
    -- Activity identification
    activity_code TEXT NOT NULL, -- VEH, INM, MJR, AVI, JYS, ARI, BLI, DON, MPC, FEP, FES, SPR, CHV, TSC, TPP, TDR, TCV, OBA, DIN
    operation_type_code TEXT, -- Activity-specific operation type from catalog
    -- Core operation data
    operation_date DATETIME NOT NULL,
    branch_postal_code TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    currency_code TEXT NOT NULL DEFAULT 'MXN',
    exchange_rate NUMERIC DEFAULT 1,
    amount_mxn NUMERIC, -- Calculated: amount * exchange_rate
    -- UMA calculation
    uma_value NUMERIC, -- Operation amount in UMA units
    uma_daily_value NUMERIC, -- UMA daily value at operation date
    -- Alert tracking
    alert_type_code TEXT NOT NULL DEFAULT '100', -- Default: no alert
    alert_description TEXT,
    -- Watchlist screening (for async PEP/sanctions checks)
    watchlist_status TEXT DEFAULT 'PENDING' CHECK(watchlist_status IN ('PENDING','QUEUED','CHECKING','COMPLETED','ERROR','NOT_AVAILABLE')),
    watchlist_checked_at DATETIME,
    watchlist_result TEXT, -- JSON with screening results
    watchlist_flags TEXT, -- Comma-separated: pep,sanctions,adverse_media
    -- Priority for SAT notice
    priority_code TEXT DEFAULT '2', -- 1=Normal, 2=Con prioridad (default)
    -- Data origin & completeness
    data_source TEXT NOT NULL DEFAULT 'MANUAL', -- CFDI, MANUAL, IMPORT, ENRICHED
    completeness_status TEXT NOT NULL DEFAULT 'COMPLETE', -- COMPLETE, INCOMPLETE, MINIMUM
    missing_fields TEXT, -- JSON array of missing field names, e.g. ["vin","plates"]
    -- Metadata
    reference_number TEXT, -- Internal reference
    notes TEXT,
    -- Timestamps
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE SET NULL
);

-- Operation payments (replaces transaction_payment_methods)
CREATE TABLE operation_payments (
    id TEXT PRIMARY KEY NOT NULL,
    operation_id TEXT NOT NULL,
    payment_date DATETIME NOT NULL,
    payment_form_code TEXT NOT NULL, -- pld-payment-forms catalog code
    monetary_instrument_code TEXT, -- pld-monetary-instruments catalog code
    currency_code TEXT NOT NULL DEFAULT 'MXN',
    amount NUMERIC NOT NULL,
    -- Additional details
    bank_name TEXT,
    account_number_masked TEXT,
    check_number TEXT,
    reference TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (operation_id) REFERENCES operations(id) ON DELETE CASCADE
);

-- ============================================================================
-- Operation Extension Tables (Activity-Specific Details)
-- ============================================================================

-- VEH: Vehicles (Venta de Vehículos)
CREATE TABLE operation_vehicles (
    id TEXT PRIMARY KEY NOT NULL,
    operation_id TEXT NOT NULL UNIQUE,
    vehicle_type TEXT NOT NULL CHECK(vehicle_type IN ('LAND','MARINE','AIR')), -- terrestre, maritimo, aereo
    brand TEXT NOT NULL, -- marca_fabricante
    model TEXT NOT NULL, -- modelo
    year INTEGER NOT NULL, -- anio
    -- Land vehicle fields
    vin TEXT, -- VIN for terrestre
    repuve TEXT, -- REPUVE registration
    plates TEXT, -- placas
    -- Marine/Air vehicle fields
    serial_number TEXT, -- numero_serie
    flag_country_code TEXT, -- bandera (country code)
    registration_number TEXT, -- matricula
    -- Common
    armor_level_code TEXT, -- nivel_blindaje (0-8)
    engine_number TEXT,
    description TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (operation_id) REFERENCES operations(id) ON DELETE CASCADE
);

-- INM: Real Estate (Compraventa de Inmuebles)
CREATE TABLE operation_real_estate (
    id TEXT PRIMARY KEY NOT NULL,
    operation_id TEXT NOT NULL UNIQUE,
    property_type_code TEXT NOT NULL, -- tipo_inmueble
    -- Location
    street TEXT,
    external_number TEXT,
    internal_number TEXT,
    neighborhood TEXT, -- colonia
    postal_code TEXT,
    municipality TEXT,
    state_code TEXT,
    country_code TEXT DEFAULT 'MEX',
    -- Registry
    registry_folio TEXT, -- folio_real
    registry_date DATETIME,
    -- Dimensions
    land_area_m2 NUMERIC,
    construction_area_m2 NUMERIC,
    -- Figures
    client_figure_code TEXT, -- figura_cliente (comprador, vendedor, etc.)
    person_figure_code TEXT, -- figura_persona
    description TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (operation_id) REFERENCES operations(id) ON DELETE CASCADE
);

-- MJR: Jewelry and Precious Metals (Metales y Joyas)
CREATE TABLE operation_jewelry (
    id TEXT PRIMARY KEY NOT NULL,
    operation_id TEXT NOT NULL UNIQUE,
    item_type_code TEXT NOT NULL, -- tipo_articulo (oro, plata, platino, joya)
    -- Metal details
    metal_type TEXT, -- tipo_metal
    weight_grams NUMERIC, -- peso_gramos
    purity TEXT, -- pureza (ley)
    -- Jewelry details
    jewelry_description TEXT,
    brand TEXT,
    serial_number TEXT,
    -- Trade
    trade_unit_code TEXT, -- unidad_comercializacion
    quantity NUMERIC DEFAULT 1,
    unit_price NUMERIC,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (operation_id) REFERENCES operations(id) ON DELETE CASCADE
);

-- AVI: Virtual Assets (Activos Virtuales)
CREATE TABLE operation_virtual_assets (
    id TEXT PRIMARY KEY NOT NULL,
    operation_id TEXT NOT NULL UNIQUE,
    asset_type_code TEXT NOT NULL, -- tipo_activo_virtual
    asset_name TEXT, -- nombre del activo (Bitcoin, Ethereum, etc.)
    -- Operation details
    wallet_address_origin TEXT,
    wallet_address_destination TEXT,
    exchange_name TEXT, -- nombre del exchange
    exchange_country_code TEXT,
    -- Amounts
    asset_quantity NUMERIC,
    asset_unit_price NUMERIC,
    -- Hash/Reference
    blockchain_tx_hash TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (operation_id) REFERENCES operations(id) ON DELETE CASCADE
);

-- JYS: Gambling (Apuestas, Concursos y Sorteos)
CREATE TABLE operation_gambling (
    id TEXT PRIMARY KEY NOT NULL,
    operation_id TEXT NOT NULL UNIQUE,
    game_type_code TEXT, -- tipo_juego
    business_line_code TEXT, -- linea_negocio
    operation_method_code TEXT, -- forma_operacion
    -- Prize/Bet details
    prize_amount NUMERIC,
    bet_amount NUMERIC,
    ticket_number TEXT,
    event_name TEXT,
    event_date DATETIME,
    -- Property if applicable (JYS can involve property as prize)
    property_type_code TEXT,
    property_description TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (operation_id) REFERENCES operations(id) ON DELETE CASCADE
);

-- ARI: Rentals (Arrendamiento de Inmuebles)
CREATE TABLE operation_rentals (
    id TEXT PRIMARY KEY NOT NULL,
    operation_id TEXT NOT NULL UNIQUE,
    property_type_code TEXT NOT NULL, -- tipo_inmueble
    -- Rental terms
    rental_period_months INTEGER,
    monthly_rent NUMERIC,
    deposit_amount NUMERIC,
    contract_start_date DATETIME,
    contract_end_date DATETIME,
    -- Property location
    street TEXT,
    external_number TEXT,
    internal_number TEXT,
    neighborhood TEXT,
    postal_code TEXT,
    municipality TEXT,
    state_code TEXT,
    -- Additional
    is_prepaid INTEGER DEFAULT 0 CHECK(is_prepaid IN (0, 1)),
    prepaid_months INTEGER,
    description TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (operation_id) REFERENCES operations(id) ON DELETE CASCADE
);

-- BLI: Armoring (Blindaje)
CREATE TABLE operation_armoring (
    id TEXT PRIMARY KEY NOT NULL,
    operation_id TEXT NOT NULL UNIQUE,
    item_type TEXT NOT NULL, -- tipo_bien (vehiculo, inmueble, etc.)
    item_status_code TEXT, -- estado_bien (nuevo, usado)
    armor_level_code TEXT NOT NULL, -- nivel_blindaje
    armored_part_code TEXT, -- parte_blindada
    -- Vehicle details if applicable
    vehicle_type TEXT,
    vehicle_brand TEXT,
    vehicle_model TEXT,
    vehicle_year INTEGER,
    vehicle_vin TEXT,
    vehicle_plates TEXT,
    -- Service details
    service_description TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (operation_id) REFERENCES operations(id) ON DELETE CASCADE
);

-- DON: Donations (Donativos)
CREATE TABLE operation_donations (
    id TEXT PRIMARY KEY NOT NULL,
    operation_id TEXT NOT NULL UNIQUE,
    donation_type TEXT NOT NULL, -- tipo_donativo (efectivo, especie)
    purpose TEXT, -- destino del donativo
    -- For in-kind donations
    item_type_code TEXT, -- tipo_bien
    item_description TEXT,
    item_value NUMERIC,
    -- Donor/Recipient info
    is_anonymous INTEGER DEFAULT 0 CHECK(is_anonymous IN (0, 1)),
    campaign_name TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (operation_id) REFERENCES operations(id) ON DELETE CASCADE
);

-- MPC: Loans (Mutuo, Préstamos y Créditos)
CREATE TABLE operation_loans (
    id TEXT PRIMARY KEY NOT NULL,
    operation_id TEXT NOT NULL UNIQUE,
    loan_type_code TEXT, -- Not in catalog for MPC, free text
    guarantee_type_code TEXT, -- tipo_garantia
    -- Loan terms
    principal_amount NUMERIC NOT NULL,
    interest_rate NUMERIC,
    term_months INTEGER,
    monthly_payment NUMERIC,
    -- Dates
    disbursement_date DATETIME,
    maturity_date DATETIME,
    -- Guarantee details
    guarantee_description TEXT,
    guarantee_value NUMERIC,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (operation_id) REFERENCES operations(id) ON DELETE CASCADE
);

-- FEP: Public Officials/Notaries (Fedatarios Públicos - Notarios y Corredores)
CREATE TABLE operation_officials (
    id TEXT PRIMARY KEY NOT NULL,
    operation_id TEXT NOT NULL UNIQUE,
    act_type_code TEXT NOT NULL, -- tipo_acto (from FEP operation types)
    instrument_number TEXT, -- numero_instrumento
    instrument_date DATETIME,
    -- Trust specific (fideicomiso)
    trust_type_code TEXT, -- tipo_fideicomiso
    trust_identifier TEXT, -- identificador_fideicomiso
    trust_purpose TEXT,
    -- Movement/Assignment
    movement_type_code TEXT,
    assignment_type_code TEXT,
    -- Corporate actions
    merger_type_code TEXT,
    incorporation_reason_code TEXT,
    patrimony_modification_type_code TEXT,
    -- Power of attorney
    power_of_attorney_type_code TEXT,
    granting_type_code TEXT,
    -- Shareholder
    shareholder_position_code TEXT,
    share_percentage NUMERIC,
    -- Item/Property being transferred
    item_type_code TEXT,
    item_description TEXT,
    item_value NUMERIC,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (operation_id) REFERENCES operations(id) ON DELETE CASCADE
);

-- FES: Notary (Servidores Públicos / Fedatarios - similar to FEP but for public servants)
CREATE TABLE operation_notary (
    id TEXT PRIMARY KEY NOT NULL,
    operation_id TEXT NOT NULL UNIQUE,
    act_type_code TEXT NOT NULL, -- tipo_acto
    notary_number TEXT, -- numero_notaria
    notary_state_code TEXT,
    instrument_number TEXT,
    instrument_date DATETIME,
    -- Legal entity
    legal_entity_type_code TEXT, -- tipo_persona_moral
    person_character_type_code TEXT, -- caracter_persona
    -- Similar fields to FEP
    incorporation_reason_code TEXT,
    patrimony_modification_type_code TEXT,
    power_of_attorney_type_code TEXT,
    granting_type_code TEXT,
    shareholder_position_code TEXT,
    share_percentage NUMERIC,
    -- Appraisal (avalúo)
    item_type_code TEXT,
    item_description TEXT,
    appraisal_value NUMERIC,
    guarantee_type_code TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (operation_id) REFERENCES operations(id) ON DELETE CASCADE
);

-- SPR: Professional Services (Servicios Profesionales)
CREATE TABLE operation_professional (
    id TEXT PRIMARY KEY NOT NULL,
    operation_id TEXT NOT NULL UNIQUE,
    service_type_code TEXT NOT NULL, -- tipo_servicio (from SPR operation types)
    service_area_code TEXT, -- area_servicio
    -- Client figures
    client_figure_code TEXT, -- figura_cliente
    -- Corporate/Trust operations
    contribution_reason_code TEXT, -- motivo_aportacion
    assignment_type_code TEXT, -- tipo_cesion
    merger_type_code TEXT,
    incorporation_reason_code TEXT,
    shareholder_position_code TEXT,
    share_percentage NUMERIC,
    -- Asset management
    managed_asset_type_code TEXT, -- tipo_bien_administrado
    management_status_code TEXT, -- estatus_administracion
    -- Financial institution (if applicable)
    financial_institution_type_code TEXT,
    financial_institution_name TEXT,
    -- Service details
    occupation_code TEXT, -- ocupacion
    service_description TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (operation_id) REFERENCES operations(id) ON DELETE CASCADE
);

-- CHV: Traveler Checks (Cheques de Viajero)
CREATE TABLE operation_traveler_checks (
    id TEXT PRIMARY KEY NOT NULL,
    operation_id TEXT NOT NULL UNIQUE,
    denomination_code TEXT NOT NULL, -- denominacion
    check_count INTEGER NOT NULL,
    serial_numbers TEXT, -- JSON array or comma-separated
    -- Issuer
    issuer_name TEXT,
    issuer_country_code TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (operation_id) REFERENCES operations(id) ON DELETE CASCADE
);

-- TSC: Credit/Service Cards (Tarjetas de Servicio o Crédito)
CREATE TABLE operation_cards (
    id TEXT PRIMARY KEY NOT NULL,
    operation_id TEXT NOT NULL UNIQUE,
    card_type_code TEXT NOT NULL, -- tipo_tarjeta
    card_number_masked TEXT, -- Last 4 digits only
    card_brand TEXT, -- Visa, Mastercard, etc.
    -- Issuer
    issuer_name TEXT,
    credit_limit NUMERIC,
    -- Card transaction type (compra, retiro, pago)
    transaction_type TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (operation_id) REFERENCES operations(id) ON DELETE CASCADE
);

-- TPP: Prepaid Cards (Tarjetas Prepago, Vales y Cupones)
CREATE TABLE operation_prepaid (
    id TEXT PRIMARY KEY NOT NULL,
    operation_id TEXT NOT NULL UNIQUE,
    card_type TEXT NOT NULL, -- tipo_tarjeta/vale
    card_number_masked TEXT,
    -- Load/Reload
    is_initial_load INTEGER DEFAULT 1 CHECK(is_initial_load IN (0, 1)),
    reload_amount NUMERIC,
    current_balance NUMERIC,
    -- Issuer
    issuer_name TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (operation_id) REFERENCES operations(id) ON DELETE CASCADE
);

-- TDR: Rewards (Monederos de Devolución y Recompensas)
CREATE TABLE operation_rewards (
    id TEXT PRIMARY KEY NOT NULL,
    operation_id TEXT NOT NULL UNIQUE,
    reward_type TEXT NOT NULL, -- tipo_recompensa
    program_name TEXT,
    -- Points
    points_amount NUMERIC,
    points_value NUMERIC, -- Value in MXN
    points_expiry_date DATETIME,
    -- Redemption
    redemption_type TEXT, -- efectivo, producto, servicio
    redemption_description TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (operation_id) REFERENCES operations(id) ON DELETE CASCADE
);

-- TCV: Valuables Transport/Custody (Traslado y Custodia de Valores)
CREATE TABLE operation_valuables (
    id TEXT PRIMARY KEY NOT NULL,
    operation_id TEXT NOT NULL UNIQUE,
    value_type_code TEXT NOT NULL, -- tipo_valor
    service_type_code TEXT, -- tipo_servicio
    -- Transport
    transport_method TEXT, -- terrestre, aereo, maritimo
    origin_address TEXT,
    destination_address TEXT,
    -- Custody
    custody_start_date DATETIME,
    custody_end_date DATETIME,
    storage_location TEXT,
    -- Value details
    declared_value NUMERIC,
    insured_value NUMERIC,
    description TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (operation_id) REFERENCES operations(id) ON DELETE CASCADE
);

-- OBA: Art and Antiques (Obras de Arte y Antigüedades)
CREATE TABLE operation_art (
    id TEXT PRIMARY KEY NOT NULL,
    operation_id TEXT NOT NULL UNIQUE,
    artwork_type_code TEXT NOT NULL, -- tipo_obra
    -- Artwork details
    title TEXT,
    artist TEXT,
    year_created INTEGER,
    medium TEXT, -- oil, watercolor, sculpture, etc.
    dimensions TEXT,
    -- Provenance
    provenance TEXT,
    certificate_authenticity TEXT,
    previous_owner TEXT,
    -- Trade details
    is_antique INTEGER DEFAULT 0 CHECK(is_antique IN (0, 1)),
    auction_house TEXT,
    lot_number TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (operation_id) REFERENCES operations(id) ON DELETE CASCADE
);

-- DIN: Real Estate Development (Desarrollo Inmobiliario)
CREATE TABLE operation_development (
    id TEXT PRIMARY KEY NOT NULL,
    operation_id TEXT NOT NULL UNIQUE,
    development_type_code TEXT NOT NULL, -- tipo_desarrollo
    credit_type_code TEXT, -- tipo_credito
    -- Project
    project_name TEXT,
    project_location TEXT,
    -- Contribution
    contribution_type TEXT, -- aportacion, credito
    contribution_amount NUMERIC,
    -- Third party
    third_party_type_code TEXT, -- tipo_tercero
    third_party_name TEXT,
    -- Financial institution
    financial_institution_type_code TEXT,
    financial_institution_name TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (operation_id) REFERENCES operations(id) ON DELETE CASCADE
);

-- ============================================================================
-- UMA Values Domain
-- ============================================================================

CREATE TABLE uma_values (
    id TEXT PRIMARY KEY NOT NULL,
    year INTEGER NOT NULL UNIQUE,
    daily_value NUMERIC NOT NULL,
    effective_date DATETIME NOT NULL,
    end_date DATETIME,
    approved_by TEXT,
    notes TEXT,
    active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0, 1)),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- Organization Settings Domain
-- ============================================================================

CREATE TABLE organization_settings (
    id TEXT PRIMARY KEY NOT NULL,
    organization_id TEXT NOT NULL UNIQUE,
    obligated_subject_key TEXT NOT NULL, -- RFC of obligated subject
    activity_key TEXT NOT NULL, -- Primary vulnerable activity code
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- Reports Domain (Analytics and Business Intelligence)
-- ============================================================================

CREATE TABLE reports (
    id TEXT PRIMARY KEY NOT NULL,
    organization_id TEXT NOT NULL,
    name TEXT NOT NULL,
    template TEXT NOT NULL DEFAULT 'CUSTOM' CHECK(template IN ('EXECUTIVE_SUMMARY','COMPLIANCE_STATUS','OPERATION_ANALYSIS','CLIENT_RISK_PROFILE','ALERT_BREAKDOWN','PERIOD_COMPARISON','CUSTOM')),
    period_type TEXT NOT NULL DEFAULT 'CUSTOM' CHECK(period_type IN ('MONTHLY','QUARTERLY','ANNUAL','CUSTOM')),
    period_start DATETIME NOT NULL,
    period_end DATETIME NOT NULL,
    comparison_period_start DATETIME,
    comparison_period_end DATETIME,
    data_sources TEXT NOT NULL DEFAULT '["ALERTS"]',
    filters TEXT NOT NULL DEFAULT '{}',
    client_id TEXT REFERENCES clients(id) ON DELETE SET NULL,
    charts TEXT NOT NULL DEFAULT '[]',
    include_summary_cards INTEGER NOT NULL DEFAULT 1,
    include_detail_tables INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','GENERATED')),
    pdf_file_url TEXT,
    file_size INTEGER,
    generated_at DATETIME,
    created_by TEXT,
    notes TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- Notices Domain (SAT Regulatory Submissions)
-- ============================================================================

CREATE TABLE notices (
    id TEXT PRIMARY KEY NOT NULL,
    organization_id TEXT NOT NULL,
    name TEXT NOT NULL,
    activity_code TEXT NOT NULL DEFAULT 'VEH', -- Vulnerable activity for this notice
    status TEXT NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','GENERATED','SUBMITTED','ACKNOWLEDGED')),
    period_start DATETIME NOT NULL,
    period_end DATETIME NOT NULL,
    reported_month TEXT NOT NULL,
    record_count INTEGER NOT NULL DEFAULT 0,
    xml_file_url TEXT,
    file_size INTEGER,
    generated_at DATETIME,
    submitted_at DATETIME,
    sat_folio_number TEXT,
    created_by TEXT,
    notes TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- Alert System Domain
-- ============================================================================

CREATE TABLE alert_rules (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0, 1)),
    severity TEXT NOT NULL DEFAULT 'MEDIUM' CHECK(severity IN ('LOW','MEDIUM','HIGH','CRITICAL')),
    rule_type TEXT, -- threshold, velocity, foreign_transfer, etc.
    is_manual_only INTEGER NOT NULL DEFAULT 0 CHECK(is_manual_only IN (0, 1)),
    activity_code TEXT NOT NULL DEFAULT 'VEH', -- Which VA this rule applies to
    metadata TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE alert_rule_config (
    id TEXT PRIMARY KEY NOT NULL,
    alert_rule_id TEXT NOT NULL,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    is_hardcoded INTEGER NOT NULL DEFAULT 0 CHECK(is_hardcoded IN (0, 1)),
    description TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(alert_rule_id, key),
    FOREIGN KEY (alert_rule_id) REFERENCES alert_rules(id) ON DELETE CASCADE
);

CREATE TABLE alerts (
    id TEXT PRIMARY KEY NOT NULL,
    organization_id TEXT NOT NULL,
    alert_rule_id TEXT NOT NULL,
    client_id TEXT NOT NULL,
    report_id TEXT REFERENCES reports(id) ON DELETE SET NULL,
    notice_id TEXT REFERENCES notices(id) ON DELETE SET NULL,
    operation_id TEXT REFERENCES operations(id) ON DELETE SET NULL, -- Changed from transaction_id
    activity_code TEXT NOT NULL DEFAULT 'VEH', -- Activity this alert belongs to
    status TEXT NOT NULL DEFAULT 'DETECTED' CHECK(status IN ('DETECTED','FILE_GENERATED','SUBMITTED','OVERDUE','CANCELLED')),
    severity TEXT NOT NULL CHECK(severity IN ('LOW','MEDIUM','HIGH','CRITICAL')),
    idempotency_key TEXT NOT NULL UNIQUE,
    context_hash TEXT NOT NULL,
    metadata TEXT NOT NULL,
    is_manual INTEGER NOT NULL DEFAULT 0 CHECK(is_manual IN (0, 1)),
    submission_deadline DATETIME,
    file_generated_at DATETIME,
    submitted_at DATETIME,
    sat_acknowledgment_receipt TEXT,
    sat_folio_number TEXT,
    is_overdue INTEGER NOT NULL DEFAULT 0 CHECK(is_overdue IN (0, 1)),
    notes TEXT,
    reviewed_at DATETIME,
    reviewed_by TEXT,
    cancelled_at DATETIME,
    cancelled_by TEXT,
    cancellation_reason TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (alert_rule_id) REFERENCES alert_rules(id) ON DELETE RESTRICT,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

-- ============================================================================
-- Imports Domain (Bulk Data Import)
-- ============================================================================

CREATE TABLE imports (
    id TEXT PRIMARY KEY NOT NULL,
    organization_id TEXT NOT NULL,
    entity_type TEXT NOT NULL CHECK(entity_type IN ('CLIENT','OPERATION')), -- Changed TRANSACTION to OPERATION
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','VALIDATING','PROCESSING','COMPLETED','FAILED')),
    total_rows INTEGER NOT NULL DEFAULT 0,
    processed_rows INTEGER NOT NULL DEFAULT 0,
    success_count INTEGER NOT NULL DEFAULT 0,
    warning_count INTEGER NOT NULL DEFAULT 0,
    error_count INTEGER NOT NULL DEFAULT 0,
    error_message TEXT,
    created_by TEXT NOT NULL,
    started_at DATETIME,
    completed_at DATETIME,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE import_row_results (
    id TEXT PRIMARY KEY NOT NULL,
    import_id TEXT NOT NULL,
    row_number INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','SUCCESS','WARNING','ERROR','SKIPPED')),
    raw_data TEXT NOT NULL,
    entity_id TEXT,
    message TEXT,
    errors TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (import_id) REFERENCES imports(id) ON DELETE CASCADE
);

-- ============================================================================
-- Indexes
-- ============================================================================

-- Clients indexes
CREATE UNIQUE INDEX idx_clients_organization_id_rfc ON clients(organization_id, rfc) WHERE deleted_at IS NULL;
CREATE INDEX idx_clients_organization_id ON clients(organization_id);
CREATE INDEX idx_clients_rfc ON clients(rfc);
CREATE INDEX idx_clients_person_type ON clients(person_type);
CREATE INDEX idx_clients_deleted_at ON clients(deleted_at);
CREATE INDEX idx_clients_country_code ON clients(country_code);
CREATE INDEX idx_clients_economic_activity_code ON clients(economic_activity_code);
CREATE INDEX idx_clients_kyc_status ON clients(kyc_status);
CREATE INDEX idx_clients_pep_status ON clients(pep_status);
CREATE INDEX idx_clients_pep_checked_at ON clients(pep_checked_at);

-- Upload links indexes
CREATE INDEX idx_upload_links_organization_id ON upload_links(organization_id);
CREATE INDEX idx_upload_links_client_id ON upload_links(client_id);
CREATE INDEX idx_upload_links_doc_svc_link_id ON upload_links(doc_svc_link_id);
CREATE INDEX idx_upload_links_status ON upload_links(status);
CREATE INDEX idx_upload_links_expires_at ON upload_links(expires_at);

-- Client documents indexes
CREATE INDEX idx_client_documents_client_id ON client_documents(client_id);
CREATE INDEX idx_client_documents_document_type ON client_documents(document_type);
CREATE INDEX idx_client_documents_status ON client_documents(status);
CREATE INDEX idx_client_documents_expiry_date ON client_documents(expiry_date);
CREATE INDEX idx_client_documents_doc_svc_document_id ON client_documents(doc_svc_document_id);
CREATE INDEX idx_client_documents_upload_link_id ON client_documents(upload_link_id);

-- Client addresses indexes
CREATE INDEX idx_client_addresses_client_id ON client_addresses(client_id);
CREATE INDEX idx_client_addresses_address_type ON client_addresses(address_type);
CREATE INDEX idx_client_addresses_country ON client_addresses(country);

-- Ultimate beneficial owners indexes
CREATE INDEX idx_ubos_client_id ON ultimate_beneficial_owners(client_id);
CREATE INDEX idx_ubos_relationship_type ON ultimate_beneficial_owners(relationship_type);
CREATE INDEX idx_ubos_pep_status ON ultimate_beneficial_owners(pep_status);
CREATE INDEX idx_ubos_pep_checked_at ON ultimate_beneficial_owners(pep_checked_at);

-- Catalogs indexes
CREATE INDEX idx_catalogs_active ON catalogs(active);

-- Catalog items indexes
CREATE INDEX idx_catalog_items_catalog_id ON catalog_items(catalog_id);
CREATE INDEX idx_catalog_items_normalized_name ON catalog_items(normalized_name);
CREATE INDEX idx_catalog_items_active ON catalog_items(active);

-- Invoices indexes
CREATE INDEX idx_invoices_organization_id ON invoices(organization_id);
CREATE INDEX idx_invoices_uuid ON invoices(uuid);
CREATE INDEX idx_invoices_issuer_rfc ON invoices(issuer_rfc);
CREATE INDEX idx_invoices_receiver_rfc ON invoices(receiver_rfc);
CREATE INDEX idx_invoices_issue_date ON invoices(issue_date);
CREATE INDEX idx_invoices_voucher_type_code ON invoices(voucher_type_code);
CREATE INDEX idx_invoices_deleted_at ON invoices(deleted_at);

-- Invoice items indexes
CREATE INDEX idx_invoice_items_invoice_id ON invoice_items(invoice_id);
CREATE INDEX idx_invoice_items_product_service_code ON invoice_items(product_service_code);

-- Operations indexes
CREATE INDEX idx_operations_organization_id ON operations(organization_id);
CREATE INDEX idx_operations_client_id ON operations(client_id);
CREATE INDEX idx_operations_invoice_id ON operations(invoice_id);
CREATE INDEX idx_operations_activity_code ON operations(activity_code);
CREATE INDEX idx_operations_operation_type_code ON operations(operation_type_code);
CREATE INDEX idx_operations_operation_date ON operations(operation_date);
CREATE INDEX idx_operations_currency_code ON operations(currency_code);
CREATE INDEX idx_operations_alert_type_code ON operations(alert_type_code);
CREATE INDEX idx_operations_watchlist_status ON operations(watchlist_status);
CREATE INDEX idx_operations_deleted_at ON operations(deleted_at);

-- Operation payments indexes
CREATE INDEX idx_operation_payments_operation_id ON operation_payments(operation_id);
CREATE INDEX idx_operation_payments_payment_form_code ON operation_payments(payment_form_code);

-- Operation extension table indexes (one unique index per table on operation_id already in table def)
CREATE INDEX idx_operation_vehicles_vehicle_type ON operation_vehicles(vehicle_type);
CREATE INDEX idx_operation_vehicles_vin ON operation_vehicles(vin);
CREATE INDEX idx_operation_real_estate_property_type_code ON operation_real_estate(property_type_code);
CREATE INDEX idx_operation_real_estate_postal_code ON operation_real_estate(postal_code);
CREATE INDEX idx_operation_jewelry_item_type_code ON operation_jewelry(item_type_code);
CREATE INDEX idx_operation_virtual_assets_asset_type_code ON operation_virtual_assets(asset_type_code);
CREATE INDEX idx_operation_gambling_game_type_code ON operation_gambling(game_type_code);
CREATE INDEX idx_operation_rentals_property_type_code ON operation_rentals(property_type_code);
CREATE INDEX idx_operation_armoring_armor_level_code ON operation_armoring(armor_level_code);
CREATE INDEX idx_operation_donations_donation_type ON operation_donations(donation_type);
CREATE INDEX idx_operation_loans_loan_type_code ON operation_loans(loan_type_code);
CREATE INDEX idx_operation_officials_act_type_code ON operation_officials(act_type_code);
CREATE INDEX idx_operation_notary_act_type_code ON operation_notary(act_type_code);
CREATE INDEX idx_operation_professional_service_type_code ON operation_professional(service_type_code);
CREATE INDEX idx_operation_traveler_checks_denomination_code ON operation_traveler_checks(denomination_code);
CREATE INDEX idx_operation_cards_card_type_code ON operation_cards(card_type_code);
CREATE INDEX idx_operation_prepaid_card_type ON operation_prepaid(card_type);
CREATE INDEX idx_operation_rewards_reward_type ON operation_rewards(reward_type);
CREATE INDEX idx_operation_valuables_value_type_code ON operation_valuables(value_type_code);
CREATE INDEX idx_operation_art_artwork_type_code ON operation_art(artwork_type_code);
CREATE INDEX idx_operation_development_development_type_code ON operation_development(development_type_code);

-- UMA values indexes
CREATE INDEX idx_uma_values_year ON uma_values(year);
CREATE INDEX idx_uma_values_active ON uma_values(active);
CREATE INDEX idx_uma_values_effective_date ON uma_values(effective_date);

-- Organization settings indexes
CREATE INDEX idx_organization_settings_organization_id ON organization_settings(organization_id);
CREATE INDEX idx_organization_settings_obligated_subject_key ON organization_settings(obligated_subject_key);
CREATE INDEX idx_organization_settings_activity_key ON organization_settings(activity_key);

-- Reports indexes
CREATE INDEX idx_reports_organization_id ON reports(organization_id);
CREATE INDEX idx_reports_template ON reports(template);
CREATE INDEX idx_reports_period_type ON reports(period_type);
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_period_start ON reports(period_start);
CREATE INDEX idx_reports_period_end ON reports(period_end);
CREATE INDEX idx_reports_client_id ON reports(client_id);

-- Notices indexes
CREATE INDEX idx_notices_organization_id ON notices(organization_id);
CREATE INDEX idx_notices_activity_code ON notices(activity_code);
CREATE INDEX idx_notices_status ON notices(status);
CREATE INDEX idx_notices_period_start ON notices(period_start);
CREATE INDEX idx_notices_period_end ON notices(period_end);
CREATE INDEX idx_notices_reported_month ON notices(reported_month);

-- Alert rules indexes
CREATE INDEX idx_alert_rules_active ON alert_rules(active);
CREATE INDEX idx_alert_rules_severity ON alert_rules(severity);
CREATE INDEX idx_alert_rules_rule_type ON alert_rules(rule_type);
CREATE INDEX idx_alert_rules_activity_code ON alert_rules(activity_code);
CREATE INDEX idx_alert_rules_is_manual_only ON alert_rules(is_manual_only);

-- Alert rule config indexes
CREATE UNIQUE INDEX idx_alert_rule_config_alert_rule_id_key ON alert_rule_config(alert_rule_id, key);
CREATE INDEX idx_alert_rule_config_alert_rule_id ON alert_rule_config(alert_rule_id);
CREATE INDEX idx_alert_rule_config_key ON alert_rule_config(key);
CREATE INDEX idx_alert_rule_config_is_hardcoded ON alert_rule_config(is_hardcoded);

-- Alerts indexes
CREATE INDEX idx_alerts_organization_id ON alerts(organization_id);
CREATE INDEX idx_alerts_alert_rule_id ON alerts(alert_rule_id);
CREATE INDEX idx_alerts_client_id ON alerts(client_id);
CREATE INDEX idx_alerts_report_id ON alerts(report_id);
CREATE INDEX idx_alerts_notice_id ON alerts(notice_id);
CREATE INDEX idx_alerts_operation_id ON alerts(operation_id);
CREATE INDEX idx_alerts_activity_code ON alerts(activity_code);
CREATE INDEX idx_alerts_status ON alerts(status);
CREATE INDEX idx_alerts_severity ON alerts(severity);
CREATE INDEX idx_alerts_created_at ON alerts(created_at);
CREATE UNIQUE INDEX idx_alerts_idempotency_key ON alerts(idempotency_key);
CREATE INDEX idx_alerts_submission_deadline ON alerts(submission_deadline);
CREATE INDEX idx_alerts_is_overdue ON alerts(is_overdue);
CREATE INDEX idx_alerts_submitted_at ON alerts(submitted_at);
CREATE INDEX idx_alerts_is_manual ON alerts(is_manual);

-- Imports indexes
CREATE INDEX idx_imports_organization_id ON imports(organization_id);
CREATE INDEX idx_imports_status ON imports(status);
CREATE INDEX idx_imports_entity_type ON imports(entity_type);
CREATE INDEX idx_imports_created_at ON imports(created_at);
CREATE INDEX idx_imports_created_by ON imports(created_by);

-- Import row results indexes
CREATE INDEX idx_import_row_results_import_id ON import_row_results(import_id);
CREATE INDEX idx_import_row_results_status ON import_row_results(status);
CREATE INDEX idx_import_row_results_row_number ON import_row_results(row_number);
