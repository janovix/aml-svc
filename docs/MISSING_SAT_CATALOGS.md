# Missing SAT Catalogs for Population

The following SAT catalogs need to be populated with initial data from CSV files. These catalogs are required for SAT XML file generation.

## Required SAT Catalogs

Please provide CSV files for the following catalogs:

1. **CAT_TIPO_SUJETO_OBLIGADO** - Type of obligated subject

   - Used in: `<tipo_sujeto_obligado>` field
   - Required: Yes
   - CSV format: `code,name,description,active`

2. **CAT_TIPO_OPERACION** - Type of operation

   - Used in: `<tipo_operacion>` field
   - Required: Yes
   - CSV format: `code,name,description,active`

3. **CAT_MONEDA** - Currency codes

   - Used in: `<moneda>` field
   - Required: Yes
   - CSV format: `code,name,description,active`

4. **CAT_TIPO_VEHICULO** - Vehicle type

   - Used in: `<tipo_vehiculo>` field
   - Required: Yes
   - CSV format: `code,name,description,active`

5. **CAT_MARCA_VEHICULO** - Vehicle brand

   - Used in: `<marca>` field
   - Required: Yes
   - CSV format: `code,name,description,active`
   - Note: This might map to the existing `vehicle-brands` catalog

6. **CAT_COLOR_VEHICULO** - Vehicle color

   - Used in: `<color>` field
   - Required: Yes
   - CSV format: `code,name,description,active`

7. **CAT_TIPO_PERSONA** - Person type (natural/legal)

   - Used in: `<tipo_persona>` field
   - Required: Yes
   - CSV format: `code,name,description,active`

8. **CAT_PAIS** - Country codes

   - Used in: `<pais>` and `<pais_nacionalidad>` fields
   - Required: Yes
   - CSV format: `code,name,description,active`

9. **CAT_ENTIDAD_FEDERATIVA** - Mexican federal entities/states
   - Used in: `<entidad_federativa>` field
   - Required: Conditional (when country is Mexico)
   - CSV format: `code,name,description,active`

## CSV Format Expected

Each CSV should have at least these columns:

- `code` - The catalog item code (value used in XML) - **Required**
- `name` - Human-readable name - **Required**
- `description` (optional) - Additional description
- `active` (optional) - Whether the item is active (default: true)
- `metadata` (optional) - Additional JSON metadata

## Population Scripts

Once CSV files are provided, population scripts will be created in:

- `scripts/populate/sat-catalog-{catalog-code}.mjs` - Individual catalog population scripts
- `scripts/populate/all-sat-catalogs.mjs` - Master script to populate all catalogs

## Current Status

- ✅ Catalog structure created (`SatCatalog` and `SatCatalogItem` models)
- ✅ Migration created (`0007_add_sat_catalogs_and_alert_file_url.sql`)
- ✅ Population script framework ready
- ⏳ Waiting for CSV files to create population scripts
