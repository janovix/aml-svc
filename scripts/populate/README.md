# Populate Scripts

This directory contains scripts for populating **reference data** (catalogs, constants, legal rules) required for the application to function.

Populate scripts run in **all environments** (local, dev, preview, production).

## What Gets Populated

### Reference Data (not synthetic)

- **ALL Catalogs** (~87 catalogs including large ones): Countries, currencies, CFDI codes, PLD codes, activity-specific codes, zip-codes (~157K items), cfdi-product-services (~52K items)
- **CFDI-PLD Mappings**: Cross-reference tables between CFDI and PLD catalogs
- **Alert Rules**: Legal/system rules for AML compliance (based on LFPIORPI)
- **Alert Rule Configs**: Configuration values for automated alert seekers
- **UMA Values**: Official UMA (Unidad de Medida y Actualización) values by year

## Architecture

All reference data is now populated using a unified, fast SQL dump approach:

1. **Generate** SQL dump files from CSV data and hardcoded constants
2. **Import** SQL files via `wrangler d1 execute --file --remote`

Two SQL files, two wrangler calls, everything populated in seconds.

## Scripts

### Main Scripts

- **`all.mjs`** - Master script that populates ALL reference data

  - Auto-generates SQL dump files
  - Imports `sql/catalogs.sql` (all ~87 catalogs)
  - Imports `sql/reference-data.sql` (rules, configs, mappings, UMA)
  - Usage: `pnpm populate` (local) or `pnpm populate:dev` (remote dev)

- **`generate-sql.mjs`** - Generates SQL dump files from CSV + hardcoded data
  - Fetches all CSVs from `catalogs.janovix.com`
  - Writes `sql/catalogs.sql` and `sql/reference-data.sql`
  - Usage: `pnpm generate:sql`

### Library Modules

- **`lib/shared.mjs`** - Shared utilities for all populate scripts

  - Wrangler config management
  - SQL execution (`executeSql`, `executeSqlFile`)
  - CSV fetching/parsing
  - MD5-based ID generation (content-addressable)

- **`lib/catalogs.mjs`** - ALL catalog definitions and SQL generation

  - ~87 catalog definitions (regular + large)
  - `generateAllCatalogsSql()` - returns SQL string for all catalogs

- **`lib/reference-data.mjs`** - Reference data SQL generation
  - Alert rules, configs, CFDI-PLD mappings, UMA values
  - `generateReferenceDataSql()` - returns SQL string

## Usage

### Local Development

```bash
# Populate all reference data (local DB)
pnpm populate

# Or populate to a specific local config
pnpm populate:local
```

### Remote Environments

```bash
# Populate dev environment
pnpm populate:dev

# Populate production environment
pnpm populate:prod

# Populate preview environment
pnpm populate:preview
```

### Manual SQL Generation (optional)

```bash
# Generate SQL dump files only (without importing)
pnpm generate:sql
```

## Why SQL Dumps?

The new approach generates SQL dumps instead of fetching CSV at runtime:

**Benefits:**

- **Fast**: ~157K zip code items imported in seconds (vs minutes with old approach)
- **Idempotent**: Content-addressable MD5 IDs ensure safe re-runs
- **Unified**: No distinction between "regular" and "large" catalogs
- **Reliable**: D1 Import API handles large files (up to 5 GB)
- **Simple**: Two wrangler calls populate everything

**Data Source:**

All catalogs are fetched from **`https://catalogs.janovix.com`** during SQL generation.

## Populate vs Seed

| Aspect          | Populate (this folder)             | Seed (`scripts/seed/`)     |
| --------------- | ---------------------------------- | -------------------------- |
| **Purpose**     | Reference data                     | Synthetic test data        |
| **Data Type**   | Catalogs, rules, constants         | Clients, reports, notices  |
| **Environment** | All (local, dev, preview, prod)    | Dev/preview only           |
| **Frequency**   | Once per environment setup         | As needed for testing      |
| **Examples**    | Countries, CFDI codes, alert rules | Fake clients, test reports |

## Data Sources

- **Catalogs**: `https://catalogs.janovix.com/*.csv`
- **Alert Rules**: Hardcoded in `alert-rules.mjs` (based on LFPIORPI legal requirements)
- **Alert Rule Configs**: Hardcoded in `alert-rule-configs.mjs`
- **UMA Values**: Hardcoded in `uma-values.mjs` (official government values)
- **CFDI-PLD Mappings**: Hardcoded in `catalog-cfdi-pld-mappings.mjs`

## Consolidated Catalogs

Previously separate catalogs are now unified:

- **Countries**: Combines `countries.csv` (ISO-2) and `cfdi-countries.csv` (ISO-3) → single `countries.csv` with both codes
- **Currencies**: `currencies.csv` is the single source (replaces `cfdi-currencies.csv`)
  - Metadata includes: `code` (ISO), `shortName` (ISO), `decimal_places`, `country`

## Implementation Details

### ID Generation (Content-Addressable)

- **Catalog IDs**: `md5("catalog:" + catalogKey)` - deterministic from catalog key
- **Item IDs**: `md5(catalogKey + ":" + normalizedName)` - identity-based, metadata-independent
- Metadata can change without affecting IDs (clean updates via `INSERT OR REPLACE`)

### SQL Generation

- Multi-row INSERT statements (50 rows per statement) for efficiency
- Uses `INSERT OR REPLACE` for catalog items (idempotent)
- Uses `ON CONFLICT DO UPDATE` for alert rules (preserves FK constraints from alerts table)
- Each catalog deletes its existing items before inserting (`DELETE FROM catalog_items WHERE catalog_id = ...`)

### Metadata Storage

Catalog items store additional data in JSON `metadata` field:

- `code`: The catalog code (e.g., "MXN", "01", "VEH")
- `shortName`: For currencies (backward compatibility)
- `decimal_places`: For currencies
- `iso2`, `iso3`: For countries
- `zip_code`, `settlement`, `municipality`, `state`, etc.: For zip codes
- `originCountry`, `type`: For vehicle brands

## Troubleshooting

### Script fails with "No wrangler config found"

Set `WRANGLER_CONFIG` environment variable:

```bash
export WRANGLER_CONFIG=wrangler.jsonc
pnpm populate
```

### Catalog items not appearing

1. Check if catalog was created: `SELECT * FROM catalogs WHERE key = 'catalog-name';`
2. Check if items were created: `SELECT COUNT(*) FROM catalog_items WHERE catalog_id = 'catalog-id';`
3. Check for SQL errors in wrangler output

### UMA values not updating

UMA values are populated from `uma-values.mjs`. Update the hardcoded values there and re-run `pnpm populate`.

## Contributing

When adding new catalogs:

1. Add CSV to `https://catalogs.janovix.com/catalog-name.csv`
2. Add catalog definition to `lib/catalogs.mjs` in the appropriate section
3. Document metadata structure if non-standard
4. Update this README

When adding new alert rules:

1. Update `lib/reference-data.mjs` with new rule definitions
2. Add corresponding configs if needed
3. Document the legal basis in metadata

## See Also

- `scripts/seed/README.md` - Synthetic test data generation
- `scripts/cfdi-catalogs/README.md` - CFDI catalog sources
- `prisma/schema.prisma` - Database schema
