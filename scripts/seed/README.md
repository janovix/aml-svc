# Seed Scripts

Seed scripts generate **synthetic data** for development and preview environments to make the UI testable with sample data.

## When Seeds Run

- **dev**: After migrations in `dev` script
- **preview**: After migrations in `versions:upload` script
- **NOT in production**: Seeds are never run in production

## Seed Scripts

Each model should have a corresponding seed script:

- `seed-clients.mjs` - Generate synthetic clients
- `seed-transactions.mjs` - Generate synthetic transactions
- `seed-alerts.mjs` - Generate synthetic alerts
- etc.

## Seed Validation

Run `pnpm seed:validate` to verify all models have seed scripts. This runs in:

- Husky pre-commit hook
- CI pipeline
