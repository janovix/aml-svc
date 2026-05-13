# Manual D1: watchlist rescan 90-day interval

This folder is **not** part of automated migrations. Apply the SQL in `2026-05-13-watchlist-rescan-90d.sql` yourself against each environment’s AML D1 database **before** (or alongside) deploying the aml-svc changes that assume a 90-day default and weekly cron.

## Why

- Prisma `@default(90)` only affects **new** `organization_settings` rows created after deploy.
- Existing rows keep their stored `watchlist_rescan_interval_days` until you `UPDATE` them.

## Suggested order

1. **Dry-run** (optional): count rows that would change.

   ```bash
   wrangler d1 execute <AML_D1_NAME> --remote --command="SELECT COUNT(*) AS n FROM organization_settings WHERE watchlist_rescan_interval_days <> 90;"
   ```

2. **Apply** the script (replace `<AML_D1_NAME>` with your binding’s database name, e.g. dev vs prod):

   ```bash
   wrangler d1 execute <AML_D1_NAME> --remote --file=aml-svc/scripts/manual/2026-05-13-watchlist-rescan-90d.sql
   ```

   For local preview DB, drop `--remote`.

3. **Deploy** aml-svc (weekly rescan cron `0 3 * * 0`, code paths).

4. **Verify** in dashboard or SQL: all orgs at 90-day interval if that was the goal.

## Optional daily-cap bump

The `.sql` file includes a commented `UPDATE` to set `watchlist_rescan_daily_cap` from `500` → `5000` for rows still on the legacy default. Uncomment that block in the file before running if you want that applied in the same transaction.
