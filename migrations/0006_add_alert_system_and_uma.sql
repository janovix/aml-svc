-- Migration: Add Alert Detection System and UMA Values
-- Description: Add alert_rules, alerts tables, and uma_values table with pre-populated UMA values from INEGI
-- UMA values source: https://www.inegi.org.mx/contenidos/saladeprensa/boletines/2025/uma/uma2025.pdf
-- NOTE: UMA values should be verified and updated with exact values from the INEGI PDF

-- Create alert_rules table
CREATE TABLE IF NOT EXISTS alert_rules (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0, 1)),
    severity TEXT NOT NULL DEFAULT 'MEDIUM' CHECK(severity IN ('LOW','MEDIUM','HIGH','CRITICAL')),
    ruleConfig TEXT NOT NULL, -- JSON string containing dynamic rule configuration
    metadata TEXT, -- Additional metadata as JSON
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for alert_rules
CREATE INDEX IF NOT EXISTS idx_alert_rules_active ON alert_rules(active);
CREATE INDEX IF NOT EXISTS idx_alert_rules_severity ON alert_rules(severity);

-- Create alerts table
CREATE TABLE IF NOT EXISTS alerts (
    id TEXT PRIMARY KEY NOT NULL,
    alertRuleId TEXT NOT NULL,
    clientId TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','REVIEWED','RESOLVED','DISMISSED')),
    severity TEXT NOT NULL CHECK(severity IN ('LOW','MEDIUM','HIGH','CRITICAL')),
    idempotencyKey TEXT NOT NULL UNIQUE, -- Ensures no duplicate alerts
    contextHash TEXT NOT NULL, -- Hash of the specific data that triggered this alert
    alertData TEXT NOT NULL, -- JSON string with alert-specific data
    triggerTransactionId TEXT, -- Optional reference to the transaction that triggered the alert
    notes TEXT,
    reviewedAt DATETIME,
    reviewedBy TEXT,
    resolvedAt DATETIME,
    resolvedBy TEXT,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (alertRuleId) REFERENCES alert_rules(id) ON DELETE RESTRICT,
    FOREIGN KEY (clientId) REFERENCES clients(rfc) ON DELETE CASCADE
);

-- Create indexes for alerts
CREATE INDEX IF NOT EXISTS idx_alerts_alertRuleId ON alerts(alertRuleId);
CREATE INDEX IF NOT EXISTS idx_alerts_clientId ON alerts(clientId);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity);
CREATE INDEX IF NOT EXISTS idx_alerts_createdAt ON alerts(createdAt);
CREATE INDEX IF NOT EXISTS idx_alerts_idempotencyKey ON alerts(idempotencyKey);

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

-- Pre-populate UMA values from INEGI
-- Source: https://www.inegi.org.mx/contenidos/saladeprensa/boletines/2025/uma/uma2025.pdf
-- 
-- IMPORTANT: The 2025 UMA value below is a PLACEHOLDER and MUST be updated with the exact value
-- from the official INEGI PDF. The value is typically published in December for the following year.
-- 
-- To update the value after migration:
-- 1. Check the official INEGI PDF for the exact 2025 UMA daily value
-- 2. Update using: UPDATE uma_values SET dailyValue = <exact_value> WHERE year = 2025;
-- 3. Or use the script: node scripts/update-uma-values.mjs
--
-- Historical UMA values (for reference):
-- 2024: ~108.57 MXN
-- 2023: ~103.74 MXN  
-- 2022: ~96.22 MXN

-- UMA 2025 (PLACEHOLDER - MUST BE UPDATED WITH EXACT VALUE FROM INEGI PDF)
INSERT INTO uma_values (
    id,
    year,
    dailyValue,
    effectiveDate,
    endDate,
    approvedBy,
    notes,
    active,
    createdAt,
    updatedAt
) VALUES (
    lower(hex(randomblob(16))),
    2025,
    108.57, -- ⚠️ PLACEHOLDER: Update with exact value from INEGI PDF
    '2025-01-01T00:00:00Z',
    '2025-12-31T23:59:59Z',
    'system',
    'UMA value for 2025 - Source: INEGI. ⚠️ VALUE MUST BE VERIFIED AND UPDATED with exact value from official PDF: https://www.inegi.org.mx/contenidos/saladeprensa/boletines/2025/uma/uma2025.pdf',
    1, -- Set as active for 2025
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

-- UMA 2024 (Historical value - typically around 108.57)
-- Keep for historical reference
INSERT INTO uma_values (
    id,
    year,
    dailyValue,
    effectiveDate,
    endDate,
    approvedBy,
    notes,
    active,
    createdAt,
    updatedAt
) VALUES (
    lower(hex(randomblob(16))),
    2024,
    108.57, -- Historical value - verify if needed
    '2024-01-01T00:00:00Z',
    '2024-12-31T23:59:59Z',
    'system',
    'UMA value for 2024 - Historical reference',
    0, -- Not active (2025 is active)
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

-- UMA 2023 (Historical value - typically around 103.74)
INSERT INTO uma_values (
    id,
    year,
    dailyValue,
    effectiveDate,
    endDate,
    approvedBy,
    notes,
    active,
    createdAt,
    updatedAt
) VALUES (
    lower(hex(randomblob(16))),
    2023,
    103.74, -- Historical value
    '2023-01-01T00:00:00Z',
    '2023-12-31T23:59:59Z',
    'system',
    'UMA value for 2023 - Historical reference',
    0,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

-- UMA 2022 (Historical value - typically around 96.22)
INSERT INTO uma_values (
    id,
    year,
    dailyValue,
    effectiveDate,
    endDate,
    approvedBy,
    notes,
    active,
    createdAt,
    updatedAt
) VALUES (
    lower(hex(randomblob(16))),
    2022,
    96.22, -- Historical value
    '2022-01-01T00:00:00Z',
    '2022-12-31T23:59:59Z',
    'system',
    'UMA value for 2022 - Historical reference',
    0,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);
