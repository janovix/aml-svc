# E2E internal API (`aml-svc`)

Mounted at **`/api/v1/internal/e2e`** (Hono app prefix + `/internal/e2e`).

All routes require header **`x-e2e-api-key`** equal to env **`E2E_API_KEY`**. Use `wrangler secret put E2E_API_KEY` in production; dev `wrangler.jsonc` may leave an empty string (endpoint disabled until set).

## `GET /alert-thresholds`

Returns JSON:

- `umaDailyValue` — from active UMA row or fallback.
- `byActivity` — map of activity code → `{ noticeThresholdUma, noticeThresholdMxn }` derived from `ACTIVITY_THRESHOLDS` + UMA.

Used by Playwright golden setup to size operation amounts above notice thresholds.

## `POST /purge`

Body: `{ "organizationIds": string[] }`.

Deletes tenant-scoped AML rows for those organizations (notices, alerts, operations, clients, etc.) via `purgeAmlOrganizations` — see `src/lib/e2e-purge-organizations.ts`.

**Only** call this from `auth-svc` `POST /api/admin/e2e/purge` or equivalent automation using the shared API key.
