-- organization_settings is org-wide configuration, not per-environment data.
-- Revert the per-env scoping introduced in 0006_environment_isolation.sql for
-- this single table. The existing UNIQUE(organization_id) is the right shape.
DROP INDEX IF EXISTS "idx_org_settings_org_env";
ALTER TABLE "organization_settings" DROP COLUMN "environment";
