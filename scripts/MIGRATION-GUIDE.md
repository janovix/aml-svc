# Migration Guide: New Script Organization

This guide helps you transition from the old script structure to the new organized structure.

## 🎯 What Changed?

### Before (Old Structure)

```bash
# Confusing - mixed everything together
pnpm populate:catalogs         # Included large catalogs (slow!)
pnpm populate:catalog:zip-codes # Individual scripts scattered
```

**Problems**:

- ❌ Large catalogs included by default (slow)
- ❌ No clear separation between core and large catalogs
- ❌ Missing PLD consolidated catalogs
- ❌ Unclear distinction between populate and seed
- ❌ Inconsistent environment-specific commands

### After (New Structure)

```bash
# Clear separation
pnpm populate:catalogs          # Core catalogs only (fast!)
pnpm populate:catalogs:large    # Large catalogs separately (optional)
pnpm populate:catalog:zip-codes # Individual large catalogs
```

**Benefits**:

- ✅ Fast default population (excludes large catalogs)
- ✅ Clear separation: core vs large catalogs
- ✅ All PLD catalogs included
- ✅ Clear populate vs seed distinction
- ✅ Consistent environment commands

---

## 📋 Command Migration Table

### Population Commands

| Old Command                             | New Command                                         | Notes                                 |
| --------------------------------------- | --------------------------------------------------- | ------------------------------------- |
| `pnpm populate:catalogs`                | `pnpm populate:catalogs`                            | Now excludes large catalogs (faster!) |
| `pnpm populate:catalogs:local`          | `pnpm populate:catalogs:local`                      | Now excludes large catalogs           |
| N/A                                     | `pnpm populate:catalogs:dev`                        | ✨ New                                |
| N/A                                     | `pnpm populate:catalogs:prod`                       | ✨ New                                |
| N/A                                     | `pnpm populate:catalogs:preview`                    | ✨ New                                |
| N/A                                     | `pnpm populate:catalogs:large`                      | ✨ New - all large catalogs           |
| N/A                                     | `pnpm populate:catalogs:large:local`                | ✨ New                                |
| N/A                                     | `pnpm populate:catalogs:large:dev`                  | ✨ New                                |
| N/A                                     | `pnpm populate:catalogs:large:prod`                 | ✨ New                                |
| `pnpm populate:catalog:zip-codes`       | `pnpm populate:catalog:zip-codes`                   | Same                                  |
| `pnpm populate:catalog:zip-codes:local` | `pnpm populate:catalog:zip-codes:local`             | Same                                  |
| N/A                                     | `pnpm populate:catalog:zip-codes:dev`               | ✨ New                                |
| N/A                                     | `pnpm populate:catalog:cfdi-units`                  | ✨ New                                |
| N/A                                     | `pnpm populate:catalog:cfdi-units:local`            | ✨ New                                |
| N/A                                     | `pnpm populate:catalog:cfdi-units:dev`              | ✨ New                                |
| N/A                                     | `pnpm populate:catalog:cfdi-product-services`       | ✨ New                                |
| N/A                                     | `pnpm populate:catalog:cfdi-product-services:local` | ✨ New                                |
| N/A                                     | `pnpm populate:catalog:cfdi-product-services:dev`   | ✨ New                                |

### Master Commands

| Old Command             | New Command             | Notes                     |
| ----------------------- | ----------------------- | ------------------------- |
| `pnpm populate`         | `pnpm populate`         | Same (all reference data) |
| `pnpm populate:local`   | `pnpm populate:local`   | Same                      |
| `pnpm populate:dev`     | `pnpm populate:dev`     | Same                      |
| `pnpm populate:prod`    | `pnpm populate:prod`    | Same                      |
| `pnpm populate:preview` | `pnpm populate:preview` | Same                      |
| `pnpm seed`             | `pnpm seed`             | Same                      |
| `pnpm seed:local`       | `pnpm seed:local`       | Same                      |
| `pnpm seed:dev`         | `pnpm seed:dev`         | Same                      |
| `pnpm seed:preview`     | `pnpm seed:preview`     | Same                      |

---

## 🔄 Update Your Workflows

### Local Development

**Before**:

```bash
# Slow - included large catalogs
pnpm populate:catalogs:local
```

**After**:

```bash
# Fast - excludes large catalogs by default
pnpm populate:catalogs:local

# Optional: Add large catalogs if needed
pnpm populate:catalogs:large:local
```

### CI/CD Pipeline

**Before**:

```bash
# Dev deployment
pnpm populate:dev  # Included large catalogs (slow)
pnpm seed:dev
```

**After**:

```bash
# Dev deployment - faster!
pnpm populate:dev  # Excludes large catalogs
pnpm seed:dev

# Optional: Add large catalogs if needed
pnpm populate:catalogs:large:dev
```

