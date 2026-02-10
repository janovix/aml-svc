# Upload Catalogs to R2 Bucket

## Overview

Upload all standardized CSV files from `catalogs-cache/` to the R2 bucket at `catalogs.janovix.com`.

**Note:** Large files (zip-codes, cfdi-product-services) are split into chunks for better upload reliability and performance.

## Files to Upload

**Total: 100 files**

- 86 regular catalog files
- 14 chunk files (8 zip-codes chunks + 6 cfdi-product-services chunks)
- Excludes: 2 deprecated files + 2 chunked originals

### Exclude These Files

**Deprecated (2 files):**

- `cfdi-countries.csv` (consolidated into `countries.csv`)
- `cfdi-currencies.csv` (consolidated into `currencies.csv`)

**Chunked Originals (2 files):**

- `zip-codes.csv` (split into 8 chunks in `chunks/` directory)
- `cfdi-product-services.csv` (split into 6 chunks in `chunks/` directory)

These large files have been split into smaller chunks for better upload reliability and performance.

### Upload All Other Files

Upload these 88 files:

#### Core Catalogs (8 files)

- `countries.csv` (name,iso2,iso3)
- `currencies.csv` (code,short_name,name,country,decimal_places)
- `states.csv` (code,name,iso)
- `banks.csv`
- `armor-levels.csv`
- `business-activities.csv`
- `economic-activities.csv`
- `payment-forms.csv`
- `payment-methods.csv`
- `vulnerable-activities.csv` (code,name,short_name,description)

#### CFDI Catalogs (12 files)

- `cfdi-export-types.csv`
- `cfdi-payment-forms.csv`
- `cfdi-payment-methods.csv`
- `cfdi-product-services.csv`
- `cfdi-relation-types.csv`
- `cfdi-tax-factors.csv`
- `cfdi-tax-objects.csv`
- `cfdi-tax-regimes.csv`
- `cfdi-taxes.csv`
- `cfdi-units.csv` (code,name,symbol)
- `cfdi-usages.csv`
- `cfdi-voucher-types.csv`

#### PLD Catalogs (15 files)

- `pld-alert-types.csv` (va_code,code,name)
- `pld-monetary-instruments.csv`
- `pld-payment-forms.csv`
- `pld-property-types.csv`
- `pld-appraisal-item-types.csv`
- `pld-liquidation-item-types.csv`
- `pld-armor-levels.csv`
- `pld-incorporation-reasons.csv`
- `pld-shareholder-positions.csv`
- `pld-merger-types.csv`
- `pld-power-of-attorney-types.csv`
- `pld-patrimony-modification-types.csv`
- `pld-guarantee-types.csv`
- `pld-granting-types.csv`
- `pld-financial-institution-types.csv`

#### Activity-Specific Catalogs (47 files)

- `ari-operation-types.csv`
- `bli-armored-item-status.csv`
- `bli-armored-property-parts.csv`
- `bli-operation-types.csv`
- `chv-currency-denominations.csv`
- `chv-operation-types.csv`
- `din-credit-types.csv`
- `din-development-types.csv`
- `din-operation-types.csv`
- `din-third-party-types.csv`
- `don-operation-types.csv`
- `fep-assignment-types.csv`
- `fep-movement-types.csv`
- `fep-operation-types.csv`
- `fep-trust-movement-types.csv`
- `fep-trust-types.csv`
- `fes-act-types.csv`
- `fes-legal-entity-types.csv`
- `fes-person-character-types.csv`
- `inm-client-figures.csv`
- `inm-operation-types.csv`
- `inm-person-figures.csv`
- `jys-business-lines.csv`
- `jys-operation-methods.csv`
- `jys-operation-types.csv`
- `mjr-item-types.csv`
- `mjr-operation-types.csv`
- `mjr-trade-units.csv`
- `mpc-operation-types.csv`
- `oba-operation-types.csv`
- `oba-traded-object-types.csv`
- `spr-assignment-types.csv`
- `spr-client-figures.csv`
- `spr-contribution-reasons.csv`
- `spr-managed-asset-types.csv`
- `spr-management-status-types.csv`
- `spr-occupations.csv`
- `spr-operation-types.csv`
- `spr-service-areas.csv`
- `tcv-operation-types.csv`
- `tcv-service-types.csv`
- `tcv-transferred-value-types.csv`
- `tdr-operation-types.csv`
- `tpp-operation-types.csv`
- `tsc-card-types.csv`
- `tsc-operation-types.csv`
- `veh-operation-types.csv`

