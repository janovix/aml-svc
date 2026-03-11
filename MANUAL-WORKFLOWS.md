# Manual Workflows Quick Reference

This guide provides quick instructions for running manual workflows to populate catalogs in the dev environment.

## 🎯 Quick Start

### Option 1: Via GitHub UI (Recommended)

1. Go to [GitHub Actions](https://github.com/YOUR_ORG/janovix/actions)
2. Select **"Populate / Seed Database"** from the left sidebar
3. Click **"Run workflow"** (top right)
4. Configure:
   - **Operation**: `populate-all` (for all catalogs + UMA)
   - **Environment**: `dev`
   - **Skip zip codes**: `true` (unless you need them)
5. Click **"Run workflow"**

### Option 2: Via GitHub CLI

```bash
# Install GitHub CLI if you haven't already
# https://cli.github.com/

# Populate all catalogs (including CFDI) in dev
gh workflow run populate-seed.yml \
  -f operation=populate-all \
  -f environment=dev \
  -f skip_zip_codes=true
```

---

## 📋 What Gets Populated

When you run `populate-all` or `populate-catalogs`, you get **ALL** of these:

### ✅ Core Catalogs (14)

- Countries, States, Currencies
- Armor Levels, Business Activities
- Economic Activities, Operation Types
- Payment Forms, Payment Methods
- Vulnerable Activities

### ✅ Vehicle Catalogs (3)

- Terrestrial, Maritime, Air Vehicle Brands

### ✅ CFDI Catalogs (12) ⭐ **Includes all new CFDI catalogs**

- Payment Forms (`c_FormaPago`)
- Payment Methods (`c_MetodoPago`)
- Tax Regimes (`c_RegimenFiscal`)
- Usages (`c_UsoCFDI`)
- Voucher Types (`c_TipoDeComprobante`)
- Currencies (`c_Moneda`)
- Countries (`c_Pais`)
- Taxes (`c_Impuesto`)
- Tax Factors (`c_TipoFactor`)
- Tax Objects (`c_ObjetoImp`)
- Relation Types (`c_TipoRelacion`)
- Export Types (`c_Exportacion`)

### ✅ CFDI-PLD Integration (1)

- CFDI-PLD Mappings (maps CFDI codes to PLD monetary instruments)

### ✅ PLD Consolidated Catalogs (15)

- Alert Types, Monetary Instruments, Payment Forms
- Property Types, Incorporation Reasons
- And more...

### ✅ Activity-Specific Catalogs (47)

- Individual catalogs for each of 19 vulnerable activities

### ✅ UMA Values (only with `populate-all`)

- Economic reference data

---

## 🔧 Common Operations

### Populate Everything (Recommended for fresh setup)

```bash
# Via GitHub CLI
gh workflow run populate-seed.yml \
  -f operation=populate-all \
  -f environment=dev \
  -f skip_zip_codes=true
```

**Time**: ~3-5 minutes  
**Includes**: All catalogs + UMA values  
**Excludes**: Zip codes (too large)

---

### Populate Only Catalogs (Faster, no UMA)

```bash
# Via GitHub CLI
gh workflow run populate-seed.yml \
  -f operation=populate-catalogs \
  -f environment=dev \
  -f skip_zip_codes=true
```

**Time**: ~2-3 minutes  
**Includes**: All catalogs  
**Excludes**: UMA values, Zip codes

---

### Populate Zip Codes (Optional, Large)

```bash
# Via GitHub CLI
gh workflow run populate-seed.yml \
  -f operation=populate-zip-codes \
  -f environment=dev
```

**Time**: ~5-10 minutes  
**Items**: ~140K+ postal codes  
**Only needed if**: Your app requires address validation with zip code lookup

---

### Seed Test Data (Development Only)

```bash
# Via GitHub CLI
gh workflow run populate-seed.yml \
  -f operation=seed \
  -f environment=dev
```

**Time**: ~1-2 minutes  
**Creates**: Test organizations, clients, operations, etc.  
**⚠️ Never use in production**

---

## 🌍 Environments

| Environment | Config                   | Worker              | Use For              |
| ----------- | ------------------------ | ------------------- | -------------------- |
| `dev`       | `wrangler.jsonc`         | `aml-svc`           | Development, testing |
| `prod`      | `wrangler.prod.jsonc`    | `aml-svc-prod`      | Production           |
| `preview`   | `wrangler.preview.jsonc` | `aml-svc` (preview) | PR previews          |

---

## 🕐 Timing Reference

| Operation            | Time      | What's Included       |
| -------------------- | --------- | --------------------- |
| `populate-all`       | ~3-5 min  | All catalogs + UMA    |
| `populate-catalogs`  | ~2-3 min  | All catalogs (no UMA) |
| `populate-zip-codes` | ~5-10 min | Zip codes only        |
| `seed`               | ~1-2 min  | Test data             |

---

## ✅ Verification

After running the workflow:

1. Check the workflow run in GitHub Actions
2. Review the summary at the bottom of the workflow run
3. Verify catalogs in your database:

```bash
# Local verification
pnpm wrangler d1 execute DB --local --config wrangler.local.jsonc \
  --command "SELECT COUNT(*) FROM catalog_cfdi_payment_forms"
```

---

## 🆘 Troubleshooting

### Workflow not appearing?

- Make sure you're on the correct repository
- Check that you have the necessary permissions
- Verify the workflow file exists in `.github/workflows/`

### Workflow failed?

1. Check the workflow logs in GitHub Actions
2. Verify secrets are configured:
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`
3. Ensure migrations have been applied
4. Check that CSV files exist in `scripts/cfdi-catalogs/output/`

### Need to re-run?

All populate scripts are **idempotent** (safe to run multiple times). They use `INSERT OR REPLACE` or `INSERT OR IGNORE`.

---

## 📚 More Information

- [Workflows README](.github/workflows/README.md) - Detailed workflow documentation
- [Populate Scripts README](scripts/populate/README.md) - Local populate script usage
- [CFDI Catalogs README](scripts/cfdi-catalogs/README.md) - CFDI catalog extraction

---

## 💡 Pro Tips

1. **First time setup**: Run `populate-all` to get everything
2. **Quick refresh**: Run `populate-catalogs` to skip UMA values
3. **Skip zip codes**: Unless you need address validation, skip them (they're huge)
4. **Test data**: Use `seed` operation for development environments only
5. **Idempotent**: Safe to re-run workflows anytime

---

## 🎉 Summary

**To populate all catalogs including CFDI in dev:**

1. Go to GitHub Actions
2. Select "Populate / Seed Database"
3. Click "Run workflow"
4. Choose:
   - Operation: `populate-all`
   - Environment: `dev`
   - Skip zip codes: `true`
5. Click "Run workflow"

**Done!** All catalogs including the new CFDI ones will be populated in ~3-5 minutes.
