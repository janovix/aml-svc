# Catalog Population Scripts

Population scripts load **real catalog data** from CSV files into the database. These are required for all environments (dev, preview, prod).

## When Population Runs

- **dev**: After migrations in `deploy:dev` script
- **preview**: After migrations in `versions:upload` script
- **prod**: After migrations in `deploy:prod` script

## Catalog Population

Catalogs are populated from CSV files. Each catalog has its own population script:

- `catalog-vehicle-brands.mjs` - Vehicle brands
- `catalog-countries.mjs` - Country codes
- `catalog-currencies.mjs` - Currency codes
- `catalog-operation-types.mjs` - Vehicle operation types (veh-operation-types)
- `catalog-payment-forms.mjs` - Payment forms
- `catalog-vulnerable-activities.mjs` - Vulnerable activities

## Population Scripts

- `populate-all-catalogs.mjs` - Populates all catalogs
- `populate-all.mjs` - Master script that runs all population scripts
