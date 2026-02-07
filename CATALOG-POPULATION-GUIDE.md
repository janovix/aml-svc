# Catalog Population Guide

Complete guide for populating all catalogs in the AML service, including the new CFDI catalogs.

## 🎯 Quick Reference

### I want to populate catalogs in dev environment

**Option A: GitHub Actions (Recommended)**

1. Go to [GitHub Actions](https://github.com/YOUR_ORG/janovix/actions)
2. Select "Populate / Seed Database"
3. Run with: `operation=populate-all`, `environment=dev`, `skip_zip_codes=true`

**Option B: Local Command**

```bash
pnpm populate:dev
```

### I want to populate catalogs locally

```bash
# Stop dev server first (Ctrl+C)
pnpm populate:local

# Restart dev server
pnpm dev:local
```

---

## 📦 What's Included

All catalog population commands include **ALL** of these catalogs:

### ✅ Core Catalogs (14)

- `catalog_countries` - Countries
- `catalog_states` - Mexican states
- `catalog_currencies` - Currencies
- `catalog_armor_levels` - Vehicle armor levels
- `catalog_business_activities` - Business activities
- `catalog_economic_activities` - Economic activities
- `catalog_operation_types` - Operation types
- `catalog_payment_forms` - Payment forms
- `catalog_payment_methods` - Payment methods
- `catalog_vulnerable_activities` - Vulnerable activities

### ✅ Vehicle Catalogs (3)

- `catalog_terrestrial_vehicle_brands` - Car brands
- `catalog_maritime_vehicle_brands` - Boat brands
- `catalog_air_vehicle_brands` - Aircraft brands

### ✅ CFDI Catalogs (12) ⭐ **NEW**

- `catalog_cfdi_payment_forms` - SAT c_FormaPago
- `catalog_cfdi_payment_methods` - SAT c_MetodoPago
- `catalog_cfdi_tax_regimes` - SAT c_RegimenFiscal
- `catalog_cfdi_usages` - SAT c_UsoCFDI
- `catalog_cfdi_voucher_types` - SAT c_TipoDeComprobante
- `catalog_cfdi_currencies` - SAT c_Moneda
- `catalog_cfdi_countries` - SAT c_Pais
- `catalog_cfdi_taxes` - SAT c_Impuesto
- `catalog_cfdi_tax_factors` - SAT c_TipoFactor
- `catalog_cfdi_tax_objects` - SAT c_ObjetoImp
- `catalog_cfdi_relation_types` - SAT c_TipoRelacion
- `catalog_cfdi_export_types` - SAT c_Exportacion

### ✅ CFDI-PLD Integration (1) ⭐ **NEW**

- `catalog_cfdi_pld_mappings` - Maps CFDI codes to PLD monetary instruments

### ✅ PLD Consolidated Catalogs (15)

- `pld_alert_types` - 395 alert types across 19 VAs
- `pld_monetary_instruments` - Monetary instruments
- `pld_payment_forms` - Payment forms
- And 12 more...

### ✅ Activity-Specific Catalogs (47)

- Individual catalogs for each of 19 vulnerable activities
- Examples: `veh_operation_types`, `tcv_transferred_value_types`, etc.

### ✅ UMA Values (with `populate:*` commands)

- `uma_values` - Economic reference data

### ❌ Large Catalogs (Excluded by Default)

- `catalog_zip_codes` - ~140K+ postal codes (run separately)
- `catalog_cfdi_units` - ~1K units (run separately)
- `catalog_cfdi_product_services` - ~52K products/services (run separately)

---

## 🚀 Local Commands

### Populate All (Recommended)

```bash
# Local development
pnpm populate:local           # All catalogs + UMA

# Remote environments
pnpm populate:dev             # Dev environment
pnpm populate:prod            # Production
pnpm populate:preview         # Preview
```

**Time**: ~3-5 minutes  
**Includes**: All catalogs + UMA values  
**Excludes**: Large catalogs (zip codes, CFDI units, CFDI products)

---

### Populate Catalogs Only (Faster)

```bash
# Local development
pnpm populate:catalogs:local  # All catalogs (no UMA)

# Remote environments
pnpm populate:catalogs:dev    # Dev environment
pnpm populate:catalogs:prod   # Production
pnpm populate:catalogs:preview # Preview
```

**Time**: ~2-3 minutes  
**Includes**: All catalogs  
**Excludes**: UMA values, Large catalogs

---

### Populate Large Catalogs (Optional)

```bash
# All large catalogs at once
pnpm populate:catalogs:large:local
pnpm populate:catalogs:large:dev

# Individual large catalogs
pnpm populate:catalog:zip-codes:local
pnpm populate:catalog:cfdi-units:local
pnpm populate:catalog:cfdi-product-services:local
```

**Time**: ~5-15 minutes  
**Only needed if**: Your app requires zip code lookup, detailed CFDI units, or product/service codes

---

## 🌐 GitHub Actions (Manual Workflows)

### Via GitHub UI

1. Go to **Actions** tab
2. Select **"Populate / Seed Database"**
3. Click **"Run workflow"**
4. Configure:
   - **Operation**: `populate-all` (or `populate-catalogs`)
   - **Environment**: `dev`, `prod`, or `preview`
   - **Skip zip codes**: `true` (recommended)
5. Click **"Run workflow"**

### Via GitHub CLI

```bash
# Populate all catalogs in dev
gh workflow run populate-seed.yml \
  -f operation=populate-all \
  -f environment=dev \
  -f skip_zip_codes=true

# Populate catalogs only (no UMA)
gh workflow run populate-seed.yml \
  -f operation=populate-catalogs \
  -f environment=dev \
  -f skip_zip_codes=true

# Populate zip codes
gh workflow run populate-seed.yml \
  -f operation=populate-zip-codes \
  -f environment=dev

# Seed test data (dev only)
gh workflow run populate-seed.yml \
  -f operation=seed \
  -f environment=dev
```

---

## 📋 Complete Workflow

### Setting Up a Fresh Environment

```bash
# 1. Apply migrations
pnpm wrangler d1 migrations apply DB --local --config wrangler.local.jsonc

# 2. Populate all catalogs
pnpm populate:local

# 3. (Optional) Populate large catalogs
pnpm populate:catalogs:large:local

# 4. (Dev only) Seed test data
pnpm seed:local

# 5. Start dev server
pnpm dev:local
```

---

## ✅ Verification

### Check Catalog Counts

```bash
# Check CFDI payment forms
pnpm wrangler d1 execute DB --local --config wrangler.local.jsonc \
  --command "SELECT COUNT(*) as count FROM catalog_cfdi_payment_forms"

# Check all CFDI catalogs
pnpm wrangler d1 execute DB --local --config wrangler.local.jsonc \
  --command "SELECT
    (SELECT COUNT(*) FROM catalog_cfdi_payment_forms) as payment_forms,
    (SELECT COUNT(*) FROM catalog_cfdi_payment_methods) as payment_methods,
    (SELECT COUNT(*) FROM catalog_cfdi_tax_regimes) as tax_regimes,
    (SELECT COUNT(*) FROM catalog_cfdi_usages) as usages,
    (SELECT COUNT(*) FROM catalog_cfdi_voucher_types) as voucher_types"

# Check CFDI-PLD mappings
pnpm wrangler d1 execute DB --local --config wrangler.local.jsonc \
  --command "SELECT COUNT(*) as count FROM catalog_cfdi_pld_mappings"
```

### Expected Counts

| Catalog                        | Expected Count |
| ------------------------------ | -------------- |
| `catalog_cfdi_payment_forms`   | ~20            |
| `catalog_cfdi_payment_methods` | ~2             |
| `catalog_cfdi_tax_regimes`     | ~40            |
| `catalog_cfdi_usages`          | ~30            |
| `catalog_cfdi_voucher_types`   | ~5             |
| `catalog_cfdi_currencies`      | ~180           |
| `catalog_cfdi_countries`       | ~250           |
| `catalog_cfdi_taxes`           | ~4             |
| `catalog_cfdi_tax_factors`     | ~3             |
| `catalog_cfdi_tax_objects`     | ~3             |
| `catalog_cfdi_relation_types`  | ~10            |
| `catalog_cfdi_export_types`    | ~4             |
| `catalog_cfdi_pld_mappings`    | ~20            |

---

## 🔧 Troubleshooting

### Database Locked Error

**Error**: `SQLITE_BUSY: database is locked`

**Solution**: Stop the dev server before running populate scripts.

```bash
# Stop dev server (Ctrl+C)
pnpm populate:local
# Restart dev server
pnpm dev:local
```

---

### Missing CSV Files

**Error**: `ENOENT: no such file or directory, open '.../*.csv'`

**Solution**: Extract CFDI catalogs from SAT sources.

```bash
cd scripts/cfdi-catalogs
node download-sat-catalogs.mjs
node extract-activity-catalogs.mjs
node consolidate-catalogs.mjs
```

---

### Catalog Already Exists

All populate scripts use `INSERT OR REPLACE` or `INSERT OR IGNORE`, so they're **idempotent**. You can safely re-run them.

---

### Slow Population

Large catalogs take time. Use the separated approach:

1. Run core catalogs first (fast): `pnpm populate:catalogs:local`
2. Run large catalogs separately: `pnpm populate:catalogs:large:local`
3. Skip large catalogs if not needed

---

## 📊 Timing Reference

| Command                                        | Time      | What's Included                   |
| ---------------------------------------------- | --------- | --------------------------------- |
| `populate:local`                               | ~3-5 min  | All catalogs + UMA                |
| `populate:catalogs:local`                      | ~2-3 min  | All catalogs (no UMA)             |
| `populate:catalogs:large:local`                | ~5-15 min | Zip codes + CFDI units + Products |
| `populate:catalog:zip-codes:local`             | ~5-10 min | Zip codes only                    |
| `populate:catalog:cfdi-units:local`            | ~30 sec   | CFDI units only                   |
| `populate:catalog:cfdi-product-services:local` | ~3-5 min  | CFDI products only                |
| `seed:local`                                   | ~1-2 min  | Test data                         |

---

## 📚 Documentation Links

- [Manual Workflows Guide](MANUAL-WORKFLOWS.md) - Quick reference for GitHub Actions
- [Workflows README](.github/workflows/README.md) - Detailed workflow documentation
- [Populate Scripts README](scripts/populate/README.md) - Local populate script usage
- [CFDI Catalogs README](scripts/cfdi-catalogs/README.md) - CFDI catalog extraction
- [Seed Scripts README](scripts/seed/README.md) - Synthetic test data generation

---

## 💡 Best Practices

1. **Stop dev server** before populating locally (SQLite doesn't allow concurrent writes)
2. **Use GitHub Actions** for remote environments (dev, prod, preview)
3. **Skip large catalogs** unless you need them (they're slow)
4. **Re-run safely** - all scripts are idempotent
5. **Verify counts** after population to ensure success

---

## 🎉 Summary

**All CFDI catalogs are included by default** in the standard populate commands:

- ✅ `pnpm populate:local` - Includes all 12 CFDI catalogs + CFDI-PLD mappings
- ✅ `pnpm populate:dev` - Includes all 12 CFDI catalogs + CFDI-PLD mappings
- ✅ GitHub Actions "populate-all" - Includes all 12 CFDI catalogs + CFDI-PLD mappings

**No special commands needed** - just run the standard populate commands and you'll get everything!
