-- Seed script for vehicle-brands catalog
-- This script creates the vehicle-brands catalog and populates it with common vehicle brands

-- Common vehicle brands list
-- First, create the catalog if it doesn't exist
INSERT OR IGNORE INTO catalogs (id, key, name, active, createdAt, updatedAt)
VALUES (
    lower(hex(randomblob(16))),
    'vehicle-brands',
    'Vehicle Brands',
    1,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

-- Get the catalog ID
-- Note: SQLite doesn't support variables well, so we'll use a subquery
-- Insert vehicle brands (using INSERT OR IGNORE to avoid duplicates)
INSERT OR IGNORE INTO catalog_items (id, catalogId, name, normalizedName, active, createdAt, updatedAt)
SELECT 
    lower(hex(randomblob(16))) as id,
    (SELECT id FROM catalogs WHERE key = 'vehicle-brands') as catalogId,
    brand as name,
    lower(trim(brand)) as normalizedName,
    1 as active,
    CURRENT_TIMESTAMP as createdAt,
    CURRENT_TIMESTAMP as updatedAt
FROM (
    SELECT 'Acura' as brand UNION ALL
    SELECT 'Alfa Romeo' UNION ALL
    SELECT 'Aston Martin' UNION ALL
    SELECT 'Audi' UNION ALL
    SELECT 'Bentley' UNION ALL
    SELECT 'BMW' UNION ALL
    SELECT 'Buick' UNION ALL
    SELECT 'Cadillac' UNION ALL
    SELECT 'Chevrolet' UNION ALL
    SELECT 'Chrysler' UNION ALL
    SELECT 'Citroën' UNION ALL
    SELECT 'Dodge' UNION ALL
    SELECT 'Ferrari' UNION ALL
    SELECT 'Fiat' UNION ALL
    SELECT 'Ford' UNION ALL
    SELECT 'Genesis' UNION ALL
    SELECT 'GMC' UNION ALL
    SELECT 'Honda' UNION ALL
    SELECT 'Hyundai' UNION ALL
    SELECT 'Infiniti' UNION ALL
    SELECT 'Jaguar' UNION ALL
    SELECT 'Jeep' UNION ALL
    SELECT 'Kia' UNION ALL
    SELECT 'Lamborghini' UNION ALL
    SELECT 'Land Rover' UNION ALL
    SELECT 'Lexus' UNION ALL
    SELECT 'Lincoln' UNION ALL
    SELECT 'Maserati' UNION ALL
    SELECT 'Mazda' UNION ALL
    SELECT 'McLaren' UNION ALL
    SELECT 'Mercedes-Benz' UNION ALL
    SELECT 'Mini' UNION ALL
    SELECT 'Mitsubishi' UNION ALL
    SELECT 'Nissan' UNION ALL
    SELECT 'Porsche' UNION ALL
    SELECT 'Ram' UNION ALL
    SELECT 'Rolls-Royce' UNION ALL
    SELECT 'Subaru' UNION ALL
    SELECT 'Tesla' UNION ALL
    SELECT 'Toyota' UNION ALL
    SELECT 'Volkswagen' UNION ALL
    SELECT 'Volvo'
) brands
WHERE NOT EXISTS (
    SELECT 1 FROM catalog_items 
    WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'vehicle-brands')
    AND normalizedName = lower(trim(brands.brand))
);