#### Vehicle Brands (3 files)

- `terrestrial-vehicle-brands.csv` (name,origin_country,type)
- `maritime-vehicle-brands.csv` (name,origin_country,type)
- `air-vehicle-brands.csv` (name,origin_country,type)

#### Large Catalogs - Chunked (14 files in chunks/ directory)

**Zip Codes (8 chunks):**

- `chunks/zip-codes-chunk-001.csv` through `chunks/zip-codes-chunk-008.csv`
- Total: ~157K items
- Format: zip_code,settlement,settlement_type,municipality,state,city,state_code,zone

**CFDI Product Services (6 chunks):**

- `chunks/cfdi-product-services-chunk-001.csv` through `chunks/cfdi-product-services-chunk-006.csv`
- Total: ~52K items
- Format: code,name

## Upload Methods

### Option 1: Wrangler CLI (Recommended)

```bash
# Navigate to catalogs-cache directory
cd catalogs-cache

# Upload all files except deprecated ones
wrangler r2 object put catalogs/countries.csv --file countries.csv
wrangler r2 object put catalogs/currencies.csv --file currencies.csv
# ... repeat for all 88 files
```

### Option 2: Cloudflare Dashboard

1. Go to Cloudflare Dashboard → R2
2. Select the `catalogs` bucket (or appropriate bucket name)
3. Upload files manually, excluding `cfdi-countries.csv` and `cfdi-currencies.csv`

### Option 3: Bulk Upload Script (Recommended)

Use the provided PowerShell script that handles regular files AND chunks:

```powershell
cd catalogs-cache
.\upload-all-catalogs.ps1
```

The script automatically:

- Uploads 86 regular catalog files to `catalogs/`
- Uploads 14 chunk files to `catalogs/chunks/`
- Excludes deprecated files
- Excludes chunked originals (uses chunks instead)
- Shows progress and summary

**Dry run mode** (preview without uploading):

```powershell
.\upload-all-catalogs.ps1 -DryRun
```

## Verification

After upload, verify by testing the populate scripts:

```bash
# Test with a few catalogs
pnpm populate:local

# Test large catalogs
pnpm populate:catalogs:large:local
```

## Chunking Strategy

Large files are split into manageable chunks for better performance:

### Zip Codes

- **Original size:** 10.86 MB, 157,539 lines
- **Split into:** 8 chunks of ~20,000 lines each
- **Location:** `catalogs/chunks/zip-codes-chunk-001.csv` through `008`

### CFDI Product Services

- **Original size:** 2.33 MB, 52,512 lines
- **Split into:** 6 chunks of ~10,000 lines each
- **Location:** `catalogs/chunks/cfdi-product-services-chunk-001.csv` through `006`

### Why Chunking?

1. **Better upload reliability** - Smaller files are less likely to fail
2. **Parallel processing** - Can process chunks concurrently
3. **Memory efficiency** - Reduces memory usage during population
4. **Faster recovery** - If one chunk fails, only that chunk needs retry

## Notes

- All files have been converted to standardized formats
- Large files split into chunks for better performance
- Deprecated files should NOT be uploaded
- Total files to upload: **100 files** (86 regular + 14 chunks)
- The R2 bucket should be publicly accessible at `https://catalogs.janovix.com/`
