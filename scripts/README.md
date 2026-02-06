# AML Service Scripts

This directory contains all scripts for managing data in the AML service.

## 📁 Directory Structure

```
scripts/
├── populate/          # Reference data (catalogs, constants) - REQUIRED
├── seed/              # Synthetic test data - OPTIONAL (dev/preview only)
├── cfdi-catalogs/     # CFDI catalog extraction from SAT sources
├── create-alert-rules.mjs
├── update-uma-values.mjs
└── versions-upload.mjs
```

## 🎯 Quick Reference

### Population (Reference Data)

**Purpose**: Load real reference data required for the app to function

**When**: Always (including production)

**What**: Countries, currencies, CFDI codes, PLD catalogs, etc.

```bash
# Local development
pnpm populate:local

# Remote environments
pnpm populate:dev
pnpm populate:prod
pnpm populate:preview
```

📚 [Full Documentation](./populate/README.md)

---

### Seeding (Test Data)

**Purpose**: Generate synthetic test data for development/testing

**When**: Dev and preview only (NEVER in production)

**What**: Fake clients, transactions, alerts, reports, etc.

```bash
# Local development (after populating)
pnpm seed:local

# Remote environments
pnpm seed:dev
pnpm seed:preview
```

📚 [Full Documentation](./seed/README.md)

---

## 🔄 Typical Workflow

### First-Time Setup (Local)

```bash
# 1. Apply migrations
pnpm wrangler d1 migrations apply DB --local --config wrangler.local.jsonc

# 2. Populate reference data (required)
pnpm populate:local

# 3. (Optional) Populate large catalogs if needed
pnpm populate:catalogs:large:local

# 4. (Optional) Seed test data for UI testing
pnpm seed:local

# 5. Start dev server
pnpm dev:local
```

### Production Deployment

```bash
# 1. Apply migrations
pnpm wrangler d1 migrations apply DB --remote --config wrangler.prod.jsonc

# 2. Populate reference data (required)
pnpm populate:prod

# 3. (Optional) Populate large catalogs if needed
pnpm populate:catalogs:large:prod

# 4. Deploy
pnpm deploy:prod

# NOTE: NO SEEDING IN PRODUCTION!
```

### Dev/Preview Deployment

```bash
# 1. Apply migrations
pnpm wrangler d1 migrations apply DB --remote --config wrangler.jsonc

# 2. Populate reference data
pnpm populate:dev

# 3. (Optional) Seed test data
pnpm seed:dev

# 4. Deploy
pnpm deploy:dev
```

---

## 📊 Population vs Seeding

| Aspect           | Population                        | Seeding                      |
| ---------------- | --------------------------------- | ---------------------------- |
| **Purpose**      | Real reference data               | Synthetic test data          |
| **Examples**     | Countries, CFDI codes, currencies | Fake clients, transactions   |
| **Required?**    | ✅ Yes (app won't work without)   | ❌ No (optional for testing) |
| **Production?**  | ✅ Yes                            | ❌ No                        |
| **Dev/Preview?** | ✅ Yes                            | ✅ Yes                       |
| **Idempotent?**  | ✅ Always                         | ✅ Usually                   |
| **Size**         | ~53K+ items                       | ~100-500 items               |
| **Time**         | 2-15 min                          | 10-30 sec                    |

---

## 🐘 Large Catalogs

Some catalogs are very large and excluded from default population:

| Catalog                | Items  | Time      | When to Use                        |
| ---------------------- | ------ | --------- | ---------------------------------- |
| Zip Codes              | ~140K+ | ~5-10 min | Address validation with zip lookup |
| CFDI Units             | ~1K    | ~30 sec   | Detailed CFDI unit codes           |
| CFDI Products/Services | ~52K   | ~3-5 min  | Detailed CFDI product codes        |

```bash
# Populate all large catalogs
pnpm populate:catalogs:large:local

# Or individually
pnpm populate:catalog:zip-codes:local
pnpm populate:catalog:cfdi-units:local
pnpm populate:catalog:cfdi-product-services:local
```

---

## 🌍 Environment-Specific Commands

### Pattern

```bash
pnpm {action}[:{scope}][:{env}]
```

Where:

- `{action}` = `populate` or `seed`
- `{scope}` = `catalogs`, `catalogs:large`, or omitted
- `{env}` = `local`, `dev`, `prod`, `preview`, or omitted

### Examples

```bash
# Population
pnpm populate                    # All reference data (local default DB)
pnpm populate:local              # All reference data (local wrangler.local.jsonc)
pnpm populate:dev                # All reference data (remote dev)
pnpm populate:prod               # All reference data (remote prod)
pnpm populate:catalogs:local     # Core catalogs only (local)
pnpm populate:catalogs:large:dev # Large catalogs only (remote dev)

# Seeding
pnpm seed:local                  # Test data (local)
pnpm seed:dev                    # Test data (remote dev)
pnpm seed:preview                # Test data (remote preview)
```

---

## ⚠️ Important Notes

### 1. Stop Dev Server Before Populating

SQLite doesn't allow concurrent writes:

```bash
# Stop dev server (Ctrl+C)
pnpm populate:local
# Restart dev server
pnpm dev:local
```

### 2. Population Before Seeding

Always populate before seeding (seeds depend on catalogs):

```bash
pnpm populate:local  # First
pnpm seed:local      # Second
```

### 3. Production: No Seeds!

Seeds are automatically skipped in production, but to be safe:

- ✅ DO run `populate:prod`
- ❌ DON'T run `seed:prod`

### 4. Idempotent Operations

All scripts are idempotent - safe to re-run multiple times.

---

## 🔧 Other Scripts

### CFDI Catalog Extraction

Extract and consolidate CFDI catalogs from SAT sources:

```bash
cd scripts/cfdi-catalogs
node download-sat-catalogs.mjs
node extract-activity-catalogs.mjs
node consolidate-catalogs.mjs
```

📚 [CFDI Catalogs Documentation](./cfdi-catalogs/README.md)

### Alert Rules

Create alert rules from definitions:

```bash
pnpm create:alert-rules
```

### UMA Values

Update UMA (Unidad de Medida y Actualización) values:

```bash
pnpm update:uma-values
```

---

## 🆘 Troubleshooting

### Database Locked

**Error**: `SQLITE_BUSY: database is locked`

**Solution**: Stop the dev server before running populate/seed scripts.

### Foreign Key Constraint Failed

**Error**: `FOREIGN KEY constraint failed`

**Solution**: Populate catalogs before seeding:

```bash
pnpm populate:local
pnpm seed:local
```

### Missing CSV Files

**Error**: CSV files not found

**Solution**: Extract CFDI catalogs first:

```bash
cd scripts/cfdi-catalogs
node download-sat-catalogs.mjs
node extract-activity-catalogs.mjs
node consolidate-catalogs.mjs
```

---

## 📚 Documentation

- [Population Scripts](./populate/README.md) - Detailed population guide
- [Seed Scripts](./seed/README.md) - Detailed seeding guide
- [CFDI Catalogs](./cfdi-catalogs/README.md) - CFDI extraction guide
- [Database Migrations](../migrations/README.md) - Schema management

---

## 🎓 Learning Resources

### For New Developers

1. Read [Population vs Seeding](#-population-vs-seeding)
2. Follow [First-Time Setup](#first-time-setup-local)
3. Explore individual script READMEs

### For CI/CD Integration

1. Review [Environment-Specific Commands](#-environment-specific-commands)
2. Check [Production Deployment](#production-deployment)
3. Ensure proper ordering: migrations → populate → (optional) seed → deploy
