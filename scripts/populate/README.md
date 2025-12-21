# Catalog Population Scripts

Population scripts load **real catalog data** from CSV files into the database. These are required for all environments (dev, preview, prod).

## When Population Runs

- **dev**: After migrations in `deploy:dev` script
- **preview**: After migrations in `versions:upload` script
- **prod**: After migrations in `deploy:prod` script

## Catalog Population

Catalogs are populated from CSV files. Each catalog has its own population script:

- `catalog-vehicle-brands.mjs` - Vehicle brands
- `catalog-country.mjs` - Country codes
- `catalog-currency.mjs` - Currency codes
- `catalog-operation-type.mjs` - Operation types
- `catalog-payment-forms.mjs` - Payment forms
- `catalog-vulnerable-activities.mjs` - Vulnerable activities

## Population Scripts

- `populate-all-catalogs.mjs` - Populates all catalogs
- `populate-all.mjs` - Master script that runs all population scripts
