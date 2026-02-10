# Seed Scripts

This directory contains scripts for generating **synthetic test data** for development and preview environments.

Seed scripts run **only in dev/preview** environments (never in production).

## What Gets Seeded

### Synthetic Test Data

- **Clients**: Fake client records for testing
- **Reports**: Sample compliance reports
- **Notices**: Test notice records
- **Upload Links**: Sample file upload links
- **Ultimate Beneficial Owners**: Test UBO records
- **Organization Settings**: Test organization configurations

**Note**: Operations are created via imports or API, not seeded.

## Scripts

### Main Scripts

- **`all.mjs`** - Master script that runs all seed scripts
  - Discovers and executes all `seed-*.mjs` files
  - Skips execution in production environments
  - Usage: `pnpm seed` (local) or `pnpm seed:dev` (remote dev)

### Individual Seed Scripts

- **`seed-client.mjs`** - Generates fake clients
- **`seed-report.mjs`** - Creates sample reports
- **`seed-notice.mjs`** - Generates test notices
- **`seed-upload-link.mjs`** - Creates sample upload links
- **`seed-ultimate-beneficial-owner.mjs`** - Generates test UBOs
- **`seed-organization-settings.mjs`** - Creates test org settings

### Validation

- **`validate.mjs`** - Validates that all Prisma models have corresponding seeds or are excluded
  - Runs in pre-commit hook and CI
  - Ensures dev/preview environments always have test data
  - Models can be in: `EXCLUDED_MODELS`, `POPULATED_MODELS`, or have a seed script

## Usage

### Local Development

```bash
# Seed all test data (local DB)
pnpm seed

# Seed to a specific local config
pnpm seed:local
```

### Remote Environments

```bash
# Seed dev environment
pnpm seed:dev

# Seed preview environment
pnpm seed:preview

# Production - automatically skipped
pnpm seed:prod  # Will skip seeding
```

### Validation

```bash
# Check that all models have seeds or are excluded
pnpm seed:validate
```

## Model Categories

### Excluded Models

Models that don't need seeds (defined in `validate.mjs`):

- **Junction tables**: `TransactionPaymentMethod`, `ClientDocument`, `ClientAddress`
- **Worker-generated**: `Alert`, `Import`, `ImportRowResult`
- **API-generated**: `Invoice`, `InvoiceItem`, `Operation`, `OperationPayment`, etc.
- **User-configured**: `ComplianceOrganization`

### Populated Models

Models populated by reference data scripts (not seeded):

- **`Catalog`** - Populated via `scripts/populate/catalogs.mjs`
- **`CatalogMapping`** - Populated via `scripts/populate/catalog-cfdi-pld-mappings.mjs`
- **`AlertRule`** - Populated via `scripts/populate/alert-rules.mjs`
- **`AlertRuleConfig`** - Populated via `scripts/populate/alert-rule-configs.mjs`
- **`UmaValue`** - Populated via `scripts/populate/uma-values.mjs`

### Seeded Models

Models that have seed scripts:

- **`Client`** - `seed-client.mjs`
- **`Report`** - `seed-report.mjs`
- **`Notice`** - `seed-notice.mjs`
- **`UploadLink`** - `seed-upload-link.mjs`
- **`UltimateBeneficialOwner`** - `seed-ultimate-beneficial-owner.mjs`
- **`OrganizationSettings`** - `seed-organization-settings.mjs`

## Seed vs Populate

| Aspect          | Seed (this folder)         | Populate (`scripts/populate/`)     |
| --------------- | -------------------------- | ---------------------------------- |
| **Purpose**     | Synthetic test data        | Reference data                     |
| **Data Type**   | Clients, reports, notices  | Catalogs, rules, constants         |
| **Environment** | Dev/preview only           | All (local, dev, preview, prod)    |
| **Frequency**   | As needed for testing      | Once per environment setup         |
| **Examples**    | Fake clients, test reports | Countries, CFDI codes, alert rules |

## Environment Detection

Seed scripts automatically detect the environment:

- **Production**: Skipped (based on `NODE_ENV=production` and absence of preview flags)
- **Preview**: Enabled (based on `CF_PAGES_BRANCH` or `PREVIEW=true`)
- **Dev**: Enabled (based on `ENVIRONMENT=dev` or `WRANGLER_CONFIG=wrangler.jsonc`)
- **Local**: Enabled (default)

## Seed Script Structure

Each seed script follows this pattern:

```javascript
#!/usr/bin/env node
/**
 * Seed [ModelName]
 */

async function seed() {
  // Detect environment
  const isRemote = process.env.CI === "true" || process.env.REMOTE === "true";

  // Generate synthetic data
  const data = [...];

  // Generate SQL
  const sql = generateSql(data);

  // Execute via wrangler d1
  executeSql(sql);
}

// Export for all.mjs
export { seed as seedModelName };

// Allow direct execution
if (isDirectRun) {
  seed().catch(console.error);
}
```

## Adding New Seeds

To add a new seed script:

1. Create `seed-model-name.mjs` in this directory
2. Follow the structure above
3. Export your seed function
4. Test locally: `node seed-model-name.mjs`
5. Verify it runs in `all.mjs`: `pnpm seed`
6. Run validation: `pnpm seed:validate`

If the model should NOT be seeded:

1. Add to `EXCLUDED_MODELS` in `validate.mjs` (for junction tables, worker-generated data)
2. Add to `POPULATED_MODELS` in `validate.mjs` (for reference data)
3. Document the reason in the comment

## Validation Rules

The `validate.mjs` script ensures:

1. Every Prisma model has a seed script OR is in `EXCLUDED_MODELS` OR is in `POPULATED_MODELS`
2. Every seed script corresponds to a Prisma model
3. No orphaned seed scripts exist

This runs automatically:

- In pre-commit hook (via husky)
- In CI (GitHub Actions)

## Best Practices

### Synthetic Data Quality

- Use realistic data (proper names, addresses, amounts)
- Vary data to test edge cases
- Include both valid and boundary cases
- Consider relationships between models

### Performance

- Batch inserts when possible
- Use `INSERT OR REPLACE` for idempotency
- Limit data volume to what's needed for testing
- Use deterministic IDs for repeatability

### Maintainability

- Document unusual data patterns
- Keep seed logic simple
- Avoid complex business logic
- Use shared utilities from `scripts/populate/lib/shared.mjs`

## Troubleshooting

### Validation fails with "Model X has no seed script"

Either:

1. Create `seed-x.mjs` for the model
2. Add the model to `EXCLUDED_MODELS` in `validate.mjs` (if it shouldn't be seeded)
3. Add the model to `POPULATED_MODELS` in `validate.mjs` (if it's reference data)

### Seed fails in CI but works locally

Check environment detection logic. CI sets `CI=true`, which affects config file selection.

### Foreign key constraint errors

Ensure seeds run in dependency order:

1. Seed parent models first (e.g., `Client` before `Transaction`)
2. Populate catalogs before seeding (catalogs are populated, not seeded)
3. Check `all.mjs` execution order

### Duplicate key errors

Use `INSERT OR REPLACE` or `ON CONFLICT DO UPDATE` for idempotency. Seed scripts should be runnable multiple times.

## Contributing

When contributing seed scripts:

1. Follow existing script structure
2. Use meaningful, realistic test data
3. Document any special data patterns
4. Update this README if adding new model categories
5. Run `pnpm seed:validate` before committing

## See Also

- `scripts/populate/README.md` - Reference data population
- `prisma/schema.prisma` - Database schema
- `.husky/pre-commit` - Validation hook
