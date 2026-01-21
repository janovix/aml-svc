-- Seed script for vehicle-brands catalog
-- This script creates the vehicle-brands catalog and populates it with common vehicle brands

-- Common vehicle brands list
-- First, create the catalog if it doesn't exist
INSERT OR IGNORE INTO catalogs (id, key, name, active, created_at, updated_at)
VALUES (
    lower(hex(randomblob(16))),
    'vehicle-brands',
    'Vehicle Brands',
    1,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

-- Insert vehicle brands (using INSERT OR IGNORE to avoid duplicates)
-- Using individual INSERT statements to avoid SQLite compound SELECT and VALUES limitations
INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, created_at, updated_at)
SELECT 
    lower(hex(randomblob(16))),
    (SELECT id FROM catalogs WHERE key = 'vehicle-brands'),
    'Acura',
    lower(trim('Acura')),
    1,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
WHERE NOT EXISTS (
    SELECT 1 FROM catalog_items 
    WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'vehicle-brands')
    AND normalized_name = lower(trim('Acura'))
);

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'vehicle-brands'), 'Alfa Romeo', lower(trim('Alfa Romeo')), 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'vehicle-brands') AND normalized_name = lower(trim('Alfa Romeo')));

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'vehicle-brands'), 'Aston Martin', lower(trim('Aston Martin')), 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'vehicle-brands') AND normalized_name = lower(trim('Aston Martin')));

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'vehicle-brands'), 'Audi', lower(trim('Audi')), 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'vehicle-brands') AND normalized_name = lower(trim('Audi')));

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'vehicle-brands'), 'Bentley', lower(trim('Bentley')), 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'vehicle-brands') AND normalized_name = lower(trim('Bentley')));

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'vehicle-brands'), 'BMW', lower(trim('BMW')), 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'vehicle-brands') AND normalized_name = lower(trim('BMW')));

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'vehicle-brands'), 'Buick', lower(trim('Buick')), 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'vehicle-brands') AND normalized_name = lower(trim('Buick')));

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'vehicle-brands'), 'Cadillac', lower(trim('Cadillac')), 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'vehicle-brands') AND normalized_name = lower(trim('Cadillac')));

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'vehicle-brands'), 'Chevrolet', lower(trim('Chevrolet')), 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'vehicle-brands') AND normalized_name = lower(trim('Chevrolet')));

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'vehicle-brands'), 'Chrysler', lower(trim('Chrysler')), 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'vehicle-brands') AND normalized_name = lower(trim('Chrysler')));

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'vehicle-brands'), 'Citroën', lower(trim('Citroën')), 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'vehicle-brands') AND normalized_name = lower(trim('Citroën')));

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'vehicle-brands'), 'Dodge', lower(trim('Dodge')), 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'vehicle-brands') AND normalized_name = lower(trim('Dodge')));

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'vehicle-brands'), 'Ferrari', lower(trim('Ferrari')), 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'vehicle-brands') AND normalized_name = lower(trim('Ferrari')));

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'vehicle-brands'), 'Fiat', lower(trim('Fiat')), 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'vehicle-brands') AND normalized_name = lower(trim('Fiat')));

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'vehicle-brands'), 'Ford', lower(trim('Ford')), 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'vehicle-brands') AND normalized_name = lower(trim('Ford')));

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'vehicle-brands'), 'Genesis', lower(trim('Genesis')), 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'vehicle-brands') AND normalized_name = lower(trim('Genesis')));

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'vehicle-brands'), 'GMC', lower(trim('GMC')), 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'vehicle-brands') AND normalized_name = lower(trim('GMC')));

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'vehicle-brands'), 'Honda', lower(trim('Honda')), 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'vehicle-brands') AND normalized_name = lower(trim('Honda')));

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'vehicle-brands'), 'Hyundai', lower(trim('Hyundai')), 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'vehicle-brands') AND normalized_name = lower(trim('Hyundai')));

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'vehicle-brands'), 'Infiniti', lower(trim('Infiniti')), 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'vehicle-brands') AND normalized_name = lower(trim('Infiniti')));

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'vehicle-brands'), 'Jaguar', lower(trim('Jaguar')), 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'vehicle-brands') AND normalized_name = lower(trim('Jaguar')));

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'vehicle-brands'), 'Jeep', lower(trim('Jeep')), 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'vehicle-brands') AND normalized_name = lower(trim('Jeep')));

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'vehicle-brands'), 'Kia', lower(trim('Kia')), 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'vehicle-brands') AND normalized_name = lower(trim('Kia')));

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'vehicle-brands'), 'Lamborghini', lower(trim('Lamborghini')), 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'vehicle-brands') AND normalized_name = lower(trim('Lamborghini')));

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'vehicle-brands'), 'Land Rover', lower(trim('Land Rover')), 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'vehicle-brands') AND normalized_name = lower(trim('Land Rover')));

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'vehicle-brands'), 'Lexus', lower(trim('Lexus')), 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'vehicle-brands') AND normalized_name = lower(trim('Lexus')));

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'vehicle-brands'), 'Lincoln', lower(trim('Lincoln')), 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'vehicle-brands') AND normalized_name = lower(trim('Lincoln')));

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'vehicle-brands'), 'Maserati', lower(trim('Maserati')), 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'vehicle-brands') AND normalized_name = lower(trim('Maserati')));

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'vehicle-brands'), 'Mazda', lower(trim('Mazda')), 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'vehicle-brands') AND normalized_name = lower(trim('Mazda')));

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'vehicle-brands'), 'McLaren', lower(trim('McLaren')), 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'vehicle-brands') AND normalized_name = lower(trim('McLaren')));

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'vehicle-brands'), 'Mercedes-Benz', lower(trim('Mercedes-Benz')), 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'vehicle-brands') AND normalized_name = lower(trim('Mercedes-Benz')));

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'vehicle-brands'), 'Mini', lower(trim('Mini')), 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'vehicle-brands') AND normalized_name = lower(trim('Mini')));

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'vehicle-brands'), 'Mitsubishi', lower(trim('Mitsubishi')), 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'vehicle-brands') AND normalized_name = lower(trim('Mitsubishi')));

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'vehicle-brands'), 'Nissan', lower(trim('Nissan')), 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'vehicle-brands') AND normalized_name = lower(trim('Nissan')));

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'vehicle-brands'), 'Porsche', lower(trim('Porsche')), 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'vehicle-brands') AND normalized_name = lower(trim('Porsche')));

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'vehicle-brands'), 'Ram', lower(trim('Ram')), 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'vehicle-brands') AND normalized_name = lower(trim('Ram')));

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'vehicle-brands'), 'Rolls-Royce', lower(trim('Rolls-Royce')), 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'vehicle-brands') AND normalized_name = lower(trim('Rolls-Royce')));

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'vehicle-brands'), 'Subaru', lower(trim('Subaru')), 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'vehicle-brands') AND normalized_name = lower(trim('Subaru')));

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'vehicle-brands'), 'Tesla', lower(trim('Tesla')), 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'vehicle-brands') AND normalized_name = lower(trim('Tesla')));

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'vehicle-brands'), 'Toyota', lower(trim('Toyota')), 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'vehicle-brands') AND normalized_name = lower(trim('Toyota')));

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'vehicle-brands'), 'Volkswagen', lower(trim('Volkswagen')), 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'vehicle-brands') AND normalized_name = lower(trim('Volkswagen')));

INSERT OR IGNORE INTO catalog_items (id, catalog_id, name, normalized_name, active, created_at, updated_at)
SELECT lower(hex(randomblob(16))), (SELECT id FROM catalogs WHERE key = 'vehicle-brands'), 'Volvo', lower(trim('Volvo')), 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM catalog_items WHERE catalog_id = (SELECT id FROM catalogs WHERE key = 'vehicle-brands') AND normalized_name = lower(trim('Volvo')));
