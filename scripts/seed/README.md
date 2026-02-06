# Seed Scripts

Seed scripts generate **synthetic test data** for development and preview environments to make the UI testable with sample data.

> **Important**: Seeds are NOT for reference data (catalogs, constants). For catalogs, use the [populate scripts](../populate/README.md) instead.

## 🔍 Seeds vs Population

| Aspect           | Seeds (this directory)             | Population (../populate/)         |
| ---------------- | ---------------------------------- | --------------------------------- |
| **Purpose**      | Synthetic test data                | Real reference data               |
| **Examples**     | Fake clients, transactions, alerts | Countries, currencies, CFDI codes |
| **Environments** | Dev, Preview only                  | All (including prod)              |
| **Idempotent**   | Usually replaces data              | Always idempotent                 |
| **Required**     | No (optional for testing)          | Yes (app won't work without)      |

## 🚀 Quick Start

```bash
# Local development (after populating catalogs)
pnpm seed:local

# Dev environment
pnpm seed:dev

# Preview environment
pnpm seed:preview

# Production - DON'T RUN SEEDS IN PROD!
# (Seeds are automatically skipped in production)
```

## 📋 When Seeds Run

- **Local**: Manually via `pnpm seed:local`
- **Dev**: Manually via `pnpm seed:dev` (after populate:dev)
- **Preview**: Manually via `pnpm seed:preview` (after populate:preview)
- **Production**: ❌ **NEVER** - Seeds are automatically skipped

## 📝 Available Seed Scripts

Each seed script generates synthetic data for a specific model:

| Script                               | Purpose                                     | Typical Count |
| ------------------------------------ | ------------------------------------------- | ------------- |
| `seed-client.mjs`                    | Synthetic clients (individuals & companies) | 10-50         |
| `seed-transaction.mjs`               | Synthetic transactions                      | 50-200        |
| `seed-alert-rule.mjs`                | Alert rule definitions                      | 5-20          |
| `seed-alert-rule-config.mjs`         | Alert rule configurations                   | 5-20          |
| `seed-notice.mjs`                    | Synthetic PLD notices                       | 10-30         |
| `seed-report.mjs`                    | Synthetic PLD reports                       | 5-15          |
| `seed-ultimate-beneficial-owner.mjs` | Synthetic UBOs                              | 10-30         |
| `seed-upload-link.mjs`               | Synthetic upload links                      | 5-10          |
| `seed-organization-settings.mjs`     | Organization settings                       | 1-5           |
| `seed-uma-value.mjs`                 | UMA values (should be in populate!)         | 1             |

## ✅ Seed Validation

Run `pnpm seed:validate` to verify seed script coverage:

```bash
pnpm seed:validate
```

This checks:

- All models have corresponding seed scripts
- Seed scripts follow naming conventions
- Dependencies between seeds are correct

Validation runs in:

- Husky pre-commit hook
- CI pipeline

## 🔧 Creating New Seed Scripts

When adding a new model, create a corresponding seed script:

1. Create `seed-{model-name}.mjs` in this directory
2. Follow the existing patterns (see other seed scripts)
3. Use deterministic IDs for reproducibility
4. Handle dependencies (e.g., clients before transactions)
5. Run `pnpm seed:validate` to verify

### Template

```javascript
#!/usr/bin/env node
/**
 * Seed {ModelName}
 *
 * Generates synthetic {model} data for dev/preview environments.
 */

import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { writeFileSync, unlinkSync } from "node:fs";
import { getWranglerConfig } from "../populate/lib/cfdi-catalog-base.mjs";

// Generate synthetic data
const items = [
	// ... your synthetic data
];

// Generate SQL
const sql = items
	.map(
		(item) => `
  INSERT OR REPLACE INTO {table} (...)
  VALUES (...);
`,
	)
	.join("\n");

// Execute SQL via wrangler
const { isRemote, configFile } = getWranglerConfig();
const sqlFile = join(__dirname, `temp-seed-{model}-${Date.now()}.sql`);
// ... execute and cleanup
```

## 🎯 Best Practices

### 1. Run Seeds After Population

Always populate catalogs before seeding:

```bash
# Correct order
pnpm populate:local    # Reference data first
pnpm seed:local        # Test data second

# Wrong order (will fail due to missing catalogs)
pnpm seed:local        # ❌ Missing foreign keys
pnpm populate:local
```

### 2. Use Deterministic IDs

Generate consistent IDs for reproducibility:

```javascript
function generateId(seed) {
	let hash = 0;
	for (let i = 0; i < seed.length; i++) {
		hash = (hash << 5) - hash + seed.charCodeAt(i);
	}
	return Math.abs(hash).toString(16).padStart(32, "0");
}
```

### 3. Handle Dependencies

Respect foreign key relationships:

```javascript
// seed-client.mjs runs first
// seed-transaction.mjs runs second (depends on clients)
// seed-alert.mjs runs third (depends on transactions)
```

The `all.mjs` script handles ordering automatically.

### 4. Make Seeds Idempotent

Use `INSERT OR REPLACE` or `INSERT OR IGNORE`:

```sql
INSERT OR REPLACE INTO clients (id, name, ...)
VALUES ('...', '...', ...);
```

### 5. Keep Seeds Realistic

Generate realistic test data:

- Valid email formats
- Realistic names and addresses
- Proper date ranges
- Valid foreign keys

## 🔍 Troubleshooting

### Foreign Key Constraint Failed

**Error**: `FOREIGN KEY constraint failed`

**Solution**: Ensure catalogs are populated first:

```bash
pnpm populate:local
pnpm seed:local
```

### Seeds Running in Production

Seeds are automatically skipped in production. If you see seeds running in prod, check:

- `NODE_ENV` environment variable
- `CF_PAGES_BRANCH` or `WORKERS_CI_BRANCH`
- Wrangler config file being used

### Duplicate Key Errors

Seeds use `INSERT OR REPLACE`, so duplicates should be handled. If you see errors:

- Check that IDs are deterministic
- Verify the seed script uses `OR REPLACE` or `OR IGNORE`

---

## 📚 Related Documentation

- [Populate Scripts](../populate/README.md) - Reference data (catalogs)
- [Database Migrations](../../migrations/README.md) - Schema management
- [CFDI Catalogs](../cfdi-catalogs/README.md) - CFDI catalog extraction
