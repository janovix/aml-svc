# GitHub Actions Workflows

This directory contains automated and manual workflows for the AML service.

## 📋 Table of Contents

- [Manual Workflows](#manual-workflows)
- [Automated Workflows](#automated-workflows)
- [How to Run Manual Workflows](#how-to-run-manual-workflows)
- [Environment Configuration](#environment-configuration)

---

## 🎯 Manual Workflows

These workflows can be triggered manually from the GitHub Actions tab.

### 1. Populate / Seed Database (`populate-seed.yml`)

**Purpose**: Comprehensive workflow for populating catalogs and seeding test data.

**When to use**:

- Setting up a new environment
- Refreshing all reference data
- Populating specific catalog types
- Seeding test data for development

**Operations**:

| Operation            | Description                 | Includes                                  |
| -------------------- | --------------------------- | ----------------------------------------- |
| `populate-all`       | **Complete reference data** | Core + CFDI + PLD + Activities + UMA      |
| `populate-catalogs`  | **Core catalogs only**      | Core + CFDI + PLD + Activities (no UMA)   |
| `populate-zip-codes` | **Zip codes only**          | ~140K+ postal codes                       |
| `seed`               | **Synthetic test data**     | Test organizations, clients, transactions |

**Environments**: `dev`, `prod`, `preview`

**Options**:

- `skip_zip_codes`: Skip large zip codes catalog (default: `true`)

**What gets populated with `populate-all` or `populate-catalogs`**:

#### Core Catalogs (14)

- Countries, States, Currencies
- Armor Levels, Business Activities
- Economic Activities, Operation Types
- Payment Forms, Payment Methods
- Vulnerable Activities

#### Vehicle Catalogs (3)

- Terrestrial Vehicle Brands
- Maritime Vehicle Brands
- Air Vehicle Brands

#### CFDI Catalogs (12) ✨ **NEW**

- Payment Forms, Payment Methods
- Tax Regimes, Usages, Voucher Types
- Currencies, Countries, Taxes
- Tax Factors, Tax Objects
- Relation Types, Export Types

#### CFDI-PLD Integration (1) ✨ **NEW**

- CFDI-PLD Mappings (payment forms → monetary instruments, etc.)

#### PLD Consolidated Catalogs (15)

- Alert Types (395 items across 19 VAs)
- Monetary Instruments, Payment Forms
- Property Types, Incorporation Reasons
- Shareholder Positions, Merger Types
- Power of Attorney Types, Guarantee Types
- Armor Levels, Financial Institution Types
- And more...

#### Activity-Specific Catalogs (47)

- Individual catalogs for each of 19 vulnerable activities
- Operation types, alert types, etc.

#### UMA Values (only with `populate-all`)

- Economic reference data (Unidad de Medida y Actualización)

---

### 2. Populate Catalogs (`populate-catalogs.yml`)

**Purpose**: Simplified workflow for populating only catalogs (no UMA values).

**When to use**:

- Quick catalog refresh
- When you don't need UMA values

**Environments**: `dev`, `prod`, `preview`

**Options**:

- `skip_zip_codes`: Skip large zip codes catalog (default: `true`)

**Note**: This runs the same catalog population as `populate-seed.yml` with operation `populate-catalogs`.

---

### 3. Populate Zip Codes (`populate-zip-codes.yml`)

**Purpose**: Dedicated workflow for populating the large zip codes catalog.

**When to use**:

- When you need address validation with zip code lookup
- Separate from other catalogs due to size (~140K+ items)

**Environments**: `dev`, `prod`, `preview`

**Time**: ~5-10 minutes

---

### 4. Seed Database (`seed-database.yml`)

**Purpose**: Populate synthetic test data for development and testing.

**When to use**:

- Setting up a development environment
- Creating test data for QA
- **Never use in production**

**Environments**: `dev`, `preview` (not available for `prod`)

**What gets seeded**:

- Test organizations
- Test clients
- Test transactions
- Test notices
- Test reports
- Test alert rules

---

### 5. Generate Synthetic Data (`generate-synthetic-data.yml`)

**Purpose**: Generate large amounts of synthetic data for load testing.

**When to use**:

- Performance testing
- Load testing
- Stress testing

**Environments**: `dev`, `preview`

---

## 🤖 Automated Workflows

### 1. CI (`ci.yml`)

**Trigger**: Push to any branch, pull requests

**What it does**:

- Runs linters (ESLint, Prettier)
- Runs type checking
- Runs tests
- Checks migrations

---

### 2. Release (`release.yml`)

**Trigger**: Push to `main` or `dev` branch

**What it does**:

- Creates semantic version releases
- Generates changelog
- Deploys to appropriate environment
- Populates catalogs after deployment

---

## 🚀 How to Run Manual Workflows

### Via GitHub UI

1. Go to the **Actions** tab in GitHub
2. Select the workflow you want to run from the left sidebar
3. Click **Run workflow** button (top right)
4. Select the options:
   - **Environment**: `dev`, `prod`, or `preview`
   - **Operation** (if applicable): Choose the operation type
   - **Options**: Configure any additional options
5. Click **Run workflow**

### Via GitHub CLI

```bash
# Populate all catalogs in dev
gh workflow run populate-seed.yml \
  -f operation=populate-catalogs \
  -f environment=dev \
  -f skip_zip_codes=true

# Populate all reference data (including UMA) in dev
gh workflow run populate-seed.yml \
  -f operation=populate-all \
  -f environment=dev \
  -f skip_zip_codes=true

# Populate zip codes in dev
gh workflow run populate-seed.yml \
  -f operation=populate-zip-codes \
  -f environment=dev

# Seed test data in dev
gh workflow run populate-seed.yml \
  -f operation=seed \
  -f environment=dev

# Simplified catalog population
gh workflow run populate-catalogs.yml \
  -f environment=dev \
  -f skip_zip_codes=true
```

---

## 🌍 Environment Configuration

### Dev Environment (`dev`)

- **Config**: `wrangler.jsonc`
- **Worker**: `aml-svc` (production slot)
- **Branch**: `dev`
- **Use for**: Development, testing, staging

### Production Environment (`prod`)

- **Config**: `wrangler.prod.jsonc`
- **Worker**: `aml-svc-prod`
- **Branch**: `main`
- **Use for**: Production deployments

### Preview Environment (`preview`)

- **Config**: `wrangler.preview.jsonc`
- **Worker**: `aml-svc` (preview slot)
- **Branch**: Feature branches
- **Use for**: PR previews, feature testing

---

## 📊 Catalog Population Times

| Catalog Type               | Items  | Time      | Included by Default        |
| -------------------------- | ------ | --------- | -------------------------- |
| Core Catalogs              | ~1K    | ~1-2 min  | ✅ Yes                     |
| Vehicle Catalogs           | ~300   | ~30 sec   | ✅ Yes                     |
| CFDI Catalogs              | ~500   | ~1-2 min  | ✅ Yes                     |
| CFDI-PLD Mappings          | ~20    | ~10 sec   | ✅ Yes                     |
| PLD Consolidated           | ~1K    | ~30 sec   | ✅ Yes                     |
| Activity-Specific          | ~2K    | ~1 min    | ✅ Yes                     |
| UMA Values                 | ~50    | ~5 sec    | ✅ Yes (populate-all only) |
| **Zip Codes**              | ~140K+ | ~5-10 min | ❌ No (run separately)     |
| **CFDI Units**             | ~1K    | ~30 sec   | ❌ No (run separately)     |
| **CFDI Products/Services** | ~52K   | ~3-5 min  | ❌ No (run separately)     |

---

## 🔍 Troubleshooting

### Workflow Failed

1. Check the workflow logs in the Actions tab
2. Verify that secrets are configured:
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`
3. Ensure migrations have been applied to the target environment
4. Check that the wrangler config file exists for the target environment

### Catalog Already Exists

All populate scripts use `INSERT OR REPLACE` or `INSERT OR IGNORE`, so they're **idempotent**. You can safely re-run them.

### Missing CSV Files

Some catalogs require CSV files from the extraction process. If you get errors about missing files:

```bash
cd scripts/cfdi-catalogs
node download-sat-catalogs.mjs
node extract-activity-catalogs.mjs
node consolidate-catalogs.mjs
```

---

## 📚 Related Documentation

- [Populate Scripts README](../../scripts/populate/README.md) - Detailed documentation on populate scripts
- [Seed Scripts README](../../scripts/seed/README.md) - Synthetic test data generation
- [CFDI Catalogs README](../../scripts/cfdi-catalogs/README.md) - CFDI catalog extraction
- [Database Migrations](../../migrations/README.md) - Schema management

---

## 🆘 Need Help?

- Check workflow logs in the Actions tab
- Verify environment configuration
- Ensure migrations are up to date
- Check that CSV files exist in `scripts/cfdi-catalogs/output/`
- Review the populate scripts README for more details
