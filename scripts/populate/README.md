# Catalog Population Scripts

Population scripts load **real catalog data** from CSV files into the database. These are required for all environments (dev, preview, prod).

## Manual Population (Recommended)

Population is **always manual** to reduce errors during deployment. Run these commands separately after migrations.

### Local Development

```bash
# Apply migrations first
pnpm dev:local

# Then populate catalogs (in a separate terminal)
pnpm populate:local

# Optionally seed test data
pnpm seed:local
```

### Remote Environments

```bash
# Dev environment
pnpm populate:dev

# Preview environment
pnpm populate:preview

# Production environment
pnpm populate:prod
```

### Individual Catalogs

For large catalogs like zip-codes, you can populate individually:

```bash
# Local
pnpm populate:catalog:zip-codes:local

# Or with cross-env for other environments
cross-env REMOTE=true WRANGLER_CONFIG=wrangler.jsonc node ./scripts/populate/catalog-zip-codes.mjs
```

## Available Catalogs

| Catalog                    | Script                                   | Items |
| -------------------------- | ---------------------------------------- | ----- |
| Armor Levels               | `catalog-armor-levels.mjs`               | ~8    |
| Business Activities        | `catalog-business-activities.mjs`        | ~136  |
| Countries                  | `catalog-countries.mjs`                  | ~249  |
| Currencies                 | `catalog-currencies.mjs`                 | ~168  |
| Economic Activities        | `catalog-economic-activities.mjs`        | ~167  |
| Operation Types            | `catalog-operation-types.mjs`            | ~3    |
| Payment Forms              | `catalog-payment-forms.mjs`              | ~5    |
| Payment Methods            | `catalog-payment-methods.mjs`            | ~17   |
| States (Mexico)            | `catalog-states.mjs`                     | ~32   |
| Terrestrial Vehicle Brands | `catalog-terrestrial-vehicle-brands.mjs` | ~130  |
| Maritime Vehicle Brands    | `catalog-maritime-vehicle-brands.mjs`    | ~62   |
| Air Vehicle Brands         | `catalog-air-vehicle-brands.mjs`         | ~68   |
| Vulnerable Activities      | `catalog-vulnerable-activities.mjs`      | ~20   |
| Zip Codes (Mexico)         | `catalog-zip-codes.mjs`                  | ~157K |

## Master Scripts

- `all-catalogs.mjs` - Populates all catalogs
- `all.mjs` - Populates all catalogs + UMA values
- `uma-values.mjs` - Populates UMA reference values

## Notes

- **Zip codes catalog** has ~157K entries and takes several minutes to complete
- All catalogs use deterministic IDs, so re-running is safe (idempotent)
- CSV files are hosted at `https://catalogs.janovix.com/`
