-- Manual one-time backfill for watchlist rescan policy (90-day interval, higher per-run cap).
-- NOT applied by wrangler d1 migrations apply — run explicitly when ready (see sibling .md).
--
-- Recommended order: (1) run this SQL on each D1 database → (2) deploy aml-svc with new code/cron.

-- Force every org to a 90-day rescan interval (per product decision).
UPDATE organization_settings
SET watchlist_rescan_interval_days = 90,
    updated_at = CURRENT_TIMESTAMP
WHERE watchlist_rescan_interval_days <> 90;

-- Optional: align legacy 500/day cap with new Prisma default (5000) for weekly batch runs.
-- Uncomment if you want existing orgs on the old default bumped up.
-- UPDATE organization_settings
-- SET watchlist_rescan_daily_cap = 5000,
--     updated_at = CURRENT_TIMESTAMP
-- WHERE watchlist_rescan_daily_cap = 500;

-- Verification
SELECT
  COUNT(*) AS total_orgs,
  SUM(CASE WHEN watchlist_rescan_interval_days = 90 THEN 1 ELSE 0 END) AS orgs_at_90d,
  MIN(watchlist_rescan_interval_days) AS min_interval,
  MAX(watchlist_rescan_interval_days) AS max_interval
FROM organization_settings;
