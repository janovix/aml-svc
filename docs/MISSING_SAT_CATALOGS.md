# Missing SAT Catalogs for Population

The following SAT catalogs need to be populated with initial data from CSV files. These catalogs are required for SAT XML file generation.

**Note:** These catalogs use the existing `Catalog` and `CatalogItem` system (not a separate SAT catalog system).

## Required SAT Catalogs

Please provide CSV files for the following catalogs. Catalog keys should match the `key` field in the `catalogs` table:

1. **tipo-operacion** - Type of operation

   - Used in: `<tipo_operacion>` field (e.g., "802")
   - Required: Yes
   - CSV format: `name,normalizedName,active,metadata`
   - Note: The `name` field should contain the code used in XML (e.g., "802")

2. **moneda** - Currency codes

   - Used in: `<moneda>` field (e.g., "3" for MXN)
   - Required: Yes
   - CSV format: `name,normalizedName,active,metadata`
   - Note: The `name` field should contain the code used in XML (e.g., "3")

3. **pais** - Country codes

   - Used in: `<pais_nacionalidad>` field (e.g., "RW", "AI", "MX")
   - Required: Yes
   - CSV format: `name,normalizedName,active,metadata`
   - Note: The `name` field should contain the ISO country code (e.g., "MX", "RW")

4. **payment-methods** - Payment method codes

   - Used in: `<forma_pago>` field (e.g., "1")
   - Required: Yes
   - CSV format: `name,normalizedName,active,metadata`
   - Note: The `name` field should contain the code used in XML

5. **vehicle-brands** - Vehicle brand names

   - Used in: `<marca_fabricante>` field (e.g., "FORD", "LINCOLN")
   - Required: Yes
   - CSV format: `name,normalizedName,active,metadata`
   - Note: Already exists, may need to be populated with SAT-compliant brand names

## CSV Format Expected

Each CSV should have at least these columns:

- `name` - The catalog item name/code (value used in XML) - **Required**
- `normalizedName` - Normalized version of the name for searching - **Required**
- `active` (optional) - Whether the item is active (default: true)
- `metadata` (optional) - Additional JSON metadata

**Note:** The `name` field should contain the exact value that will be used in the XML file (e.g., "802" for operation type, "3" for currency, "RW" for country code).

## Population Scripts

Once CSV files are provided, population scripts will be created in:

- `scripts/populate/catalog-{catalog-key}.mjs` - Individual catalog population scripts
- `scripts/populate/all-catalogs.mjs` - Master script to populate all catalogs

## Current Status

- ✅ Using existing `Catalog` and `CatalogItem` system
- ✅ XML generator updated to match actual SAT schema structure
- ✅ Removed `tipo_sujeto_obligado` (replaced with `clave_actividad`)
- ✅ Population script framework ready
- ⏳ Waiting for CSV files to create population scripts
