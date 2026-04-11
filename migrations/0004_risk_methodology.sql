-- Risk Methodology Configuration (Dynamic EBR -- FATF R.1 / Art. 18-VII)
-- Normalized relational model: Methodology -> Categories -> Factors -> ScoreMaps + Thresholds

-- Add methodology_id linkage to existing assessment tables
ALTER TABLE client_risk_assessments ADD COLUMN methodology_id TEXT;
ALTER TABLE org_risk_assessments ADD COLUMN methodology_id TEXT;

CREATE INDEX idx_client_risk_assessments_methodology ON client_risk_assessments(methodology_id);

-- Core methodology table
CREATE TABLE risk_methodologies (
  id TEXT PRIMARY KEY,
  scope TEXT NOT NULL,
  activity_key TEXT,
  organization_id TEXT,
  name TEXT NOT NULL,
  description TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  scoring_formula TEXT NOT NULL DEFAULT 'weighted_sum',
  scale_max REAL NOT NULL DEFAULT 9.0,
  created_by TEXT NOT NULL,
  approved_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX idx_risk_methodologies_scope_unique ON risk_methodologies(scope, activity_key, organization_id, status);
CREATE INDEX idx_risk_methodologies_scope_status ON risk_methodologies(scope, status);
CREATE INDEX idx_risk_methodologies_activity ON risk_methodologies(activity_key);
CREATE INDEX idx_risk_methodologies_org ON risk_methodologies(organization_id);

-- Risk categories (4 elements per FATF/ENR)
CREATE TABLE risk_categories (
  id TEXT PRIMARY KEY,
  methodology_id TEXT NOT NULL,
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  weight REAL NOT NULL,
  display_order INTEGER NOT NULL,
  FOREIGN KEY (methodology_id) REFERENCES risk_methodologies(id) ON DELETE CASCADE
);

CREATE INDEX idx_risk_categories_methodology ON risk_categories(methodology_id);

-- Risk factors within each category
CREATE TABLE risk_factors (
  id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL,
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  weight REAL NOT NULL,
  factor_type TEXT NOT NULL,
  data_source TEXT NOT NULL,
  display_order INTEGER NOT NULL,
  description TEXT,
  FOREIGN KEY (category_id) REFERENCES risk_categories(id) ON DELETE CASCADE
);

CREATE INDEX idx_risk_factors_category ON risk_factors(category_id);

-- Score maps: condition -> score mappings for each factor
CREATE TABLE risk_factor_score_maps (
  id TEXT PRIMARY KEY,
  factor_id TEXT NOT NULL,
  condition_type TEXT NOT NULL,
  condition_value TEXT NOT NULL,
  score REAL NOT NULL,
  label TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (factor_id) REFERENCES risk_factors(id) ON DELETE CASCADE
);

CREATE INDEX idx_risk_factor_score_maps_factor ON risk_factor_score_maps(factor_id);

-- Risk level thresholds with DD and review frequency
CREATE TABLE risk_thresholds (
  id TEXT PRIMARY KEY,
  methodology_id TEXT NOT NULL,
  risk_level TEXT NOT NULL,
  min_score REAL NOT NULL,
  max_score REAL NOT NULL,
  dd_level TEXT NOT NULL,
  review_months INTEGER NOT NULL,
  display_order INTEGER NOT NULL,
  FOREIGN KEY (methodology_id) REFERENCES risk_methodologies(id) ON DELETE CASCADE
);

CREATE INDEX idx_risk_thresholds_methodology ON risk_thresholds(methodology_id);

-- Mitigant definitions
CREATE TABLE risk_mitigant_defs (
  id TEXT PRIMARY KEY,
  methodology_id TEXT NOT NULL,
  mitigant_key TEXT NOT NULL,
  display_name TEXT NOT NULL,
  max_effect REAL NOT NULL,
  weight REAL NOT NULL,
  data_source TEXT NOT NULL,
  display_order INTEGER NOT NULL,
  FOREIGN KEY (methodology_id) REFERENCES risk_methodologies(id) ON DELETE CASCADE
);

CREATE INDEX idx_risk_mitigant_defs_methodology ON risk_mitigant_defs(methodology_id);

-- Audit trail for methodology changes
CREATE TABLE methodology_audit_logs (
  id TEXT PRIMARY KEY,
  methodology_id TEXT NOT NULL,
  change_type TEXT NOT NULL,
  previous_value TEXT,
  new_value TEXT,
  changed_by TEXT NOT NULL,
  justification TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (methodology_id) REFERENCES risk_methodologies(id) ON DELETE CASCADE
);

CREATE INDEX idx_methodology_audit_logs_methodology ON methodology_audit_logs(methodology_id);
