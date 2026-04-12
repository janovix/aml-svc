-- Migration: Risk-Based Approach (Art. 18-VII through XI LFPIORPI Reform 2025)
-- Adds reference catalogs, organization EBR, and client risk classification models

-- =============================================================================
-- Reference Catalogs (ENR 2023 derived)
-- =============================================================================

CREATE TABLE IF NOT EXISTS "geographic_risk_zones" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "state_code" TEXT NOT NULL,
    "state_name" TEXT NOT NULL,
    "risk_level" TEXT NOT NULL,
    "risk_score" REAL NOT NULL,
    "factors" TEXT,
    "source" TEXT NOT NULL DEFAULT 'ENR_2023',
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "geographic_risk_zones_state_code_key" ON "geographic_risk_zones"("state_code");

CREATE TABLE IF NOT EXISTS "activity_risk_profiles" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "activity_key" TEXT NOT NULL,
    "activity_name" TEXT NOT NULL,
    "risk_level" TEXT NOT NULL,
    "risk_score" REAL NOT NULL,
    "liquidity_factor" REAL NOT NULL,
    "anonymity_factor" REAL NOT NULL,
    "value_transfer_factor" REAL NOT NULL,
    "cash_intensity_factor" REAL NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'ENR_2023',
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "activity_risk_profiles_activity_key_key" ON "activity_risk_profiles"("activity_key");

CREATE TABLE IF NOT EXISTS "jurisdiction_risks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "country_code" TEXT NOT NULL,
    "country_name" TEXT NOT NULL,
    "risk_level" TEXT NOT NULL,
    "risk_score" REAL NOT NULL,
    "preferential_tax" INTEGER NOT NULL DEFAULT 0,
    "gafi_deficient" INTEGER NOT NULL DEFAULT 0,
    "high_corruption" INTEGER NOT NULL DEFAULT 0,
    "source" TEXT NOT NULL DEFAULT 'GAFI_2023',
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "jurisdiction_risks_country_code_key" ON "jurisdiction_risks"("country_code");

-- =============================================================================
-- Organization Risk Assessment (Art. 18-VII entity side)
-- =============================================================================

CREATE TABLE IF NOT EXISTS "org_risk_assessments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organization_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "inherent_risk_score" REAL,
    "residual_risk_score" REAL,
    "risk_level" TEXT,
    "required_audit_type" TEXT,
    "fp_risk_level" TEXT,
    "fp_risk_justification" TEXT,
    "period_start_date" DATETIME NOT NULL,
    "period_end_date" DATETIME NOT NULL,
    "assessed_by" TEXT NOT NULL,
    "next_review_deadline" DATETIME,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "org_risk_assessments_organization_id_idx" ON "org_risk_assessments"("organization_id");
CREATE INDEX IF NOT EXISTS "org_risk_assessments_status_idx" ON "org_risk_assessments"("status");

CREATE TABLE IF NOT EXISTS "org_risk_elements" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "assessment_id" TEXT NOT NULL,
    "element_type" TEXT NOT NULL,
    "weight" REAL NOT NULL,
    "risk_score" REAL NOT NULL,
    "risk_level" TEXT NOT NULL,
    "factor_breakdown" TEXT NOT NULL,
    "justification" TEXT,
    CONSTRAINT "org_risk_elements_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "org_risk_assessments" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "org_risk_elements_assessment_id_idx" ON "org_risk_elements"("assessment_id");

CREATE TABLE IF NOT EXISTS "org_mitigants" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "assessment_id" TEXT NOT NULL,
    "mitigant_key" TEXT NOT NULL,
    "mitigant_name" TEXT NOT NULL,
    "exists" INTEGER NOT NULL DEFAULT 1,
    "effectiveness_score" REAL NOT NULL,
    "risk_effect" REAL NOT NULL,
    "justification" TEXT,
    CONSTRAINT "org_mitigants_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "org_risk_assessments" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "org_mitigants_assessment_id_idx" ON "org_mitigants"("assessment_id");

-- =============================================================================
-- Client Risk Classification (Art. 18-VII client side)
-- =============================================================================

CREATE TABLE IF NOT EXISTS "client_risk_assessments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "client_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "inherent_risk_score" REAL NOT NULL,
    "residual_risk_score" REAL NOT NULL,
    "risk_level" TEXT NOT NULL,
    "due_diligence_level" TEXT NOT NULL,
    "client_factors" TEXT NOT NULL,
    "geographic_factors" TEXT NOT NULL,
    "activity_factors" TEXT NOT NULL,
    "transaction_factors" TEXT NOT NULL,
    "mitigant_factors" TEXT NOT NULL,
    "assessed_at" DATETIME NOT NULL,
    "next_review_at" DATETIME NOT NULL,
    "assessed_by" TEXT NOT NULL,
    "trigger_reason" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "client_risk_assessments_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "client_risk_assessments_client_id_idx" ON "client_risk_assessments"("client_id");
CREATE INDEX IF NOT EXISTS "client_risk_assessments_organization_id_idx" ON "client_risk_assessments"("organization_id");
CREATE INDEX IF NOT EXISTS "client_risk_assessments_risk_level_idx" ON "client_risk_assessments"("risk_level");

-- =============================================================================
-- Client table: add risk denormalized fields
-- =============================================================================

ALTER TABLE "clients" ADD COLUMN "risk_level" TEXT;
ALTER TABLE "clients" ADD COLUMN "due_diligence_level" TEXT;
ALTER TABLE "clients" ADD COLUMN "last_risk_assessment" DATETIME;
ALTER TABLE "clients" ADD COLUMN "next_risk_review" DATETIME;
CREATE INDEX IF NOT EXISTS "clients_risk_level_idx" ON "clients"("risk_level");
CREATE INDEX IF NOT EXISTS "clients_next_risk_review_idx" ON "clients"("next_risk_review");
