# Populate Scripts

This directory contains scripts for populating **reference data** (catalogs, constants, legal rules) required for the application to function.

Populate scripts run in **all environments** (local, dev, preview, production).

## What Gets Populated

### Reference Data (not synthetic)

- **Catalogs** (~85 catalogs): Countries, currencies, CFDI codes, PLD codes, activity-specific codes
- **CFDI-PLD Mappings**: Cross-reference tables between CFDI and PLD catalogs
- **Alert Rules**: Legal/system rules for AML compliance (based on LFPIORPI)
- **Alert Rule Configs**: Configuration values for automated alert seekers
- **UMA Values**: Official UMA (Unidad de Medida y Actualización) values by year

## Scripts

### Main Scripts

- **`all.mjs`** - Master script that populates ALL reference data

  - Runs: catalogs → CFDI-PLD mappings → alert rules → alert rule configs → UMA values
  - Usage: `pnpm populate` (local) or `pnpm populate:dev` (remote dev)

- **`catalogs.mjs`** - Populates ~85 small/medium catalogs from `catalogs.janovix.com`

  - Core catalogs (countries, currencies, states, banks)
  - CFDI catalogs (SAT codes)
  - PLD consolidated catalogs
  - Activity-specific catalogs (47 catalogs across 19 vulnerable activities)
  - Vehicle brands (terrestrial, maritime, air)

- **`all-catalogs-large.mjs`** - Populates large catalogs separately (optional)
  - Zip codes (~140K items)
  - CFDI product/services (~52K items)
  - Usage: `pnpm populate:catalogs:large`

### Individual Scripts

- **`alert-rules.mjs`** - Legal/system alert rules for AML compliance
- **`alert-rule-configs.mjs`** - Configuration values for alert seekers
- **`catalog-cfdi-pld-mappings.mjs`** - CFDI ↔ PLD catalog mappings
- **`uma-values.mjs`** - UMA reference values

### Utilities

- **`lib/shared.mjs`** - Shared utilities for all populate scripts
  - Wrangler config management
  - SQL execution
  - CSV fetching/parsing
  - ID generation
  - SQL generation helpers

## Usage

### Local Development

```bash
# Populate all reference data (local DB)
pnpm populate

# Populate to a specific local config
pnpm populate:local

# Populate large catalogs (optional)
pnpm populate:catalogs:large
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

## Architecture

All catalogs are now fetched from a single remote source: **`https://catalogs.janovix.com`**

Benefits:

- Single source of truth for all catalog data
- Easy updates without code changes
- Consistent format (CSV with `code,name` or specialized formats)
- Version control of data separate from code

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

### ID Generation

- Catalog IDs: Deterministic hash from catalog key
- Item IDs: Deterministic hash from catalog ID + item seed
- Ensures stable IDs across re-populations

### SQL Generation

- Uses SQLite upsert syntax: `INSERT OR REPLACE` for items
- Uses `ON CONFLICT DO UPDATE` for alert rules (preserves FK constraints)
- Batched execution for large catalogs (1000 items per batch)

### Metadata Storage

Catalog items store additional data in JSON `metadata` field:

- `code`: The catalog code (e.g., "MXN", "01", "VEH")
- `shortName`: For currencies (backward compatibility)
- `decimal_places`: For currencies
- `iso2`, `iso3`: For countries
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
2. Add catalog definition to `catalogs.mjs` in the appropriate section
3. Document metadata structure if non-standard
4. Update this README

When adding new alert rules:

1. Update `alert-rules.mjs` with new rule definitions
2. Add corresponding configs in `alert-rule-configs.mjs` if needed
3. Document the legal basis in metadata

## See Also

- `scripts/seed/README.md` - Synthetic test data generation
- `scripts/cfdi-catalogs/README.md` - CFDI catalog sources
- `prisma/schema.prisma` - Database schema
