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

-- Insert vehicle brands (using INSERT OR IGNORE to avoid duplicates)
-- Using VALUES clause instead of UNION ALL to avoid SQLite compound SELECT limit
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
    VALUES 
    ('Acura'),
    ('Alfa Romeo'),
    ('Aston Martin'),
    ('Audi'),
    ('Bentley'),
    ('BMW'),
    ('Buick'),
    ('Cadillac'),
    ('Chevrolet'),
    ('Chrysler'),
    ('Citroën'),
    ('Dodge'),
    ('Ferrari'),
    ('Fiat'),
    ('Ford'),
    ('Genesis'),
    ('GMC'),
    ('Honda'),
    ('Hyundai'),
    ('Infiniti'),
    ('Jaguar'),
    ('Jeep'),
    ('Kia'),
    ('Lamborghini'),
    ('Land Rover'),
    ('Lexus'),
    ('Lincoln'),
    ('Maserati'),
    ('Mazda'),
    ('McLaren'),
    ('Mercedes-Benz'),
    ('Mini'),
    ('Mitsubishi'),
    ('Nissan'),
    ('Porsche'),
    ('Ram'),
    ('Rolls-Royce'),
    ('Subaru'),
    ('Tesla'),
    ('Toyota'),
    ('Volkswagen'),
    ('Volvo')
) AS brands(brand)
WHERE NOT EXISTS (
    SELECT 1 FROM catalog_items 
    WHERE catalogId = (SELECT id FROM catalogs WHERE key = 'vehicle-brands')
    AND normalizedName = lower(trim(brands.brand))
);
