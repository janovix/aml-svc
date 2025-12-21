# SAT Catalogs for Population

The following SAT catalogs are populated with initial data from CSV files. These catalogs are required for SAT XML file generation.

**Note:** These catalogs use the existing `Catalog` and `CatalogItem` system (not a separate SAT catalog system).

## Populated Catalogs

The following catalogs are automatically populated from CSV files:

1. **country** - Country codes ✅

   - Used in: `<pais_nacionalidad>` field (e.g., "RW", "AI", "MX")
   - Source: `COUNTRY.csv`
   - Population script: `scripts/populate/catalog-country.mjs`

2. **currency** - Currency codes ✅

   - Used in: `<moneda>` field (e.g., "3" for MXN)
   - Source: `CURRENCY.csv`
   - Population script: `scripts/populate/catalog-currency.mjs`
   - Note: The `name` field contains the code used in XML (e.g., "1", "2", "3")

3. **operation-type** - Type of operation ✅

   - Used in: `<tipo_operacion>` field (e.g., "802")
   - Source: `OPERATION_TYPE.csv`
   - Population script: `scripts/populate/catalog-operation-type.mjs`
   - Note: The `name` field contains the code used in XML (e.g., "1", "802")

4. **payment-forms** - Payment form codes ✅

   - Used in: `<forma_pago>` field (e.g., "1")
   - Source: `PAYMENT_FORM.csv`
   - Population script: `scripts/populate/catalog-payment-forms.mjs`
   - Note: The `name` field contains the code used in XML (e.g., "1", "2")

5. **vulnerable-activities** - Vulnerable activities ✅

   - Used in: `<clave_actividad>` field (e.g., "VEH" for vehicles)
   - Source: `VULNERABLE_ACTIVITIES.csv`
   - Population script: `scripts/populate/catalog-vulnerable-activities.mjs`
   - Note: The `name` field contains the activity code (e.g., "VEH", "JYS", "TSC")

6. **vehicle-brands** - Vehicle brand names ✅

   - Used in: `<marca_fabricante>` field (e.g., "FORD", "LINCOLN")
   - Source: Existing SQL file
   - Population script: `scripts/populate/catalog-vehicle-brands.mjs`

## Population Scripts

All catalog population scripts are located in `scripts/populate/`:

- `catalog-country.mjs` - Populates country codes
- `catalog-currency.mjs` - Populates currency codes
- `catalog-operation-type.mjs` - Populates operation types
- `catalog-payment-forms.mjs` - Populates payment forms
- `catalog-vulnerable-activities.mjs` - Populates vulnerable activities
- `catalog-vehicle-brands.mjs` - Populates vehicle brands
- `all-catalogs.mjs` - Master script to populate all catalogs

## Running Population Scripts

To populate all catalogs:

```bash
pnpm populate
```

To populate a specific catalog:

```bash
node scripts/populate/catalog-country.mjs
```

## Current Status

- ✅ Using existing `Catalog` and `CatalogItem` system
- ✅ XML generator updated to match actual SAT schema structure
- ✅ Removed `tipo_sujeto_obligado` (replaced with `clave_actividad`)
- ✅ All catalog population scripts created and ready
- ✅ CSV files downloaded from `https://eng-assets.algenium.tools/janovix_catalogs/`
- ✅ Catalogs automatically populated during deployment
