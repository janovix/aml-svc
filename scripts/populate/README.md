# Catalog Population Scripts

This directory contains scripts for populating **reference data** (catalogs, constants) into the database.

> **Important**: These are NOT seed scripts. Seeds create synthetic test data. Population scripts load real reference data required for the application to function.

## 📋 Table of Contents

- [Quick Start](#quick-start)
- [Script Organization](#script-organization)
- [Environment-Specific Commands](#environment-specific-commands)
- [Catalog Categories](#catalog-categories)
- [Large Catalogs](#large-catalogs)
- [Best Practices](#best-practices)

---

## 🚀 Quick Start

### Local Development

```bash
# Populate ALL reference data (recommended for first-time setup)
pnpm populate:local

# Or populate just catalogs (faster, excludes UMA values)
pnpm populate:catalogs:local

# Optional: Populate large catalogs separately (zip codes, CFDI units, products)
pnpm populate:catalogs:large:local
```

### Remote Environments

```bash
# Dev environment
pnpm populate:dev

# Production (catalogs only, no seeds)
pnpm populate:prod

# Preview environment
pnpm populate:preview
```

---

## 📁 Script Organization

### Master Scripts

| Script                   | Purpose                     | Catalogs                             | Time      |
| ------------------------ | --------------------------- | ------------------------------------ | --------- |
| `all.mjs`                | **Complete reference data** | Core + CFDI + PLD + Activities + UMA | ~2-5 min  |
| `all-catalogs.mjs`       | **Core catalogs only**      | Core + CFDI + PLD + Activities       | ~1-3 min  |
| `all-catalogs-large.mjs` | **Large catalogs only**     | Zip codes + CFDI units + Products    | ~5-15 min |

### Individual Catalog Scripts

All individual catalog scripts follow the pattern: `catalog-{name}.mjs`

Examples:

- `catalog-countries.mjs` - Countries catalog
- `catalog-cfdi-payment-forms.mjs` - CFDI payment forms
- `catalog-pld-consolidated.mjs` - PLD consolidated catalogs
- `catalog-activity-all.mjs` - All activity-specific catalogs

---

## 🌍 Environment-Specific Commands

### Pattern

```bash
pnpm populate[:<scope>][:<env>]
```

Where:

- `<scope>` = `catalogs`, `catalogs:large`, or omitted for all
- `<env>` = `local`, `dev`, `prod`, `preview`, or omitted for default

### Examples

```bash
# All reference data
pnpm populate              # Local (default DB)
pnpm populate:local        # Local (wrangler.local.jsonc)
pnpm populate:dev          # Remote dev
pnpm populate:prod         # Remote prod
pnpm populate:preview      # Remote preview

# Core catalogs only
pnpm populate:catalogs
pnpm populate:catalogs:local
pnpm populate:catalogs:dev
pnpm populate:catalogs:prod
pnpm populate:catalogs:preview

# Large catalogs only
pnpm populate:catalogs:large
pnpm populate:catalogs:large:local
pnpm populate:catalogs:large:dev
pnpm populate:catalogs:large:prod

# Individual large catalogs
pnpm populate:catalog:zip-codes:local
pnpm populate:catalog:cfdi-units:dev
pnpm populate:catalog:cfdi-product-services:prod
```

---

## 📊 Catalog Categories

### Core Catalogs (14)

Essential reference data, fast to populate (~1-2 min):

- Countries, States, Currencies
- Armor Levels, Business Activities
- Economic Activities, Operation Types
- Payment Forms, Payment Methods
- Vulnerable Activities

### Vehicle Catalogs (3)

Vehicle brand catalogs (~30 sec):

- Terrestrial Vehicle Brands
- Maritime Vehicle Brands
- Air Vehicle Brands

### CFDI Catalogs (12)

SAT CFDI codes, small to medium size (~1-2 min):

- Payment Forms, Payment Methods
- Tax Regimes, Usages, Voucher Types
- Currencies, Countries, Taxes
- Tax Factors, Tax Objects
- Relation Types, Export Types

### CFDI-PLD Integration (1)

Mappings between CFDI and PLD catalogs (~10 sec):

- CFDI-PLD Mappings (payment forms → monetary instruments, etc.)

### PLD Consolidated Catalogs (15)

Unified catalogs across multiple vulnerable activities (~30 sec):

- Alert Types (395 items across 19 VAs)
- Monetary Instruments, Payment Forms
- Property Types, Incorporation Reasons
- Shareholder Positions, Merger Types
- Power of Attorney Types, Guarantee Types
- Armor Levels, Financial Institution Types
- And more...

### Activity-Specific Catalogs (47)

Individual catalogs for each vulnerable activity (~1 min):

- Operation types, alert types, etc. for each of 19 VAs
- Examples: `veh-operation-types`, `tcv-transferred-value-types`, `tdr-operation-types`

### UMA Values (1)

Economic reference data (~5 sec):

- UMA (Unidad de Medida y Actualización) values

---

## 🐘 Large Catalogs

These catalogs are **excluded by default** due to their size. Run them separately when needed.

| Catalog                    | Items  | Time      | Command                                             |
| -------------------------- | ------ | --------- | --------------------------------------------------- |
| **Zip Codes**              | ~140K+ | ~5-10 min | `pnpm populate:catalog:zip-codes:local`             |
| **CFDI Units**             | ~1K    | ~30 sec   | `pnpm populate:catalog:cfdi-units:local`            |
| **CFDI Products/Services** | ~52K   | ~3-5 min  | `pnpm populate:catalog:cfdi-product-services:local` |

### When to Populate Large Catalogs?

- **Zip Codes**: Only if your app needs address validation with zip code lookup
- **CFDI Units**: Only if generating CFDI invoices with detailed unit codes
- **CFDI Products/Services**: Only if generating CFDI invoices with detailed product/service codes

### Populate All Large Catalogs at Once

```bash
pnpm populate:catalogs:large:local
```

---

## ✅ Best Practices

### 1. Stop Dev Server Before Populating

SQLite doesn't allow concurrent writes. Stop your dev server before running populate scripts:

```bash
# Stop dev server (Ctrl+C)
pnpm populate:local
# Restart dev server
pnpm dev:local
```

### 2. Population Order

For a fresh database:

```bash
# 1. Run migrations first
pnpm wrangler d1 migrations apply DB --local --config wrangler.local.jsonc

# 2. Populate core catalogs
pnpm populate:local

# 3. (Optional) Populate large catalogs
pnpm populate:catalogs:large:local

# 4. (Dev/Preview only) Seed synthetic test data
pnpm seed:local
```

### 3. Production Deployment

For production, **only populate catalogs** (no seeds):

```bash
# After migrations
pnpm populate:prod

# Large catalogs only if needed
pnpm populate:catalogs:large:prod
```

### 4. CI/CD Integration

In your CI/CD pipeline:

```bash
# Dev branch → dev environment
pnpm populate:dev

# Main branch → prod environment
pnpm populate:prod

# Other branches → preview environment
pnpm populate:preview
```

---

## 🔍 Troubleshooting

### Database Locked Error

**Error**: `SQLITE_BUSY: database is locked`

**Solution**: Stop the dev server before running populate scripts.

### Catalog Already Exists

All populate scripts use `INSERT OR REPLACE` or `INSERT OR IGNORE`, so they're **idempotent**. You can safely re-run them.

### Missing CSV Files

Some catalogs require CSV files from the extraction process:

```bash
# Extract CFDI catalogs from SAT sources
cd scripts/cfdi-catalogs
node download-sat-catalogs.mjs
node extract-activity-catalogs.mjs
node consolidate-catalogs.mjs
```

### Slow Population

Large catalogs take time. Use the separated scripts:

- Run core catalogs first (fast)
- Run large catalogs separately when needed
- Consider skipping large catalogs in dev if not needed

---

## 📚 Related Documentation

- [Seed Scripts](../seed/README.md) - Synthetic test data generation
- [CFDI Catalogs](../cfdi-catalogs/README.md) - CFDI catalog extraction
- [Database Migrations](../../migrations/README.md) - Schema management

---

## 🆘 Need Help?

- Check if CSV files exist in `scripts/cfdi-catalogs/output/`
- Verify wrangler config files exist (`wrangler.local.jsonc`, etc.)
- Ensure migrations have been applied
- Check that dev server is stopped before populating
