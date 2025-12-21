# Catalog Population Scripts

Population scripts load **real catalog data** from CSV files into the database. These are required for all environments (dev, preview, prod).

## When Population Runs

- **dev**: After migrations in `deploy:dev` script
- **preview**: After migrations in `versions:upload` script
- **prod**: After migrations in `deploy:prod` script

## SAT Catalog Population

SAT catalogs are populated from CSV files provided by the user. Each catalog has its own population script:

- `populate-sat-catalog-tipo-sujeto-obligado.mjs`
- `populate-sat-catalog-tipo-operacion.mjs`
- `populate-sat-catalog-moneda.mjs`
- etc.

## Regular Catalog Population

Regular catalogs (like vehicle-brands) are also populated:

- `populate-catalog-vehicle-brands.mjs` (refactored from seed-vehicle-brands)

## Population Scripts

- `populate-all-sat-catalogs.mjs` - Populates all SAT catalogs
- `populate-all-catalogs.mjs` - Populates all regular catalogs
- `populate-all.mjs` - Master script that runs all population scripts