### Production Deployment

**Before**:

```bash
# Production
pnpm populate:prod  # Included large catalogs (slow)
```

**After**:

```bash
# Production - faster!
pnpm populate:prod  # Excludes large catalogs

# Optional: Add large catalogs if needed
pnpm populate:catalogs:large:prod
```

---

## 📊 What's Included Now?

### Core Catalogs (Default - Fast)

The default `pnpm populate:catalogs` now includes:

✅ **Core Catalogs** (14):

- Countries, States, Currencies
- Armor Levels, Business Activities
- Economic Activities, Operation Types
- Payment Forms, Payment Methods
- Vulnerable Activities

✅ **Vehicle Catalogs** (3):

- Terrestrial, Maritime, Air Vehicle Brands

✅ **CFDI Catalogs** (12):

- All SAT CFDI codes (payment forms, tax regimes, etc.)

✅ **CFDI-PLD Integration** (1):

- Mappings between CFDI and PLD catalogs

✅ **PLD Consolidated Catalogs** (15) - **NEW!**:

- Alert Types, Monetary Instruments
- Property Types, Power of Attorney Types
- And 11 more consolidated catalogs

✅ **Activity-Specific Catalogs** (47):

- All catalogs for 19 vulnerable activities

**Total**: ~89 catalogs, ~1K-5K items, **1-3 minutes**

### Large Catalogs (Optional - Slow)

Now separated into `pnpm populate:catalogs:large`:

⚠️ **Zip Codes** (~140K items, ~5-10 min)
⚠️ **CFDI Units** (~1K items, ~30 sec)
⚠️ **CFDI Products/Services** (~52K items, ~3-5 min)

**Total**: 3 catalogs, ~193K items, **5-15 minutes**

---

## 🚀 Quick Migration Steps

### Step 1: Update Your Scripts

If you have custom scripts or CI/CD configs, update them:

**Before**:

```yaml
# .github/workflows/deploy.yml
- run: pnpm populate:catalogs:dev
```

**After**:

```yaml
# .github/workflows/deploy.yml
- run: pnpm populate:catalogs:dev # Faster now!
# Optional: Add large catalogs if needed
# - run: pnpm populate:catalogs:large:dev
```

### Step 2: Update Documentation

Update any internal docs that reference the old commands.

### Step 3: Communicate to Team

Share this migration guide with your team:

- Default population is now faster (excludes large catalogs)
- Large catalogs must be populated separately if needed
- All PLD catalogs are now included by default

### Step 4: Test Locally

```bash
# Stop dev server
# Ctrl+C

# Test new fast population
pnpm populate:catalogs:local

# Verify it works
pnpm dev:local

# Optional: Test large catalogs
pnpm populate:catalogs:large:local
```

---

## ❓ FAQ

### Q: Will my existing data be affected?

**A**: No! All scripts are idempotent. They use `INSERT OR REPLACE` or `INSERT OR IGNORE`, so re-running them is safe.

### Q: Do I need to populate large catalogs?

**A**: Only if your app needs:

- **Zip Codes**: Address validation with zip code lookup
- **CFDI Units**: Detailed CFDI unit codes for invoices
- **CFDI Products/Services**: Detailed product/service codes for invoices

Most apps can skip these initially.

### Q: What if I was relying on large catalogs?

**A**: Just add the large catalog population step:

```bash
# After your normal population
pnpm populate:catalogs:large:local
```

Or individually:

```bash
pnpm populate:catalog:zip-codes:local
pnpm populate:catalog:cfdi-units:local
pnpm populate:catalog:cfdi-product-services:local
```

### Q: Why were PLD catalogs missing before?

**A**: The `catalog-pld-consolidated.mjs` script existed but wasn't included in `all-catalogs.mjs`. It's now included by default.

### Q: Can I still use the old commands?

**A**: Most old commands still work the same way. The main difference is that `populate:catalogs` now excludes large catalogs by default.

### Q: How do I know if I need large catalogs?

**A**: Check your app's features:

- ✅ Need zip code validation? → Populate zip codes
- ✅ Generate CFDI with detailed units? → Populate CFDI units
- ✅ Generate CFDI with detailed products? → Populate CFDI products/services
- ❌ None of the above? → Skip large catalogs

---

## 📚 Additional Resources

- [Scripts Overview](./README.md)
- [Population Guide](./populate/README.md)
- [Seeding Guide](./seed/README.md)

---

## 🆘 Need Help?

If you encounter issues during migration:

1. Check the [Troubleshooting section](./README.md#-troubleshooting)
2. Review the [Population README](./populate/README.md)
3. Verify your wrangler config files exist
4. Ensure dev server is stopped before populating

Still stuck? Check the logs and error messages - they now provide better guidance!
